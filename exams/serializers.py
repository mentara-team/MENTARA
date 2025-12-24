from rest_framework import serializers
from .models import Topic, Question, Exam, ExamQuestion, Attempt, Response, LeaderboardEntry
from accounts.serializers import UserMinimalSerializer


class TopicSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    exams_count = serializers.SerializerMethodField()
    
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
    level = serializers.SerializerMethodField()  # Extract from title or default
    paper_number = serializers.SerializerMethodField()  # Extract from title or default
    
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
    
    def get_level(self, obj):
        """Extract level from title or return default"""
        title_upper = obj.title.upper()
        if 'HL' in title_upper:
            return 'HL'
        elif 'SL' in title_upper:
            return 'SL'
        return 'SL'  # Default to SL
    
    def get_paper_number(self, obj):
        """Extract paper number from title or return default"""
        import re
        match = re.search(r'paper\s*(\d+)', obj.title, re.IGNORECASE)
        if match:
            return int(match.group(1))
        return 1  # Default to Paper 1


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
