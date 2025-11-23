"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from sensor_readings.routing import websocket_urlpatterns

# For development, allow all origins. In production, use AllowedHostsOriginValidator
from django.conf import settings

if settings.DEBUG:
    # Development: Allow all origins and anonymous WebSocket connections
    # Skip AuthMiddlewareStack to allow unauthenticated connections
    websocket_application = URLRouter(websocket_urlpatterns)
else:
    # Production: Validate origins and require authentication
    websocket_application = AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    )

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": websocket_application,
})
