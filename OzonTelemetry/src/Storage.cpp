#include "Storage.h"

// REF:
// https://github.com/pbecchi/ESP32-Sprinkler/blob/master/Eeprom_ESP.cpp

Storage::Storage(void) {
    // Just some initialization
}


bool Storage::format(void) {
    if(SPIFFS.format()) {
        return true;
    } else {
        return false;
    }
}


bool Storage::exists(String path) {
    if(SPIFFS.exists(path)) {
        return true;
    } else {
        return false;
    }
}


bool Storage::begin(void) {
    if(!SPIFFS.begin(FORMAT_SPIFFS_IF_FAILED)) {
        Serial.println("SPIFFS mount failed");
        return false;
    }

    // Demo and checking only
    Storage::listDir(SPIFFS, "/", 0);

    if(Storage::exists("/OZON")) {
        Serial.println(F("HEADER FOUND"));
    } else {
        Serial.println(F("HEADER NOT FOUND - Formatting now"));
        Storage::format();
        Storage::writeFile(SPIFFS, "/OZON", "");
        load_defaults = true;
    }
    
    // Check Total storage
    Serial.print(F("Storage size: "));
    Serial.print(SPIFFS.totalBytes());
    Serial.println(F(" Bytes"));

    Serial.print(F("Storage used: " ));
    Serial.print(SPIFFS.usedBytes());
    Serial.println(F(" Bytes"));
    return true;
}


void Storage::listDir(fs::FS &fs, const char * dirname, uint8_t levels){
    Serial.printf("Listing directory: %s\r\n", dirname);

    File root = fs.open(dirname);
    if(!root){
        Serial.println(F("- failed to open directory"));
        return;
    }   
    if(!root.isDirectory()){
        Serial.println(F(" - not a directory"));
        return;
    }   

    File file = root.openNextFile();
    while(file){
        if(file.isDirectory()){
            Serial.print(F("  DIR : "));

            #ifdef CONFIG_SPIFFS_FOR_IDF_3_2
            Serial.println(file.name());
            #else
            Serial.print(file.name());
            time_t t= file.getLastWrite();
            struct tm * tmstruct = localtime(&t);
            Serial.printf("  LAST WRITE: %d-%02d-%02d %02d:%02d:%02d\r\n",(tmstruct->tm_year)+1900,( tmstruct->tm_mon)+1, tmstruct->tm_mday,tmstruct->tm_hour , tmstruct->tm_min, tmstruct->tm_sec);
            #endif

            if(levels){
                listDir(fs, file.name(), levels -1);
            }
        } else {
            Serial.print(F("  FILE: "));
            Serial.print(file.name());
            Serial.print(F("  SIZE: "));

            #ifdef CONFIG_SPIFFS_FOR_IDF_3_2
            Serial.println(file.size());
            #else
            Serial.print(file.size());
            time_t t= file.getLastWrite();
            struct tm * tmstruct = localtime(&t);
            Serial.printf("  LAST WRITE: %d-%02d-%02d %02d:%02d:%02d\r\n",(tmstruct->tm_year)+1900,( tmstruct->tm_mon)+1, tmstruct->tm_mday,tmstruct->tm_hour , tmstruct->tm_min, tmstruct->tm_sec);
            #endif
        }
        file = root.openNextFile();
    }   
}


String Storage::readFile(fs::FS &fs, String path){
    // Serial.printf("Reading file: %s\r\n", path);
    String return_str = "";

    File file = fs.open(path, "r");
    if(!file || file.isDirectory()){
        //// Serial.println(F("- failed to open file for reading"));
        return "";
    }

    while(file.available()){
        return_str = return_str + String((char)file.read());
    }
    file.close();

    return return_str;
}


void Storage::appendFile(fs::FS &fs, const char * path, const char * message){
    Serial.printf("Appending to file: %s\r\n", path);

    File file = fs.open(path, FILE_APPEND);
    if(!file){
        Serial.println("- failed to open file for appending");
        return;
    }
    if(file.print(message)){
        Serial.println("- message appended");
    } else {
        Serial.println("- append failed");
    }
    file.close();
}


void Storage::deleteFile(fs::FS &fs, const char * path){
    Serial.printf("Deleting file: %s\r\n", path);
    if(fs.remove(path)){
        Serial.println("- file deleted");
    } else {
        Serial.println("- delete failed");
    }
}


void Storage::writeFile(fs::FS &fs, String path, String message){
    File file = fs.open(path, "w+");
    if(!file){
        return;
    }

    file.println(message);
    file.close();
}


//void Storage::write_block(uint8_t * data, const char * path, uint32_t len){
void Storage::write_block(const void * data, const char * path, uint32_t len){
    uint32_t i;
    fs::FS &fs = SPIFFS;
    // Serial.println("write block 1");
    // Serial.print("FILE: ");
    // Serial.println(path);
    // Serial.println(ESP.getFreeHeap());

    File file = fs.open(path, FILE_WRITE);
    // Serial.println("write block 2");
    if(!file) {
        Serial.println("write_block append failed");
        return;
    }
    // Serial.println("write block 3");
    /**
    for(i = 0; i < len; i++){
        // EEPROM.write(address+i, data[i]);
        byte b = *((unsigned char*) data + i);
        Serial.print("Wrote: "); Serial.println(b);
    }
     **/
    file.write((byte *)&data, sizeof(len));
    // Serial.println("write block 4");
    file.close();
}


void Storage::read_block(void * data, const char * path, uint32_t len){
    uint32_t i;
    fs::FS &fs = SPIFFS;

    File file = fs.open(path);
    if(!file) {
        Serial.println("- File not exists.");
        return;
    }

    // for(i = 0; i < len; i++){
    /**
    i = 0;
    while(file.available()) {
        // data[i] = EEPROM.read(address+i);
        // data[i++] = file.read();
        // uint8_t b = file.read()
        *((char *)data + i) = file.read();
        Serial.print("read_block: "); Serial.println(*((char *)data + i));
        i++;
    }
     **/
    file.read((byte *)&data, sizeof(len));
    file.close();
}

Storage storage;
