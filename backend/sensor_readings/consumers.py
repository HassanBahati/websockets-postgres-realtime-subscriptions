import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class SensorReadingsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info(f"WebSocket connection attempt from: {self.scope.get('client', 'unknown')}")
        logger.info(f"WebSocket path: {self.scope.get('path', 'unknown')}")
        
        # Accept the connection first, before trying to use channel layer
        await self.accept()
        logger.info(f"WebSocket connection accepted: {self.channel_name}")
        
        try:
            # Join sensor_group
            if self.channel_layer:
                await self.channel_layer.group_add(
                    "sensor_group",
                    self.channel_name
                )
                logger.info(f"WebSocket connected and joined group: {self.channel_name}")
            else:
                logger.warning("No channel layer available, connection accepted without group")
        except Exception as e:
            logger.error(f"Error joining group (connection still active): {e}", exc_info=True)
            # Don't close - connection is already accepted

    async def disconnect(self, close_code):
        try:
            # Leave sensor_group
            await self.channel_layer.group_discard(
                "sensor_group",
                self.channel_name
            )
            logger.info(f"WebSocket disconnected: {self.channel_name}, code: {close_code}")
        except Exception as e:
            logger.error(f"Error in disconnect: {e}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')

        # Send message to room group
        await self.channel_layer.group_send(
            "sensor_group",
            {
                "type": "sensor.message",
                "message": message
            }
        )

    # Receive message from room group
    async def sensor_message(self, event):
        try:
            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'data': event.get('data', event)
            }))
            logger.debug(f"Sent message to {self.channel_name}: {event.get('data')}")
        except Exception as e:
            logger.error(f"Error sending message: {e}")

