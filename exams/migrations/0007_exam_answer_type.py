from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0006_exam_passing_marks_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='exam',
            name='answer_type',
            field=models.CharField(blank=True, choices=[('MCQ', 'MCQ'), ('MULTI', 'Multi-select'), ('FIB', 'Fill-in-blank'), ('STRUCT', 'Structured')], default='', max_length=12),
        ),
    ]
