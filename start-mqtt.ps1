# PowerShell script to start Mosquitto MQTT broker with Docker
# Run with: .\start-mqtt.ps1

Write-Host "🚀 Starting Mosquitto MQTT Broker with Docker..." -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
try {
    docker --version 2>&1 | Out-Null
    Write-Host "✅ Docker found" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps 2>&1 | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Creating directories..." -ForegroundColor Yellow

# Create necessary directories
New-Item -ItemType Directory -Force -Path "mosquitto\config" | Out-Null
New-Item -ItemType Directory -Force -Path "mosquitto\data" | Out-Null
New-Item -ItemType Directory -Force -Path "mosquitto\log" | Out-Null

Write-Host "✅ Directories created" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 Starting Mosquitto container..." -ForegroundColor Yellow

# Start Mosquitto with Docker Compose
docker-compose -f docker-mosquitto.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Mosquitto MQTT Broker started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 MQTT Broker is running!" -ForegroundColor Green
    Write-Host "Broker: localhost:1883" -ForegroundColor Cyan
    Write-Host "WebSocket: localhost:9001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Test with:" -ForegroundColor Yellow
    Write-Host "docker exec -it ozon-mosquitto mosquitto_pub -h localhost -t test -m 'hello'" -ForegroundColor White
    Write-Host "docker exec -it ozon-mosquitto mosquitto_sub -h localhost -t test" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 View logs with:" -ForegroundColor Yellow
    Write-Host "docker logs ozon-mosquitto" -ForegroundColor White
} else {
    Write-Host "❌ Failed to start Mosquitto" -ForegroundColor Red
    Write-Host "Check Docker logs for details" -ForegroundColor Yellow
}
