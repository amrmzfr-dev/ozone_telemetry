# PowerShell script to test MQTT communication
# Run with: .\test-mqtt.ps1

Write-Host "🧪 Testing MQTT Communication..." -ForegroundColor Green
Write-Host ""

# Check if mosquitto clients are available
try {
    $mosquittoPub = Get-Command mosquitto_pub -ErrorAction Stop
    $mosquittoSub = Get-Command mosquitto_sub -ErrorAction Stop
    Write-Host "✅ Mosquitto clients found" -ForegroundColor Green
} catch {
    Write-Host "❌ Mosquitto clients not found. Please install Mosquitto first." -ForegroundColor Red
    Write-Host "Download from: https://mosquitto.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📡 Testing MQTT broker connection..." -ForegroundColor Yellow

# Test connection to broker
$testMessage = "Hello from PowerShell test"
$testTopic = "test/ozon_telemetry"

Write-Host "Publishing test message..." -ForegroundColor Cyan
mosquitto_pub -h broker.hivemq.com -t $testTopic -m $testMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test message published successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to publish test message" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📥 Testing message subscription..." -ForegroundColor Yellow
Write-Host "Listening for messages on topic: $testTopic" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop listening..." -ForegroundColor Yellow
Write-Host ""

# Subscribe to test topic
mosquitto_sub -h broker.hivemq.com -t $testTopic
