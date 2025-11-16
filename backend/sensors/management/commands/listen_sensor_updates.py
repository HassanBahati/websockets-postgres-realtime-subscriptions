from django.core.management.base import BaseCommand
import psycopg2
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class Command(BaseCommand):
    help = "Listen to PostgreSQL NOTIFY events and broadcast via WebSockets"

    def handle(self, *args, **kwargs):
        # Get database connection details from Django settings
        from django.conf import settings
        
        db_config = settings.DATABASES['default']
        
        conn = psycopg2.connect(
            dbname=db_config['NAME'],
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        cur.execute("LISTEN sensor_updates;")
        
        channel_layer = get_channel_layer()
        
        self.stdout.write(self.style.SUCCESS("Listening for sensor updates..."))
        
        try:
            while True:
                conn.poll()
                
                while conn.notifies:
                    notify = conn.notifies.pop()
                    payload = json.loads(notify.payload)
                    
                    # When a notification arrives, broadcasts it via Redis channel layer to WebSocket clients
                    # Broadcast through WebSockets
                    async_to_sync(channel_layer.group_send)(
                        "sensor_group",
                        {
                            "type": "sensor.message",
                            "data": payload
                        }
                    )
                    
                    self.stdout.write(f"Broadcasted update: {payload}")
                    
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nStopping listener..."))
        finally:
            cur.close()
            conn.close()

