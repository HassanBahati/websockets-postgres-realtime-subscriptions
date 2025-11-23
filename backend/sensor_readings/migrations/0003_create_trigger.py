# Generated manually

from django.db import migrations


def create_trigger_function(apps, schema_editor):
    """Create PostgreSQL trigger function for NOTIFY"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            CREATE OR REPLACE FUNCTION notify_sensor_update()
            RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('sensor_updates', row_to_json(NEW)::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)


def create_trigger(apps, schema_editor):
    """Create trigger on sensor_readings table"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            DROP TRIGGER IF EXISTS sensor_update_trigger ON sensor_readings;
            CREATE TRIGGER sensor_update_trigger
            AFTER INSERT ON sensor_readings
            FOR EACH ROW EXECUTE FUNCTION notify_sensor_update();
        """)


def drop_trigger(apps, schema_editor):
    """Drop trigger and function"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP TRIGGER IF EXISTS sensor_update_trigger ON sensor_readings;")
        cursor.execute("DROP FUNCTION IF EXISTS notify_sensor_update();")


class Migration(migrations.Migration):

    dependencies = [
        ('sensor_readings', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(create_trigger_function, drop_trigger),
        migrations.RunPython(create_trigger, drop_trigger),
    ]

