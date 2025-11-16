import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import SensorReading


@csrf_exempt
@require_http_methods(["POST"])
def create_sensor_reading(request):
    """
    API endpoint to create a new sensor reading.
    
    Expected JSON payload:
    {
        "sensor_id": "sensor1",
        "value": 25.5,
        "metadata": {"unit": "celsius", "location": "room1"}  # optional
    }
    """
    try:
        data = json.loads(request.body)
        
        sensor_id = data.get('sensor_id')
        value = data.get('value')
        metadata = data.get('metadata', {})
        
        if not sensor_id:
            return JsonResponse(
                {'error': 'sensor_id is required'}, 
                status=400
            )
        
        if value is None:
            return JsonResponse(
                {'error': 'value is required'}, 
                status=400
            )
        
        # Create the sensor reading
        # This will trigger the PostgreSQL trigger which sends NOTIFY
        reading = SensorReading.objects.create(
            sensor_id=sensor_id,
            value=float(value),
            metadata=metadata
        )
        
        return JsonResponse({
            'id': reading.id,
            'sensor_id': reading.sensor_id,
            'value': reading.value,
            'timestamp': reading.timestamp.isoformat(),
            'metadata': reading.metadata,
            'message': 'Sensor reading created successfully'
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse(
            {'error': 'Invalid JSON'}, 
            status=400
        )
    except ValueError as e:
        return JsonResponse(
            {'error': f'Invalid value: {str(e)}'}, 
            status=400
        )
    except Exception as e:
        return JsonResponse(
            {'error': str(e)}, 
            status=500
        )

