#!/usr/bin/env python3
"""
Simulate ESP32 MQTT messages to test Django backend
"""
import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime

# MQTT Configuration
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = "3c8a1fa43ec4"  # Your ESP32 MAC address

# Topics
STATUS_TOPIC = f"telemetry/status/{DEVICE_ID}"
EVENTS_TOPIC = f"telemetry/events/{DEVICE_ID}"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ ESP32 Simulator connected to MQTT broker!")
    else:
        print(f"❌ Failed to connect. Return code: {rc}")

def simulate_esp32():
    client = mqtt.Client()
    client.on_connect = on_connect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        print("🤖 Simulating ESP32 device...")
        print(f"Device ID: {DEVICE_ID}")
        print(f"Status Topic: {STATUS_TOPIC}")
        print(f"Events Topic: {EVENTS_TOPIC}")
        print()
        
        # Simulate status message
        status_message = {
            "device_id": DEVICE_ID,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "status",
            "data": {
                "basic_count": 15,
                "standard_count": 8,
                "premium_count": 3,
                "wifi_connected": True,
                "rtc_available": True
            }
        }
        
        print("📤 Publishing status message...")
        client.publish(STATUS_TOPIC, json.dumps(status_message))
        print(f"Status: {json.dumps(status_message, indent=2)}")
        
        time.sleep(2)
        
        # Simulate event message
        event_message = {
            "device_id": DEVICE_ID,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "event",
            "data": {
                "event_type": "BASIC",
                "count": 16
            }
        }
        
        print("📤 Publishing event message...")
        client.publish(EVENTS_TOPIC, json.dumps(event_message))
        print(f"Event: {json.dumps(event_message, indent=2)}")
        
        time.sleep(2)
        
        print("✅ ESP32 simulation complete!")
        print("Check your Django MQTT client logs to see if messages were received.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    simulate_esp32()
