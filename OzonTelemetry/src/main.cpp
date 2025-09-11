#include "main.h"

String filename_basic_counter    = "/BASIC";
String filename_standard_counter = "/STANDARD";
String filename_premium_counter  = "/PREMIUM";

WebServer server(80);
uint32_t global_uptime = 0;

void setup() {
    Serial.begin(115200);

    // Setting up Storage for Configurations
    storage.begin();

    // Setting up Input and Output
    init_gpio();
    
    // Setting up SoftAP
    init_ap();

    // Setting up WiFi
    init_wifi();

    // Setting up Webserver
    init_webserver();

    // Setting up counter
    init_counter();

    // Setting up RTC
    init_rtc();
    
    // Setting up NTP
    init_ntp();
    
    // Setting up OTA
    init_ota();
    
    // Setting up MQTT
    init_mqtt();
    
    // Setting up SD Card (commented out for now)
    // init_sd();

    // Setting up Tasker
    init_task(); 
}


void init_counter(void) {
    // if the respective counter file exists, read it and put to global variable.
    if(storage.exists(filename_basic_counter)) {
        String counter_basic_str = storage.readFile(SPIFFS, filename_basic_counter);
        counter_basic_str.trim();
        counter_basic = counter_basic_str.toInt();
    } 
    if(storage.exists(filename_standard_counter)) {
        String counter_standard_str = storage.readFile(SPIFFS, filename_standard_counter);
        counter_standard_str.trim();
        counter_standard = counter_standard_str.toInt();
    } 
    if(storage.exists(filename_premium_counter)) {
        String counter_premium_str = storage.readFile(SPIFFS, filename_premium_counter);
        counter_premium_str.trim();
        counter_premium = counter_premium_str.toInt();
    } 
}


void init_gpio(void) {
    pinMode(BUTTON_HARDRESET, INPUT);
    pinMode(INDICATOR_PIN, OUTPUT);
}


void init_wifi(void) {
    String filename_ssid = "/SSID";
    String filename_pass = "/PASSPHRASE";
    if(storage.exists(filename_ssid) && storage.exists(filename_pass)) {
        char ssid[128];
        char passphrase[128];
        String ssid_string = storage.readFile(SPIFFS, filename_ssid);
        ssid_string.trim();
        ssid_string.toCharArray(ssid, ssid_string.length() + 1);
    
        String pass_string = storage.readFile(SPIFFS, filename_pass);
        pass_string.trim();
        pass_string.toCharArray(passphrase, pass_string.length() + 1);

        String cmd = "Connection [" + ssid_string + "][" + pass_string + "]";
        WiFi.setTxPower(WIFI_POWER_19_5dBm);
        WiFi.begin(ssid, passphrase);
        // WiFi.begin("LiTS2", "BondBond12\$");

        Serial.println("Initiate WiFi Connectivity." + cmd);
    } else {
        // Generate a default wifi and push to the system and reboot.
        save_wifi_details("testtest", "mb95z78y");

        // Restart it 
        ESP.restart();
    }
}


void save_wifi_details(String ssid, String passphrase) {
    String filename = "/SSID";

    // We dont care is it exists...just override the file
    storage.writeFile(SPIFFS, filename, ssid);

    filename = "/PASSPHRASE";
    storage.writeFile(SPIFFS, filename, passphrase);
}


void save_tracker_url(String url) {
    String filename = "/TRACKERURL";
    storage.writeFile(SPIFFS, filename, url);
}


void save_counter(uint8_t counter_type) {
    switch(counter_type) {
        case COUNTER_BASIC:
            storage.writeFile(SPIFFS, filename_basic_counter, String(counter_basic));
            break;

        case COUNTER_STANDARD:
            storage.writeFile(SPIFFS, filename_standard_counter, String(counter_standard));
            break;

        case COUNTER_PREMIUM:
            storage.writeFile(SPIFFS, filename_premium_counter, String(counter_premium));
            break;
    }
}


void send_header(void) {
    server.sendHeader("Connection", "close");
}

void send_body(String body) {
    server.send(200, "text/html", body);
}


void init_webserver(void) {

    // ### Index page
    
    server.on("/", HTTP_GET, []() {
        send_header();
        String html = "<pre>Ozon Telemetry Device";
        send_body(html);
    });
     

    server.on("/setting", HTTP_GET, []() {
        send_header();

        String html_ssid = "";
        String html_pass = "";
        String html_tracker = "";
        String filename = "/SSID";
        if(storage.exists(filename)) { 
            html_ssid = storage.readFile(SPIFFS, filename);
            html_ssid.trim();
        }
        filename = "/PASSPHRASE";
        if(storage.exists(filename)) { 
            html_pass = storage.readFile(SPIFFS, filename);
            html_pass.trim();
        }
        filename = "/TRACKERURL";
        if(storage.exists(filename)) { 
            html_tracker = storage.readFile(SPIFFS, filename);
            html_tracker.trim();
        }
        
        char global_uptime_char[16];
        sprintf(global_uptime_char, "%d", global_uptime);
        String index_html_str = "<html><head><title>Ozon Telemetry Node Admin</title><meta name='viewport' content='width=device-width,initial-scale=1'></head><body bgcolor='#EEEEEE'><pre><h2>Ozon Telemetry Node Admin</h2>";
        index_html_str = index_html_str + "<h3>[" + device_macaddr_str + "]</h3>";

        index_html_str = index_html_str + "<h3><b>WiFi Status:</b>";
        if(wifi_connected) {
            index_html_str = index_html_str + "Connected [" + WiFi.localIP().toString() + "]" ;
        } else {
            index_html_str = index_html_str + "Not Connected";
        }

        index_html_str = index_html_str + "<h3>Uptime:</h3> " + global_uptime_char + "<h3><b>WiFi:</b></h3>[" + html_ssid + "][" + html_pass + "] <form method='POST' action='/setting' id='form_ssid'><input type='hidden' name='form' value='wifi'>SSID:<input name='ssid'> Passphrase: <input name='passphrase'> <input type='submit' value='Update WiFi Settings'></form>";
        index_html_str = index_html_str + "<h3><b>Tracker Server:</b></h3>[" + html_tracker + "]<form method='POST' action='/setting' id='form_server'><input type='hidden' name='form' value='tracker'>URL:<input name='url'> <input type='submit' value='Update Tracker URL'></form>";
        index_html_str = index_html_str + "<h3><b>Counter Settings:</b></h3><form method='POST' action='/setting' id='form_counter'><input type='hidden' name='form' value='counter'>BASIC:<input name='basic' value='" + String(counter_basic) + "'><br>STANDARD:<input name='standard' value='" + String(counter_standard) + "'><br>PREMIUM:<input name='premium' value='" + String(counter_premium) + "'><br><input type='submit' value='Update Counters'></form>";
        index_html_str = index_html_str + "<h3><b>System Status:</b></h3>";
        index_html_str = index_html_str + "<p>RTC: " + String(rtc_available ? "Available" : "Not Available") + "</p>";
        index_html_str = index_html_str + "<p>MQTT: " + String(mqtt_connected ? "Connected" : "Disconnected") + "</p>";
        // index_html_str = index_html_str + "<p>SD Card: " + String(sd_available ? "Available" : "Not Available") + "</p>";  // commented out for now
        index_html_str = index_html_str + "<p>Current Time: " + get_timestamp() + "</p>";
        index_html_str = index_html_str + "<h3><b>MQTT Configuration:</b></h3>";
        index_html_str = index_html_str + "<p>Broker: " + String(MQTT_SERVER) + ":" + String(MQTT_PORT) + "</p>";
        index_html_str = index_html_str + "<p>Client ID: " + mqtt_client_id + "</p>";
        index_html_str = index_html_str + "<p>Status Topic: " + mqtt_topic_status + "</p>";
        index_html_str = index_html_str + "<p>Events Topic: " + mqtt_topic_events + "</p>";
        index_html_str = index_html_str + "<h3><b>OTA Update:</b></h3>";
        index_html_str = index_html_str + "<p>Hostname: " + String(OTA_HOSTNAME) + "</p>";
        index_html_str = index_html_str + "<p>Password: " + String(OTA_PASSWORD) + "</p>";
        index_html_str = index_html_str + "<p>Port: 3232</p>";
        index_html_str = index_html_str + "<h3><b>Data & Reports:</b></h3>";
        // index_html_str = index_html_str + "<p><a href='/history'>View Historical Data</a></p>";  // commented out for now
        index_html_str = index_html_str + "<p><a href='/reboot'>Reboot Device</a></p></body></html>";
        // server.send(200, "text/html", index_html_str);
        send_body(index_html_str);
    });

    // Handling POST request
    server.on("/setting", HTTP_POST, []() {
        send_header();

        String html_ssid = "";
        String html_pass = "";
        String html_url = "";
        String html_basic = "";
        String html_standard = "";
        String html_premium = "";

        String html= "<pre>";
        uint8_t form_post = 0;      /*
                                     * 0: Nothing
                                     * 1: wifi config
                                     * 2: server tracker config
                                     */

        for(uint8_t i = 0; i < server.args(); i++) {
            // html = html + server.argName(i) + " | " + server.arg(i) + "\n";
            // Determine mode:
            if(server.argName(i) == "form" && server.arg(i) == "wifi") {
                form_post = 1;
                continue;       // Move to next loop.
            } else if(server.argName(i) == "form" && server.arg(i) == "tracker") {
                form_post = 2;
                continue;       // Move to next loop.
            } else if(server.argName(i) == "form" && server.arg(i) == "counter") {
                form_post = 3;
                continue;
            }

            if(server.argName(i) == "ssid") {
                html_ssid = server.arg(i);                
            } else if(server.argName(i) == "passphrase") {
                html_pass = server.arg(i);
            } else if(server.argName(i) == "url") {
                html_url = server.arg(i);
            } else if(server.argName(i) == "basic") {
                html_basic = server.arg(i);
            } else if(server.argName(i) == "standard") {
                html_standard = server.arg(i);
            } else if(server.argName(i) == "premium") {
                html_premium = server.arg(i);
            }
        }

        if(form_post == 1) {
            // Save the details to SPIFFS
            save_wifi_details(html_ssid, html_pass);    

            html = "Update WiFi: [" + html_ssid + "] [" + html_pass + "] Done.";
        } else if(form_post == 2) {
            // Save the detail to SPIFFS
            save_tracker_url(html_url);

            html = "Update Tracker URL: [" + html_url + "] Done.";
        } else if(form_post == 3) {
            // Save the basic, standard and premium
            counter_basic = html_basic.toInt();
            counter_standard = html_standard.toInt();
            counter_premium = html_premium.toInt();

            save_counter(COUNTER_BASIC);
            save_counter(COUNTER_STANDARD);
            save_counter(COUNTER_PREMIUM);
            html = "Update Counter:[ BASIC" + html_basic + " STANDARD: " + html_standard + " PREMIUM: " + html_premium + "] Done.";
        }

        send_body(html);
    });


    // Handling REBOOT
    server.on("/reboot", HTTP_GET, []() {
        send_header();
        ESP.restart();
    });

    // Handling RTC SYNC
    server.on("/sync", HTTP_GET, []() {
        send_header();
        sync_rtc_time();
        String html = "RTC time synced. Current time: " + get_timestamp();
        send_body(html);
    });

    // Historical data page (commented out for now)
    /*
    server.on("/history", HTTP_GET, []() {
        send_header();
        String html = "<html><head><title>Historical Data - Ozon Telemetry</title><meta name='viewport' content='width=device-width,initial-scale=1'></head><body bgcolor='#EEEEEE'>";
        html += "<h2>Historical Data</h2>";
        html += "<h3>Device: " + device_macaddr_str + "</h3>";
        html += "<h3>Current Time: " + get_timestamp() + "</h3>";
        html += "<p><a href='/setting'>Back to Settings</a></p>";
        
        // RTC and SD Card status
        html += "<h3>System Status:</h3>";
        html += "<p>RTC: " + String(rtc_available ? "Available" : "Not Available") + "</p>";
        html += "<p>SD Card: " + String(sd_available ? "Available" : "Not Available") + "</p>";
        
        if (sd_available) {
            html += get_historical_data(7); // Last 7 days
        } else {
            html += "<p>SD Card not available for historical data</p>";
        }
        
        html += "</body></html>";
        send_body(html);
    });
    */

    server.begin();
}


void init_task(void) {
    // Tasks...
    xTaskCreatePinnedToCore(
        taskServer,
        "TaskServer",           // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        0                       // Using CPU 0
    );

    xTaskCreatePinnedToCore(
        taskWiFi,
        "TaskWiiFi",            // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        0                       // Using CPU 0
    );

    xTaskCreatePinnedToCore(
        taskHardReset,
        "Task HardReset",       // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        0                       // Using CPU 0
    );

    xTaskCreatePinnedToCore(
        taskUptime,
        "Task Uptime",          // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        0                       // Using CPU 0
    );

    xTaskCreatePinnedToCore(
        taskMonitorBasic,
        "Task Monitor Basic",   // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        1                       // Using CPU 1
    );

    xTaskCreatePinnedToCore(
        taskUpdater,
        "Task Log Messages",    // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        1                       // Using CPU 1
    );

    xTaskCreatePinnedToCore(
        taskPush,
        "Task Push",            // Name of the process
        8192,                   // This stack size can be checked & adjusted by reading the Stack Highwater
        NULL,
        4,                      // Priority
        NULL,
        1                       // Using CPU 1
    );
}



void taskMonitorBasic(void *pvParameters) {
    (void) pvParameters;
    uint32_t last_check = 0;

    uint32_t last_display = 0;

    // Debounce timers
    static uint32_t last_basic_trigger = 0;
    static uint32_t last_standard_trigger = 0;
    static uint32_t last_premium_trigger = 0;

    // Pin Setup
    pinMode(BASIC_PIN, INPUT_PULLUP);
    pinMode(STANDARD_PIN, INPUT_PULLUP);
    pinMode(PREMIUM_PIN, INPUT_PULLUP);

    for(;;) {
        if ((uint32_t)(millis() - last_check) > 100) {

            // Machine ON state - BASIC
            if (digitalRead(BASIC_PIN) != HIGH) {
                if (!started_basic && (millis() - last_basic_trigger > 50)) {
                    started_basic = true;
                    last_basic_trigger = millis();
                    counter_basic++;
                    save_counter(COUNTER_BASIC);
                    // log_usage_event("BASIC", counter_basic);  // commented out for now
                    Serial.print("Instant Counter (BASIC): "); Serial.println(counter_basic);
                    push_data_now = true;
                    trigger_basic = true;
                }
            } else {
                started_basic = false;
            }

            // Machine ON state - STANDARD
            if (digitalRead(STANDARD_PIN) != HIGH) {
                if (!started_standard && (millis() - last_standard_trigger > 50)) {
                    started_standard = true;
                    last_standard_trigger = millis();
                    counter_standard++;
                    save_counter(COUNTER_STANDARD);
                    // log_usage_event("STANDARD", counter_standard);  // commented out for now
                    Serial.print("Instant Counter (STANDARD): "); Serial.println(counter_standard);
                    push_data_now = true;
                    trigger_standard = true;
                }
            } else {
                started_standard = false;
            }

            // Machine ON state - PREMIUM
            if (digitalRead(PREMIUM_PIN) != HIGH) {
                if (!started_premium && (millis() - last_premium_trigger > 50)) {
                    started_premium = true;
                    last_premium_trigger = millis();
                    counter_premium++;
                    save_counter(COUNTER_PREMIUM);
                    // log_usage_event("PREMIUM", counter_premium);  // commented out for now
                    Serial.print("Instant Counter (PREMIUM): "); Serial.println(counter_premium);
                    push_data_now = true;
                    trigger_premium = true;
                }
            } else {
                started_premium = false;
            }

            last_check = millis();
        }

        if ((uint32_t)(millis() - last_display) > 1000) {
            // DEBUG ONLY
            Serial.print("Triggered (BASIC)   : "); Serial.println(started_basic);
            Serial.print("Triggered (STANDARD): "); Serial.println(started_standard);
            Serial.print("Triggered (PREMIUM) : "); Serial.println(started_premium);
            Serial.println("");

            indicator_state = !indicator_state;
            digitalWrite(INDICATOR_PIN, indicator_state);

            last_display = millis();
        }

        vTaskDelay(100);
    }
}


void taskUpdater(void *pvParameters) {
    (void) pvParameters;

    uint32_t lastUpdate = 0;    // In seconds

    for(;;) {
        // Heartbeat: every 60 seconds
        if((uint32_t) (global_uptime - lastUpdate) > 59) {
        // if((uint32_t) (global_uptime - lastUpdate) > 10) {
            // Reconnect MQTT if needed
            if (!mqttClient.connected()) {
                mqtt_connected = false;
                mqtt_reconnect();
            }
            
            // Publish status via MQTT
            if (mqtt_connected) {
                publish_status();
                Serial.println("Status published via MQTT.");
            } else {
                Serial.println("MQTT not connected, skipping status update.");
            }
            
            // Log status to SD card
            // log_status_update();  // commented out for now

            lastUpdate = global_uptime;
        }
        vTaskDelay(100);
    }
}


void taskPush(void *pvParameters) {
    (void) pvParameters;

    uint32_t lastUpdate = 0;    // In seconds

    for(;;) {
        // Every 100mS
        if((uint32_t) (millis() - lastUpdate) > 100) {
            if(push_data_now) {
                // Reconnect MQTT if needed
                if (!mqttClient.connected()) {
                    mqtt_connected = false;
                    mqtt_reconnect();
                }
                
                // Determine event type
                String event_trigger = "";
                uint16_t count = 1;  // Always send 1 for each event

                if(trigger_basic) {
                    event_trigger = "BASIC";
                } else if(trigger_standard) {
                    event_trigger = "STANDARD";
                } else if(trigger_premium) {
                    event_trigger = "PREMIUM";
                }

                trigger_basic = false;
                trigger_standard = false;
                trigger_premium = false;

                // Publish event via MQTT
                if (mqtt_connected && event_trigger != "") {
                    publish_event(event_trigger, count);
                    Serial.println("Event published via MQTT: " + event_trigger);
                } else if (event_trigger != "") {
                    Serial.println("MQTT not connected, skipping event: " + event_trigger);
                }

                push_data_now = false;
            }

            lastUpdate = millis();
        }
        vTaskDelay(100);
    }
}

void taskUptime(void *pvParameters) {
    (void) pvParameters;
    uint32_t last_check = 0;

    for(;;) {
        if((uint32_t) (millis() - last_check) > 999) {
            global_uptime++;
            last_check = millis();
        }
        vTaskDelay(10);
    }
}


void reset_data(void) {
    Serial.println("Clearing SPIFFS.");
    storage.format();
    Serial.println("Done. Rebooting now.");
    ESP.restart();
}


void taskHardReset(void *pvParameters) {
    (void) pvParameters;
    uint32_t last_check = 0;

    for(;;) {
        if((uint32_t) (millis() - last_check) > 100) {
            // LOW = PRESS, HIGH = RELEASE
            if(digitalRead(BUTTON_HARDRESET) == 0) {
                reset_data();
            }   

            last_check = millis();
        }
        vTaskDelay(100);
    }
}


void taskWiFi(void *pvParameters) {
    (void) pvParameters;
    static bool was_connected = false;

    for(;;) {
        if(WiFi.status() == WL_CONNECTED) {
            if (!was_connected) {
                Serial.println("WiFi Connected - syncing RTC with NTP");
                sync_rtc_with_ntp();
                was_connected = true;
            }
            wifi_connected = true;
        } else {
            if (was_connected) {
                Serial.println("WiFi disconnected");
                was_connected = false;
            }
            wifi_connected = false;
        }
        vTaskDelay(1000);
    }
}


void taskServer(void *pvParameters) {
    (void) pvParameters;

    for(;;) {
        server.handleClient();
        
        // Handle OTA updates
        ArduinoOTA.handle();
        
        // Handle MQTT
        if (wifi_connected) {
            if (!mqttClient.connected()) {
                mqtt_connected = false;
                mqtt_reconnect();
            } else {
                mqtt_connected = true;
                mqttClient.loop();
            }
        }
          
        // Delay another 100mS
        vTaskDelay(100);
    }
}


void init_ap(void) {
    // NOTE:
    // Using Mac Address as SSID and PASSWORD. 
    // e.g.:
    // MAC ADDRESS > 00:11:22:33:44:AE
    // SSID >>>>>>>> OZONT_0011223344AE
    // PASSWORD >>>> 0011223344AEADAM
    uint8_t mac_addr[6];
    esp_read_mac(mac_addr, ESP_MAC_WIFI_STA);

    // Store to global for later use
    sprintf(
        device_macaddr,
        "%02X:%02X:%02X:%02X:%02X:%02X",
        mac_addr[0],
        mac_addr[1],
        mac_addr[2],
        mac_addr[3],
        mac_addr[4],
        mac_addr[5]
    );
    mac_addr[17] = '\0';
    device_macaddr_str = String(device_macaddr);

    char ap_ssid[32];
    char ap_pass[32];
    sprintf(
        ap_ssid,
        "OZONT_%02X%02X%02X%02X%02X%02X",
        mac_addr[0],
        mac_addr[1],
        mac_addr[2],
        mac_addr[3],
        mac_addr[4],
        mac_addr[5]
    );  
    ap_ssid[18] = '\0';

    sprintf(
        ap_pass,
        "%02X%02X%02X%02X%02X%02XADAM",
        mac_addr[0],
        mac_addr[1],
        mac_addr[2],
        mac_addr[3],
        mac_addr[4],
        mac_addr[5]
    );  
    ap_pass[20] = '\0';

    Serial.printf("AP: %s\r\n", ap_ssid);

    // (const char* ssid, const char* password, int channel, int ssid_hidden, int max_connection)
    // Due to some issues on client end, changed to mesb1234
    const char *passphrase = "mesb1234";
    // WiFi.softAP(ap_ssid, ap_pass, 13, false, 8);
    WiFi.softAP(ap_ssid, passphrase, 13, false, 8);
    IPAddress IP = WiFi.softAPIP();
    Serial.print("AP: ");
    Serial.println(IP);
}


void init_rtc(void) {
    Wire.begin(RTC_SDA_PIN, RTC_SCL_PIN);
    
    if (!rtc.begin()) {
        Serial.println("RTC not found!");
        rtc_available = false;
        return;
    }
    
    if (rtc.lostPower()) {
        Serial.println("RTC lost power, will sync with NTP when WiFi is connected");
        // Don't set time here, wait for NTP sync
    }
    
    rtc_available = true;
    Serial.println("RTC initialized successfully");
    Serial.print("Current RTC time: ");
    Serial.println(get_timestamp());
}

void init_ntp(void) {
    // Configure time with NTP
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.println("NTP configured for Kuala Lumpur timezone (UTC+8)");
}

void sync_rtc_with_ntp(void) {
    if (!rtc_available || !wifi_connected) {
        Serial.println("Cannot sync RTC: RTC unavailable or WiFi not connected");
        return;
    }
    
    Serial.println("Syncing RTC with NTP...");
    
    // Wait for NTP time to be available
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Failed to obtain NTP time");
        return;
    }
    
    // Convert to DateTime and adjust RTC
    DateTime ntpTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    
    rtc.adjust(ntpTime);
    Serial.println("RTC synced with NTP successfully");
    Serial.print("New RTC time: ");
    Serial.println(get_timestamp());
}

void sync_rtc_time(void) {
    // Legacy function - now uses NTP sync
    sync_rtc_with_ntp();
}

void init_ota(void) {
    // Set OTA hostname
    ArduinoOTA.setHostname(OTA_HOSTNAME);
    
    // Set OTA password
    ArduinoOTA.setPassword(OTA_PASSWORD);
    
    // Set OTA port (default 3232)
    ArduinoOTA.setPort(3232);
    
    // Set OTA partition scheme
    ArduinoOTA.setPartitionLabel("OTA");
    
    // OTA callbacks
    ArduinoOTA.onStart([]() {
        String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
        Serial.println("OTA Update started for " + type);
        // Don't suspend all tasks - OTA needs the server task to keep running
    });
    
    ArduinoOTA.onEnd([]() {
        Serial.println("\nOTA Update completed");
        // No need to resume tasks since we didn't suspend them
    });
    
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("OTA Progress: %u%%\r", (progress / (total / 100)));
    });
    
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("OTA Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
        // No need to resume tasks since we didn't suspend them
    });
    
    ArduinoOTA.begin();
    Serial.println("OTA initialized - Hostname: " + String(OTA_HOSTNAME));
    Serial.println("OTA Password: " + String(OTA_PASSWORD));
    Serial.println("Use Arduino IDE or PlatformIO to upload OTA updates");
}

/*
void init_sd(void) {
    SPI.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
    
    if (!SD.begin(SD_CS_PIN)) {
        Serial.println("SD Card initialization failed!");
        sd_available = false;
        return;
    }
    
    sd_available = true;
    Serial.println("SD Card initialized successfully");
    
    // Create CSV headers if files don't exist
    if (!SD.exists(log_filename)) {
        File file = SD.open(log_filename, FILE_WRITE);
        if (file) {
            file.println("Timestamp,Machine_Type,Count,Device_MAC");
            file.close();
            Serial.println("Created usage log file");
        }
    }
    
    if (!SD.exists(status_filename)) {
        File file = SD.open(status_filename, FILE_WRITE);
        if (file) {
            file.println("Timestamp,Basic_Count,Standard_Count,Premium_Count,WiFi_Status,Device_MAC");
            file.close();
            Serial.println("Created status log file");
        }
    }
}
*/

String get_timestamp(void) {
    if (!rtc_available) {
        return "RTC_UNAVAILABLE";
    }
    
    DateTime now = rtc.now();
    char timestamp[25];
    sprintf(timestamp, "%04d-%02d-%02d %02d:%02d:%02d", 
            now.year(), now.month(), now.day(),
            now.hour(), now.minute(), now.second());
    return String(timestamp);
}

/*
void log_usage_event(String machine_type, uint16_t count) {
    if (!sd_available) {
        Serial.println("SD Card not available for logging");
        return;
    }
    
    File file = SD.open(log_filename, FILE_APPEND);
    if (file) {
        String log_entry = get_timestamp() + "," + machine_type + "," + String(count) + "," + device_macaddr_str;
        file.println(log_entry);
        file.close();
        Serial.println("Logged usage event: " + log_entry);
    } else {
        Serial.println("Failed to open log file for writing");
    }
}
*/

/*
void log_status_update(void) {
    if (!sd_available) {
        Serial.println("SD Card not available for status logging");
        return;
    }
    
    File file = SD.open(status_filename, FILE_APPEND);
    if (file) {
        String status_entry = get_timestamp() + "," + 
                             String(counter_basic) + "," + 
                             String(counter_standard) + "," + 
                             String(counter_premium) + "," + 
                             (wifi_connected ? "CONNECTED" : "DISCONNECTED") + "," + 
                             device_macaddr_str;
        file.println(status_entry);
        file.close();
        Serial.println("Logged status update: " + status_entry);
    } else {
        Serial.println("Failed to open status file for writing");
    }
}
*/

/*
String get_historical_data(int days) {
    if (!sd_available) {
        return "SD Card not available";
    }
    
    String result = "<h3>Historical Usage Data (Last " + String(days) + " days)</h3>";
    result += "<table border='1'><tr><th>Timestamp</th><th>Machine Type</th><th>Count</th></tr>";
    
    File file = SD.open(log_filename, FILE_READ);
    if (!file) {
        return "Failed to open log file";
    }
    
    // Skip header line
    file.readStringUntil('\n');
    
    // Read and filter data
    while (file.available()) {
        String line = file.readStringUntil('\n');
        if (line.length() > 0) {
            // Simple date filtering (you might want to implement proper date parsing)
            result += "<tr><td>" + line + "</td></tr>";
        }
    }
    
    file.close();
    result += "</table>";
    return result;
}
*/

void init_mqtt(void) {
    // Set up MQTT client
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqtt_callback);
    
    // Create unique client ID with MAC address
    mqtt_client_id = String(MQTT_CLIENT_ID) + device_macaddr_str;
    mqtt_topic_status = String(MQTT_TOPIC_STATUS) + device_macaddr_str;
    mqtt_topic_events = String(MQTT_TOPIC_EVENTS) + device_macaddr_str;
    mqtt_topic_commands = String(MQTT_TOPIC_COMMANDS) + device_macaddr_str;
    
    Serial.println("MQTT initialized - Client ID: " + mqtt_client_id);
    Serial.println("Status topic: " + mqtt_topic_status);
    Serial.println("Events topic: " + mqtt_topic_events);
    Serial.println("Commands topic: " + mqtt_topic_commands);
}

void mqtt_reconnect(void) {
    while (!mqttClient.connected() && wifi_connected) {
        Serial.print("Attempting MQTT connection...");
        
        // Attempt to connect
        if (mqttClient.connect(mqtt_client_id.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
            Serial.println("connected");
            mqtt_connected = true;
            
            // Subscribe to commands topic
            mqttClient.subscribe(mqtt_topic_commands.c_str());
            Serial.println("Subscribed to: " + mqtt_topic_commands);
            
            // Publish initial status
            publish_status();
        } else {
            Serial.print("failed, rc=");
            Serial.print(mqttClient.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    String message = "";
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    Serial.println("MQTT Message received on topic: " + String(topic));
    Serial.println("Message: " + message);
    
    // Process commands here if needed
    // For now, just log the received command
}

void publish_status(void) {
    if (!mqtt_connected) return;
    
    // Create JSON status message
    String statusMessage = "{";
    statusMessage += "\"device_id\":\"" + device_macaddr_str + "\",";
    statusMessage += "\"timestamp\":\"" + get_timestamp() + "\",";
    statusMessage += "\"type\":\"status\",";
    statusMessage += "\"data\":{";
    statusMessage += "\"basic_count\":" + String(counter_basic) + ",";
    statusMessage += "\"standard_count\":" + String(counter_standard) + ",";
    statusMessage += "\"premium_count\":" + String(counter_premium) + ",";
    statusMessage += "\"wifi_connected\":" + String(wifi_connected ? "true" : "false") + ",";
    statusMessage += "\"rtc_available\":" + String(rtc_available ? "true" : "false");
    statusMessage += "}";
    statusMessage += "}";
    
    // Publish status
    mqttClient.publish(mqtt_topic_status.c_str(), statusMessage.c_str());
    Serial.println("Published status: " + statusMessage);
}

void publish_event(String event_type, uint16_t count) {
    if (!mqtt_connected) return;
    
    // Create JSON event message
    String eventMessage = "{";
    eventMessage += "\"device_id\":\"" + device_macaddr_str + "\",";
    eventMessage += "\"timestamp\":\"" + get_timestamp() + "\",";
    eventMessage += "\"type\":\"event\",";
    eventMessage += "\"data\":{";
    eventMessage += "\"event_type\":\"" + event_type + "\",";
    eventMessage += "\"count\":" + String(count);
    eventMessage += "}";
    eventMessage += "}";
    
    // Publish event
    mqttClient.publish(mqtt_topic_events.c_str(), eventMessage.c_str());
    Serial.println("Published event: " + eventMessage);
}

void loop() {
}
