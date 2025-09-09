#ifndef _Storage_H
#define _Storage_H

#include <Arduino.h>
#include <LITTLEFS.h>

#ifndef CONFIG_LITTLEFS_FOR_IDF_3_2
#include <time.h>
#endif

/* You only need to format LITTLEFS the first time you run a
   test or else use the LITTLEFS plugin to create a partition
   https://github.com/lorol/arduino-esp32littlefs-plugin */

#define FORMAT_LITTLEFS_IF_FAILED true


class Storage {

    public:
        Storage(void);
        bool begin(void);
        void listDir(fs::FS &fs, const char * dirname, uint8_t levels);
        String readFile(fs::FS &fs, String path);
        void appendFile(fs::FS &fs, const char * path, const char * message);
        void deleteFile(fs::FS &fs, const char * path);
        void writeFile(fs::FS &fs, String path, String message);

        // Emulate EEPROM write to LITTLEFS
        // void write_block(uint8_t * data, const char * path, uint32_t len);
        void write_block(const void * data, const char * path, uint32_t len);
        void read_block(void * data, const char * path, uint32_t len);

        bool format(void);
        bool exists(String path);
        bool load_defaults = false; // Default false. Only during reset this will auto set to true

    private:
};

extern Storage storage;
#endif
