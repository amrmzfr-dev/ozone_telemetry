# PowerShell script to scan for ESP32 devices on the network
# Run with: .\scan-esp32.ps1

Write-Host "🔍 Scanning for ESP32 devices on the network..." -ForegroundColor Green
Write-Host ""

# Get the local IP address and network range
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"} | Select-Object -First 1).IPAddress
if (-not $localIP) {
    Write-Host "❌ Could not determine local IP address" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Your local IP: $localIP" -ForegroundColor Cyan

# Extract network prefix (e.g., 192.168.1 from 192.168.1.100)
$networkPrefix = $localIP -replace '\.\d+$', ''
Write-Host "🌐 Scanning network: $networkPrefix.0/24" -ForegroundColor Cyan
Write-Host ""

# Function to test if a device responds
function Test-Device {
    param($ip)
    try {
        $ping = Test-Connection -ComputerName $ip -Count 1 -Quiet -TimeoutSeconds 1
        if ($ping) {
            # Try to get hostname
            try {
                $hostname = [System.Net.Dns]::GetHostByAddress($ip).HostName
            } catch {
                $hostname = "Unknown"
            }
            
            # Try to check if it's an ESP32 by looking for common ESP32 web server responses
            try {
                $webRequest = Invoke-WebRequest -Uri "http://$ip" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
                if ($webRequest.StatusCode -eq 200) {
                    $content = $webRequest.Content
                    if ($content -match "ESP32|OZONT|WiFi|telemetry|settings" -or $content -match "html|body") {
                        return @{
                            IP = $ip
                            Hostname = $hostname
                            Type = "ESP32 (Web Server)"
                            Status = "Active"
                        }
                    }
                }
            } catch {
                # Try common ESP32 ports
                $ports = @(80, 8080, 3000)
                foreach ($port in $ports) {
                    try {
                        $tcpClient = New-Object System.Net.Sockets.TcpClient
                        $tcpClient.Connect($ip, $port)
                        $tcpClient.Close()
                        return @{
                            IP = $ip
                            Hostname = $hostname
                            Type = "ESP32 (Port $port)"
                            Status = "Active"
                        }
                    } catch {
                        continue
                    }
                }
            }
            
            return @{
                IP = $ip
                Hostname = $hostname
                Type = "Unknown Device"
                Status = "Active"
            }
        }
    } catch {
        return $null
    }
    return $null
}

# Scan the network
$devices = @()
$totalIPs = 254
$currentIP = 0

Write-Host "🔄 Scanning IP addresses..." -ForegroundColor Yellow

for ($i = 1; $i -le 254; $i++) {
    $ip = "$networkPrefix.$i"
    $currentIP++
    
    # Show progress
    if ($currentIP % 50 -eq 0) {
        $progress = [math]::Round(($currentIP / $totalIPs) * 100, 1)
        Write-Progress -Activity "Scanning Network" -Status "Progress: $progress%" -PercentComplete $progress
    }
    
    $device = Test-Device -ip $ip
    if ($device) {
        $devices += $device
    }
}

Write-Progress -Activity "Scanning Network" -Completed

Write-Host ""
Write-Host "📊 Scan Results:" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

if ($devices.Count -eq 0) {
    Write-Host "❌ No active devices found on the network" -ForegroundColor Red
} else {
    Write-Host "✅ Found $($devices.Count) active device(s):" -ForegroundColor Green
    Write-Host ""
    
    foreach ($device in $devices) {
        Write-Host "🔹 IP: $($device.IP)" -ForegroundColor Cyan
        Write-Host "   Hostname: $($device.Hostname)" -ForegroundColor White
        Write-Host "   Type: $($device.Type)" -ForegroundColor Yellow
        Write-Host "   Status: $($device.Status)" -ForegroundColor Green
        Write-Host ""
    }
    
    # Check for ESP32 devices specifically
    $esp32Devices = $devices | Where-Object { $_.Type -like "*ESP32*" }
    if ($esp32Devices.Count -gt 0) {
        Write-Host "🎯 ESP32 Devices Found:" -ForegroundColor Magenta
        Write-Host "======================" -ForegroundColor Magenta
        foreach ($esp in $esp32Devices) {
            Write-Host "📱 ESP32 at $($esp.IP)" -ForegroundColor Magenta
            Write-Host "   Web Interface: http://$($esp.IP)" -ForegroundColor Cyan
            Write-Host "   Settings: http://$($esp.IP)/setting" -ForegroundColor Cyan
            Write-Host "   History: http://$($esp.IP)/history" -ForegroundColor Cyan
            Write-Host ""
        }
    }
}

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "- ESP32 devices typically show 'OZONT_XXXXXXXXXXXX' in their hostname" -ForegroundColor White
Write-Host "- Try accessing http://[IP] in your browser to see the ESP32 web interface" -ForegroundColor White
Write-Host "- Check your router's admin panel for a complete list of connected devices" -ForegroundColor White
