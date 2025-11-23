# Local Testing Guide

This guide walks you through testing the Docker setup locally.

## Prerequisites

- Docker and Docker Compose installed
- Frontend dependencies installed (if testing the full stack)

## Step 1: Environment Setup

Create a `.env` file in the project root (same directory as `docker-compose.yml`):

```bash
# Django Settings
SECRET_KEY=django-insecure-change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration
DB_NAME=websockets_realtime
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
```

## Step 2: Start Docker Services

```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps
```

You should see 4 services running:
- `websockets-postgres` (PostgreSQL)
- `websockets-redis` (Redis)
- `websockets-backend` (Django ASGI server)
- `websockets-backend-listener` (Listener worker)

## Step 3: Run Database Migrations

```bash
# Run migrations
docker-compose exec backend uv run manage.py migrate

# Verify migrations completed successfully
docker-compose logs backend | grep -i migration
```

## Step 4: Verify Services Are Running

### Check Backend API

```bash
# Test if the API is responding
curl http://localhost:8000/api/v1/sensors-readings/

# Should return: [] (empty array if no data)
```

### Check Service Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f backend-listener
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Check Database Connection

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d websockets_realtime

# Inside psql, verify tables exist:
\dt
# Should show: sensor_readings

# Check if trigger exists:
\d sensor_readings
# Should show: sensor_update_trigger

# Exit psql:
\q
```

### Check Redis Connection

```bash
# Test Redis
docker-compose exec redis redis-cli ping
# Should return: PONG
```

## Step 5: Test the API

### Create a Sensor Reading

```bash
curl -X POST http://localhost:8000/api/v1/sensors-readings/ \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor1",
    "value": 25.5,
    "metadata": {"unit": "celsius", "location": "room1"}
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "sensor_id": "sensor1",
  "value": 25.5,
  "timestamp": "2025-01-XX...",
  "metadata": {"unit": "celsius", "location": "room1"},
  "created_at": "2025-01-XX...",
  "updated_at": "2025-01-XX...",
  "message": "Sensor reading created successfully"
}
```

### Retrieve All Sensor Readings

```bash
curl http://localhost:8000/api/v1/sensors-readings/
```

### Retrieve Latest Reading

```bash
curl http://localhost:8000/api/v1/sensors-readings/?limit=1
```

## Step 6: Test WebSocket Connection

### Using wscat (if installed)

```bash
# Install wscat: npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/ws/sensor-readings/

# You should see: Connected
```

### Using Browser Console

Open browser console and run:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sensor-readings/');

ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (event) => console.log('📨 Received:', JSON.parse(event.data));
ws.onerror = (error) => console.error('❌ Error:', error);
ws.onclose = () => console.log('🔌 Disconnected');
```

## Step 7: Test Real-time Flow

### Terminal 1: Watch Backend Logs

```bash
docker-compose logs -f backend backend-listener
```

### Terminal 2: Create Sensor Reading

```bash
curl -X POST http://localhost:8000/api/v1/sensors-readings/ \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor2",
    "value": 30.2,
    "metadata": {"unit": "celsius", "location": "room2"}
  }'
```

### What to Observe:

1. **Backend logs** should show:
   - API request received
   - Database insert
   - Listener worker receives NOTIFY
   - Message broadcasted to Redis

2. **WebSocket client** (browser console or wscat) should receive:
   ```json
   {
     "data": {
       "id": 2,
       "sensor_id": "sensor2",
       "value": 30.2,
       ...
     }
   }
   ```

## Step 8: Test with Frontend

### Start Frontend (if not already running)

```bash
cd frontend
npm install  # if not already done
npm run dev
```

### Open Browser

Navigate to `http://localhost:5173` (or your frontend port)

### Test Flow:

1. **Check Connection Status**: Should show "🟢 Connected"
2. **Create Sensor Reading** (from another terminal):
   ```bash
   curl -X POST http://localhost:8000/api/v1/sensors-readings/ \
     -H "Content-Type: application/json" \
     -d '{
       "sensor_id": "sensor3",
       "value": 42.0,
       "metadata": {"unit": "celsius"}
     }'
   ```
3. **Watch Frontend**: The sensor reading should appear automatically without page refresh! 🚀

## Step 9: Load Testing (Optional)

### Create Multiple Readings

```bash
# Create 10 sensor readings
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/sensors-readings/ \
    -H "Content-Type: application/json" \
    -d "{
      \"sensor_id\": \"sensor$i\",
      \"value\": $((20 + i)),
      \"metadata\": {\"unit\": \"celsius\", \"batch\": \"test\"}
    }"
  echo ""
  sleep 0.5
done
```

### Verify All Received

Check that your WebSocket client received all 10 updates in real-time.

## Troubleshooting

### Backend not starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready: Wait for postgres health check
# - Missing .env: Create .env file
# - Port conflict: Change port in docker-compose.yml
```

### WebSocket not connecting

1. **Check CORS settings** in `backend/config/settings.py`
2. **Verify WebSocket URL** matches routing in `backend/sensor_readings/routing.py`
3. **Check backend logs** for WebSocket connection errors:
   ```bash
   docker-compose logs backend | grep -i websocket
   ```

### No real-time updates

1. **Verify listener worker is running**:
   ```bash
   docker-compose ps backend-listener
   docker-compose logs backend-listener
   ```

2. **Check PostgreSQL trigger exists**:
   ```bash
   docker-compose exec postgres psql -U postgres -d websockets_realtime -c "\d sensor_readings"
   ```

3. **Verify Redis connection**:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

4. **Check listener logs** for "Broadcasted update" messages

### Database connection errors

```bash
# Verify postgres is healthy
docker-compose ps postgres

# Check database exists
docker-compose exec postgres psql -U postgres -l | grep websockets_realtime

# Test connection from backend container
docker-compose exec backend uv run python -c "
from django.conf import settings
import psycopg2
db = settings.DATABASES['default']
conn = psycopg2.connect(
    dbname=db['NAME'],
    user=db['USER'],
    password=db['PASSWORD'],
    host=db['HOST'],
    port=db['PORT']
)
print('✅ Database connection successful')
conn.close()
"
```

## Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

echo "🧪 Testing API..."
echo ""

# Test 1: Health check
echo "1. Testing API endpoint..."
curl -s http://localhost:8000/api/v1/sensors-readings/ | jq '.' || echo "❌ API not responding"

# Test 2: Create reading
echo ""
echo "2. Creating sensor reading..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/sensors-readings/ \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "test_sensor",
    "value": 99.9,
    "metadata": {"test": true}
  }')

echo "$RESPONSE" | jq '.' || echo "$RESPONSE"

# Test 3: Retrieve readings
echo ""
echo "3. Retrieving all readings..."
curl -s http://localhost:8000/api/v1/sensors-readings/ | jq '.'

echo ""
echo "✅ Tests complete!"
```

Make it executable and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Clean Up

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

