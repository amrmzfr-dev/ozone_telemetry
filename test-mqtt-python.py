#!/usr/bin/env python3
"""
Simple MQTT test script to verify broker connection
"""
import paho.mqtt.client as mqtt
import json
import time

# MQTT Configuration
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "test/ozon_telemetry"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to MQTT broker successfully!")
        # Subscribe to test topic
        client.subscribe(MQTT_TOPIC)
        print(f"📡 Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"❌ Failed to connect. Return code: {rc}")

def on_message(client, userdata, msg):
    print(f"📥 Received message on {msg.topic}: {msg.payload.decode()}")

def on_disconnect(client, userdata, rc):
    print("⚠️ Disconnected from MQTT broker")

def main():
    print("🧪 Testing MQTT Connection...")
    print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic: {MQTT_TOPIC}")
    print()
    
    # Create MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        # Connect to broker
        print("🔌 Connecting to MQTT broker...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        # Wait a moment for connection
        time.sleep(2)
        
        # Publish test message
        test_message = {
            "device_id": "test_device",
            "timestamp": "2024-01-15 14:30:25",
            "type": "test",
            "data": {"message": "Hello from Python test!"}
        }
        
        print("📤 Publishing test message...")
        client.publish(MQTT_TOPIC, json.dumps(test_message))
        
        # Wait for messages
        print("⏳ Waiting for messages (press Ctrl+C to stop)...")
        time.sleep(10)
        
    except KeyboardInterrupt:
        print("\n🛑 Test stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("🔌 Disconnected from MQTT broker")

if __name__ == "__main__":
    main()
