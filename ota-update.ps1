# PowerShell script to perform OTA update to ESP32
# Run with: .\ota-update.ps1

param(
    [string]$TargetIP = "10.172.66.249",
    [string]$Password = "ozon123"
)

Write-Host "🚀 Starting OTA Update to ESP32..." -ForegroundColor Green
Write-Host "Target IP: $TargetIP" -ForegroundColor Cyan
Write-Host "Password: $Password" -ForegroundColor Cyan
Write-Host ""

# Check if PlatformIO is installed
try {
    $pioVersion = pio --version 2>&1
    Write-Host "✅ PlatformIO found: $pioVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PlatformIO not found. Please install PlatformIO CLI first." -ForegroundColor Red
    Write-Host "Install with: pip install platformio" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the correct directory
if (-not (Test-Path "OzonTelemetry/platformio.ini")) {
    Write-Host "❌ OzonTelemetry directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📁 Changing to OzonTelemetry directory..." -ForegroundColor Yellow
Set-Location OzonTelemetry

Write-Host ""
Write-Host "🔧 Building project..." -ForegroundColor Yellow
pio run -e esp32dev_ota

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📤 Uploading firmware via OTA..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

pio run -e esp32dev_ota -t upload

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ OTA Update completed successfully!" -ForegroundColor Green
    Write-Host "ESP32 at $TargetIP has been updated" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 You can now:" -ForegroundColor Yellow
    Write-Host "- Check the device status at http://$TargetIP/setting" -ForegroundColor White
    Write-Host "- Monitor the serial output for any issues" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ OTA Update failed!" -ForegroundColor Red
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "- ESP32 is not reachable at $TargetIP" -ForegroundColor White
    Write-Host "- Wrong password (current: $Password)" -ForegroundColor White
    Write-Host "- ESP32 is not in OTA mode" -ForegroundColor White
    Write-Host "- Network connectivity issues" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
