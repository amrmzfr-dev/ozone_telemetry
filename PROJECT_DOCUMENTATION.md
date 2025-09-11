# OzonTelemetry - IoT Ozone Treatment Monitoring System

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [MQTT Communication](#mqtt-communication)
- [Frontend Components](#frontend-components)
- [ESP32 Firmware](#esp32-firmware)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Project Overview

OzonTelemetry is a comprehensive IoT monitoring system designed to track and analyze ozone treatment operations across multiple outlets. The system consists of ESP32 devices that collect treatment data, a Django backend for data processing and storage, and a React frontend for visualization and analytics.

### Key Features
- **Real-time Data Collection**: ESP32 devices collect treatment events (Basic, Standard, Premium)
- **Multi-Outlet Support**: Manage multiple outlets with individual machines and devices
- **Advanced Analytics**: Comprehensive charts and performance analysis
- **MQTT Communication**: Reliable real-time data transmission
- **Responsive Dashboard**: Modern React-based user interface
- **Device Management**: Track device status, uptime, and maintenance
- **Historical Data**: Store and analyze treatment patterns over time

## 🏗️ Architecture

```
┌─────────────────┐    MQTT     ┌─────────────────┐    HTTP     ┌─────────────────┐
│   ESP32 Devices │◄───────────►│  MQTT Broker    │◄───────────►│  Django Backend │
│  (Ozone Units)  │             │   (HiveMQ)      │             │   (API Server)  │
└─────────────────┘             └─────────────────┘             └─────────────────┘
                                                                         │
                                                                         │ HTTP
                                                                         ▼
                                                                ┌─────────────────┐
                                                                │  React Frontend │
                                                                │   (Dashboard)   │
                                                                └─────────────────┘
```

### Data Flow
1. **ESP32** collects treatment events and sends via MQTT
2. **MQTT Broker** (HiveMQ Cloud) receives and forwards messages
3. **Django Backend** processes MQTT messages and stores in database
4. **React Frontend** fetches data via REST API and displays analytics

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 4.2+ with Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **MQTT Client**: paho-mqtt
- **CORS**: django-cors-headers

### Frontend
- **Framework**: React 19+ with TypeScript
- **Build Tool**: Vite
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **HTTP Client**: Axios

### ESP32 Firmware
- **Platform**: PlatformIO with Arduino Framework
- **Libraries**: 
  - PubSubClient (MQTT)
  - RTClib (Real-time Clock)
- **Board**: ESP32 DevKit

### Infrastructure
- **MQTT Broker**: HiveMQ Cloud
- **Version Control**: Git
- **Development**: Concurrently for multi-service development

## 📁 Project Structure

```
P2-rnd/
├── backend/                          # Django Backend
│   ├── manage.py                     # Django management script
│   ├── requirements.txt              # Python dependencies
│   ├── db.sqlite3                    # SQLite database
│   ├── ozontelemetry/                # Django project settings
│   │   ├── settings.py               # Main settings
│   │   ├── urls.py                   # URL routing
│   │   ├── asgi.py                   # ASGI configuration
│   │   └── wsgi.py                   # WSGI configuration
│   └── telemetry/                    # Main Django app
│       ├── models.py                 # Database models
│       ├── views.py                  # API views
│       ├── serializers.py            # Data serializers
│       ├── mqtt_client.py            # MQTT client service
│       ├── admin.py                  # Django admin
│       ├── migrations/               # Database migrations
│       └── management/commands/      # Custom Django commands
│           ├── start_mqtt.py         # Start MQTT service
│           ├── update_device_counts.py
│           └── update_usage_stats.py
├── frontend/                         # React Frontend
│   ├── package.json                  # Node.js dependencies
│   ├── vite.config.ts                # Vite configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── src/
│   │   ├── App.tsx                   # Main App component
│   │   ├── App.css                   # Global styles
│   │   ├── main.tsx                  # Entry point
│   │   ├── components/               # Reusable components
│   │   │   ├── Layout.tsx            # Main layout wrapper
│   │   │   └── Footer.tsx            # Footer component
│   │   └── pages/                    # Page components
│   │       ├── Dashboard.tsx         # Main dashboard
│   │       ├── Charts.tsx            # Analytics page
│   │       ├── Outlets.tsx           # Outlet management
│   │       └── Machines.tsx          # Machine management
├── OzonTelemetry/                    # ESP32 Firmware
│   ├── platformio.ini                # PlatformIO configuration
│   ├── src/
│   │   ├── main.cpp                  # Main firmware code
│   │   ├── main.h                    # Header definitions
│   │   ├── Storage.cpp               # Data storage functions
│   │   └── Storage.h                 # Storage header
│   └── test/                         # Test files
├── mosquitto/                        # Local MQTT broker config
│   └── config/
│       └── mosquitto.conf            # Mosquitto configuration
├── docker-mosquitto.yml              # Docker MQTT setup
├── DEVELOPMENT_SETUP.md              # Development setup guide
├── MQTT_SETUP_GUIDE.md              # MQTT configuration guide
└── README_ESP32_PINS.md             # ESP32 pin configuration
```

## 🚀 Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- PlatformIO (for ESP32 development)
- Git

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### ESP32 Setup
```bash
cd OzonTelemetry
pio run
pio run --target upload
```

### Full Development Environment
```bash
# Install all dependencies
npm run install:all

# Start all services
npm run dev:all
```

## ⚙️ Configuration

### Backend Configuration (`backend/ozontelemetry/settings.py`)
```python
# MQTT Configuration
MQTT_BROKER_HOST = 'your-hivemq-broker.hivemq.cloud'
MQTT_BROKER_PORT = 8883
MQTT_USERNAME = 'your-username'
MQTT_PASSWORD = 'your-password'
MQTT_USE_TLS = True

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://10.115.106.5:5173"
]
```

### Frontend Configuration (`frontend/src/`)
Update API base URL in each page:
```typescript
const api = axios.create({ baseURL: 'http://YOUR_BACKEND_IP:8000/api' });
```

### ESP32 Configuration (`OzonTelemetry/src/main.h`)
```cpp
// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "your-hivemq-broker.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "your-username";
const char* mqtt_password = "your-password";
```

## 🗄️ Database Models

### Core Models

#### Outlet
```python
class Outlet(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    address = models.TextField()
    contact_person = models.CharField(max_length=200)
    contact_phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
```

#### Machine
```python
class Machine(models.Model):
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    machine_type = models.CharField(max_length=50, default='Ozone Generator')
    is_active = models.BooleanField(default=True)
    installed_date = models.DateField(null=True, blank=True)
    last_maintenance = models.DateField(null=True, blank=True)
    
    @property
    def current_device(self):
        return self.devices.filter(is_active=True).first()
```

#### MachineDevice
```python
class MachineDevice(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.CASCADE)
    device_id = models.CharField(max_length=128, db_index=True)
    is_active = models.BooleanField(default=True)
    assigned_date = models.DateTimeField(auto_now_add=True)
    deactivated_date = models.DateTimeField(null=True, blank=True)
```

#### TelemetryEvent
```python
class TelemetryEvent(models.Model):
    device_id = models.CharField(max_length=128, db_index=True)
    event_type = models.CharField(max_length=20, choices=[
        ('BASIC', 'Basic Treatment'),
        ('STANDARD', 'Standard Treatment'),
        ('PREMIUM', 'Premium Treatment'),
        ('status', 'Status Update')
    ])
    occurred_at = models.DateTimeField(auto_now_add=True)
    device_timestamp = models.DateTimeField()
    count_basic = models.IntegerField(default=0)
    count_standard = models.IntegerField(default=0)
    count_premium = models.IntegerField(default=0)
```

#### DeviceStatus
```python
class DeviceStatus(models.Model):
    device_id = models.CharField(max_length=128, unique=True)
    last_seen = models.DateTimeField(auto_now=True)
    wifi_connected = models.BooleanField(default=False)
    rtc_available = models.BooleanField(default=False)
    sd_available = models.BooleanField(default=False)
```

## 🔌 API Endpoints

### Device Management
- `GET /api/devices/all/` - Get all devices
- `GET /api/devices/{device_id}/` - Get specific device
- `POST /api/devices/` - Register new device

### Outlet Management
- `GET /api/outlets/` - Get all outlets
- `POST /api/outlets/` - Create new outlet
- `PUT /api/outlets/{id}/` - Update outlet
- `DELETE /api/outlets/{id}/` - Delete outlet

### Machine Management
- `GET /api/machines/` - Get all machines
- `POST /api/machines/` - Create new machine
- `PUT /api/machines/{id}/` - Update machine
- `DELETE /api/machines/{id}/` - Delete machine

### Analytics
- `GET /api/events/analytics/?device_id={id}&days={n}` - Get device analytics
- `GET /api/events/recent/` - Get recent events

### MQTT Management
- `POST /api/mqtt/start/` - Start MQTT service
- `POST /api/mqtt/stop/` - Stop MQTT service

## 📡 MQTT Communication

### Topics Structure
```
ozon/device/{device_id}/event     # Treatment events
ozon/device/{device_id}/status    # Device status updates
ozon/device/{device_id}/heartbeat # Device heartbeat
```

### Message Format
```json
{
  "device_id": "3C:8A:1F:A4:3E:C4",
  "event_type": "BASIC",
  "timestamp": "2024-01-15T10:30:00Z",
  "count_basic": 1,
  "count_standard": 0,
  "count_premium": 0
}
```

### MQTT Service
The MQTT client runs as a Django management command:
```bash
python manage.py start_mqtt
```

## 🎨 Frontend Components

### Main Pages

#### Dashboard (`pages/Dashboard.tsx`)
- Device status overview
- Recent events table
- Quick statistics
- Real-time updates

#### Charts (`pages/Charts.tsx`)
- Interactive analytics charts
- Time period selection (day/week/month/year)
- Chart types (bar/line/pie)
- View modes (all/outlet/device)
- Performance analysis

#### Outlets (`pages/Outlets.tsx`)
- Outlet management
- Machine assignment
- Contact information
- Status monitoring

#### Machines (`pages/Machines.tsx`)
- Machine management
- Device assignment
- Maintenance tracking
- Performance metrics

### Reusable Components

#### Layout (`components/Layout.tsx`)
- Sidebar navigation
- Header with user info
- Responsive design
- Theme management

#### Footer (`components/Footer.tsx`)
- Copyright information
- Version details
- System status

## 🔧 ESP32 Firmware

### Key Features
- WiFi connectivity
- MQTT communication
- Button input handling
- Data storage (SD card)
- Real-time clock (RTC)
- OTA updates

### Pin Configuration
```cpp
// Button Pins
#define BUTTON_BASIC_PIN 2
#define BUTTON_STANDARD_PIN 4
#define BUTTON_PREMIUM_PIN 5

// Status LED
#define LED_PIN 2

// SD Card (SPI)
#define SD_CS_PIN 5
#define SD_MOSI_PIN 23
#define SD_MISO_PIN 19
#define SD_SCK_PIN 18

// RTC (I2C)
#define RTC_SDA_PIN 21
#define RTC_SCL_PIN 22
```

### Main Functions
- `setup()` - Initialize hardware and connections
- `loop()` - Main program loop
- `handleButtonPress()` - Process button events
- `sendMQTTMessage()` - Send data to MQTT broker
- `updateDeviceStatus()` - Update device status

## 🔄 Development Workflow

### 1. Database Changes
```bash
# Create migration
python manage.py makemigrations

# Apply migration
python manage.py migrate

# Create custom data migration
python manage.py makemigrations --empty telemetry
```

### 2. Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### 3. ESP32 Development
```bash
# Compile firmware
pio run

# Upload to device
pio run --target upload

# Monitor serial output
pio device monitor

# OTA update
pio run --target upload --environment esp32dev_ota
```

### 4. Testing
```bash
# Test MQTT connection
python test-mqtt-python.py

# Test ESP32 MQTT
python test-esp32-mqtt.py
```

## 🚀 Deployment

### Production Backend
1. Set up PostgreSQL database
2. Configure environment variables
3. Set up MQTT broker (HiveMQ Cloud)
4. Deploy with Gunicorn + Nginx

### Production Frontend
1. Build React app: `npm run build`
2. Serve with Nginx or CDN
3. Configure API endpoints

### ESP32 Deployment
1. Configure WiFi credentials
2. Set MQTT broker details
3. Upload firmware via OTA or USB
4. Monitor device status

## 🐛 Troubleshooting

### Common Issues

#### MQTT Connection Failed
- Check broker credentials
- Verify network connectivity
- Check firewall settings
- Review MQTT logs

#### ESP32 Not Connecting
- Verify WiFi credentials
- Check MQTT broker settings
- Monitor serial output
- Reset device if needed

#### Frontend API Errors
- Check backend server status
- Verify API endpoint URLs
- Check CORS configuration
- Review browser console

#### Database Issues
- Run migrations: `python manage.py migrate`
- Check database permissions
- Review model definitions
- Check data integrity

### Debug Commands
```bash
# Check Django logs
python manage.py runserver --verbosity=2

# Test MQTT connection
python -c "import paho.mqtt.client as mqtt; print('MQTT library OK')"

# Check ESP32 serial
pio device monitor --baud 115200

# Frontend build check
npm run build --verbose
```

## 🤝 Contributing

### Development Guidelines
1. Follow PEP 8 for Python code
2. Use TypeScript for frontend
3. Write descriptive commit messages
4. Test changes thoroughly
5. Update documentation

### Code Style
- Python: Black formatter
- TypeScript: ESLint configuration
- C++: PlatformIO formatting

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For technical support or questions:
- Check this documentation
- Review existing issues
- Create new issue with detailed description
- Include logs and error messages

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintainer**: Development Team
