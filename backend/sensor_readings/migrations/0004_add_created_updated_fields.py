# Generated manually

from django.db import migrations, models
from django.utils import timezone


def set_initial_timestamps(apps, schema_editor):
    """Set created_at and updated_at for existing rows"""
    SensorReading = apps.get_model('sensor_readings', 'SensorReading')
    now = timezone.now()
    SensorReading.objects.all().update(created_at=now, updated_at=now)


class Migration(migrations.Migration):

    dependencies = [
        ('sensor_readings', '0003_create_trigger'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensorreading',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='sensorreading',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.RunPython(set_initial_timestamps, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='sensorreading',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='sensorreading',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]

