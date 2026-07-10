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

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "timbangan2-dev"
#endif

#ifndef HEARTBEAT_INTERVAL_MS
#define HEARTBEAT_INTERVAL_MS 30000
#endif

#ifndef BATCH_STATUS_POLL_MS
#define BATCH_STATUS_POLL_MS 15000
#endif

#ifndef AUTO_SEND_RETRY_MIN_MS
#define AUTO_SEND_RETRY_MIN_MS 5000
#endif

#ifndef AUTO_SEND_RETRY_MAX_MS
#define AUTO_SEND_RETRY_MAX_MS 120000
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
  http.addHeader("X-Device-Id", String(TIMBANGAN_ID));
  http.addHeader("X-Firmware-Version", FIRMWARE_VERSION);
}

String apiErrorCode(const String &response) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, response)) {
    return "";
  }
  return String(doc["code"] | "");
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
    delay(API_RETRY_DELAY_MS * attempt);
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
    delay(API_RETRY_DELAY_MS * attempt);
  }

  return httpCode;
}

bool isMissingBatchResponse(int httpCode, const String &response) {
  String errorCode = apiErrorCode(response);
  return (httpCode == 400 && errorCode == "BATCH_NOT_ACTIVE") ||
         (httpCode == 400 && response.indexOf("Belum ada batch racikan") >= 0);
}

bool isInvalidBatchResponse(int httpCode, const String &response) {
  if (httpCode != 400 && httpCode != 404) {
    return false;
  }

  String errorCode = apiErrorCode(response);
  return errorCode == "BATCH_NOT_MUTABLE" ||
         errorCode == "BATCH_NOT_FOUND" ||
         errorCode == "BATCH_DATE_MISMATCH" ||
         response.indexOf("tidak bisa menerima data timbangan") >= 0 ||
         response.indexOf("Batch racikan dari timbangan tidak ditemukan") >= 0 ||
         response.indexOf("Tanggal data timbangan tidak cocok") >= 0;
}

void scheduleBulkRetry();
void clearBulkRetry();

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  String url = String(API_BASE_URL) + "/timbangan/" + String(TIMBANGAN_ID) + "/heartbeat";
  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;
  if (!beginApiRequest(http, client, secureClient, url)) {
    return;
  }

  StaticJsonDocument<128> doc;
  doc["firmware_version"] = FIRMWARE_VERSION;
  String payload;
  serializeJson(doc, payload);

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  addDeviceHeaders(http);
  int httpCode = http.POST(payload);
  http.end();

  if (httpCode > 0) {
    Serial.print("Heartbeat HTTP: ");
    Serial.println(httpCode);
  }
}

void checkActiveBatchStatus() {
  if (WiFi.status() != WL_CONNECTED || strlen(activeBatchId) == 0 || resetConfirmPending) {
    return;
  }

  String url = String(API_BASE_URL) + "/feeding-batches/scale-map?timbangan_id=" +
               String(TIMBANGAN_ID) + "&batch_id=" + String(activeBatchId);
  HTTPClient http;
  WiFiClient client;
  WiFiClientSecure secureClient;
  if (!beginApiRequest(http, client, secureClient, url)) {
    return;
  }

  http.setTimeout(6000);
  addDeviceHeaders(http);
  int httpCode = http.GET();
  String response = http.getString();
  http.end();

  if (isInvalidBatchResponse(httpCode, response)) {
    clearBulkRetry();
    resetConfirmPending = true;
    resetConfirmStarted = millis();
    weighingStarted = false;
    printLine(0, "BATCH BATAL");
    printLine(1, "C=RESET");
  }
}

void scheduleBulkRetry() {
  pendingAutoSend = true;
  autoSendAttempt++;
  unsigned long delayMs = AUTO_SEND_RETRY_MIN_MS;
  for (unsigned int i = 1; i < autoSendAttempt && delayMs < AUTO_SEND_RETRY_MAX_MS; i++) {
    delayMs *= 2;
  }
  if (delayMs > AUTO_SEND_RETRY_MAX_MS) {
    delayMs = AUTO_SEND_RETRY_MAX_MS;
  }
  nextAutoSendAt = millis() + delayMs;
}

void clearBulkRetry() {
  pendingAutoSend = false;
  autoSendAttempt = 0;
  nextAutoSendAt = 0;
}

uint32_t requestHash(const String &value) {
  uint32_t hash = 2166136261UL;
  for (size_t i = 0; i < value.length(); i++) {
    hash ^= static_cast<uint8_t>(value[i]);
    hash *= 16777619UL;
  }
  return hash;
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
    if (isMissingBatchResponse(httpCode, response)) {
      printLine(0, "AKTIFKAN");
      printLine(1, "RACIKAN DI APK");
      delay(3000);
    } else {
      printLine(0, "AMBIL GAGAL");
      printLine(1, httpCodeText(httpCode));
      delay(2500);
    }
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
    nextItems[nextItemCount].synced = nextItems[nextItemCount].saved;

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
  int nextMissing = firstMissingIndex();
  currentIndex = nextMissing >= 0 ? nextMissing : 0;
  currentWeight = 0;

  saveLocalCache();
  showTargetReadyScreen();
  return true;
}

void resetLocalDataAfterSend() {
  activeBatchId[0] = '\0';
  itemCount = 0;
  currentIndex = 0;
  currentWeight = 0;
  weighingStarted = false;
  clearBulkRetry();
  clearLocalCache();
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

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0 && !samePhaseIndex(currentIndex, pendingSend)) {
    currentIndex = pendingSend;
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

  if (isPhaseSynced(currentIndex)) {
    int nextMissing = firstMissingIndex();
    if (nextMissing >= 0) {
      currentIndex = nextMissing;
      weighingStarted = true;
      printLine(0, "FASE SDH KIRIM");
      printLine(1, "Lanjut " + phaseDisplayName(currentIndex));
      delay(1200);
      displayCurrentItem();
    } else {
      printLine(0, "SEMUA TERKIRIM");
      printLine(1, "#=AMBIL BARU");
      delay(1500);
      showTargetReadyScreen();
    }
    return;
  }

  if (!ensureWiFi()) {
    printLine(0, "WIFI GAGAL");
    printLine(1, "Data aman");
    delay(1500);
    scheduleBulkRetry();
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
  String requestId = String(TIMBANGAN_ID) + "-" + String(scaleItems[start].kode) + "-" + String(requestHash(payload), HEX);
  doc["request_id"] = requestId;
  payload = "";
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
    scheduleBulkRetry();
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
    clearBulkRetry();
    for (int i = start; i < end; i++) {
      scaleItems[i].synced = true;
    }
    saveLocalCache();

    printLine(0, "FASE TERKIRIM");
    printLine(1, phaseName);
    delay(1500);

    int nextMissing = firstMissingIndex();
    if (nextMissing >= 0) {
      currentIndex = nextMissing;
      weighingStarted = true;

      printLine(0, "AUTO TARE...");
      printLine(1, "Fase berikut");
      currentWeight = 0;

      requestTare();
      appState = APP_WAIT_TARE_AUTO;
      pendingNextIndexAfterTare = nextMissing;
    } else {
      printLine(0, "SEMUA TERKIRIM");
      printLine(1, "Cek web");
      delay(2000);
      resetLocalDataAfterSend();
      showHomeScreen();
    }
  } else {
    if (isInvalidBatchResponse(httpCode, response)) {
      clearBulkRetry();
      resetConfirmPending = true;
      resetConfirmStarted = millis();
      weighingStarted = false;
      printLine(0, "BATCH BATAL");
      printLine(1, "C=RESET");
      delay(2500);
    } else {
      printLine(0, "KIRIM GAGAL");
      printLine(1, httpCodeText(httpCode));
      delay(2500);
      displayCurrentItem();
      scheduleBulkRetry();
    }
  }
}

void serviceDeviceSync() {
  if (appState != APP_IDLE || resetConfirmPending) {
    return;
  }

  unsigned long now = millis();
  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }

  if (strlen(activeBatchId) > 0 && now - lastBatchStatusPollAt >= BATCH_STATUS_POLL_MS) {
    lastBatchStatusPollAt = now;
    checkActiveBatchStatus();
    if (resetConfirmPending) {
      return;
    }
  }

  if (pendingAutoSend && static_cast<long>(now - nextAutoSendAt) >= 0 && hasUnsyncedSavedItems()) {
    sendBulkData();
  }
}

#endif
