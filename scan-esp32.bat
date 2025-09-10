@echo off
REM Batch script to scan for ESP32 devices on the network
REM Run with: scan-esp32.bat

echo 🔍 Scanning for ESP32 devices on the network...
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "localIP=%%a"
    goto :found
)
:found
set "localIP=%localIP: =%"

echo 📍 Your local IP: %localIP%

REM Extract network prefix
for /f "tokens=1,2,3 delims=." %%a in ("%localIP%") do (
    set "networkPrefix=%%a.%%b.%%c"
)

echo 🌐 Scanning network: %networkPrefix%.0/24
echo.

echo 🔄 Scanning IP addresses...
echo.

set "foundDevices=0"

REM Scan IP range
for /l %%i in (1,1,254) do (
    set "ip=%networkPrefix%.%%i"
    
    REM Ping the IP
    ping -n 1 -w 1000 !ip! >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Found active device at !ip!
        
        REM Try to get hostname
        for /f "tokens=1" %%h in ('nslookup !ip! 2^>nul ^| findstr /c:"Name:"') do (
            set "hostname=%%h"
        )
        
        REM Check if it's an ESP32 by trying common ports
        echo   Checking if ESP32...
        
        REM Try port 80 (HTTP)
        powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('!ip!', 80); $tcp.Close(); Write-Host '   🎯 ESP32 Web Server detected on port 80' } catch { }" 2>nul
        
        REM Try port 8080
        powershell -Command "try { $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('!ip!', 8080); $tcp.Close(); Write-Host '   🎯 ESP32 Web Server detected on port 8080' } catch { }" 2>nul
        
        echo   Web Interface: http://!ip!
        echo   Settings: http://!ip!/setting
        echo   History: http://!ip!/history
        echo.
        
        set /a foundDevices+=1
    )
)

if %foundDevices% equ 0 (
    echo ❌ No active devices found on the network
) else (
    echo 📊 Found %foundDevices% active device(s)
)

echo.
echo 💡 Tips:
echo - ESP32 devices typically show 'OZONT_XXXXXXXXXXXX' in their hostname
echo - Try accessing http://[IP] in your browser to see the ESP32 web interface
echo - Check your router's admin panel for a complete list of connected devices

pause
