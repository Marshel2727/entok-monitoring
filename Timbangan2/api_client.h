#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "display_helper.h"
#include "scale_map.h"

#ifndef API_RETRY_COUNT
#define API_RETRY_COUNT 2
#endif

#ifndef API_RETRY_DELAY_MS
#define API_RETRY_DELAY_MS 800
#endif

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

bool beginApiRequest(HTTPClient &http, WiFiClient &client, WiFiClientSecure &secureClient, const String &url) {
  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }

  return http.begin(client, url);
}

void addDeviceHeaders(HTTPClient &http) {
  String key = String(DEVICE_API_KEY);
  key.trim();

  if (key.length() > 0 && key != "CHANGE_THIS_TO_MATCH_IOT_DEVICE_API_KEY") {
    http.addHeader("X-Device-Key", key);
  }
}

String httpCodeText(int httpCode) {
  if (httpCode > 0) {
    return "HTTP:" + String(httpCode);
  }

  return "NET:" + String(httpCode);
}

int getWithRetry(HTTPClient &http) {
  int httpCode = 0;

  for (int attempt = 1; attempt <= API_RETRY_COUNT; attempt++) {
    httpCode = http.GET();
    if (httpCode > 0) {
      return httpCode;
    }

    Serial.print("GET retry ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.print(API_RETRY_COUNT);
    Serial.print(" code=");
    Serial.println(httpCode);
    delay(API_RETRY_DELAY_MS);
  }

  return httpCode;
}

int postWithRetry(HTTPClient &http, const String &payload) {
  int httpCode = 0;

  for (int attempt = 1; attempt <= API_RETRY_COUNT; attempt++) {
    httpCode = http.POST(payload);
    if (httpCode > 0) {
      return httpCode;
    }

    Serial.print("POST retry ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.print(API_RETRY_COUNT);
    Serial.print(" code=");
    Serial.println(httpCode);
    delay(API_RETRY_DELAY_MS);
  }

  return httpCode;
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
  WiFiClient client;
  WiFiClientSecure secureClient;
  if (!beginApiRequest(http, client, secureClient, url)) {
    printLine(0, "URL ERROR");
    printLine(1, "Backend");
    delay(2000);
    showHomeScreen();
    return false;
  }
  http.setTimeout(10000);
  addDeviceHeaders(http);

  int httpCode = getWithRetry(http);
  String response = http.getString();

  Serial.print("GET scale-map HTTP: ");
  Serial.println(httpCode);
  Serial.println(response);

  http.end();

  if (httpCode < 200 || httpCode >= 300) {
    printLine(0, "AMBIL GAGAL");
    printLine(1, httpCodeText(httpCode));
    delay(2500);
    showHomeScreen();
    return false;
  }

  DynamicJsonDocument doc(24576);
  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    printLine(0, "JSON ERROR");
    printLine(1, "Scale map");
    delay(2000);
    showHomeScreen();
    return false;
  }

  if (!doc["items"].is<JsonArray>()) {
    printLine(0, "TARGET ERROR");
    printLine(1, "items kosong");
    delay(2200);
    showHomeScreen();
    return false;
  }

  const char* batchId = doc["batch_id"] | "";

  Serial.print("Active batch ID: ");
  Serial.println(batchId);

  if (strlen(batchId) == 0) {
    printLine(0, "BATCH ID KOSONG");
    printLine(1, "Ambil ulang #");
    delay(2500);
    showHomeScreen();
    return false;
  }

  JsonArray arr = doc["items"].as<JsonArray>();
  static ScaleItem nextItems[MAX_ITEMS];
  int nextItemCount = 0;

  for (JsonObject obj : arr) {
    if (nextItemCount >= MAX_ITEMS) {
      break;
    }

    const char* phase = obj["phase"] | "";
    const char* label = obj["label"] | "";
    if (strlen(phase) == 0 || strlen(label) == 0) {
      continue;
    }

    nextItems[nextItemCount].kode = obj["kode"] | (nextItemCount + 1);
    nextItems[nextItemCount].ingredientId = obj["ingredient_id"] | 0;

    setText(nextItems[nextItemCount].phase, sizeof(nextItems[nextItemCount].phase), phase);
    setText(nextItems[nextItemCount].phaseShort, sizeof(nextItems[nextItemCount].phaseShort), obj["phase_short"] | "");
    setText(nextItems[nextItemCount].label, sizeof(nextItems[nextItemCount].label), label);
    setText(nextItems[nextItemCount].labelShort, sizeof(nextItems[nextItemCount].labelShort), obj["label_short"] | "");
    setText(nextItems[nextItemCount].feedId, sizeof(nextItems[nextItemCount].feedId), obj["feed_id"] | "");
    setText(nextItems[nextItemCount].phaseId, sizeof(nextItems[nextItemCount].phaseId), obj["phase_id"] | "");

    nextItems[nextItemCount].target = obj["target"] | 0.0;
    nextItems[nextItemCount].weight = obj["weighed"] | 0.0;
    nextItems[nextItemCount].saved = obj["saved"] | false;

    nextItemCount++;
  }

  if (nextItemCount == 0) {
    printLine(0, "TARGET KOSONG");
    printLine(1, "Cek formulasi");
    delay(2000);
    showHomeScreen();
    return false;
  }

  activeBatchId[0] = '\0';
  setText(activeBatchId, sizeof(activeBatchId), batchId);
  itemCount = nextItemCount;
  for (int i = 0; i < itemCount; i++) {
    scaleItems[i] = nextItems[i];
  }

  weighingStarted = false;
  currentIndex = firstUnsavedIndex();
  currentWeight = 0;

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

void addScaleItemPayload(JsonObject obj, int itemIndex) {
  obj["kode"] = scaleItems[itemIndex].kode;
  if (scaleItems[itemIndex].ingredientId > 0) {
    obj["ingredient_id"] = scaleItems[itemIndex].ingredientId;
  }

  obj["phase"] = scaleItems[itemIndex].phase;
  obj["fase"] = scaleItems[itemIndex].phase;
  obj["label"] = scaleItems[itemIndex].label;
  obj["feed_name"] = scaleItems[itemIndex].label;
  obj["value"] = scaleItems[itemIndex].weight;
  obj["amount"] = scaleItems[itemIndex].weight;
  obj["planned_amount"] = scaleItems[itemIndex].target;

  if (strlen(scaleItems[itemIndex].feedId) > 0) {
    obj["feed_id"] = scaleItems[itemIndex].feedId;
  }

  if (strlen(scaleItems[itemIndex].phaseId) > 0) {
    obj["phase_id"] = scaleItems[itemIndex].phaseId;
    obj["fase_id"] = scaleItems[itemIndex].phaseId;
  }
}

void sendBulkData() {
  if (itemCount == 0) {
    printLine(0, "BELUM ADA DATA");
    printLine(1, "#=AMBIL TARGET");
    delay(1200);
    showHomeScreen();
    return;
  }

  int missing = firstMissingIndexInPhase(currentIndex);
  if (missing >= 0) {
    currentIndex = missing;
    weighingStarted = true;
    printLine(0, "FASE BLM LENGKAP");
    printLine(1, String(savedCountInPhase(currentIndex)) + "/" + String(phaseItemCount(currentIndex)));
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

  if (strlen(activeBatchId) == 0) {
    printLine(0, "BATCH BELUM ADA");
    printLine(1, "Tekan # dulu");
    delay(1800);
    showHomeScreen();
    return;
  }

  int start = phaseStartIndex(currentIndex);
  int end = phaseEndIndex(currentIndex);
  int phaseItems = end - start;
  String phaseName = phaseDisplayName(currentIndex);

  printLine(0, "KIRIM FASE...");
  printLine(1, phaseName + " " + String(phaseItems) + " item");

  DynamicJsonDocument doc(24576);
  doc["timbangan_id"] = TIMBANGAN_ID;
  doc["mode"] = "SET";
  doc["unit"] = "kg";
  doc["scope"] = "PHASE";
  doc["phase"] = scaleItems[start].phase;

  if (strlen(scaleItems[start].phaseId) > 0) {
    doc["phase_id"] = scaleItems[start].phaseId;
  }

  if (strlen(activeBatchId) > 0) {
    doc["batch_id"] = activeBatchId;
  }

  JsonArray arr = doc.createNestedArray("items");

  for (int i = start; i < end; i++) {
    JsonObject obj = arr.createNestedObject();
    addScaleItemPayload(obj, i);
  }

  String payload;
  serializeJson(doc, payload);

  Serial.println("POST bulk payload:");
  Serial.println(payload);

  String url = String(API_BASE_URL) + "/feeding-batches/scale-readings/bulk";

  Serial.print("POST URL: ");
  Serial.println(url);

  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;
  if (!beginApiRequest(http, client, secureClient, url)) {
    printLine(0, "URL ERROR");
    printLine(1, "Backend");
    delay(2000);
    displayCurrentItem();
    return;
  }
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  addDeviceHeaders(http);

  int httpCode = postWithRetry(http, payload);
  String response = http.getString();

  Serial.print("POST bulk HTTP: ");
  Serial.println(httpCode);
  Serial.println(response);

  http.end();

  if (httpCode >= 200 && httpCode < 300) {
    printLine(0, "FASE TERKIRIM");
    printLine(1, phaseName);
    delay(1500);

    int nextMissing = firstMissingIndex();
    if (nextMissing >= 0) {
      currentIndex = nextMissing;
      weighingStarted = true;

      printLine(0, "AUTO TARE...");
      printLine(1, "Fase berikut");
      scale.tare(AUTO_TARE_SAMPLES);
      currentWeight = 0;
      displayWeight = 0;
      displayWeightReady = false;
      delay(700);

      displayCurrentItem();
    } else {
      printLine(0, "SEMUA TERKIRIM");
      printLine(1, "Cek web");
      delay(2000);
      resetLocalDataAfterSend();
      showHomeScreen();
    }
  } else {
    printLine(0, "KIRIM GAGAL");
    printLine(1, httpCodeText(httpCode));
    delay(2500);
    displayCurrentItem();
  }
}

#endif
