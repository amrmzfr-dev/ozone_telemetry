#!/usr/bin/env python3
"""
Simple MQTT connection test for Django
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ozontelemetry.settings')
django.setup()

from django.conf import settings
import paho.mqtt.client as mqtt
import time

def test_mqtt_connection():
    print(f"Testing MQTT connection to {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("✅ MQTT connection successful!")
            client.disconnect()
        else:
            print(f"❌ MQTT connection failed with code: {rc}")
    
    def on_disconnect(client, userdata, rc):
        print("Disconnected from MQTT broker")
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    
    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
        client.loop_start()
        time.sleep(3)
        client.loop_stop()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_mqtt_connection()
