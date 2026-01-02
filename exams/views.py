from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response as DRFResponse
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.db.models import Avg, Count, Exists, Max, OuterRef, Q
from django.utils import timezone
import random
from datetime import timedelta

from .models import Curriculum, Topic, Question, Exam, ExamQuestion, Attempt, Response, LeaderboardEntry
from django.core.mail import send_mail
from .serializers import CurriculumSerializer, TopicSerializer, QuestionSerializer, ExamSerializer, AttemptSerializer, ResponseSerializer


def _attempt_expires_at(attempt: Attempt) -> timezone.datetime | None:
    try:
        dur = int(getattr(getattr(attempt, 'exam', None), 'duration_seconds', 0) or 0)
        if dur <= 0:
            return None
        return attempt.started_at + timedelta(seconds=dur)
    except Exception:
        return None


def _mark_attempt_timedout(attempt: Attempt, expires_at_dt: timezone.datetime | None = None) -> None:
    if expires_at_dt is None:
        expires_at_dt = _attempt_expires_at(attempt)
    if expires_at_dt is None:
        return
    if attempt.status == 'timedout':
        return
    attempt.status = 'timedout'
    attempt.finished_at = expires_at_dt
    try:
        attempt.duration_seconds = int(getattr(getattr(attempt, 'exam', None), 'duration_seconds', 0) or 0)
    except Exception:
        attempt.duration_seconds = int(max(0, (expires_at_dt - attempt.started_at).total_seconds()))
    attempt.save(update_fields=['status', 'finished_at', 'duration_seconds'])


def _attempt_needs_grading(attempt_id: int) -> bool:
    return Response.objects.filter(
        attempt_id=attempt_id,
        question__type='STRUCT',
        teacher_mark__isnull=True,
    ).exists()


def _compute_attempt_rank(attempt: Attempt) -> int | None:
    """Compute rank for an attempt within its exam.

    Rank ordering: higher score first; ties broken by shorter duration, then earlier start, then lower id.
    Excludes attempts that still need STRUCT grading.
    """
    if not attempt or not getattr(attempt, 'exam_id', None):
        return None
    if attempt.status not in ('submitted', 'timedout'):
        return None
    if _attempt_needs_grading(attempt.id):
        return None

    base_qs = Attempt.objects.filter(
        exam_id=attempt.exam_id,
        status__in=['submitted', 'timedout'],
    )
    pending_struct = Response.objects.filter(
        attempt_id=OuterRef('pk'),
        question__type='STRUCT',
        teacher_mark__isnull=True,
    )
    base_qs = base_qs.annotate(needs_grading=Exists(pending_struct)).filter(needs_grading=False)

    better = base_qs.filter(
        Q(total_score__gt=attempt.total_score)
        | Q(total_score=attempt.total_score, duration_seconds__lt=attempt.duration_seconds)
        | Q(
            total_score=attempt.total_score,
            duration_seconds=attempt.duration_seconds,
            started_at__lt=attempt.started_at,
        )
        | Q(
            total_score=attempt.total_score,
            duration_seconds=attempt.duration_seconds,
            started_at=attempt.started_at,
            id__lt=attempt.id,
        )
    ).count()
    return int(better) + 1

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


class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        role = getattr(u, 'role', None)
        return bool(u.is_staff or role == 'ADMIN')


def _is_teacher_or_admin(user):
    if not (user and user.is_authenticated):
        return False
    role = getattr(user, 'role', None)
    return bool(user.is_staff or role in ('ADMIN', 'TEACHER') or user.groups.filter(name__iexact='Teachers').exists())

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.filter(is_active=True).filter(Q(curriculum__isnull=True) | Q(curriculum__is_active=True))
    serializer_class = TopicSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('curriculum', 'parent')
        curriculum_id = self.request.query_params.get('curriculum')
        if curriculum_id:
            qs = qs.filter(curriculum_id=curriculum_id)
        parent_id = self.request.query_params.get('parent')
        if parent_id is not None:
            if parent_id == '' or parent_id.lower() == 'null':
                qs = qs.filter(parent__isnull=True)
            else:
                qs = qs.filter(parent_id=parent_id)
        return qs

    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.AllowAny()]
        return [IsAdminOrTeacher()]

    def perform_create(self, serializer):
        # Enforce the requested rule: Topics must belong to a Curriculum.
        curriculum = serializer.validated_data.get('curriculum')
        if curriculum is None:
            raise ValidationError({'curriculum': 'This field is required.'})
        if getattr(curriculum, 'is_active', True) is False:
            raise ValidationError({'curriculum': 'This curriculum is archived. Restore it before adding topics.'})
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            # Production-safe behavior: if topic is referenced (questions/exams),
            # archive the topic (and its subtree) instead of failing.
            to_archive = [instance.id]
            idx = 0
            while idx < len(to_archive):
                parent_id = to_archive[idx]
                child_ids = list(
                    Topic.objects.filter(parent_id=parent_id, is_active=True).values_list('id', flat=True)
                )
                to_archive.extend([cid for cid in child_ids if cid not in to_archive])
                idx += 1

            Topic.objects.filter(id__in=to_archive).update(is_active=False)
            return DRFResponse(
                {
                    'detail': (
                        'Topic is linked to existing exams/questions, so it was archived instead of deleted.'
                    ),
                    'archived': True,
                },
                status=status.HTTP_200_OK,
            )
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.filter(is_active=True)
    serializer_class = QuestionSerializer
    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrTeacher()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return DRFResponse(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            # Production-safe behavior: if question is referenced (attempts/exams),
            # soft-delete it instead of failing the request.
            if getattr(instance, 'is_active', True):
                instance.is_active = False
                instance.save(update_fields=['is_active'])
            return DRFResponse(
                {
                    'detail': (
                        'Question is linked to existing exams/attempts, so it was archived instead of deleted.'
                    ),
                    'archived': True,
                },
                status=status.HTTP_200_OK,
            )

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.filter(is_active=True)
    serializer_class = ExamSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('topic', 'topic__curriculum')
        qp = self.request.query_params

        topic_id = qp.get('topic')
        if topic_id:
            qs = qs.filter(topic_id=topic_id)

        curriculum_id = qp.get('curriculum')
        if curriculum_id:
            qs = qs.filter(topic__curriculum_id=curriculum_id)

        level = qp.get('level')
        if level:
            qs = qs.filter(level__iexact=level)

        paper_number = qp.get('paper_number')
        if paper_number:
            try:
                qs = qs.filter(paper_number=int(paper_number))
            except Exception:
                pass

        return qs

    def get_permissions(self):
        if self.request.method in ('GET','HEAD','OPTIONS'):
            return [permissions.AllowAny()]
        return [IsAdminOrTeacher()]

    def destroy(self, request, *args, **kwargs):
        """Soft-delete (archive) exams to preserve attempts/history."""
        instance = self.get_object()
        if getattr(instance, 'is_active', True):
            instance.is_active = False
            instance.save(update_fields=['is_active'])
        return DRFResponse(
            {
                'detail': 'Exam archived successfully.',
                'archived': True,
                'id': instance.id,
            },
            status=status.HTTP_200_OK,
        )


class CurriculumViewSet(viewsets.ModelViewSet):
    queryset = Curriculum.objects.all()
    serializer_class = CurriculumSerializer

    def get_queryset(self):
        """List curriculums.

        - Default: only active curriculums.
        - Admin can pass ?include_archived=1 to include archived curriculums.
        """
        qs = Curriculum.objects.all()
        include_archived = (self.request.query_params.get('include_archived') or '').strip().lower() in (
            '1',
            'true',
            'yes',
        )
        user = getattr(self.request, 'user', None)
        is_admin = bool(
            user
            and user.is_authenticated
            and (getattr(user, 'is_staff', False) or getattr(user, 'role', None) == 'ADMIN')
        )
        if is_admin and include_archived:
            return qs
        return qs.filter(is_active=True)

    def get_object(self):
        """Allow admins to access archived curriculums for restore/purge actions."""
        user = getattr(self.request, 'user', None)
        is_admin = bool(
            user
            and user.is_authenticated
            and (getattr(user, 'is_staff', False) or getattr(user, 'role', None) == 'ADMIN')
        )
        base_qs = Curriculum.objects.all() if is_admin else self.get_queryset()
        return get_object_or_404(base_qs, pk=self.kwargs.get('pk'))

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [permissions.AllowAny()]
        return [IsAdminOnly()]

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def tree(self, request, pk=None):
        """Return folder-like navigation: top-level topics for this curriculum, with nested children."""
        curriculum = self.get_object()
        roots = Topic.objects.filter(is_active=True, curriculum=curriculum, parent__isnull=True).select_related('curriculum')
        data = TopicSerializer(roots, many=True).data
        return DRFResponse({'curriculum': CurriculumSerializer(curriculum).data, 'roots': data})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore an archived curriculum (sets is_active=True)."""
        instance = self.get_object()
        if getattr(instance, 'is_active', True):
            return DRFResponse(
                {
                    'detail': 'Curriculum is already active.',
                    'restored': False,
                    'id': instance.id,
                },
                status=status.HTTP_200_OK,
            )
        instance.is_active = True
        instance.save(update_fields=['is_active'])
        return DRFResponse(
            {
                'detail': 'Curriculum restored successfully.',
                'restored': True,
                'id': instance.id,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """Soft-delete (archive) curriculums.

        Hard-deleting is unsafe because Topics reference Curriculum via PROTECT.
        Archiving removes it from active lists while preserving referential integrity.
        """
        instance = self.get_object()
        if getattr(instance, 'is_active', True):
            instance.is_active = False
            instance.save(update_fields=['is_active'])
        return DRFResponse(
            {
                'detail': 'Curriculum archived successfully.',
                'archived': True,
                'id': instance.id,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['delete'], url_path='purge')
    def purge(self, request, pk=None):
        """Permanently delete a curriculum.

        Default behavior is safe: if the curriculum is referenced, return 409.
        Use ?force=1 to delete ALL content under this curriculum (topics/questions/exams/attempts).

        Note: force deletion is refused if questions under this curriculum are used outside it.
        """
        instance = self.get_object()
        force = (request.query_params.get('force') or '').strip().lower() in ('1', 'true', 'yes')
        keep_shared = (request.query_params.get('keep_shared') or '').strip().lower() in ('1', 'true', 'yes')

        if not force:
            try:
                curriculum_id = instance.id
                instance.delete()
                return DRFResponse(
                    {
                        'detail': 'Curriculum permanently deleted.',
                        'deleted': True,
                        'forced': False,
                        'id': curriculum_id,
                    },
                    status=status.HTTP_200_OK,
                )
            except ProtectedError:
                return DRFResponse(
                    {
                        'detail': (
                            'Cannot permanently delete this curriculum because it has related content. '
                            'Archive it instead, or use ?force=1 to delete all content under it.'
                        ),
                        'deleted': False,
                        'forced': False,
                        'id': instance.id,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        with transaction.atomic():
            topic_ids = list(Topic.objects.filter(curriculum=instance).values_list('id', flat=True))
            question_ids = list(Question.objects.filter(topic_id__in=topic_ids).values_list('id', flat=True))

            outside_exam_qids = list(
                ExamQuestion.objects.filter(question_id__in=question_ids)
                .exclude(exam__topic__curriculum=instance)
                .values_list('question_id', flat=True)
                .distinct()
            )
            outside_resp_qids = list(
                Response.objects.filter(question_id__in=question_ids)
                .exclude(attempt__exam__topic__curriculum=instance)
                .values_list('question_id', flat=True)
                .distinct()
            )
            shared_question_ids = sorted(set(outside_exam_qids) | set(outside_resp_qids))
            used_outside = len(shared_question_ids) > 0

            moved_shared = 0
            if used_outside and keep_shared:
                shared_curriculum, _ = Curriculum.objects.get_or_create(
                    name='__Shared Question Pool__',
                    defaults={'description': 'System: Holds questions shared across curriculums.', 'order': 9999, 'is_active': True},
                )
                shared_topic, _ = Topic.objects.get_or_create(
                    curriculum=shared_curriculum,
                    parent=None,
                    name='Shared Questions',
                    defaults={'description': 'System: Questions moved here to preserve history.', 'icon': '🗂️', 'order': 0, 'is_active': True},
                )
                moved_shared = Question.objects.filter(id__in=shared_question_ids).update(topic=shared_topic)
                question_ids = [qid for qid in question_ids if qid not in set(shared_question_ids)]

            if used_outside and not keep_shared:
                return DRFResponse(
                    {
                        'detail': (
                            'Cannot force-delete this curriculum because one or more of its questions are '
                            'used in exams/attempts outside this curriculum. Unlink them first, or call purge '
                            'with keep_shared=1 to keep those questions and delete the curriculum.'
                        ),
                        'deleted': False,
                        'forced': True,
                        'keep_shared': False,
                        'shared_questions': len(shared_question_ids),
                        'id': instance.id,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            exam_ids = list(Exam.objects.filter(topic_id__in=topic_ids).values_list('id', flat=True))

            attempts_deleted = Attempt.objects.filter(exam_id__in=exam_ids).delete()[0]
            exams_deleted = Exam.objects.filter(id__in=exam_ids).delete()[0]
            questions_deleted = Question.objects.filter(id__in=question_ids).delete()[0]
            topics_deleted = Topic.objects.filter(id__in=topic_ids).delete()[0]
            curriculum_id = instance.id
            instance.delete()

        return DRFResponse(
            {
                'detail': 'Curriculum permanently deleted (forced).',
                'deleted': True,
                'forced': True,
                'id': curriculum_id,
                'counts': {
                    'attempts': attempts_deleted,
                    'exams': exams_deleted,
                    'questions': questions_deleted,
                    'topics': topics_deleted,
                    'questions_moved_to_shared_pool': moved_shared,
                },
            },
            status=status.HTTP_200_OK,
        )

class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.all()
    serializer_class = AttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().select_related('user', 'exam', 'exam__topic', 'exam__topic__curriculum')
        qp = self.request.query_params

        # Non-admin/teacher can only see their attempts.
        if not _is_teacher_or_admin(self.request.user):
            qs = qs.filter(user=self.request.user)

        topic_id = qp.get('topic')
        if topic_id:
            qs = qs.filter(exam__topic_id=topic_id)

        curriculum_id = qp.get('curriculum')
        if curriculum_id:
            qs = qs.filter(exam__topic__curriculum_id=curriculum_id)

        level = qp.get('level')
        if level:
            qs = qs.filter(exam__level__iexact=level)

        paper_number = qp.get('paper_number')
        if paper_number:
            try:
                qs = qs.filter(exam__paper_number=int(paper_number))
            except Exception:
                pass

        # Convenience: completed=1 returns submitted + timedout (i.e., "appeared")
        completed = (qp.get('completed') or '').strip().lower()
        if completed in ('1', 'true', 'yes'):
            qs = qs.filter(status__in=['submitted', 'timedout'])

        status_param = (qp.get('status') or '').strip()
        if status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            if statuses:
                qs = qs.filter(status__in=statuses)

        # needs_grading=1 returns attempts that still have at least one STRUCT response
        # without a teacher_mark.
        needs_grading = (qp.get('needs_grading') or '').strip().lower()
        if needs_grading in ('1', 'true', 'yes'):
            qs = qs.filter(
                responses__question__type='STRUCT',
                responses__teacher_mark__isnull=True,
            ).distinct()

        return qs

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
    exam = get_object_or_404(Exam.objects.select_related('topic__curriculum'), pk=exam_id, is_active=True)
    now = timezone.now()

    # Enforce: one exam can only be attempted once per student.
    # If already submitted/timedout, do not allow a new attempt.
    completed = (
        Attempt.objects.filter(user=request.user, exam=exam, status__in=['submitted', 'timedout'])
        .order_by('-finished_at', '-started_at')
        .first()
    )
    if completed:
        return DRFResponse(
            {
                'detail': 'This exam has already been attempted and submitted.',
                'attempt_id': completed.id,
                'status': completed.status,
            },
            status=status.HTTP_409_CONFLICT,
        )

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
        # IMPORTANT: if older buggy behavior created multiple in-progress attempts,
        # always resume the earliest start time so refresh cannot "reset" the timer.
        inprogress = list(
            Attempt.objects.select_for_update()
            .filter(user=request.user, exam=exam, status='inprogress')
            .order_by('started_at')
        )

        if inprogress:
            attempt = inprogress[0]
            # Close out any newer duplicates created previously (defensive cleanup).
            for dup in inprogress[1:]:
                dup.status = 'timedout'
                dup.finished_at = now
                dup.duration_seconds = int(max(0, (now - dup.started_at).total_seconds()))
                dup.save(update_fields=['status', 'finished_at', 'duration_seconds'])
        else:
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
        raw_question_order = meta.get('question_order')

        def _normalize_question_order(raw) -> list[int]:
            if not isinstance(raw, list):
                return []
            normalized: list[int] = []
            seen: set[int] = set()
            for item in raw:
                try:
                    qid = int(item)
                except Exception:
                    continue
                if qid in seen:
                    continue
                seen.add(qid)
                normalized.append(qid)
            return normalized

        question_order = _normalize_question_order(raw_question_order)
        if not question_order:
            question_order = _pick_question_ids_for_exam()
            meta['question_order'] = question_order
            attempt.metadata = meta
            attempt.save(update_fields=['metadata'])

        # Store a snapshot of "what the student is attempting" for professional display
        # and for historical records (even if topics/curriculums get archived later).
        try:
            snapshot = {
                'exam_id': exam.id,
                'exam_title': exam.title,
                'level': exam.level,
                'paper_number': exam.paper_number,
                'topic_id': getattr(exam.topic, 'id', None),
                'topic_name': getattr(exam.topic, 'name', None),
                'curriculum_id': getattr(getattr(exam.topic, 'curriculum', None), 'id', None),
                'curriculum_name': getattr(getattr(exam.topic, 'curriculum', None), 'name', None),
            }
            meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
            meta['exam_snapshot'] = snapshot
            attempt.metadata = meta
            attempt.save(update_fields=['metadata'])
        except Exception:
            pass

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
        {
            'attempt_id': attempt.id,
            'expires_at': expires_at,
            'questions': questions,
            'exam': {
                'id': exam.id,
                'title': exam.title,
                'level': exam.level,
                'paper_number': exam.paper_number,
                'duration_seconds': exam.duration_seconds,
                'total_marks': exam.total_marks,
                'passing_marks': exam.passing_marks,
                'topic_id': getattr(exam.topic, 'id', None),
                'topic_name': getattr(exam.topic, 'name', None),
                'curriculum_id': getattr(getattr(exam.topic, 'curriculum', None), 'id', None),
                'curriculum_name': getattr(getattr(exam.topic, 'curriculum', None), 'name', None),
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_exam(request, exam_id):
    attempt_id = request.data.get('attempt_id')
    attempt = get_object_or_404(Attempt, pk=attempt_id, user=request.user, exam_id=exam_id)
    responses = request.data.get('responses', [])  # [{question_id, answer_payload, time_spent_seconds}]

    now = timezone.now()
    expires_at_dt = _attempt_expires_at(attempt)
    grace_seconds = 10
    is_late = bool(expires_at_dt and now > (expires_at_dt + timedelta(seconds=grace_seconds)))

    # Idempotency: if the attempt is already submitted, return stored score.
    # This prevents duplicate submits (e.g. user double-click, retry after timeout)
    # from raising IntegrityError on the unique (attempt, question) constraint.
    if attempt.status in ('submitted', 'timedout'):
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

    # If the attempt is already past the deadline (beyond a small grace window),
    # do not accept new responses. Mark as timed out and return.
    if is_late:
        _mark_attempt_timedout(attempt, expires_at_dt)
        return DRFResponse(
            {
                'detail': 'Attempt timed out. Submission window has ended.',
                'attempt_id': attempt.id,
            },
            status=status.HTTP_410_GONE,
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

        # If within grace but technically past time, treat as timed out submission.
        if expires_at_dt and now >= expires_at_dt:
            attempt.finished_at = expires_at_dt
            attempt.duration_seconds = int(getattr(attempt.exam, 'duration_seconds', 0) or 0)
            attempt.status = 'timedout'
        else:
            attempt.finished_at = now
            attempt.duration_seconds = int((attempt.finished_at - attempt.started_at).total_seconds())
            attempt.status = 'submitted'

        attempt.total_score = score
        attempt.percentage = round((float(score) / float(total)) * 100.0, 2) if total else 0.0
        attempt.save(update_fields=['finished_at', 'duration_seconds', 'status', 'total_score', 'percentage'])

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
                subject=f"Mentara Results: {(getattr(getattr(attempt, 'exam', None), 'title', None) or 'Exam')}",
                message=f"You scored {score} out of {total}. Attempt ID: {attempt.id}",
                from_email=None,
                recipient_list=[request.user.email],
                fail_silently=True,
            )
    except Exception:
        pass

    # Compute rank immediately for non-teacher-graded attempts.
    rank = None
    try:
        rank = _compute_attempt_rank(attempt)
        attempt.rank = rank
        attempt.save(update_fields=['rank'])
    except Exception:
        rank = None

    return DRFResponse({'score': score, 'total': total, 'attempt_id': attempt.id, 'rank': rank}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def finalize_attempt_grading(request, attempt_id):
    """Finalize teacher grading for an attempt.

    After finalization, grades become read-only.
    """
    if not _is_teacher_or_admin(request.user):
        return DRFResponse({'detail': 'Only teachers/admins can finalize grading.'}, status=status.HTTP_403_FORBIDDEN)

    attempt = get_object_or_404(Attempt, pk=attempt_id)
    meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    if meta.get('grades_finalized') is True:
        return DRFResponse({'detail': 'Grades are already finalized.'}, status=status.HTTP_409_CONFLICT)

    if _attempt_needs_grading(attempt.id):
        return DRFResponse({'detail': 'Cannot finalize: some structured questions are ungraded.'}, status=status.HTTP_400_BAD_REQUEST)

    total_marks = 0.0
    total_score = 0.0
    for r in Response.objects.filter(attempt=attempt).select_related('question'):
        total_marks += float(r.question.marks or 0)
        q_score = r.teacher_mark if r.teacher_mark is not None else (float(r.question.marks or 0) if r.correct else 0.0)
        total_score += float(q_score or 0.0)

    attempt.total_score = float(total_score)
    attempt.percentage = round((float(total_score) / float(total_marks)) * 100.0, 2) if total_marks else 0.0
    attempt.save(update_fields=['total_score', 'percentage'])

    meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    meta['grades_finalized'] = True
    meta['graded_by'] = getattr(request.user, 'id', None)
    meta['graded_at'] = timezone.now().isoformat()
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])

    # Compute and store rank now that grading is complete.
    try:
        rank = _compute_attempt_rank(attempt)
        attempt.rank = rank
        attempt.save(update_fields=['rank'])
    except Exception:
        pass

    return DRFResponse({'detail': 'Grades finalized.', 'attempt_id': attempt.id, 'rank': attempt.rank}, status=status.HTTP_200_OK)

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
    expires_at_dt = _attempt_expires_at(attempt)
    if expires_at_dt and timezone.now() >= expires_at_dt:
        _mark_attempt_timedout(attempt, expires_at_dt)
        return DRFResponse({'detail': 'Attempt timed out.'}, status=status.HTTP_410_GONE)
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
    needs_grading_sq = Response.objects.filter(
        attempt_id=OuterRef('pk'),
        question__type='STRUCT',
        teacher_mark__isnull=True,
    )
    requires_teacher_grading_sq = Response.objects.filter(
        attempt_id=OuterRef('pk'),
        question__type='STRUCT',
    )

    qs = (
        Attempt.objects.filter(user=request.user)
        .select_related('exam', 'exam__topic', 'exam__topic__curriculum')
        .annotate(
            needs_grading=Exists(needs_grading_sq),
            requires_teacher_grading=Exists(requires_teacher_grading_sq),
        )
        .order_by('-created_at')
    )
    data = [
        {
            'id': a.id,
            'exam_id': a.exam_id,
            'exam_title': a.exam.title,
            'topic_name': (getattr(getattr(a.exam, 'topic', None), 'name', None) or (a.metadata or {}).get('exam_snapshot', {}).get('topic_name')),
            'curriculum_name': (
                getattr(getattr(getattr(a.exam, 'topic', None), 'curriculum', None), 'name', None)
                or (a.metadata or {}).get('exam_snapshot', {}).get('curriculum_name')
            ),
            'status': a.status,
            'requires_teacher_grading': bool(getattr(a, 'requires_teacher_grading', False)),
            'needs_grading': bool(getattr(a, 'needs_grading', False)),
            # Keep legacy key for compatibility
            'score': float(a.total_score or 0),
            'percentage': float(a.percentage or 0),
            'rank': a.rank,
            'percentile': a.percentile,
            'exam_snapshot': (a.metadata or {}).get('exam_snapshot', {}) if isinstance(a.metadata, dict) else {},
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
    requires_teacher_grading = False
    needs_grading = False
    student_uploads = []
    evaluated_pdf = None
    evaluated_pdf_url = None
    snapshot = {}
    grades_finalized = False
    if isinstance(attempt.metadata, dict):
        teacher_remarks = attempt.metadata.get('teacher_remarks', {}) or {}
        student_uploads = attempt.metadata.get('student_uploads', []) or []
        evaluated_pdf = attempt.metadata.get('evaluated_pdf')
        evaluated_pdf_url = attempt.metadata.get('evaluated_pdf_url')
        snapshot = attempt.metadata.get('exam_snapshot', {}) or {}
        grades_finalized = bool(attempt.metadata.get('grades_finalized', False))

    # Normalize upload URLs for the frontend.
    # FileSystemStorage saves paths like "answer_uploads/..." but URLs are served under MEDIA_URL ("/media/").
    from django.core.files.storage import default_storage

    def _file_url(path_or_url: str | None):
        if not path_or_url or not isinstance(path_or_url, str):
            return None
        if path_or_url.startswith('http://') or path_or_url.startswith('https://'):
            return path_or_url
        # If already a URL-like path (e.g. /media/...), keep it.
        if path_or_url.startswith('/'):
            return path_or_url
        try:
            return default_storage.url(path_or_url)
        except Exception:
            return path_or_url

    normalized_uploads = []
    for u in (student_uploads or []):
        if not isinstance(u, dict):
            continue
        p = u.get('path')
        normalized_uploads.append({
            **u,
            'url': u.get('url') or _file_url(p),
        })

    if evaluated_pdf and not evaluated_pdf_url:
        evaluated_pdf_url = _file_url(evaluated_pdf)
    for r in Response.objects.filter(attempt=attempt).select_related('question'):
        q_type = getattr(r.question, 'type', None)
        is_struct = q_type == 'STRUCT'
        if is_struct:
            requires_teacher_grading = True
            if r.teacher_mark is None:
                needs_grading = True

        # For STRUCT responses, don't show an auto-correct/incorrect flag in the API.
        # The actual evaluation happens via teacher marks + uploaded submission.
        display_correct = None if is_struct else r.correct
        # The stored payload for STRUCT is usually {answer: null}; avoid confusing UI output.
        display_answer = None if is_struct else r.answer_payload

        q_marks = r.teacher_mark if r.teacher_mark is not None else (r.question.marks if r.correct else 0)
        total_marks += r.question.marks
        res.append({
            'response_id': r.id,
            'question_id': r.question_id,
            'statement': r.question.statement,
            'question_type': q_type,
            'answer': display_answer,
            'correct': display_correct,
            'time_spent': r.time_spent_seconds,
            'marks_obtained': q_marks,
            'total_marks': r.question.marks,
            'teacher_mark': r.teacher_mark,
            'remarks': teacher_remarks.get(str(r.question_id), ''),
        })

    missing_submission_upload = bool(requires_teacher_grading and not (normalized_uploads or []))

    exam_title = None
    topic_name = None
    curriculum_name = None
    try:
        if getattr(attempt, 'exam', None) is not None:
            exam_title = attempt.exam.title
            topic_name = getattr(getattr(attempt.exam, 'topic', None), 'name', None)
            curriculum_name = getattr(getattr(getattr(attempt.exam, 'topic', None), 'curriculum', None), 'name', None)
    except Exception:
        pass
    if not exam_title:
        exam_title = snapshot.get('exam_title')
    if not topic_name:
        topic_name = snapshot.get('topic_name')
    if not curriculum_name:
        curriculum_name = snapshot.get('curriculum_name')

    return DRFResponse({
        'responses': res, 
        'score': attempt.total_score, 
        'total': total_marks,
        'percentage': attempt.percentage,
        'requires_teacher_grading': requires_teacher_grading,
        'needs_grading': needs_grading,
        'student_uploads': normalized_uploads,
        'evaluated_pdf': evaluated_pdf,
        'evaluated_pdf_url': evaluated_pdf_url,
        'missing_submission_upload': missing_submission_upload,
        'exam_title': exam_title,
        'topic_name': topic_name,
        'curriculum_name': curriculum_name,
        'duration_seconds': attempt.duration_seconds,
        'rank': attempt.rank,
        'percentile': attempt.percentile,
        'grades_finalized': grades_finalized,
        'exam_snapshot': snapshot,
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
    from datetime import timedelta
    from django.db.models import Avg, Count, Exists, OuterRef, Sum

    raw_period = (request.query_params.get('period') or 'weekly').strip().lower()
    if raw_period in ('all-time', 'all_time', 'alltime', 'all'):
        period = 'all-time'
    elif raw_period in ('daily', 'today'):
        period = 'daily'
    else:
        period = 'weekly'

    now = timezone.now()
    attempts_qs = Attempt.objects.filter(status__in=['submitted', 'timedout']).select_related('user')
    if period == 'daily':
        start = now - timedelta(days=1)
        attempts_qs = attempts_qs.filter(finished_at__gte=start)
    elif period == 'weekly':
        start = now - timedelta(days=7)
        attempts_qs = attempts_qs.filter(finished_at__gte=start)

    pending_struct = Response.objects.filter(
        attempt_id=OuterRef('pk'),
        question__type='STRUCT',
        teacher_mark__isnull=True,
    )
    attempts_qs = attempts_qs.annotate(needs_grading=Exists(pending_struct)).filter(needs_grading=False)

    grouped = (
        attempts_qs.values('user_id', 'user__username')
        .annotate(
            tests_completed=Count('id'),
            avg_percentage=Avg('percentage'),
            total_score=Sum('total_score'),
        )
        .order_by('-avg_percentage', '-tests_completed', '-total_score', 'user_id')
    )

    rankings = []
    leaders = []
    user_rank = None

    for idx, row in enumerate(grouped[:100], start=1):
        score_pct = round(float(row.get('avg_percentage') or 0.0), 2)
        tests_completed = int(row.get('tests_completed') or 0)
        username = row.get('user__username') or ''
        entry = {
            'user_id': row.get('user_id'),
            'name': username,
            'username': username,
            'score': score_pct,
            'tests_completed': tests_completed,
            'rank': idx,
        }
        rankings.append(entry)
        # Backward-compatible shape
        leaders.append({'user_id': entry['user_id'], 'username': username, 'score': score_pct, 'rank': idx})

    if getattr(request, 'user', None) is not None and request.user.is_authenticated:
        try:
            for entry in rankings:
                if entry.get('user_id') == request.user.id:
                    user_rank = {
                        'user_id': entry.get('user_id'),
                        'name': entry.get('name'),
                        'score': entry.get('score'),
                        'tests_completed': entry.get('tests_completed'),
                        'rank': entry.get('rank'),
                    }
                    break
        except Exception:
            user_rank = None

    return DRFResponse(
        {
            'period': period,
            'leaders': leaders,
            'rankings': rankings,
            'user_rank': user_rank,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_attempt_submission(request, attempt_id):
    """Student (or teacher/admin) uploads submission files for an attempt."""
    attempt = get_object_or_404(Attempt, pk=attempt_id)

    is_privileged = _is_teacher_or_admin(request.user)
    if not is_privileged and attempt.user_id != request.user.id:
        return DRFResponse({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

    # Enforce deadline for student uploads.
    if not is_privileged:
        expires_at_dt = _attempt_expires_at(attempt)
        if expires_at_dt and timezone.now() >= expires_at_dt:
            _mark_attempt_timedout(attempt, expires_at_dt)
            return DRFResponse({'detail': 'Attempt timed out. Upload window has ended.'}, status=status.HTTP_410_GONE)

    files = request.FILES.getlist('files')
    if not files:
        f = request.FILES.get('file')
        if f:
            files = [f]
    if not files:
        return DRFResponse({'detail': 'No files uploaded. Use multipart field "files".'}, status=status.HTTP_400_BAD_REQUEST)

    from django.core.files.storage import default_storage
    import os

    meta = attempt.metadata or {}
    uploads = meta.get('student_uploads', []) or []

    for uploaded in files:
        base, ext = os.path.splitext(uploaded.name or '')
        ext = (ext or '').lower()
        safe_name = f"{base[:80]}{ext}" if base else f"upload{ext}"
        file_path = f"answer_uploads/{attempt.user_id}/{attempt.id}/{timezone.now().strftime('%Y%m%d%H%M%S')}_{safe_name}"
        saved_path = default_storage.save(file_path, uploaded)
        url = None
        try:
            url = default_storage.url(saved_path)
        except Exception:
            url = None
        uploads.append(
            {
                'name': uploaded.name,
                'path': saved_path,
                'url': url,
                'uploaded_at': timezone.now().isoformat(),
            }
        )

    meta['student_uploads'] = uploads
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])

    return DRFResponse({'status': 'uploaded', 'student_uploads': uploads}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def grade_response(request, response_id):
    """Teacher grades a structured response"""
    if not _is_teacher_or_admin(request.user):
        return DRFResponse({'detail': 'Only teachers/admins can grade responses.'}, status=status.HTTP_403_FORBIDDEN)
    resp = get_object_or_404(Response, pk=response_id)

    attempt = resp.attempt
    meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    if meta.get('grades_finalized') is True:
        return DRFResponse({'detail': 'Grades have been finalized and cannot be edited.'}, status=status.HTTP_409_CONFLICT)
    teacher_mark = request.data.get('teacher_mark')
    remarks = request.data.get('remarks', '')
    
    if teacher_mark is not None:
        # Accept number or numeric-string. Empty string should behave like "not provided".
        if isinstance(teacher_mark, str) and teacher_mark.strip() == '':
            teacher_mark = None
        if teacher_mark is not None:
            try:
                resp.teacher_mark = float(teacher_mark)
            except Exception:
                return DRFResponse({'detail': 'Invalid teacher_mark. Must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

            # Enforce bounds for structured marking.
            try:
                max_marks = float(resp.question.marks)
            except Exception:
                max_marks = None
            if resp.teacher_mark is not None:
                if resp.teacher_mark < 0:
                    return DRFResponse({'detail': 'teacher_mark cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
                if max_marks is not None and resp.teacher_mark > max_marks:
                    return DRFResponse({'detail': f'teacher_mark cannot exceed {max_marks}.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Store remarks in attempt metadata
    meta = attempt.metadata if isinstance(attempt.metadata, dict) else {}
    meta.setdefault('teacher_remarks', {})[str(resp.question_id)] = remarks
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])
    
    resp.save()

    # Recompute the attempt score so student/teacher views stay consistent.
    # (Do not finalize rank here; rank becomes stable only after finalization.)
    try:
        total_marks = 0.0
        total_score = 0.0
        for r in Response.objects.filter(attempt=attempt).select_related('question'):
            total_marks += float(r.question.marks or 0)
            q_score = r.teacher_mark if r.teacher_mark is not None else (float(r.question.marks or 0) if r.correct else 0.0)
            total_score += float(q_score or 0.0)
        attempt.total_score = float(total_score)
        attempt.percentage = round((float(total_score) / float(total_marks)) * 100.0, 2) if total_marks else 0.0
        attempt.rank = None
        attempt.save(update_fields=['total_score', 'percentage', 'rank'])
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
    url = None
    try:
        url = default_storage.url(saved_path)
    except Exception:
        url = None
    
    meta = attempt.metadata or {}
    meta['evaluated_pdf'] = saved_path
    meta['evaluated_pdf_url'] = url
    attempt.metadata = meta
    attempt.save(update_fields=['metadata'])
    
    return DRFResponse({'status': 'uploaded', 'path': saved_path, 'url': url}, status=status.HTTP_200_OK)
