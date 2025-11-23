from django.core.management.base import BaseCommand
import psycopg2
import json
import time
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class Command(BaseCommand):
    help = "Listen to PostgreSQL NOTIFY events and broadcast via WebSockets"

    def handle(self, *args, **kwargs):
        # Get database connection details from Django settings
        from django.conf import settings
        import os
        
        db_config = settings.DATABASES['default']
        sslmode = os.environ.get("DB_SSLMODE", "prefer")
        
        channel_layer = get_channel_layer()
        
        # Force immediate output (unbuffered)
        import sys
        sys.stdout.flush()
        sys.stderr.flush()
        
        self.stdout.write(self.style.SUCCESS("Starting sensor update listener..."))
        self.stdout.flush()
        
        # Retry loop for connection
        retry_delay = 5
        conn = None
        cur = None
        
        while True:
            try:
                self.stdout.write(f"Connecting to database at {db_config['HOST']}...")
                self.stdout.flush()
                conn = psycopg2.connect(
                    dbname=db_config['NAME'],
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT'],
                    sslmode=sslmode
                )
                
                conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
                cur = conn.cursor()
                
                cur.execute("LISTEN sensor_updates;")
                
                self.stdout.write(self.style.SUCCESS("✅ Listening for sensor updates..."))
                self.stdout.flush()
                
                # Main listening loop
                while True:
                    conn.poll()
                    
                    while conn.notifies:
                        notify = conn.notifies.pop()
                        payload = json.loads(notify.payload)
                        
                        # When a notification arrives, broadcasts it via Redis channel layer to WebSocket clients
                        async_to_sync(channel_layer.group_send)(
                            "sensor_group",
                            {
                                "type": "sensor.message",
                                "data": payload
                            }
                        )
                        
                        self.stdout.write(f"📨 Broadcasted update: {payload}")
                        self.stdout.flush()
                    
                    # Small sleep to prevent busy waiting
                    time.sleep(0.1)
                    
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING("\nStopping listener..."))
                if cur:
                    try:
                        cur.close()
                    except:
                        pass
                if conn:
                    try:
                        conn.close()
                    except:
                        pass
                break
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                self.stdout.write(self.style.ERROR(f"❌ Database connection error: {e}"))
                self.stdout.write(f"Retrying in {retry_delay} seconds...")
                if cur:
                    try:
                        cur.close()
                    except:
                        pass
                if conn:
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
                cur = None
                time.sleep(retry_delay)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Unexpected error: {e}"))
                import traceback
                self.stdout.write(traceback.format_exc())
                self.stdout.write(f"Retrying in {retry_delay} seconds...")
                if cur:
                    try:
                        cur.close()
                    except:
                        pass
                if conn:
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
                cur = None
                time.sleep(retry_delay)
