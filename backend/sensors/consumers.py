import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SensorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join sensor_group
        await self.channel_layer.group_add(
            "sensor_group",
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave sensor_group
        await self.channel_layer.group_discard(
            "sensor_group",
            self.channel_name
        )

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
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'data': event['data']
        }))

