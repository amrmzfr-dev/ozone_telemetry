# PowerShell script to start both frontend and backend servers
# Run with: .\start-dev.ps1

Write-Host "🚀 Starting Ozon Telemetry Servers..." -ForegroundColor Green
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python and try again." -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 Starting servers..." -ForegroundColor Green
Write-Host "Backend will run on: http://0.0.0.0:8000 (accessible from network)" -ForegroundColor Cyan
Write-Host "Frontend will run on: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; python manage.py runserver 0.0.0.0:8000"

# Start MQTT client in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; python manage.py start_mqtt"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in current window
Set-Location frontend
npm run dev
