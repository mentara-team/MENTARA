from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0005_curriculum_and_exam_papers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='exam',
            name='passing_marks',
            field=models.FloatField(blank=True, default=40, null=True),
        ),
    ]
