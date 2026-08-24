#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "HX711.h"

// ================= WIFI =================
#define WIFI_SSID "Aaa"
#define WIFI_PASS "12345678910"

// ================= API =================
#define API_BASE_URL "https://api-entok.bengkelit.id/api"
#define DEVICE_API_KEY "entok-2026"
#define TIMBANGAN_ID 1
#define FEED_LABEL "dedak"
#define FIRMWARE_VERSION "timbangan1-2026-07-16"

// ================= HX711 =================
#define DT_PIN 16
#define SCK_PIN 17

HX711 scale;
WiFiClientSecure secureClient;

float calibration_factor = 19986.0;
long offset_wadah_kosong = 8450000; // Ubah sesuai hasil kalibrasi wadah kosong.

// ================= SETTING STABILITAS =================
const float zeroThreshold = 0.05;        // 0-50 gram dianggap 0.
const float minChangeToSend = 0.05;      // Kirim kalau beda minimal 50 gram.
const float stableTolerance = 0.03;      // Stabil kalau beda antar baca <= 30 gram.
const int stableNeedCount = 3;           // Harus stabil 3 kali berturut-turut.
const float maxValidWeightKg = 500.0;    // Pengaman agar noise besar tidak merusak stok.

unsigned long lastSend = 0;
unsigned long lastHeartbeat = 0;
const unsigned long sendInterval = 10000;
const unsigned long heartbeatInterval = 30000;

float lastSentWeight = -999.0;
float lastReadWeight = 0.0;
int stableCount = 0;

bool initHX711() {
  scale.begin(DT_PIN, SCK_PIN);

  Serial.println("Menunggu HX711 siap...");
  int hxRetry = 0;
  while (!scale.is_ready() && hxRetry < 30) {
    Serial.println("HX711 belum siap...");
    delay(500);
    hxRetry++;
  }

  if (!scale.is_ready()) {
    Serial.println("HX711 tetap tidak terbaca.");
    Serial.println("Cek kabel DT/SCK/VCC/GND, lalu restart ESP32.");
    return false;
  }

  scale.set_scale(calibration_factor);
  scale.set_offset(offset_wadah_kosong);

  Serial.println("HX711 siap.");
  Serial.print("Calibration factor: ");
  Serial.println(calibration_factor, 3);
  Serial.print("Zero offset: ");
  Serial.println(offset_wadah_kosong);
  return true;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);

  Serial.print("Menghubungkan WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 40) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi tersambung. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi gagal tersambung.");
  }
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("WiFi putus, mencoba sambung ulang...");
  WiFi.disconnect();
  delay(200);
  connectWiFi();
  return WiFi.status() == WL_CONNECTED;
}

bool postJson(String url, String payload, String logName) {
  if (!ensureWiFi()) {
    Serial.println(logName + " gagal: WiFi tidak tersambung");
    return false;
  }

  HTTPClient http;
  if (!http.begin(secureClient, url)) {
    Serial.println(logName + " gagal: HTTP begin gagal");
    return false;
  }

  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  Serial.print("POST ");
  Serial.println(url);
  Serial.print("Payload: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  String response = http.getString();
  http.end();

  Serial.print("HTTP Code: ");
  Serial.println(httpCode);
  Serial.print("Response: ");
  Serial.println(response);

  return httpCode >= 200 && httpCode < 300;
}

bool sendHeartbeat() {
  String url = String(API_BASE_URL) + "/timbangan/" + String(TIMBANGAN_ID) + "/heartbeat";
  String payload = "{";
  payload += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\"";
  payload += "}";
  return postJson(url, payload, "Heartbeat");
}

bool sendReading(float berat) {
  String url = String(API_BASE_URL) + "/timbangan/readings";
  String payload = "{";
  payload += "\"timbangan_id\":" + String(TIMBANGAN_ID) + ",";
  payload += "\"value\":" + String(berat, 3) + ",";
  payload += "\"unit\":\"kg\",";
  payload += "\"label\":\"" + String(FEED_LABEL) + "\"";
  payload += "}";
  return postJson(url, payload, "Kirim reading");
}

float readStableWeight() {
  float berat = scale.get_units(10);

  if (isnan(berat) || isinf(berat)) {
    Serial.println("Bacaan HX711 tidak valid, pakai bacaan terakhir.");
    return lastReadWeight;
  }

  if (abs(berat) < zeroThreshold || berat < 0) {
    berat = 0;
  }

  if (berat > maxValidWeightKg) {
    Serial.println("Bacaan terlalu besar, diabaikan.");
    return lastReadWeight;
  }

  return berat;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  secureClient.setInsecure();

  if (!initHX711()) {
    while (true) {
      delay(1000);
    }
  }

  connectWiFi();
  sendHeartbeat();

  Serial.println("Timbangan 1 siap");
  Serial.println("Mode: stok dedak");
}

void loop() {
  if (!scale.is_ready()) {
    Serial.println("HX711 tidak siap");
    delay(500);
    return;
  }

  unsigned long now = millis();

  if (now - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = now;
    sendHeartbeat();
  }

  float berat = readStableWeight();
  float diffRead = abs(berat - lastReadWeight);

  if (diffRead <= stableTolerance) {
    stableCount++;
  } else {
    stableCount = 0;
  }

  lastReadWeight = berat;

  Serial.print("Stok ");
  Serial.print(FEED_LABEL);
  Serial.print(" = ");
  Serial.print(berat, 3);
  Serial.print(" kg | stabil: ");
  Serial.print(stableCount);
  Serial.print("/");
  Serial.println(stableNeedCount);

  bool sudahStabil = stableCount >= stableNeedCount;
  bool waktunyaKirim = now - lastSend >= sendInterval;
  bool beratBerubah = abs(berat - lastSentWeight) >= minChangeToSend;

  if (sudahStabil && waktunyaKirim && beratBerubah) {
    lastSend = now;

    if (sendReading(berat)) {
      lastSentWeight = berat;
      Serial.println("Data stok berhasil dikirim ke web");
    } else {
      Serial.println("Data stok gagal dikirim ke web");
    }
  }

  delay(1000);
}
