@echo off
REM Batch script to start both frontend and backend
REM Run with: start-dev.bat

echo 🚀 Starting Ozon Telemetry Development Environment...
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
echo 📦 Installing dependencies...

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ..\frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Running database migrations...
cd ..\backend
python manage.py migrate
if %errorlevel% neq 0 (
    echo ❌ Failed to run database migrations
    pause
    exit /b 1
)

echo.
echo 🎯 Starting servers...
echo Backend will run on: http://0.0.0.0:8000 (accessible from network)
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend in a new window
start "Backend Server" cmd /k "python manage.py runserver 0.0.0.0:8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in current window
cd ..\frontend
npm run dev
