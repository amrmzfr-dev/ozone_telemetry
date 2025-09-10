@echo off
REM Batch script to start Mosquitto MQTT broker with Docker
REM Run with: start-mqtt.bat

echo 🚀 Starting Mosquitto MQTT Broker with Docker...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo ✅ Docker found

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)
echo ✅ Docker is running

echo.
echo 🔧 Creating directories...

REM Create necessary directories
if not exist "mosquitto\config" mkdir "mosquitto\config"
if not exist "mosquitto\data" mkdir "mosquitto\data"
if not exist "mosquitto\log" mkdir "mosquitto\log"

echo ✅ Directories created

echo.
echo 🎯 Starting Mosquitto container...

REM Start Mosquitto with Docker Compose
docker-compose -f docker-mosquitto.yml up -d

if %errorlevel% equ 0 (
    echo ✅ Mosquitto MQTT Broker started successfully!
    echo.
    echo 🎉 MQTT Broker is running!
    echo Broker: localhost:1883
    echo WebSocket: localhost:9001
    echo.
    echo 💡 Test with:
    echo docker exec -it ozon-mosquitto mosquitto_pub -h localhost -t test -m "hello"
    echo docker exec -it ozon-mosquitto mosquitto_sub -h localhost -t test
    echo.
    echo 📊 View logs with:
    echo docker logs ozon-mosquitto
) else (
    echo ❌ Failed to start Mosquitto
    echo Check Docker logs for details
)

pause
