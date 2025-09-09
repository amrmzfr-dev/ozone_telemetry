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

    // Setting up Tasker
    init_task(); 
}


void init_counter(void) {
    // if the respective counter file exists, read it and put to global variable.
    if(storage.exists(filename_basic_counter)) {
        String counter_basic_str = storage.readFile(LITTLEFS, filename_basic_counter);
        counter_basic_str.trim();
        counter_basic = counter_basic_str.toInt();
    } 
    if(storage.exists(filename_standard_counter)) {
        String counter_standard_str = storage.readFile(LITTLEFS, filename_standard_counter);
        counter_standard_str.trim();
        counter_standard = counter_standard_str.toInt();
    } 
    if(storage.exists(filename_premium_counter)) {
        String counter_premium_str = storage.readFile(LITTLEFS, filename_premium_counter);
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
        String ssid_string = storage.readFile(LITTLEFS, filename_ssid);
        ssid_string.trim();
        ssid_string.toCharArray(ssid, ssid_string.length() + 1);
    
        String pass_string = storage.readFile(LITTLEFS, filename_pass);
        pass_string.trim();
        pass_string.toCharArray(passphrase, pass_string.length() + 1);

        String cmd = "Connection [" + ssid_string + "][" + pass_string + "]";
        WiFi.setTxPower(WIFI_POWER_19_5dBm);
        WiFi.begin(ssid, passphrase);
        // WiFi.begin("LiTS2", "BondBond12\$");

        Serial.println("Initiate WiFi Connectivity." + cmd);
    } else {
        // Generate a default wifi and push to the system and reboot.
        save_wifi_details("CZERORTR", "mesb1234");

        // Restart it 
        ESP.restart();
    }
}


void save_wifi_details(String ssid, String passphrase) {
    String filename = "/SSID";

    // We dont care is it exists...just override the file
    storage.writeFile(LITTLEFS, filename, ssid);

    filename = "/PASSPHRASE";
    storage.writeFile(LITTLEFS, filename, passphrase);
}


void save_tracker_url(String url) {
    String filename = "/TRACKERURL";
    storage.writeFile(LITTLEFS, filename, url);
}


void save_counter(uint8_t counter_type) {
    switch(counter_type) {
        case COUNTER_BASIC:
            storage.writeFile(LITTLEFS, filename_basic_counter, String(counter_basic));
            break;

        case COUNTER_STANDARD:
            storage.writeFile(LITTLEFS, filename_standard_counter, String(counter_standard));
            break;

        case COUNTER_PREMIUM:
            storage.writeFile(LITTLEFS, filename_premium_counter, String(counter_premium));
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
            html_ssid = storage.readFile(LITTLEFS, filename);
            html_ssid.trim();
        }
        filename = "/PASSPHRASE";
        if(storage.exists(filename)) { 
            html_pass = storage.readFile(LITTLEFS, filename);
            html_pass.trim();
        }
        filename = "/TRACKERURL";
        if(storage.exists(filename)) { 
            html_tracker = storage.readFile(LITTLEFS, filename);
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
        index_html_str = index_html_str + "<h3><b>Tracker Server:</b></h3>[" + html_tracker + "]<form method='POST' action='/setting' id='form_server'><input type='hidden' name='form' value='tracker'>URL:<input name='url'> <input type='submit' value='Update Tracker URL'></form></body></html>";
        index_html_str = index_html_str + "<h3><b>Counter Settings:</b></h3><form method='POST' action='/setting' id='form_counter'><input type='hidden' name='form' value='counter'>BASIC:<input name='basic' value='" + String(counter_basic) + "'><br>STANDARD:<input name='standard' value='" + String(counter_standard) + "'><br>PREMIUM:<input name='premium' value='" + String(counter_premium) + "'><br><input type='submit' value='Update Tracker URL'></form></body></html>";
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
            // Save the details to LITTLEFS
            save_wifi_details(html_ssid, html_pass);    

            html = "Update WiFi: [" + html_ssid + "] [" + html_pass + "] Done.";
        } else if(form_post == 2) {
            // Save the detail to LITTLEFS
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
    bool post_ok = false;

    for(;;) {
        // Every 5 minutes update
        if((uint32_t) (global_uptime - lastUpdate) > 299) {
        // if((uint32_t) (global_uptime - lastUpdate) > 59) {
        // if((uint32_t) (global_uptime - lastUpdate) > 10) {
            // Preparing POST data
            String httpRequestData = "";

            // Type:
            // 1 = Basic
            // 2 = Standard
            // 3 = Premium
            httpRequestData = "mode=status&macaddr=" + device_macaddr_str + "&type1=" + String(started_basic) + "&type2=" + String(started_standard) + "&type3=" + String(started_premium) + "&count1=" + String(counter_basic) + "&count2=" + String(counter_standard) + "&count3=" + String(counter_premium);
                
            HTTPClient http;
            // http.begin("http://209.97.170.88/iot/");
            http.begin("http://iot.mesraekuiti.my/iot/");
            http.addHeader("Content-Type", "application/x-www-form-urlencoded");

            // 5 Seconds timeout
            http.setTimeout(5000);

            // Making Request
            int httpCode = http.POST(httpRequestData);

            if(httpCode > 0) {
                post_ok = true;
            } else {
                post_ok = false;
            }

            Serial.println("Updated.");

            lastUpdate = global_uptime;
        }
        vTaskDelay(100);
    }
}


void taskPush(void *pvParameters) {
    (void) pvParameters;

    uint32_t lastUpdate = 0;    // In seconds
    bool post_ok = false;

    for(;;) {
        // Every 100mS
        if((uint32_t) (millis() - lastUpdate) > 100) {
            if(push_data_now) {
                // Preparing POST data
                String httpRequestData = "";

                // Type:
                // 1 = Basic
                // 2 = Standard
                // 3 = Premium
                String event_trigger = "";

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

                httpRequestData = "mode=" + event_trigger + "&macaddr=" + device_macaddr_str + "&type1=" + String(total_on_time_basic) + "&type2=" + String(total_on_time_standard) + "&type3=" + String(total_on_time_premium) + "&count1=" + String(counter_basic) + "&count2=" + String(counter_standard) + "&count3=" + String(counter_premium);
                
                HTTPClient http2;
                // http2.begin("http://209.97.170.88/iot/");
                http2.begin("http://iot.mesraekuiti.my/iot/");
                http2.addHeader("Content-Type", "application/x-www-form-urlencoded");

                // 5 Seconds timeout
                http2.setTimeout(5000);

                // Making Request
                int httpCode = http2.POST(httpRequestData);

                if(httpCode > 0) {
                    post_ok = true;
                } else {
                    post_ok = false;
                }

                Serial.println("Pushed.");
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
    Serial.println("Clearing LITTLEFS.");
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

    // bool connected = false;
    
    for(;;) {
        if(WiFi.status() == WL_CONNECTED) {
            // Serial.println("WiFi Connected.");

            // Serial.print("IP: ");
            // Serial.println(WiFi.localIP());
        
            // connected = true;
            wifi_connected = true;
        } else {
            // connected = false;
            wifi_connected = false;
            // Serial.println("WiFi disconnected.");
        }
        // Delay another 500mS
        vTaskDelay(1000);
    }
}


void taskServer(void *pvParameters) {
    (void) pvParameters;

    for(;;) {
        server.handleClient();
          
        // Delay another 500mS
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


void loop() {
}
