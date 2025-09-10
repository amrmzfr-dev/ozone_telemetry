# PowerShell script to download and run portable Mosquitto
# Run with: .\download-mosquitto.ps1

Write-Host "🚀 Setting up Portable Mosquitto MQTT Broker..." -ForegroundColor Green
Write-Host ""

# Create mosquitto directory
$mosquittoDir = ".\mosquitto-portable"
New-Item -ItemType Directory -Force -Path $mosquittoDir | Out-Null

Write-Host "📁 Created directory: $mosquittoDir" -ForegroundColor Cyan

# Download Mosquitto (using a direct link)
$mosquittoUrl = "https://mosquitto.org/files/win64/mosquitto-2.0.18-install-windows-x64.exe"
$mosquittoInstaller = "$mosquittoDir\mosquitto-installer.exe"

Write-Host "📥 Downloading Mosquitto installer..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $mosquittoUrl -OutFile $mosquittoInstaller
    Write-Host "✅ Download completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed. Please download manually from:" -ForegroundColor Red
    Write-Host "https://mosquitto.org/download/" -ForegroundColor Yellow
    Write-Host "Extract to: $mosquittoDir" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔧 Creating configuration..." -ForegroundColor Yellow

# Create mosquitto.conf
$configContent = @"
# Mosquitto Configuration for Ozon Telemetry

# Basic settings
listener 1883
allow_anonymous true
persistence true
persistence_location ./data/
log_dest file ./mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Performance settings
max_connections 1000
max_inflight_messages 100
max_queued_messages 1000

# WebSocket support
listener 9001
protocol websockets
"@

$configContent | Out-File -FilePath "$mosquittoDir\mosquitto.conf" -Encoding UTF8

# Create data directory
New-Item -ItemType Directory -Force -Path "$mosquittoDir\data" | Out-Null

Write-Host "✅ Configuration created" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Starting Mosquitto..." -ForegroundColor Yellow

# Try to run mosquitto directly
$mosquittoExe = "$mosquittoDir\mosquitto.exe"
if (Test-Path $mosquittoExe) {
    Write-Host "✅ Found mosquitto.exe, starting server..." -ForegroundColor Green
    Start-Process -FilePath $mosquittoExe -ArgumentList "-c", "mosquitto.conf" -WorkingDirectory $mosquittoDir
} else {
    Write-Host "⚠️ Please install Mosquitto manually:" -ForegroundColor Yellow
    Write-Host "1. Run: $mosquittoInstaller" -ForegroundColor White
    Write-Host "2. Install to: $mosquittoDir" -ForegroundColor White
    Write-Host "3. Copy mosquitto.exe to: $mosquittoDir" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 Mosquitto setup complete!" -ForegroundColor Green
Write-Host "Configuration: $mosquittoDir\mosquitto.conf" -ForegroundColor Cyan
Write-Host "Data directory: $mosquittoDir\data" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To start manually:" -ForegroundColor Yellow
Write-Host "cd $mosquittoDir" -ForegroundColor White
Write-Host ".\mosquitto.exe -c mosquitto.conf" -ForegroundColor White
