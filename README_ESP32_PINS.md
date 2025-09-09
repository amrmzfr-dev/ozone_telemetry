# ESP32 Wiring Guide: SD Card Module & RTC Module

This document describes the wiring connections between an ESP32 microcontroller, an SD card module, and a Real-Time Clock (RTC) module for the Ozone Telemetry System.  
Wire colors are based on your setup for easy reference.

---

## 🗂️ SD Card Module Wiring

| SD Card Module Pin | Wire Color | ESP32 Pin |
|--------------------|-----------|-----------|
| **CS**             | Blue      | D5        |
| **SCK**            | Green     | D18       |
| **MOSI**           | Yellow    | D23       |
| **MISO**           | Orange    | D19       |
| **VCC**            | Red       | 3.3V / 5V |
| **GND**            | Brown     | GND       |

---

## ⏰ RTC Module Wiring

| RTC Module Pin     | Wire Color | ESP32 Pin |
|--------------------|-----------|-----------|
| **32K**            | N/A       | N/A       |
| **SQW**            | N/A       | N/A       |
| **SCL**            | Black     | D21       |
| **SDA**            | White     | D22       |
| **VCC**            | Grey      | 3.3V      |
| **GND**            | Purple    | GND       |

---

## 📝 Notes
- The SD card module uses **SPI communication**:
  - `CS`, `SCK`, `MOSI`, `MISO` must match your ESP32's SPI pins.
- The RTC module uses **I²C communication**:
  - `SCL` → D21, `SDA` → D22 are ESP32 default I²C pins.
- Supply voltage:
  - Use **3.3V** if your modules are not 5V-tolerant.
- `32K` and `SQW` pins are not used in this setup.

---

## 📦 Suggested Libraries
- **SD Card:**  
  - [Arduino SD library](https://www.arduino.cc/en/Reference/SD)  
  - or [ESP32 SD_MMC library](https://github.com/espressif/arduino-esp32)
- **RTC (DS3231 or DS1307):**  
  - [RTClib](https://github.com/adafruit/RTClib)

---

## 🔌 Wiring Diagram (Text-Based)

```
ESP32 Dev Board
┌─────────────────────────────────────┐
│  [3.3V] ──── Red ──── [VCC] SD Card │
│  [GND]  ──── Brown ── [GND] SD Card │
│  [D5]   ──── Blue ─── [CS]  SD Card │
│  [D18]  ──── Green ── [SCK] SD Card │
│  [D23]  ──── Yellow ─ [MOSI]SD Card │
│  [D19]  ──── Orange ─ [MISO]SD Card │
│                                     │
│  [3.3V] ──── Grey ──── [VCC] RTC    │
│  [GND]  ──── Purple ── [GND] RTC    │
│  [D21]  ──── Black ─── [SCL] RTC    │
│  [D22]  ──── White ─── [SDA] RTC    │
└─────────────────────────────────────┘
```

---

## 🔧 Additional ESP32 Pins for Ozone Telemetry

| Component | ESP32 Pin | Purpose |
|-----------|-----------|---------|
| **Ozone Sensor** | D34 (ADC) | Analog reading |
| **Status LED** | D2 | System status indicator |
| **WiFi Reset** | D0 | WiFi configuration reset |
| **Power Control** | D4 | Sensor power control |

---

## ⚠️ Important Considerations

1. **Power Supply**: Ensure stable 3.3V supply for all modules
2. **Pull-up Resistors**: I²C lines (SDA/SCL) may need 4.7kΩ pull-up resistors
3. **Ground Plane**: Connect all GND pins to a common ground plane
4. **Cable Length**: Keep connections short to avoid signal degradation
5. **Shielding**: Consider shielding for long cable runs in noisy environments

---

## 🧪 Testing Connections

### SD Card Test
```cpp
#include <SD.h>
#include <SPI.h>

void setup() {
  Serial.begin(115200);
  if (!SD.begin(5)) {  // CS pin D5
    Serial.println("SD Card initialization failed!");
  } else {
    Serial.println("SD Card initialized successfully!");
  }
}
```

### RTC Test
```cpp
#include <Wire.h>
#include <RTClib.h>

RTC_DS3231 rtc;

void setup() {
  Serial.begin(115200);
  if (!rtc.begin()) {
    Serial.println("RTC initialization failed!");
  } else {
    Serial.println("RTC initialized successfully!");
    DateTime now = rtc.now();
    Serial.print("Current time: ");
    Serial.println(now.timestamp());
  }
}
```

---

## 📋 Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| SD Card not detected | Wrong CS pin | Check D5 connection |
| RTC not responding | I²C address conflict | Check SDA/SCL connections |
| Data corruption | Power supply issues | Check 3.3V stability |
| Intermittent failures | Loose connections | Re-solder or use breadboard |

---

*This wiring guide is part of the Ozone Telemetry System project. For more information, see the main project documentation.*
