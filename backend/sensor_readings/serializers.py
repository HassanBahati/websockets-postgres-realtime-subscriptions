from rest_framework import serializers
from .models import SensorReading


class SensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorReading
        fields = ['id', 'sensor_id', 'value', 'timestamp', 'metadata', 'created_at', 'updated_at']
        read_only_fields = ['id', 'timestamp', 'created_at', 'updated_at']

    def validate_value(self, value):
        """Validate that value is a number"""
        if not isinstance(value, (int, float)):
            raise serializers.ValidationError("Value must be a number")
        return value

    def validate_sensor_id(self, value):
        """Validate sensor_id is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("sensor_id cannot be empty")
        return value.strip()

