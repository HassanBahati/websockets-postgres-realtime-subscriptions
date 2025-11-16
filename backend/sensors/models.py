from django.db import models


class SensorReading(models.Model):
    sensor_id = models.CharField(max_length=100)
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'sensor_readings'
        ordering = ['-timestamp']

    def __str__(self):
        return f"Sensor {self.sensor_id}: {self.value} at {self.timestamp}"

