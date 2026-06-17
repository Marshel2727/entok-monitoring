#ifndef CONFIG_H
#define CONFIG_H

// Copy this file to config.h, then fill in your local WiFi and backend URL.

// ================= WIFI =================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASSWORD"

// Use the backend host reachable from the ESP32.
// Example: http://192.168.1.10:5000/api
#define API_BASE_URL "http://YOUR_BACKEND_HOST:5000/api"
#define TIMBANGAN_ID 2

// ================= LCD I2C =================
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2
#define LCD_SDA 21
#define LCD_SCL 22

// ================= HX711 =================
#define LOADCELL_DOUT_PIN 16
#define LOADCELL_SCK_PIN 17
#define CALIBRATION_FACTOR 6304.998047
#define ZERO_THRESHOLD 0.030

// ================= KEYPAD =================
#define ROW1_PIN 13
#define ROW2_PIN 12
#define ROW3_PIN 14
#define ROW4_PIN 27

#define COL1_PIN 26
#define COL2_PIN 25
#define COL3_PIN 33
#define COL4_PIN 32

#define MAX_ITEMS 40

#endif
