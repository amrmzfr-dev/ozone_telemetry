import json
import logging
from django.conf import settings
from paho.mqtt.client import Client
from .models import TelemetryEvent, DeviceStatus
from datetime import datetime

logger = logging.getLogger(__name__)

class MQTTClient:
    def __init__(self):
        self.client = Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        self.connected = False
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            self.connected = True
            
            # Subscribe to all telemetry topics
            client.subscribe(f"{settings.MQTT_TOPIC_STATUS}+")  # telemetry/status/+
            client.subscribe(f"{settings.MQTT_TOPIC_EVENTS}+")  # telemetry/events/+
            logger.info(f"Subscribed to {settings.MQTT_TOPIC_STATUS}+ and {settings.MQTT_TOPIC_EVENTS}+")
        else:
            logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        logger.warning("Disconnected from MQTT broker")
        self.connected = False
    
    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            logger.info(f"Received MQTT message on topic: {topic}")
            logger.debug(f"Message payload: {payload}")
            
            # Extract device ID from topic
            device_id = topic.split('/')[-1]
            
            if 'status' in topic:
                self.handle_status_message(device_id, payload)
            elif 'events' in topic:
                self.handle_event_message(device_id, payload)
            else:
                logger.warning(f"Unknown topic: {topic}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def handle_status_message(self, device_id, payload):
        """Handle status messages from ESP32 devices"""
        try:
            data = payload.get('data', {})
            
            # Create or update device status
            device_status, created = DeviceStatus.objects.get_or_create(
                device_id=device_id,
                defaults={
                    'basic_count': data.get('basic_count', 0),
                    'standard_count': data.get('standard_count', 0),
                    'premium_count': data.get('premium_count', 0),
                    'wifi_connected': data.get('wifi_connected', False),
                    'rtc_available': data.get('rtc_available', False),
                    'last_seen': datetime.now()
                }
            )
            
            if not created:
                # Update existing status
                device_status.basic_count = data.get('basic_count', device_status.basic_count)
                device_status.standard_count = data.get('standard_count', device_status.standard_count)
                device_status.premium_count = data.get('premium_count', device_status.premium_count)
                device_status.wifi_connected = data.get('wifi_connected', device_status.wifi_connected)
                device_status.rtc_available = data.get('rtc_available', device_status.rtc_available)
                device_status.last_seen = datetime.now()
                device_status.save()
            
            logger.info(f"Updated status for device {device_id}")
            
        except Exception as e:
            logger.error(f"Error handling status message: {e}")
    
    def handle_event_message(self, device_id, payload):
        """Handle event messages from ESP32 devices"""
        try:
            data = payload.get('data', {})
            event_type = data.get('event_type', 'UNKNOWN')
            count = data.get('count', 0)
            
            # Create telemetry event
            TelemetryEvent.objects.create(
                device_id=device_id,
                event_type=event_type,
                count=count,
                timestamp=datetime.now()
            )
            
            logger.info(f"Created event for device {device_id}: {event_type} count={count}")
            
        except Exception as e:
            logger.error(f"Error handling event message: {e}")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
                self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
            
            self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
            self.client.loop_start()
            logger.info(f"Connecting to MQTT broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
            
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
        self.connected = False
        logger.info("Disconnected from MQTT broker")
    
    def publish_command(self, device_id, command):
        """Publish a command to a specific device"""
        try:
            topic = f"{settings.MQTT_TOPIC_COMMANDS}{device_id}"
            message = json.dumps(command)
            self.client.publish(topic, message)
            logger.info(f"Published command to {topic}: {message}")
            
        except Exception as e:
            logger.error(f"Failed to publish command: {e}")

# Global MQTT client instance
mqtt_client = MQTTClient()
