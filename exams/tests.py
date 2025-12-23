from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Topic, Question, Exam, ExamQuestion, Attempt
from rest_framework.test import APIClient

User = get_user_model()

class ExamFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='pass123')
        self.client.login(username='alice', password='pass123')
        self.topic = Topic.objects.create(name='Mechanics')
        q1 = Question.objects.create(topic=self.topic, type='MCQ', statement='g?', choices={'A':'9.8','B':'10'}, correct_answers=['A'])
        q2 = Question.objects.create(topic=self.topic, type='FIB', statement='symbol?', correct_answers=['g'])
        self.exam = Exam.objects.create(title='Kinematics Test', topic=self.topic, duration_seconds=600)
        ExamQuestion.objects.create(exam=self.exam, question=q1, order=1)
        ExamQuestion.objects.create(exam=self.exam, question=q2, order=2)

    def test_start_and_submit_exam(self):
        start_url = reverse('start_exam', args=[self.exam.id])
        # start_exam endpoint is POST-only (creates an Attempt)
        res = self.client.post(start_url)
        self.assertEqual(res.status_code, 200)
        attempt_id = res.json()['attempt_id']
        submit_url = reverse('submit_exam', args=[self.exam.id])
        payload = {
            'attempt_id': attempt_id,
            'responses': [
                {'question_id': self.exam.exam_questions.all()[0].question_id, 'answer_payload': {'answers':['A']}, 'time_spent_seconds': 12},
                {'question_id': self.exam.exam_questions.all()[1].question_id, 'answer_payload': {'answer':'g'}, 'time_spent_seconds': 7},
            ]
        }
        res2 = self.client.post(submit_url, data=payload, content_type='application/json')
        self.assertEqual(res2.status_code, 200)
        data = res2.json()
        self.assertGreaterEqual(data['score'], 1)
        self.assertEqual(data['attempt_id'], attempt_id)

    def test_start_exam_is_idempotent_for_inprogress_attempt(self):
        start_url = reverse('start_exam', args=[self.exam.id])

        res1 = self.client.post(start_url)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()

        res2 = self.client.post(start_url)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()

        self.assertEqual(data1['attempt_id'], data2['attempt_id'])
        self.assertEqual(data1['expires_at'], data2['expires_at'])

        # Ensure we didn't create a second attempt for the same user+exam.
        self.assertEqual(
            Attempt.objects.filter(user=self.user, exam=self.exam, status='inprogress').count(),
            1,
        )

        # Question order should remain stable across refresh/restart.
        qids1 = [q['id'] for q in data1.get('questions', [])]
        qids2 = [q['id'] for q in data2.get('questions', [])]
        self.assertEqual(qids1, qids2)


class ReviewAndGradingPermissionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.User = get_user_model()

        self.teacher = self.User.objects.create_user(username='t_review', password='pw12345', role='TEACHER')
        self.student_a = self.User.objects.create_user(username='s_review_a', password='pw12345', role='STUDENT')
        self.student_b = self.User.objects.create_user(username='s_review_b', password='pw12345', role='STUDENT')

        self.topic = Topic.objects.create(name='Review Topic')
        q1 = Question.objects.create(
            topic=self.topic,
            type='MCQ',
            statement='What is 2+2?',
            choices={'A': '4', 'B': '5'},
            correct_answers=['A'],
            marks=1,
        )
        q2 = Question.objects.create(
            topic=self.topic,
            type='FIB',
            statement='Symbol for gravity?',
            correct_answers=['g'],
            marks=1,
        )
        self.exam = Exam.objects.create(title='Review Exam', topic=self.topic, duration_seconds=600)
        ExamQuestion.objects.create(exam=self.exam, question=q1, order=1)
        ExamQuestion.objects.create(exam=self.exam, question=q2, order=2)

    def _create_submitted_attempt_for_student_a(self):
        self.client.force_authenticate(user=self.student_a)
        start_url = reverse('start_exam', args=[self.exam.id])
        start_res = self.client.post(start_url)
        self.assertEqual(start_res.status_code, 200)
        attempt_id = start_res.data['attempt_id']

        submit_url = reverse('submit_exam', args=[self.exam.id])
        payload = {
            'attempt_id': attempt_id,
            'responses': [
                {'question_id': self.exam.exam_questions.all()[0].question_id, 'answer_payload': {'answers': ['A']}, 'time_spent_seconds': 1},
                {'question_id': self.exam.exam_questions.all()[1].question_id, 'answer_payload': {'answer': 'g'}, 'time_spent_seconds': 1},
            ]
        }
        submit_res = self.client.post(submit_url, data=payload, format='json')
        self.assertEqual(submit_res.status_code, 200)
        return attempt_id

    def test_teacher_can_review_and_grade_student_attempt(self):
        attempt_id = self._create_submitted_attempt_for_student_a()

        self.client.force_authenticate(user=self.teacher)
        review_url = reverse('review_attempt', args=[attempt_id])
        review_res = self.client.get(review_url)
        self.assertEqual(review_res.status_code, 200)
        self.assertIn('responses', review_res.data)
        self.assertGreaterEqual(len(review_res.data['responses']), 1)

        response_id = review_res.data['responses'][0].get('response_id')
        question_id = review_res.data['responses'][0].get('question_id')
        self.assertIsNotNone(response_id)
        self.assertIsNotNone(question_id)

        grade_url = reverse('grade_response', args=[response_id])
        grade_res = self.client.post(grade_url, data={'teacher_mark': 0.5, 'remarks': 'Checked'}, format='json')
        self.assertEqual(grade_res.status_code, 200)
        self.assertEqual(grade_res.data.get('status'), 'graded')

        # Ensure remarks round-trip via review
        review_res2 = self.client.get(review_url)
        self.assertEqual(review_res2.status_code, 200)
        remarks_by_qid = {str(r['question_id']): r.get('remarks', '') for r in review_res2.data.get('responses', [])}
        self.assertEqual(remarks_by_qid.get(str(question_id)), 'Checked')

    def test_student_cannot_review_or_grade_other_students_attempt(self):
        attempt_id = self._create_submitted_attempt_for_student_a()

        # Different student should not be able to review someone else's attempt
        self.client.force_authenticate(user=self.student_b)
        review_url = reverse('review_attempt', args=[attempt_id])
        review_res = self.client.get(review_url)
        self.assertEqual(review_res.status_code, 404)

        # Different student should not be able to grade responses
        self.client.force_authenticate(user=self.teacher)
        review_as_teacher = self.client.get(review_url)
        response_id = review_as_teacher.data['responses'][0]['response_id']

        self.client.force_authenticate(user=self.student_b)
        grade_url = reverse('grade_response', args=[response_id])
        grade_res = self.client.post(grade_url, data={'teacher_mark': 1, 'remarks': 'nope'}, format='json')
        self.assertEqual(grade_res.status_code, 403)
