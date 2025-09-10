# MQTT Setup Guide

## 🚀 **Quick Start Options**

### **Option 1: Cloud MQTT (Recommended for Testing)**
Use a free cloud MQTT broker - no installation needed!

**HiveMQ Cloud (Free):**
1. Go to https://www.hivemq.com/cloud/
2. Sign up for free account
3. Create a cluster
4. Get your broker details:
   - Host: `your-cluster.hivemq.cloud`
   - Port: `8883` (SSL) or `1883` (non-SSL)
   - Username: `your-username`
   - Password: `your-password`

### **Option 2: Local Mosquitto (For Production)**
Install Mosquitto locally for full control.

**Windows Installation:**
1. Download from: https://mosquitto.org/download/
2. Install with default settings
3. Start service: `net start mosquitto`
4. Test: `mosquitto_pub -h localhost -t test -m "hello"`

**Docker Installation:**
```bash
docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2.0
```

## 🔧 **Configuration**

### **MQTT Topics Structure**
```
telemetry/
├── status/          # Device status updates
│   └── {device_id}  # e.g., telemetry/status/3c8a1fa43ec4
├── events/          # Machine usage events  
│   └── {device_id}  # e.g., telemetry/events/3c8a1fa43ec4
└── commands/        # Commands to devices
    └── {device_id}  # e.g., telemetry/commands/3c8a1fa43ec4
```

### **Message Format**
```json
{
  "device_id": "3c8a1fa43ec4",
  "timestamp": "2024-01-15 14:30:25",
  "type": "status|event|command",
  "data": {
    "basic_count": 15,
    "standard_count": 8,
    "premium_count": 3,
    "wifi_connected": true,
    "rtc_available": true
  }
}
```

## 🎯 **Next Steps**

1. **Choose MQTT broker** (cloud or local)
2. **Update ESP32 code** to use MQTT
3. **Update Django backend** to use MQTT client
4. **Test communication** between ESP32 and backend
5. **Deploy to VPS** when ready

## 📊 **Testing Commands**

**Publish test message:**
```bash
mosquitto_pub -h localhost -t "telemetry/status/test" -m '{"device_id":"test","type":"status","data":{"basic_count":1}}'
```

**Subscribe to all telemetry:**
```bash
mosquitto_sub -h localhost -t "telemetry/#"
```

**Subscribe to specific device:**
```bash
mosquitto_sub -h localhost -t "telemetry/status/3c8a1fa43ec4"
```
