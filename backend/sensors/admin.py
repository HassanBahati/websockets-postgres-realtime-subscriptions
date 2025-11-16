from django.contrib import admin
from .models import SensorReading


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ('sensor_id', 'value', 'timestamp')
    list_filter = ('sensor_id', 'timestamp')
    search_fields = ('sensor_id',)

