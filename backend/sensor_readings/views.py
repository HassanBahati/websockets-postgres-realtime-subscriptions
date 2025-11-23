from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SensorReading
from .serializers import SensorReadingSerializer


class SensorReadingListCreateView(APIView):
    """
    List sensor readings (GET) or create a new one (POST).
    
    GET /api/v1/sensors/
    - Query parameters:
      - sensor_id: Filter by sensor ID
      - limit: Limit number of results (default: 100)
    
    POST /api/v1/sensors/
    - Request body:
      {
          "sensor_id": "sensor1",
          "value": 25.5,
          "metadata": {"unit": "celsius", "location": "room1"}  // optional
      }
    """
    
    def get(self, request):
        """List sensor readings with optional filtering"""
        queryset = SensorReading.objects.all().order_by('-timestamp')
        
        # Filter by sensor_id if provided
        sensor_id = request.query_params.get('sensor_id', None)
        if sensor_id:
            queryset = queryset.filter(sensor_id=sensor_id)
        
        # Limit results
        limit = int(request.query_params.get('limit', 100))
        queryset = queryset[:limit]
        
        serializer = SensorReadingSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new sensor reading"""
        serializer = SensorReadingSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create the sensor reading
            # This will trigger the PostgreSQL trigger which sends NOTIFY
            reading = serializer.save()
            
            return Response(
                {
                    **serializer.data,
                    'message': 'Sensor reading created successfully',
                    'success': True
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

