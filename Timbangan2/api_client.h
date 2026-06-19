#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "display_helper.h"
#include "scale_map.h"

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  printLine(0, "WIFI CONNECT");
  printLine(1, WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 40) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi IP: ");
    Serial.println(WiFi.localIP());

    printLine(0, "WIFI OK");
    printLine(1, WiFi.localIP().toString());
    delay(1500);
  } else {
    printLine(0, "WIFI GAGAL");
    printLine(1, "Cek koneksi");
    delay(2000);
  }
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  connectWiFi();
  return WiFi.status() == WL_CONNECTED;
}

bool loadScaleMap(bool showMessage) {
  if (!ensureWiFi()) {
    return false;
  }

  if (showMessage) {
    printLine(0, "AMBIL TARGET");
    printLine(1, "Tunggu...");
  }

  String url = String(API_BASE_URL) + "/feeding-batches/scale-map?timbangan_id=" + String(TIMBANGAN_ID);

  Serial.print("GET URL: ");
  Serial.println(url);

  HTTPClient http;
  http.begin(url);
  http.setTimeout(10000);

  int httpCode = http.GET();
  String response = http.getString();

  Serial.print("GET scale-map HTTP: ");
  Serial.println(httpCode);
  Serial.println(response);

  http.end();

  if (httpCode < 200 || httpCode >= 300) {
    printLine(0, "AMBIL GAGAL");
    printLine(1, "HTTP:" + String(httpCode));
    delay(2500);
    showHomeScreen();
    return false;
  }

  DynamicJsonDocument doc(12288);
  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    printLine(0, "JSON ERROR");
    printLine(1, "Scale map");
    delay(2000);
    showHomeScreen();
    return false;
  }

  JsonArray arr = doc["items"].as<JsonArray>();
  itemCount = 0;
  setText(activeBatchId, sizeof(activeBatchId), doc["batch_id"] | "");

  for (JsonObject obj : arr) {
    if (itemCount >= MAX_ITEMS) {
      break;
    }

    scaleItems[itemCount].kode = obj["kode"] | (itemCount + 1);

    setText(scaleItems[itemCount].phase, sizeof(scaleItems[itemCount].phase), obj["phase"] | "");
    setText(scaleItems[itemCount].phaseShort, sizeof(scaleItems[itemCount].phaseShort), obj["phase_short"] | "");
    setText(scaleItems[itemCount].label, sizeof(scaleItems[itemCount].label), obj["label"] | "");
    setText(scaleItems[itemCount].labelShort, sizeof(scaleItems[itemCount].labelShort), obj["label_short"] | "");
    setText(scaleItems[itemCount].phaseId, sizeof(scaleItems[itemCount].phaseId), obj["phase_id"] | "");

    scaleItems[itemCount].target = obj["target"] | 0.0;
    scaleItems[itemCount].weight = obj["weighed"] | 0.0;
    scaleItems[itemCount].saved = obj["saved"] | false;

    itemCount++;
  }

  weighingStarted = false;
  currentIndex = firstUnsavedIndex();

  if (itemCount == 0) {
    printLine(0, "TARGET KOSONG");
    printLine(1, "Cek formulasi");
    delay(2000);
    showHomeScreen();
    return false;
  }

  showTargetReadyScreen();
  return true;
}

void resetLocalDataAfterSend() {
  activeBatchId[0] = '\0';
  itemCount = 0;
  currentIndex = 0;
  jumpInput = "";
  currentWeight = 0;
  weighingStarted = false;
}

void sendBulkData() {
  if (itemCount == 0) {
    printLine(0, "BELUM ADA DATA");
    printLine(1, "#=AMBIL TARGET");
    delay(1200);
    showHomeScreen();
    return;
  }

  int missing = firstMissingIndex();
  if (missing >= 0) {
    currentIndex = missing;
    weighingStarted = true;
    printLine(0, "BELUM LENGKAP");
    printLine(1, scaleItems[missing].labelShort);
    delay(1500);
    displayCurrentItem();
    return;
  }

  if (!ensureWiFi()) {
    printLine(0, "WIFI GAGAL");
    printLine(1, "Data aman");
    delay(1500);
    return;
  }

  printLine(0, "KIRIM DATA...");
  printLine(1, String(itemCount) + " item");

  DynamicJsonDocument doc(12288);
  doc["timbangan_id"] = TIMBANGAN_ID;
  doc["mode"] = "SET";
  doc["unit"] = "kg";

  if (strlen(activeBatchId) > 0) {
    doc["batch_id"] = activeBatchId;
  }

  JsonArray arr = doc.createNestedArray("items");

  for (int i = 0; i < itemCount; i++) {
    JsonObject obj = arr.createNestedObject();
    obj["kode"] = scaleItems[i].kode;
    obj["phase"] = scaleItems[i].phase;
    obj["label"] = scaleItems[i].label;
    obj["value"] = scaleItems[i].weight;

    if (strlen(scaleItems[i].phaseId) > 0) {
      obj["phase_id"] = scaleItems[i].phaseId;
    }
  }

  String payload;
  serializeJson(doc, payload);

  Serial.println("POST bulk payload:");
  Serial.println(payload);

  String url = String(API_BASE_URL) + "/feeding-batches/scale-readings/bulk";

  Serial.print("POST URL: ");
  Serial.println(url);

  HTTPClient http;
  http.begin(url);
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);
  String response = http.getString();

  Serial.print("POST bulk HTTP: ");
  Serial.println(httpCode);
  Serial.println(response);

  http.end();

  if (httpCode >= 200 && httpCode < 300) {
    printLine(0, "KIRIM SUKSES");
    printLine(1, "Cek web");
    delay(2000);
    resetLocalDataAfterSend();
    showHomeScreen();
  } else {
    printLine(0, "KIRIM GAGAL");
    printLine(1, "HTTP:" + String(httpCode));
    delay(2500);
    displayCurrentItem();
  }
}

#endif
