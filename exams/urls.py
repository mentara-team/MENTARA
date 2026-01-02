from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CurriculumViewSet, TopicViewSet, QuestionViewSet, ExamViewSet, AttemptViewSet, ResponseViewSet,
    start_exam, submit_exam, resume_attempt, save_attempt,
    bulk_create_questions, my_attempts, review_attempt, analytics_user_topics, leaderboard,
    grade_response, upload_evaluated_pdf, analytics_exams_summary, upload_attempt_submission,
    finalize_attempt_grading
)
from .admin_views import (
    admin_overview, admin_users_list, admin_delete_user, 
    admin_analytics, add_questions_to_exam,
    exam_questions_list, exam_question_remove, exam_questions_reorder
)

router = DefaultRouter()
router.register(r'curriculums', CurriculumViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'exams', ExamViewSet)
router.register(r'attempts', AttemptViewSet)
router.register(r'responses', ResponseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Admin endpoints
    path('admin/overview/', admin_overview, name='admin_overview'),
    path('admin/users/', admin_users_list, name='admin_users_list'),
    path('admin/users/<int:user_id>/', admin_delete_user, name='admin_delete_user'),
    path('admin/analytics/', admin_analytics, name='admin_analytics'),
    path('exams/<int:exam_id>/add-questions/', add_questions_to_exam, name='add_questions_to_exam'),
    path('exams/<int:exam_id>/questions/', exam_questions_list, name='exam_questions_list'),
    path('exams/<int:exam_id>/questions/<int:question_id>/', exam_question_remove, name='exam_question_remove'),
    path('exams/<int:exam_id>/questions/reorder/', exam_questions_reorder, name='exam_questions_reorder'),
    # Student/Teacher endpoints
    path('exams/<int:exam_id>/start/', start_exam, name='start_exam'),
    path('exams/<int:exam_id>/submit/', submit_exam, name='submit_exam'),
    path('attempts/<str:attempt_id>/resume/', resume_attempt, name='resume_attempt'),
    path('attempts/<str:attempt_id>/save/', save_attempt, name='save_attempt'),
    path('questions/bulk/', bulk_create_questions, name='questions_bulk'),
    path('users/me/attempts/', my_attempts, name='my_attempts'),
    path('attempts/<str:attempt_id>/review/', review_attempt, name='review_attempt'),
    path('analytics/user/me/topics/', analytics_user_topics, name='analytics_user_topics'),
    path('analytics/exams/summary/', analytics_exams_summary, name='analytics_exams_summary'),
    path('leaderboard/', leaderboard, name='leaderboard'),
    path('responses/<int:response_id>/grade/', grade_response, name='grade_response'),
    path('attempts/<int:attempt_id>/finalize-grading/', finalize_attempt_grading, name='finalize_attempt_grading'),
    path('attempts/<int:attempt_id>/upload-pdf/', upload_evaluated_pdf, name='upload_evaluated_pdf'),
    path('attempts/<int:attempt_id>/upload-submission/', upload_attempt_submission, name='upload_attempt_submission'),
]
