# PowerShell script to install Mosquitto MQTT broker
# Run with: .\install-mosquitto.ps1

Write-Host "🚀 Installing Mosquitto MQTT Broker..." -ForegroundColor Green
Write-Host ""

# Check if Chocolatey is installed
try {
    choco --version 2>&1 | Out-Null
    Write-Host "✅ Chocolatey found" -ForegroundColor Green
} catch {
    Write-Host "❌ Chocolatey not found. Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

Write-Host ""
Write-Host "📦 Installing Mosquitto..." -ForegroundColor Yellow
choco install mosquitto -y

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Mosquitto installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install Mosquitto" -ForegroundColor Red
    Write-Host "Please install manually from: https://mosquitto.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔧 Creating Mosquitto configuration..." -ForegroundColor Yellow

# Create mosquitto config directory
$configDir = "C:\Program Files\mosquitto"
$configFile = "$configDir\mosquitto.conf"

# Create basic configuration
$config = @"
# Mosquitto Configuration for Ozon Telemetry

# Basic settings
listener 1883
allow_anonymous true
persistence true
persistence_location C:\Program Files\mosquitto\data\
log_dest file C:\Program Files\mosquitto\mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Performance settings
max_connections 1000
max_inflight_messages 100
max_queued_messages 1000

# WebSocket support (for web clients)
listener 9001
protocol websockets
"@

# Write configuration file
$config | Out-File -FilePath $configFile -Encoding UTF8

Write-Host "✅ Configuration created at: $configFile" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Starting Mosquitto service..." -ForegroundColor Yellow

# Start Mosquitto as Windows service
sc.exe create mosquitto binPath= "C:\Program Files\mosquitto\mosquitto.exe -c C:\Program Files\mosquitto\mosquitto.conf" start= auto
sc.exe start mosquitto

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Mosquitto service started successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Service might already be running or needs manual start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Mosquitto MQTT Broker Setup Complete!" -ForegroundColor Green
Write-Host "Broker running on: localhost:1883" -ForegroundColor Cyan
Write-Host "WebSocket on: localhost:9001" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Test with:" -ForegroundColor Yellow
Write-Host "mosquitto_pub -h localhost -t test -m 'hello'" -ForegroundColor White
Write-Host "mosquitto_sub -h localhost -t test" -ForegroundColor White
