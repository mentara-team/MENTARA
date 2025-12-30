from rest_framework import serializers
from .models import Curriculum, Topic, Question, Exam, ExamQuestion, Attempt, Response, LeaderboardEntry
from accounts.serializers import UserMinimalSerializer


class CurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curriculum
        fields = '__all__'


class TopicSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()
    curriculum_name = serializers.CharField(source='curriculum.name', read_only=True)
    
    class Meta:
        model = Topic
        fields = '__all__'
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return TopicSerializer(children, many=True).data
    
    def get_questions_count(self, obj):
        return obj.questions.filter(is_active=True).count()
    
    def get_exams_count(self, obj):
        return obj.exams.filter(is_active=True).count()


class QuestionSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    
    class Meta:
        model = Question
        fields = '__all__'


class QuestionDetailSerializer(serializers.ModelSerializer):
    """For test-taking - hides correct answers"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    
    class Meta:
        model = Question
        exclude = ['correct_answers']


class ExamQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    question_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = ExamQuestion
        fields = '__all__'


class ExamSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    questions_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()  # Alias for frontend compatibility
    attempts_count = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()  # Alias for frontend compatibility
    duration = serializers.SerializerMethodField()  # Convert seconds to minutes
    
    class Meta:
        model = Exam
        fields = '__all__'
    
    def get_questions_count(self, obj):
        count = obj.exam_questions.count()
        return count
    
    def get_question_count(self, obj):
        return self.get_questions_count(obj)
    
    def get_attempts_count(self, obj):
        return obj.attempts.filter(status__in=['submitted', 'timedout']).count()
    
    def get_attempt_count(self, obj):
        return self.get_attempts_count(obj)
    
    def get_duration(self, obj):
        """Convert duration_seconds to minutes"""
        return obj.duration_seconds // 60

    def validate(self, attrs):
        # level is a non-null CharField in the model (blank allowed). Some clients
        # may send null when curriculum is non-IB; normalize that to ''.
        if attrs.get('level', serializers.empty) is None:
            attrs['level'] = ''

        # paper_number can be null; normalize empty-string to null.
        if attrs.get('paper_number', serializers.empty) == '':
            attrs['paper_number'] = None
        return attrs

    # Back-compat: legacy data stored level/paper in title. Prefer explicit fields.
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('level'):
            title_upper = (instance.title or '').upper()
            if 'HL' in title_upper:
                data['level'] = 'HL'
            elif 'SL' in title_upper:
                data['level'] = 'SL'
        if not data.get('paper_number'):
            import re

            match = re.search(r'paper\s*(\d+)', instance.title or '', re.IGNORECASE)
            if match:
                try:
                    data['paper_number'] = int(match.group(1))
                except Exception:
                    pass
        return data


class ExamDetailSerializer(serializers.ModelSerializer):
    exam_questions = ExamQuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    
    class Meta:
        model = Exam
        fields = '__all__'


class ResponseSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    question_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Response
        fields = '__all__'
        read_only_fields = ['correct', 'teacher_mark', 'teacher_feedback']


class AttemptSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Attempt
        fields = '__all__'
        read_only_fields = ['total_score', 'percentage', 'rank', 'percentile']


class AttemptDetailSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    exam = ExamDetailSerializer(read_only=True)
    responses = ResponseSerializer(many=True, read_only=True)
    
    class Meta:
        model = Attempt
        fields = '__all__'


class AttemptStartSerializer(serializers.Serializer):
    """For starting a new attempt"""
    exam_id = serializers.IntegerField()


class SubmitAnswerSerializer(serializers.Serializer):
    """For submitting/saving individual answer"""
    question_id = serializers.IntegerField()
    answer_payload = serializers.JSONField()
    time_spent_seconds = serializers.IntegerField(default=0)
    flagged_for_review = serializers.BooleanField(default=False)


class LeaderboardSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = LeaderboardEntry
        fields = '__all__'
