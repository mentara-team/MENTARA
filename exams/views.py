from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response as DRFResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Avg, Count, Max, Q
from django.utils import timezone
import random
from datetime import timedelta

from .models import Topic, Question, Exam, ExamQuestion, Attempt, Response, LeaderboardEntry
from django.core.mail import send_mail
from .serializers import TopicSerializer, QuestionSerializer, ExamSerializer, AttemptSerializer, ResponseSerializer

class IsAdminOrTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        role = getattr(u, 'role', None)
        # Back-compat: allow staff/admins and legacy "Teachers" group.
        return bool(
            u.is_staff
            or role in ('ADMIN', 'TEACHER')
            or u.groups.filter(name__iexact='Teachers').exists()
        )


def _is_teacher_or_admin(user):
    if not (user and user.is_authenticated):
        return False
    role = getattr(user, 'role', None)
    return bool(user.is_staff or role in ('ADMIN', 'TEACHER') or user.groups.filter(name__iexact='Teachers').exists())

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.AllowAny()]
        return [IsAdminOrTeacher()]

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrTeacher()]

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.filter(is_active=True)
    serializer_class = ExamSerializer
    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.AllowAny()]
        return [IsAdminOrTeacher()]

class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.all()
    serializer_class = AttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().select_related('user', 'exam')
        if _is_teacher_or_admin(self.request.user):
            return qs
        return qs.filter(user=self.request.user)

class ResponseViewSet(viewsets.ModelViewSet):
    queryset = Response.objects.all()
    serializer_class = ResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().select_related('attempt', 'question', 'attempt__user')
        if _is_teacher_or_admin(self.request.user):
            return qs
        return qs.filter(attempt__user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_exam(request, exam_id):
    exam = get_object_or_404(Exam, pk=exam_id, is_active=True)
    now = timezone.now()

    def _pick_question_ids_for_exam() -> list[int]:
        eqs = list(ExamQuestion.objects.filter(exam=exam).select_related('question').order_by('order'))
        if eqs:
            ids = [int(eq.question_id) for eq in eqs]
        else:
            ids = list(Question.objects.filter(topic=exam.topic, is_active=True).values_list('id', flat=True))
            ids = [int(x) for x in ids]
        if exam.shuffle_questions:
            random.shuffle(ids)
        return ids

    with transaction.atomic():
        # If there's an active attempt, resume it instead of creating a new one.
        attempt = (
            Attempt.objects.select_for_update()
            .filter(user=request.user, exam=exam, status='inprogress')
            .order_by('-started_at')
            .first()
        )

        if attempt is None:
            attempt = Attempt.objects.create(user=request.user, exam=exam, started_at=now)

        expires_at_dt = attempt.started_at + timedelta(seconds=exam.duration_seconds)
        expires_at = expires_at_dt.isoformat()

        # If time has already elapsed, mark timed out and return (do not restart timer).
        if now >= expires_at_dt:
            if attempt.status == 'inprogress':
                attempt.status = 'timedout'
                attempt.finished_at = expires_at_dt
                attempt.duration_seconds = int(exam.duration_seconds)
                attempt.save(update_fields=['status', 'finished_at', 'duration_seconds'])
            return DRFResponse(
                {'attempt_id': attempt.id, 'expires_at': expires_at, 'detail': 'Attempt timed out.'},
                status=status.HTTP_410_GONE,
            )

        meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
        question_order = meta.get('question_order')
        if not isinstance(question_order, list) or not question_order:
            question_order = _pick_question_ids_for_exam()
            meta['question_order'] = question_order
            attempt.metadata = meta
            attempt.save(update_fields=['metadata'])

    # Build questions list in the stored order.
    qs = Question.objects.filter(id__in=question_order)
    by_id = {q.id: q for q in qs}

    def map_type(t):
        return {'MCQ': 'mcq', 'MULTI': 'multi', 'FIB': 'fib', 'STRUCT': 'structured'}.get(t, 'mcq')

    questions = []
    for qid in question_order:
        q = by_id.get(int(qid))
        if not q:
            continue
        # Keep choices as-is if dict, otherwise convert to dict format
        choices = q.choices if isinstance(q.choices, dict) else {}
        if not choices and q.type == 'MCQ':
            choices = {'A': 'Option A', 'B': 'Option B', 'C': 'Option C', 'D': 'Option D'}
        
        questions.append({
            'id': q.id,
            'type': map_type(q.type),
            'statement': q.statement,
            'choices': choices,
            'time_est': q.estimated_time,
            'marks': q.marks,
            # Frontend runs on a different origin (e.g. :3000), so return an absolute URL.
            'image': request.build_absolute_uri(q.image.url) if q.image else None,
        })

    return DRFResponse(
        {'attempt_id': attempt.id, 'expires_at': expires_at, 'questions': questions},
        status=status.HTTP_200_OK,
    )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_exam(request, exam_id):
    attempt_id = request.data.get('attempt_id')
    attempt = get_object_or_404(Attempt, pk=attempt_id, user=request.user, exam_id=exam_id)
    responses = request.data.get('responses', [])  # [{question_id, answer_payload, time_spent_seconds}]

    # Idempotency: if the attempt is already submitted, return stored score.
    # This prevents duplicate submits (e.g. user double-click, retry after timeout)
    # from raising IntegrityError on the unique (attempt, question) constraint.
    if attempt.status == 'submitted':
        total_existing = 0
        # Best-effort total for display; falls back to 0 if responses missing.
        try:
            total_existing = sum(
                float(r.question.marks)
                for r in Response.objects.filter(attempt=attempt).select_related('question')
            )
        except Exception:
            total_existing = 0
        return DRFResponse(
            {'score': attempt.total_score, 'total': total_existing, 'attempt_id': attempt.id},
            status=status.HTTP_200_OK,
        )

    total = 0
    score = 0
    with transaction.atomic():
        for r in responses:
            qid = r.get('question_id')
            q = get_object_or_404(Question, pk=qid)

            payload = r.get('answer_payload')
            if payload is None:
                # Accept alternative client shape: {answer, time_spent, flagged}
                # Normalize to the stored JSON payload used elsewhere.
                raw_answer = r.get('answer', None)
                if q.type in ('MCQ', 'MULTI'):
                    payload = {'answers': [raw_answer] if raw_answer is not None else []}
                else:
                    payload = {'answer': raw_answer}

            spent = int(r.get('time_spent_seconds', r.get('time_spent', 0)) or 0)
            flagged = bool(r.get('flagged_for_review', r.get('flagged', False)))

            correct = False
            # basic auto-grade for MCQ/MULTI/FIB
            if q.type in ('MCQ', 'MULTI'):
                correct = set(map(str, payload.get('answers', []))) == set(map(str, q.correct_answers))
            elif q.type == 'FIB':
                correct = str(payload.get('answer', '')).strip().lower() in [
                    str(a).strip().lower() for a in q.correct_answers
                ]

            # STRUCT requires teacher grading
            Response.objects.update_or_create(
                attempt=attempt,
                question=q,
                defaults={
                    'answer_payload': payload,
                    'correct': correct,
                    'time_spent_seconds': spent,
                    'flagged_for_review': flagged,
                },
            )

            m = q.marks
            total += m
            if correct:
                score += m
        attempt.finished_at = timezone.now()
        attempt.total_score = score
        attempt.percentage = round((float(score) / float(total)) * 100.0, 2) if total else 0.0
        attempt.duration_seconds = int((attempt.finished_at - attempt.started_at).total_seconds())
        attempt.status = 'submitted'
        attempt.save()

        try:
            attempt.calculate_percentile()
        except Exception:
            pass

        # Update leaderboard (weekly)
        period = 'weekly'
        lb, created = LeaderboardEntry.objects.get_or_create(user=request.user, time_period=period, defaults={'score_metric': 0})
        lb.score_metric = (lb.score_metric or 0) + score
        lb.save()

    # Notify via email (dev console backend prints email)
    try:
        # Avoid slow/hanging SMTP calls unless email is configured.
        if request.user.email and getattr(settings, 'EMAIL_HOST', ''):
            send_mail(
                subject=f"Mentara Results: {attempt.exam.title}",
                message=f"You scored {score} out of {total}. Attempt ID: {attempt.id}",
                from_email=None,
                recipient_list=[request.user.email],
                fail_silently=True,
            )
    except Exception:
        pass

    return DRFResponse({'score': score, 'total': total, 'attempt_id': attempt.id}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def resume_attempt(request, attempt_id):
    attempt = get_object_or_404(Attempt, pk=attempt_id, user=request.user)
    answers = {}
    times = {}
    flagged = attempt.metadata.get('flagged', {}) if isinstance(attempt.metadata, dict) else {}
    for resp in Response.objects.filter(attempt=attempt).select_related('question'):
        answers[resp.question_id] = resp.answer_payload
        times[resp.question_id] = resp.time_spent_seconds
    return DRFResponse({'answers': answers, 'times': times, 'flagged': flagged}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def save_attempt(request, attempt_id):
    attempt = get_object_or_404(Attempt, pk=attempt_id, user=request.user)
    qid = request.data.get('question_id')
    payload = request.data.get('answer')
    time_spent = int(request.data.get('time_spent', 0))
    flagged = bool(request.data.get('flagged', False))
    q = get_object_or_404(Question, pk=qid)
    with transaction.atomic():
        resp, _ = Response.objects.get_or_create(attempt=attempt, question=q, defaults={'answer_payload': payload})
        resp.answer_payload = payload
        resp.time_spent_seconds = time_spent
        resp.save()
        meta = attempt.metadata or {}
        flagged_map = meta.get('flagged', {})
        flagged_map[str(qid)] = flagged
        meta['flagged'] = flagged_map
        attempt.metadata = meta
        attempt.save(update_fields=['metadata'])
    return DRFResponse({'status': 'ok'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_create_questions(request):
    """Accept JSON list or CSV file for bulk question creation"""
    import csv
    import io
    
    items = request.data.get('items')
    csv_file = request.FILES.get('csv')
    created = []
    errors = []
    
    # Handle CSV upload
    if csv_file:
        try:
            decoded_file = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))
            
            for row in csv_reader:
                try:
                    topic_id = row.get('topic_id')
                    topic = Topic.objects.get(pk=topic_id)
                    
                    # Parse choices from comma-separated string if needed
                    choices_raw = row.get('choices', '')
                    if isinstance(choices_raw, str):
                        choices_list = [c.strip() for c in choices_raw.split('|')]
                        choices = {chr(65+i): ch for i, ch in enumerate(choices_list)}
                    else:
                        choices = {}
                    
                    # Parse correct answers
                    correct_raw = row.get('correct_answers', '')
                    correct_answers = [c.strip() for c in correct_raw.split('|')] if correct_raw else []
                    
                    q = Question.objects.create(
                        topic=topic,
                        type=row.get('type', 'MCQ'),
                        statement=row.get('statement', ''),
                        choices=choices,
                        correct_answers=correct_answers,
                        difficulty=row.get('difficulty', ''),
                        marks=float(row.get('marks', 1)),
                        estimated_time=int(row.get('estimated_time', 60)),
                        tags=row.get('tags', '').split('|') if row.get('tags') else [],
                    )
                    created.append(q.id)
                except Exception as e:
                    errors.append({'row': row, 'error': str(e)})
            
            return DRFResponse({
                'created_count': len(created),
                'created_ids': created,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return DRFResponse({'error': f'CSV parse error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle JSON list
    if isinstance(items, list):
        for it in items:
            try:
                topic_id = it.get('topic_id')
                topic = get_object_or_404(Topic, pk=topic_id)
                q = Question.objects.create(
                    topic=topic,
                    type=it.get('type','MCQ'),
                    statement=it.get('statement',''),
                    choices=it.get('choices', {}),
                    correct_answers=it.get('correct_answers', []),
                    difficulty=it.get('difficulty',''),
                    marks=float(it.get('marks', 1)),
                    estimated_time=int(it.get('estimated_time', 60)),
                    tags=it.get('tags', []),
                )
                created.append(q.id)
            except Exception as e:
                errors.append({'item': it, 'error': str(e)})
        
        return DRFResponse({
            'created_count': len(created),
            'created_ids': created,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)
    
    return DRFResponse({'error': 'provide items: [] or csv file'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_attempts(request):
    qs = Attempt.objects.filter(user=request.user).select_related('exam').order_by('-created_at')
    data = [
        {
            'id': a.id,
            'exam_id': a.exam_id,
            'exam_title': a.exam.title,
            'status': a.status,
            # Keep legacy key for compatibility
            'score': float(a.total_score or 0),
            'percentage': float(a.percentage or 0),
            'started_at': a.started_at.isoformat(),
            'finished_at': a.finished_at.isoformat() if a.finished_at else None,
            'duration_seconds': int(a.duration_seconds or 0),
        }
        for a in qs
    ]
    return DRFResponse({'attempts': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics_exams_summary(request):
    """Teacher/Admin: summary of attempts by exam (how many attempts, who attempted, last attempted, avg score)."""
    if not _is_teacher_or_admin(request.user):
        return DRFResponse({'detail': 'Only teachers/admins can view exam analytics.'}, status=status.HTTP_403_FORBIDDEN)

    exam_id = request.query_params.get('exam_id')
    qs = Attempt.objects.select_related('exam')
    if exam_id:
        qs = qs.filter(exam_id=exam_id)

    grouped = (
        qs.values('exam_id', 'exam__title')
        .annotate(
            attempts_total=Count('id'),
            attempts_submitted=Count('id', filter=Q(status='submitted')),
            attempts_inprogress=Count('id', filter=Q(status='inprogress')),
            attempts_timedout=Count('id', filter=Q(status='timedout')),
            unique_students=Count('user_id', distinct=True),
            last_attempt_at=Max('started_at'),
            avg_percentage=Avg('percentage', filter=Q(status__in=['submitted', 'timedout'])),
        )
        .order_by('-last_attempt_at')
    )

    data = []
    for row in grouped:
        data.append(
            {
                'exam_id': row['exam_id'],
                'exam_title': row['exam__title'],
                'attempts_total': int(row['attempts_total'] or 0),
                'attempts_submitted': int(row['attempts_submitted'] or 0),
                'attempts_inprogress': int(row['attempts_inprogress'] or 0),
                'attempts_timedout': int(row['attempts_timedout'] or 0),
                'unique_students': int(row['unique_students'] or 0),
                'last_attempt_at': row['last_attempt_at'].isoformat() if row['last_attempt_at'] else None,
                'avg_percentage': round(float(row['avg_percentage'] or 0.0), 2),
            }
        )

    return DRFResponse({'exams': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def review_attempt(request, attempt_id):
    if _is_teacher_or_admin(request.user):
        attempt = get_object_or_404(Attempt, pk=attempt_id)
    else:
        attempt = get_object_or_404(Attempt, pk=attempt_id, user=request.user)
    res = []
    total_marks = 0
    teacher_remarks = {}
    if isinstance(attempt.metadata, dict):
        teacher_remarks = attempt.metadata.get('teacher_remarks', {}) or {}
    for r in Response.objects.filter(attempt=attempt).select_related('question'):
        q_marks = r.teacher_mark if r.teacher_mark is not None else (r.question.marks if r.correct else 0)
        total_marks += r.question.marks
        res.append({
            'response_id': r.id,
            'question_id': r.question_id,
            'statement': r.question.statement,
            'answer': r.answer_payload,
            'correct': r.correct,
            'time_spent': r.time_spent_seconds,
            'marks_obtained': q_marks,
            'total_marks': r.question.marks,
            'teacher_mark': r.teacher_mark,
            'remarks': teacher_remarks.get(str(r.question_id), ''),
        })
    return DRFResponse({
        'responses': res, 
        'score': attempt.total_score, 
        'total': total_marks,
        'percentage': attempt.percentage,
        'exam_title': attempt.exam.title,
        'duration_seconds': attempt.duration_seconds
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics_user_topics(request, user_id=None):
    user = request.user
    # Compute accuracy per topic across submitted attempts
    topic_stats = {}
    reps = Response.objects.filter(attempt__user=user, attempt__status='submitted').select_related('question__topic')
    for r in reps:
        t = r.question.topic
        key = t.id
        ts = topic_stats.setdefault(key, {'topic_id': t.id, 'topic': t.name, 'correct': 0, 'total': 0})
        ts['total'] += 1
        ts['correct'] += 1 if r.correct else 0
    for ts in topic_stats.values():
        ts['accuracy_pct'] = round(100.0 * (ts['correct'] / ts['total']), 2) if ts['total'] else 0.0
    return DRFResponse({'topics': list(topic_stats.values())}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def leaderboard(request):
    period = request.query_params.get('period','weekly')
    qs = LeaderboardEntry.objects.filter(time_period=period).order_by('-score_metric','rank','-created_at')[:100]
    data = []
    rank_counter = 1
    for e in qs:
        data.append({'user_id': e.user_id, 'username': getattr(e.user, 'username', ''), 'score': e.score_metric, 'rank': e.rank or rank_counter})
        rank_counter += 1
    return DRFResponse({'period': period, 'leaders': data}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def grade_response(request, response_id):
    """Teacher grades a structured response"""
    if not _is_teacher_or_admin(request.user):
        return DRFResponse({'detail': 'Only teachers/admins can grade responses.'}, status=status.HTTP_403_FORBIDDEN)
    resp = get_object_or_404(Response, pk=response_id)
    teacher_mark = request.data.get('teacher_mark')
    remarks = request.data.get('remarks', '')
    
    if teacher_mark is not None:
        resp.teacher_mark = float(teacher_mark)
    
    # Store remarks in attempt metadata
    attempt = resp.attempt
    meta = attempt.metadata or {}
    meta.setdefault('teacher_remarks', {})[str(resp.question_id)] = remarks
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])
    
    resp.save()

    # Recompute the attempt score so student/teacher views stay consistent.
    try:
        attempt.calculate_score()
        attempt.calculate_percentile()
    except Exception:
        pass
    return DRFResponse({'status': 'graded', 'teacher_mark': resp.teacher_mark}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_evaluated_pdf(request, attempt_id):
    """Upload evaluated PDF for an attempt"""
    if not _is_teacher_or_admin(request.user):
        return DRFResponse({'detail': 'Only teachers/admins can upload evaluated PDFs.'}, status=status.HTTP_403_FORBIDDEN)
    attempt = get_object_or_404(Attempt, pk=attempt_id)
    pdf_file = request.FILES.get('pdf')
    
    if not pdf_file:
        return DRFResponse({'error': 'pdf file required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # In production, upload to S3; for now, save locally
    from django.core.files.storage import default_storage
    from django.conf import settings
    import os
    
    file_path = f'evaluated_pdfs/{attempt.user_id}/{attempt.id}_{pdf_file.name}'
    saved_path = default_storage.save(file_path, pdf_file)
    
    meta = attempt.metadata or {}
    meta['evaluated_pdf'] = saved_path
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])
    
    return DRFResponse({'status': 'uploaded', 'path': saved_path}, status=status.HTTP_200_OK)
