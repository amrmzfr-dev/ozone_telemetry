@echo off
REM Batch script to install Mosquitto MQTT broker
REM Run with: install-mosquitto.bat

echo 🚀 Installing Mosquitto MQTT Broker...
echo.

REM Check if Chocolatey is installed
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Chocolatey not found. Installing Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
)

echo.
echo 📦 Installing Mosquitto...
choco install mosquitto -y

if %errorlevel% equ 0 (
    echo ✅ Mosquitto installed successfully!
) else (
    echo ❌ Failed to install Mosquitto
    echo Please install manually from: https://mosquitto.org/download/
    pause
    exit /b 1
)

echo.
echo 🔧 Creating Mosquitto configuration...

REM Create basic configuration
echo # Mosquitto Configuration for Ozon Telemetry > "C:\Program Files\mosquitto\mosquitto.conf"
echo. >> "C:\Program Files\mosquitto\mosquitto.conf"
echo # Basic settings >> "C:\Program Files\mosquitto\mosquitto.conf"
echo listener 1883 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo allow_anonymous true >> "C:\Program Files\mosquitto\mosquitto.conf"
echo persistence true >> "C:\Program Files\mosquitto\mosquitto.conf"
echo persistence_location C:\Program Files\mosquitto\data\ >> "C:\Program Files\mosquitto\mosquitto.conf"
echo log_dest file C:\Program Files\mosquitto\mosquitto.log >> "C:\Program Files\mosquitto\mosquitto.conf"
echo log_type error >> "C:\Program Files\mosquitto\mosquitto.conf"
echo log_type warning >> "C:\Program Files\mosquitto\mosquitto.conf"
echo log_type notice >> "C:\Program Files\mosquitto\mosquitto.conf"
echo log_type information >> "C:\Program Files\mosquitto\mosquitto.conf"
echo. >> "C:\Program Files\mosquitto\mosquitto.conf"
echo # Performance settings >> "C:\Program Files\mosquitto\mosquitto.conf"
echo max_connections 1000 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo max_inflight_messages 100 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo max_queued_messages 1000 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo. >> "C:\Program Files\mosquitto\mosquitto.conf"
echo # WebSocket support >> "C:\Program Files\mosquitto\mosquitto.conf"
echo listener 9001 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo protocol websockets >> "C:\Program Files\mosquitto\mosquitto.conf"

echo ✅ Configuration created

echo.
echo 🎯 Starting Mosquitto service...

REM Start Mosquitto as Windows service
sc.exe create mosquitto binPath= "C:\Program Files\mosquitto\mosquitto.exe -c C:\Program Files\mosquitto\mosquitto.conf" start= auto
sc.exe start mosquitto

if %errorlevel% equ 0 (
    echo ✅ Mosquitto service started successfully!
) else (
    echo ⚠️ Service might already be running or needs manual start
)

echo.
echo 🎉 Mosquitto MQTT Broker Setup Complete!
echo Broker running on: localhost:1883
echo WebSocket on: localhost:9001
echo.
echo 💡 Test with:
echo mosquitto_pub -h localhost -t test -m "hello"
echo mosquitto_sub -h localhost -t test

pause
