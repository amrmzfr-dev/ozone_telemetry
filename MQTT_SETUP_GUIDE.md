# 🚀 MQTT Setup Guide for Ozon Telemetry

## 📋 **Overview**

This guide will help you set up MQTT communication between your ESP32 devices and Django backend, replacing the HTTP-based communication.

## 🏗️ **Architecture**

```
ESP32 Device → MQTT Broker → Django Backend → Database
     ↓              ↓              ↓
  Publishes     Forwards      Subscribes &
  Events &      Messages      Processes
  Status                      Data
```

## 🔧 **Setup Steps**

### **Step 1: Install Dependencies**

**Backend Dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**ESP32 Dependencies:**
The MQTT library is already added to `platformio.ini`:
```ini
lib_deps = 
    adafruit/RTClib@^2.1.1
    knolleary/PubSubClient@^2.8
```

### **Step 2: Choose MQTT Broker**

**Option A: Free Cloud Broker (Recommended for Testing)**
- **HiveMQ Cloud**: https://www.hivemq.com/cloud/
- **Broker**: `broker.hivemq.com:1883`
- **No authentication required**

**Option B: Local Mosquitto (For Production)**
```bash
# Windows (with Chocolatey)
choco install mosquitto

# Or download from: https://mosquitto.org/download/
```

### **Step 3: Configure MQTT Settings**

**ESP32 Configuration** (`OzonTelemetry/src/main.h`):
```cpp
#define MQTT_SERVER         "broker.hivemq.com"
#define MQTT_PORT           1883
#define MQTT_USERNAME       ""
#define MQTT_PASSWORD       ""
```

**Django Configuration** (`backend/ozontelemetry/settings.py`):
```python
MQTT_BROKER = 'broker.hivemq.com'
MQTT_PORT = 1883
MQTT_USERNAME = ''
MQTT_PASSWORD = ''
```

### **Step 4: Run the System**

**Start Everything:**
```bash
# Option 1: Use the development script
.\start-dev.bat

# Option 2: Start manually
# Terminal 1: Backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2: MQTT Client
cd backend
python manage.py start_mqtt

# Terminal 3: Frontend
cd frontend
npm run dev
```

## 📡 **MQTT Topics**

### **Topic Structure**
```
telemetry/
├── status/{device_id}    # Device status updates
├── events/{device_id}    # Machine usage events
└── commands/{device_id}  # Commands to devices
```

### **Example Topics**
- `telemetry/status/3c8a1fa43ec4`
- `telemetry/events/3c8a1fa43ec4`
- `telemetry/commands/3c8a1fa43ec4`

## 📊 **Message Formats**

### **Status Message**
```json
{
  "device_id": "3c8a1fa43ec4",
  "timestamp": "2024-01-15 14:30:25",
  "type": "status",
  "data": {
    "basic_count": 15,
    "standard_count": 8,
    "premium_count": 3,
    "wifi_connected": true,
    "rtc_available": true
  }
}
```

### **Event Message**
```json
{
  "device_id": "3c8a1fa43ec4",
  "timestamp": "2024-01-15 14:30:25",
  "type": "event",
  "data": {
    "event_type": "BASIC",
    "count": 16
  }
}
```

## 🧪 **Testing**

### **Test MQTT Connection**
```bash
# Test script
.\test-mqtt.bat

# Manual test
mosquitto_pub -h broker.hivemq.com -t "test/ozon" -m "hello"
mosquitto_sub -h broker.hivemq.com -t "test/ozon"
```

### **Test ESP32 Communication**
1. Upload the updated ESP32 code
2. Check serial monitor for MQTT connection status
3. Visit ESP32 web interface: `http://[ESP32_IP]/setting`
4. Check MQTT status in the web interface

### **Test Backend MQTT Client**
1. Start the MQTT client: `python manage.py start_mqtt`
2. Check Django logs for MQTT messages
3. Verify data is being saved to database

## 🔍 **Monitoring**

### **ESP32 Web Interface**
- Visit: `http://[ESP32_IP]/setting`
- Check MQTT connection status
- View MQTT configuration

### **Django Admin**
- Visit: `http://localhost:8000/admin`
- Check `TelemetryEvent` and `DeviceStatus` models
- View real-time data

### **MQTT Broker Logs**
```bash
# For local Mosquitto
mosquitto_sub -h localhost -t "telemetry/#" -v

# For cloud broker
mosquitto_sub -h broker.hivemq.com -t "telemetry/#" -v
```

## 🚀 **Deployment to VPS**

### **VPS Setup**
1. **Install Mosquitto on VPS:**
```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

2. **Configure Mosquitto:**
```bash
sudo nano /etc/mosquitto/mosquitto.conf
```

3. **Update ESP32 and Django settings:**
```cpp
// ESP32
#define MQTT_SERVER "your-vps-ip"
#define MQTT_PORT 1883
```

```python
# Django
MQTT_BROKER = 'your-vps-ip'
MQTT_PORT = 1883
```

### **Security (Production)**
1. **Enable authentication:**
```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd ozon_telemetry
```

2. **Update configuration:**
```conf
allow_anonymous false
password_file /etc/mosquitto/passwd
```

3. **Update credentials in code**

## 🐛 **Troubleshooting**

### **Common Issues**

**ESP32 not connecting to MQTT:**
- Check WiFi connection
- Verify MQTT broker address
- Check firewall settings

**Django MQTT client not receiving messages:**
- Check MQTT broker connection
- Verify topic subscriptions
- Check Django logs

**Messages not appearing in database:**
- Check MQTT client is running
- Verify message format
- Check Django logs for errors

### **Debug Commands**
```bash
# Check MQTT broker status
mosquitto_pub -h broker.hivemq.com -t "test" -m "ping"

# Monitor all telemetry messages
mosquitto_sub -h broker.hivemq.com -t "telemetry/#" -v

# Check Django MQTT client
python manage.py start_mqtt
```

## 📈 **Benefits of MQTT**

1. **Reliability**: Message queuing and persistence
2. **Scalability**: Handle many devices easily
3. **Real-time**: Lower latency than HTTP
4. **Bidirectional**: Send commands to devices
5. **Offline Support**: Messages queued when offline

## 🎯 **Next Steps**

1. **Test locally** with cloud MQTT broker
2. **Deploy to VPS** with local Mosquitto
3. **Add security** with authentication
4. **Monitor performance** and optimize
5. **Scale up** for production use

---

**Ready to start? Run `.\start-dev.bat` to begin!** 🚀
