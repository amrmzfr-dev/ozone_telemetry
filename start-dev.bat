@echo off
REM Batch script to start both frontend and backend servers
REM Run with: start-dev.bat

echo 🚀 Starting Ozon Telemetry Servers...
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python and try again.
    pause
    exit /b 1
)
echo ✅ Python found

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js and try again.
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo 🎯 Starting servers...
echo Backend will run on: http://0.0.0.0:8000 (accessible from network)
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend in a new window
start "Backend Server" cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"

REM Start MQTT client in a new window
start "MQTT Client" cmd /k "cd backend && python manage.py start_mqtt"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in current window
cd frontend
npm run dev
