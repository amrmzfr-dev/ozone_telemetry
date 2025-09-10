#ifndef _MAIN_H
#define _MAIN_H

#include "Arduino.h"
#include <HTTPClient.h>
#include "Storage.h"
#include <WiFi.h>
#include <WiFiClient.h>                                                                                                                                                                  
#include <WebServer.h>
#include <Wire.h>
#include <RTClib.h>
#include <time.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
// #include "SD.h"
// #include <SPI.h>

#define BUTTON_HARDRESET    0   // Default Push Button
#define BASIC_PIN           13  // BASIC
#define STANDARD_PIN        12  // STANDARD
#define PREMIUM_PIN         14  // PREMIUM
#define INDICATOR_PIN       2

// RTC Pins (I2C)
#define RTC_SDA_PIN         22  // SDA
#define RTC_SCL_PIN         21  // SCL

// NTP Configuration for Kuala Lumpur (UTC+8)
#define NTP_SERVER          "pool.ntp.org"
#define GMT_OFFSET_SEC      (8 * 3600)  // UTC+8 for Kuala Lumpur
#define DAYLIGHT_OFFSET_SEC 0           // No daylight saving in Malaysia

// OTA Configuration
#define OTA_HOSTNAME        "OzonTelemetry"
#define OTA_PASSWORD        "ozon123"   // Change this password

// MQTT Configuration
#define MQTT_SERVER         "broker.hivemq.com"  // Free public broker for testing
#define MQTT_PORT           1883
#define MQTT_USERNAME       ""  // Leave empty for public broker
#define MQTT_PASSWORD       ""  // Leave empty for public broker
#define MQTT_CLIENT_ID      "OzonTelemetry_"
#define MQTT_TOPIC_STATUS   "telemetry/status/"
#define MQTT_TOPIC_EVENTS   "telemetry/events/"
#define MQTT_TOPIC_COMMANDS "telemetry/commands/"

// SD Card Pins (SPI) - commented out for now
// #define SD_CS_PIN           5   // Chip Select
// #define SD_SCK_PIN          18  // Clock
// #define SD_MOSI_PIN         23  // Master Out Slave In
// #define SD_MISO_PIN         19  // Master In Slave Out

uint16_t counter_basic    = 0;
uint16_t counter_standard = 0;
uint16_t counter_premium  = 0;

enum counter_type_name {
    COUNTER_BASIC,
    COUNTER_STANDARD,
    COUNTER_PREMIUM
};

bool indicator_state = false;
bool push_data_now = false;
char device_macaddr[17];
String device_macaddr_str;

bool started_basic = false;
bool started_standard = false;
bool started_premium = false;

bool wifi_connected = false;

uint32_t total_on_time_basic = 0;
uint32_t total_on_time_standard = 0;
uint32_t total_on_time_premium = 0;

// uint32_t minimum_time_basic = 200;
// uint32_t minimum_time_standard = 500;
// uint32_t minimum_time_premium = 800;
uint32_t minimum_time_basic = 5;
uint32_t minimum_time_standard = 5;
uint32_t minimum_time_premium = 5;

bool trigger_basic = false;
bool trigger_standard = false;
bool trigger_premium = false;

// RTC and SD Card variables
RTC_DS3231 rtc;
bool rtc_available = false;
// bool sd_available = false;  // commented out for now
// String log_filename = "/usage_log.csv";  // commented out for now
// String status_filename = "/status_log.csv";  // commented out for now

// MQTT variables
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool mqtt_connected = false;
String mqtt_client_id;
String mqtt_topic_status;
String mqtt_topic_events;
String mqtt_topic_commands;

void init_ap(void);
void init_webserver(void);
void init_task(void);
void taskServer(void *pvParameters);
void taskWiFi(void *pvParameters);
void taskHardReset(void *pvParameters);
void taskMonitorBasic(void *pvParameters);
void taskUptime(void *pvParameters);
void taskUpdater(void *pvParameters);
void taskPush(void *pvParameters);

void reset_data(void);
void send_header(void);
void send_body(String body);
void save_wifi_details(String ssid, String passphrase);
void save_tracker_url(String url);
void save_counter(uint8_t counter_type);
void init_wifi(void);
void init_gpio(void);
void init_counter(void);
void init_rtc(void);
void sync_rtc_time(void);
void init_ntp(void);
void sync_rtc_with_ntp(void);
void init_ota(void);
void init_mqtt(void);
void mqtt_reconnect(void);
void mqtt_callback(char* topic, byte* payload, unsigned int length);
void publish_status(void);
void publish_event(String event_type, uint16_t count);
// void init_sd(void);  // commented out for now
String get_timestamp(void);
// void log_usage_event(String machine_type, uint16_t count);  // commented out for now
// void log_status_update(void);  // commented out for now
// String get_historical_data(int days);  // commented out for now

#endif
