@echo off
REM Batch script to test MQTT communication
REM Run with: test-mqtt.bat

echo 🧪 Testing MQTT Communication...
echo.

REM Check if mosquitto clients are available
mosquitto_pub -h broker.hivemq.com -t test -m "test" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Mosquitto clients not found. Please install Mosquitto first.
    echo Download from: https://mosquitto.org/download/
    pause
    exit /b 1
)
echo ✅ Mosquitto clients found

echo.
echo 📡 Testing MQTT broker connection...

REM Test connection to broker
set testMessage=Hello from Batch test
set testTopic=test/ozon_telemetry

echo Publishing test message...
mosquitto_pub -h broker.hivemq.com -t %testTopic% -m "%testMessage%"

if %errorlevel% equ 0 (
    echo ✅ Test message published successfully!
) else (
    echo ❌ Failed to publish test message
    pause
    exit /b 1
)

echo.
echo 📥 Testing message subscription...
echo Listening for messages on topic: %testTopic%
echo Press Ctrl+C to stop listening...
echo.

REM Subscribe to test topic
mosquitto_sub -h broker.hivemq.com -t %testTopic%
