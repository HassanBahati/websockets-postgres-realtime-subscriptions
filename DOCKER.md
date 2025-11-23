# Docker Setup Guide

This guide explains how to run the backend (and supporting services) using Docker.

## Prerequisites

- Docker and Docker Compose installed
- No need for local PostgreSQL or Redis installations

## Quick Start

### 1. Create Environment File

Create a `.env` file in the project root (same directory as `docker-compose.yml`):

```bash
# Django Settings
SECRET_KEY=your-secret-key-here-change-in-production
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

**Note:** The `DB_HOST` and `REDIS_HOST` are set to service names (`postgres` and `redis`) which Docker Compose resolves automatically.

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Django ASGI Server** on port 8000
- **Listener Worker** (runs in separate container)

### 3. Run Database Migrations

In a new terminal, run migrations:

```bash
# Run migrations
docker-compose exec backend uv run manage.py migrate

# Or if you want to run it manually
docker-compose exec backend uv run manage.py migrate
```

### 4. Access the Services

- **Backend API**: http://localhost:8000
- **WebSocket**: ws://localhost:8000/ws/sensors/
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f backend-listener
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v
```

### Restart a Service

```bash
# Restart backend
docker-compose restart backend

# Restart listener worker
docker-compose restart backend-listener
```

### Run Django Management Commands

```bash
# Django shell
docker-compose exec backend uv run manage.py shell

# Create superuser
docker-compose exec backend uv run manage.py createsuperuser

# Make migrations
docker-compose exec backend uv run manage.py makemigrations

# Run migrations
docker-compose exec backend uv run manage.py migrate
```

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d websockets_realtime

# Or from host machine (if you have psql installed)
psql -h localhost -U postgres -d websockets_realtime
```

### Access Redis

```bash
# Redis CLI
docker-compose exec redis redis-cli

# Test connection
docker-compose exec redis redis-cli ping
```

## Development Workflow

### Hot Reload

The backend service is configured with `--reload` flag, so code changes will automatically restart the server. The listener worker will need to be restarted manually if you change its code:

```bash
docker-compose restart backend-listener
```

### Rebuild After Dependency Changes

If you modify `pyproject.toml`:

```bash
docker-compose build backend
docker-compose up -d
```

## Production Considerations

For production deployment, you should:

1. **Set strong SECRET_KEY** in `.env`
2. **Set DEBUG=False**
3. **Remove `--reload` flag** from docker-compose.yml
4. **Use proper database credentials**
5. **Set up proper volume persistence** for PostgreSQL
6. **Configure proper CORS origins** in settings.py
7. **Use environment-specific .env files**
8. **Consider using Docker secrets** for sensitive data

## Troubleshooting

### Backend can't connect to database

1. Check if postgres service is healthy:
   ```bash
   docker-compose ps
   ```

2. Verify database credentials in `.env` match docker-compose.yml

3. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

### Listener worker not receiving updates

1. Verify listener is running:
   ```bash
   docker-compose logs backend-listener
   ```

2. Check Redis connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

3. Verify database trigger exists:
   ```bash
   docker-compose exec postgres psql -U postgres -d websockets_realtime -c "\d sensor_readings"
   ```

### Port conflicts

If ports 5432, 6379, or 8000 are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

## Architecture

The Docker setup includes:

- **postgres**: PostgreSQL 16 database
- **redis**: Redis 7 for channel layer
- **backend**: Django ASGI server (uvicorn)
- **backend-listener**: Separate container running the listener worker

All services communicate through a Docker network (`app-network`).

