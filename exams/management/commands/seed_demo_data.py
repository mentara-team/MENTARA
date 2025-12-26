"""
Management command to seed the database with sample data for demo purposes.
Usage: python manage.py seed_demo_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from exams.models import Curriculum, Topic, Exam, Question, Attempt, Response
from accounts.models import CustomUser
import random
from datetime import datetime, timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds database with demo data for client presentation'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🌱 Starting database seeding...'))
        
        # Create demo users
        self.create_users()
        
        # Create topics
        self.create_topics()
        
        # Create exams and questions
        self.create_exams_and_questions()
        
        # Create sample attempts
        self.create_sample_attempts()
        
        self.stdout.write(self.style.SUCCESS('✅ Database seeded successfully!'))
        self.stdout.write(self.style.SUCCESS('\n📋 Demo Accounts:'))
        self.stdout.write(self.style.SUCCESS('   Student: student@demo.com / Demo@123'))
        self.stdout.write(self.style.SUCCESS('   Teacher: teacher@demo.com / Demo@123'))
        self.stdout.write(self.style.SUCCESS('   Admin: admin@demo.com / Admin@123'))

    def create_users(self):
        self.stdout.write('Creating demo users...')
        
        # Create admin (only if doesn't exist)
        if not User.objects.filter(email='admin@demo.com').exists():
            User.objects.create_superuser(
                email='admin@demo.com',
                password='Admin@123',
                username='admin_demo',
                first_name='Admin',
                last_name='Demo',
                grade='Staff'
            )
        
        # Create teacher
        if not User.objects.filter(email='teacher@demo.com').exists():
            teacher = User.objects.create_user(
                email='teacher@demo.com',
                password='Demo@123',
                username='teacher_demo',
                first_name='Sarah',
                last_name='Johnson',
                grade='Teacher'
            )
            teacher.is_staff = True
            teacher.save()
        
        # Create students
        student_names = [
            ('John', 'Smith'), ('Emma', 'Brown'), ('Michael', 'Davis'),
            ('Sophia', 'Wilson'), ('James', 'Taylor'), ('Olivia', 'Anderson'),
            ('William', 'Martinez'), ('Ava', 'Garcia'), ('Robert', 'Lee')
        ]
        
        grades = ['IB1', 'IB2']
        for i, (first, last) in enumerate(student_names, 1):
            email = f'student{i}@demo.com'
            if not User.objects.filter(email=email).exists():
                User.objects.create_user(
                    email=email,
                    password='Demo@123',
                    username=f'student_{i}',
                    first_name=first,
                    last_name=last,
                    grade=grades[i % 2]
                )
        
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created demo users (skipped existing)'))

    def create_topics(self):
        self.stdout.write('Creating topics...')

        curriculum, _ = Curriculum.objects.get_or_create(name='IB', defaults={'order': 0})
        
        topics_data = [
            ('Mechanics', 'Forces, motion, energy, and momentum'),
            ('Waves', 'Wave properties, sound, and light'),
            ('Thermal Physics', 'Temperature, heat transfer, and thermodynamics'),
            ('Electricity & Magnetism', 'Circuits, fields, and electromagnetic induction'),
            ('Atomic Physics', 'Atomic structure and nuclear physics'),
            ('Quantum Physics', 'Wave-particle duality and quantum phenomena'),
            ('Relativity', 'Special relativity and spacetime'),
            ('Astrophysics', 'Stars, galaxies, and cosmology'),
        ]
        
        for name, description in topics_data:
            topic, _ = Topic.objects.get_or_create(
                name=name,
                defaults={'description': description, 'curriculum': curriculum}
            )
            if topic.curriculum_id is None:
                topic.curriculum = curriculum
                topic.save(update_fields=['curriculum'])
        
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(topics_data)} topics'))

    def create_exams_and_questions(self):
        self.stdout.write('Creating exams and questions...')
        
        teacher = User.objects.filter(is_staff=True, is_superuser=False).first()
        if not teacher:
            teacher = User.objects.filter(is_superuser=True).first()
        topics = list(Topic.objects.all())
        
        exam_configs = [
            ('Mechanics Basics', topics[0], 3600, 10),  # title, topic, duration_seconds, num_questions
            ('Wave Properties', topics[1], 2700, 8),
            ('Thermodynamics Test', topics[2], 3000, 10),
            ('Electric Circuits', topics[3], 3600, 12),
            ('Nuclear Physics', topics[4], 2700, 8),
        ]
        
        for title, topic, duration_seconds, num_questions in exam_configs:
            exam, created = Exam.objects.get_or_create(
                title=title,
                defaults={
                    'topic': topic,
                    'duration_seconds': duration_seconds,
                    'created_by': teacher,
                    'total_marks': num_questions * 2,  # Estimate
                    'is_active': True
                }
            )
            
            if created:
                # Create questions for this exam
                for i in range(num_questions):
                    if i < num_questions * 0.7:  # 70% MCQ
                        self.create_mcq_question(exam, topic, i+1)
                    else:  # 30% descriptive
                        self.create_descriptive_question(exam, topic, i+1)
        
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(exam_configs)} exams'))

    def create_mcq_question(self, exam, topic, number):
        mcq_templates = [
            {
                'statement': 'What is the SI unit of force?',
                'choices': {'A': 'Newton', 'B': 'Joule', 'C': 'Watt', 'D': 'Pascal'},
                'correct': ['A'],
            },
            {
                'statement': 'Which law states that F = ma?',
                'choices': {'A': "Newton's Second Law", 'B': "Newton's First Law", 'C': "Newton's Third Law", 'D': "Law of Gravitation"},
                'correct': ['A'],
            },
            {
                'statement': 'What is the speed of light in vacuum?',
                'choices': {'A': '3×10^8 m/s', 'B': '3×10^6 m/s', 'C': '3×10^10 m/s', 'D': '3×10^5 m/s'},
                'correct': ['A'],
            },
        ]
        
        template = random.choice(mcq_templates)
        
        question = Question.objects.create(
            topic=topic,
            type='MCQ',
            statement=template['statement'],
            choices=template['choices'],
            correct_answers=template['correct'],
            difficulty='medium',
            marks=1,
            estimated_time=120
        )
        
        # Link question to exam
        from exams.models import ExamQuestion
        ExamQuestion.objects.create(
            exam=exam,
            question=question,
            order=number
        )

    def create_descriptive_question(self, exam, topic, number):
        descriptive_templates = [
            'Explain the principle of conservation of energy with an example.',
            'Derive the equation for kinetic energy starting from Newton\'s second law.',
            'Describe the photoelectric effect and explain Einstein\'s explanation.',
            'Explain how a transformer works and derive the transformer equation.',
        ]
        
        question = Question.objects.create(
            topic=topic,
            type='STRUCT',
            statement=random.choice(descriptive_templates),
            difficulty='hard',
            marks=5,
            estimated_time=600
        )
        
        # Link question to exam
        from exams.models import ExamQuestion
        ExamQuestion.objects.create(
            exam=exam,
            question=question,
            order=number
        )

    def create_sample_attempts(self):
        self.stdout.write('Creating sample attempts...')
        
        students = list(User.objects.filter(is_staff=False, is_superuser=False))
        exams = list(Exam.objects.all())
        
        attempt_count = 0
        for student in students[:5]:  # First 5 students
            # Create 3-7 random attempts
            num_attempts = random.randint(3, 7)
            
            for i in range(num_attempts):
                exam = random.choice(exams)
                days_ago = random.randint(1, 30)
                start_time = datetime.now() - timedelta(days=days_ago)
                
                attempt = Attempt.objects.create(
                    user=student,
                    exam=exam,
                    started_at=start_time,
                    finished_at=start_time + timedelta(seconds=exam.duration_seconds),
                    duration_seconds=exam.duration_seconds,
                    total_score=random.randint(60, 95),
                    status='submitted'
                )
                
                # Create responses for MCQ questions
                from exams.models import ExamQuestion
                exam_questions = ExamQuestion.objects.filter(exam=exam, question__type='MCQ')
                for eq in exam_questions:
                    correct = random.random() > 0.3  # 70% correct rate
                    Response.objects.create(
                        attempt=attempt,
                        question=eq.question,
                        answer_payload={'selected': ['A'] if correct else ['B']},
                        correct=correct,
                        time_spent_seconds=random.randint(30, 120)
                    )
                
                attempt_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {attempt_count} sample attempts'))
