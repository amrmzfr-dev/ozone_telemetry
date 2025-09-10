@echo off
REM Batch script to perform OTA update to ESP32
REM Run with: ota-update.bat

set TARGET_IP=10.172.66.213
set PASSWORD=ozon123

echo 🚀 Starting OTA Update to ESP32...
echo Target IP: %TARGET_IP%
echo Password: %PASSWORD%
echo.

REM Check if PlatformIO is installed
pio --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PlatformIO not found. Please install PlatformIO CLI first.
    echo Install with: pip install platformio
    pause
    exit /b 1
)
echo ✅ PlatformIO found

REM Check if we're in the correct directory
if not exist "OzonTelemetry\platformio.ini" (
    echo ❌ OzonTelemetry directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo 📁 Changing to OzonTelemetry directory...
cd OzonTelemetry

echo.
echo 🔧 Building project...
pio run -e esp32dev_ota
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📤 Uploading firmware via OTA...
echo This may take a few minutes...

pio run -e esp32dev_ota -t upload

if %errorlevel% equ 0 (
    echo.
    echo ✅ OTA Update completed successfully!
    echo ESP32 at %TARGET_IP% has been updated
    echo.
    echo 💡 You can now:
    echo - Check the device status at http://%TARGET_IP%/setting
    echo - Monitor the serial output for any issues
) else (
    echo.
    echo ❌ OTA Update failed!
    echo Possible causes:
    echo - ESP32 is not reachable at %TARGET_IP%
    echo - Wrong password (current: %PASSWORD%)
    echo - ESP32 is not in OTA mode
    echo - Network connectivity issues
)

echo.
pause
