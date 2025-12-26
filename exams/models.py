from django.db import models
from django.conf import settings
from django.utils import timezone

class TimeStamped(models.Model):
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True


class Curriculum(TimeStamped):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'name']
        indexes = [models.Index(fields=['is_active', 'order'])]

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify

            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Topic(TimeStamped):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=120, blank=True)
    curriculum = models.ForeignKey(
        Curriculum,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='topics',
    )
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    class Meta:
        indexes = [
            models.Index(fields=['curriculum', 'parent', 'order']),
            models.Index(fields=['parent', 'order']),
        ]
        ordering = ['curriculum__id', 'parent__id', 'order', 'name']
    def __str__(self):
        return self.name

QUESTION_TYPES = (
    ('MCQ', 'MCQ'),
    ('MULTI', 'Multi-select'),
    ('FIB', 'Fill-in-blank'),
    ('STRUCT', 'Structured'),
)

class Question(TimeStamped):
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name='questions')
    type = models.CharField(max_length=12, choices=QUESTION_TYPES)
    statement = models.TextField()
    choices = models.JSONField(default=dict, blank=True)  # {A:"",B:"",...}
    correct_answers = models.JSONField(default=list, blank=True)  # ["A"] or payload
    difficulty = models.CharField(max_length=20, blank=True)
    marks = models.FloatField(default=1)
    estimated_time = models.PositiveIntegerField(default=60)  # seconds
    attachments = models.JSONField(default=list, blank=True)  # list of file refs
    tags = models.JSONField(default=list, blank=True)
    image = models.ImageField(upload_to='question_images/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        indexes = [models.Index(fields=['topic','is_active'])]
        ordering = ['id']
    def __str__(self):
        return self.statement[:80]

class Exam(TimeStamped):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name='exams')
    level = models.CharField(max_length=10, blank=True, default='')  # HL/SL or blank
    paper_number = models.PositiveSmallIntegerField(null=True, blank=True)  # 1/2/3 or null
    duration_seconds = models.PositiveIntegerField(default=3600)
    total_marks = models.FloatField(default=0)
    passing_marks = models.FloatField(default=40)
    shuffle_questions = models.BooleanField(default=True)
    visibility = models.CharField(max_length=20, default='PUBLIC')  # PUBLIC/PREMIUM/PRIVATE
    instructions = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return self.title

class ExamQuestion(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='exam_questions')
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    order = models.PositiveIntegerField(default=0)
    marks_override = models.FloatField(null=True, blank=True)
    class Meta:
        unique_together = ('exam','question')
        ordering = ['order']

class Attempt(TimeStamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exams_attempts')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default='inprogress')  # inprogress/submitted/timedout
    total_score = models.FloatField(default=0)
    percentage = models.FloatField(default=0)
    rank = models.IntegerField(null=True, blank=True)
    percentile = models.FloatField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [models.Index(fields=['user', 'exam']), models.Index(fields=['status'])]
    
    def calculate_score(self):
        """Calculate total score from responses"""
        total = sum(r.teacher_mark or (r.question.marks if r.correct else 0) 
                   for r in self.responses.all())
        self.total_score = total
        if self.exam.total_marks > 0:
            self.percentage = (total / self.exam.total_marks) * 100
        self.save()
    
    def calculate_percentile(self):
        """Calculate percentile based on all attempts"""
        all_attempts = Attempt.objects.filter(
            exam=self.exam, 
            status__in=['submitted', 'timedout']
        ).exclude(id=self.id)
        
        if all_attempts.count() > 0:
            lower_scores = all_attempts.filter(total_score__lt=self.total_score).count()
            self.percentile = (lower_scores / all_attempts.count()) * 100
            self.save()

class Response(TimeStamped):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    answer_payload = models.JSONField(default=dict)  # user answer
    correct = models.BooleanField(default=False)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    teacher_mark = models.FloatField(null=True, blank=True)
    teacher_feedback = models.TextField(blank=True)
    flagged_for_review = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['id']
        unique_together = ('attempt', 'question')
    
    def check_answer(self):
        """Auto-grade MCQ and Multi-select questions"""
        if self.question.type in ['MCQ', 'MULTI']:
            user_answer = self.answer_payload.get('answer', [])
            if isinstance(user_answer, str):
                user_answer = [user_answer]
            self.correct = set(user_answer) == set(self.question.correct_answers)
            self.save()

class Badge(TimeStamped):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    criteria_json = models.JSONField(default=dict)

class LeaderboardEntry(TimeStamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    score_metric = models.FloatField(default=0)
    time_period = models.CharField(max_length=20, default='weekly')
    rank = models.PositiveIntegerField(default=0)
    class Meta:
        indexes = [models.Index(fields=['time_period','rank'])]
