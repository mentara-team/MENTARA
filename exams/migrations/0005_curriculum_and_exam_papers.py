from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone
from django.utils.text import slugify


def _unique_slug_for_curriculum(Curriculum, base_slug: str) -> str:
    base_slug = (base_slug or '').strip() or 'curriculum'
    candidate = base_slug
    suffix = 2
    while Curriculum.objects.filter(slug=candidate).exists():
        candidate = f"{base_slug}-{suffix}"
        suffix += 1
    return candidate


def forwards_create_curriculums(apps, schema_editor):
    Topic = apps.get_model('exams', 'Topic')
    Curriculum = apps.get_model('exams', 'Curriculum')

    # Create a Curriculum for each active root topic (parent is null).
    # This is a safe, data-preserving default for existing installs.
    root_topics = Topic.objects.filter(parent__isnull=True, is_active=True).order_by('id')
    for root in root_topics:
        name = (root.name or '').strip() or f"Curriculum {root.id}"

        base_slug = slugify(name) or f"curriculum-{root.id}"
        desired_slug = _unique_slug_for_curriculum(Curriculum, base_slug)

        cur, created = Curriculum.objects.get_or_create(
            name=name,
            defaults={
                'order': root.order or 0,
                'slug': desired_slug,
            },
        )
        if (not created) and (not (cur.slug or '').strip()):
            # Historical model in migrations doesn't run the model's save() override,
            # so old/partial data could have blank slugs; backfill safely.
            cur.slug = _unique_slug_for_curriculum(Curriculum, desired_slug)
            cur.save(update_fields=['slug'])

        # Set curriculum on the whole subtree (including root).
        to_visit = [root.id]
        seen = set()
        while to_visit:
            tid = to_visit.pop(0)
            if tid in seen:
                continue
            seen.add(tid)
            Topic.objects.filter(id=tid, curriculum__isnull=True).update(curriculum=cur)
            child_ids = list(Topic.objects.filter(parent_id=tid, is_active=True).values_list('id', flat=True))
            to_visit.extend(child_ids)

        # If the root topic is purely a container (no questions/exams),
        # re-parent its children to be top-level inside the curriculum and archive the root.
        # This aligns with the requested model: Curriculum → Topics (not Topic-root).
        has_questions = root.questions.exists()
        has_exams = root.exams.exists()
        has_children = Topic.objects.filter(parent_id=root.id, is_active=True).exists()

        if (not has_questions) and (not has_exams) and has_children:
            Topic.objects.filter(parent_id=root.id).update(parent=None, curriculum=cur)
            Topic.objects.filter(id=root.id).update(is_active=False)


def backwards_delete_curriculums(apps, schema_editor):
    Curriculum = apps.get_model('exams', 'Curriculum')
    Topic = apps.get_model('exams', 'Topic')

    # Best-effort rollback: detach topics from curriculums then delete curriculums.
    Topic.objects.update(curriculum=None)
    Curriculum.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0004_topic_is_active'),
    ]

    operations = [
        migrations.CreateModel(
            name='Curriculum',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=120, unique=True)),
                ('slug', models.SlugField(blank=True, max_length=140, unique=True)),
                ('description', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['order', 'name'],
            },
        ),
        migrations.AddIndex(
            model_name='curriculum',
            index=models.Index(fields=['is_active', 'order'], name='exams_curri_is_acti_ec6c1c_idx'),
        ),
        migrations.AddField(
            model_name='topic',
            name='curriculum',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='topics', to='exams.curriculum'),
        ),
        migrations.AlterModelOptions(
            name='topic',
            options={'ordering': ['curriculum__id', 'parent__id', 'order', 'name']},
        ),
        migrations.AddField(
            model_name='exam',
            name='level',
            field=models.CharField(blank=True, default='', max_length=10),
        ),
        migrations.AddField(
            model_name='exam',
            name='paper_number',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['curriculum', 'parent', 'order'], name='exams_topic_curricu_223746_idx'),
        ),
        migrations.RunPython(forwards_create_curriculums, backwards_delete_curriculums),
    ]
