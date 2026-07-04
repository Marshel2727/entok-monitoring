#include <Keypad.h>
#include "config.h"
#include "scale_map.h"
#include "display_helper.h"
#include "scale_helper.h"
#include "api_client.h"

#ifndef DISPLAY_REFRESH_MS
#define DISPLAY_REFRESH_MS 500
#endif

#ifndef STABLE_DELTA_KG
#define STABLE_DELTA_KG 0.030
#endif

#ifndef WEIGHT_READ_INTERVAL_MS
#define WEIGHT_READ_INTERVAL_MS 80
#endif

enum AppState {
  ST_HOME,
  ST_TARGET_READY,
  ST_WEIGHING,
  ST_TARING,
  ST_API_BUSY
};

enum InstructionType {
  INS_NONE,
  INS_LOAD_BATCH,
  INS_START,
  INS_SELECT_ITEM,
  INS_SAVE_WEIGHT,
  INS_SEND_PHASE,
  INS_PREV_ITEM,
  INS_CLEAR_ITEM,
  INS_TARE,
  INS_CANCEL,
  INS_SUMMARY
};

enum ApiJobType {
  API_NONE,
  API_LOAD_BATCH,
  API_SEND_PHASE
};

struct Instruction {
  InstructionType type;
  int value;
};

struct ApiJob {
  ApiJobType type;
};

struct ApiResult {
  ApiJobType type;
  bool ok;
};

const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[ROWS] = {ROW1_PIN, ROW2_PIN, ROW3_PIN, ROW4_PIN};
byte colPins[COLS] = {COL1_PIN, COL2_PIN, COL3_PIN, COL4_PIN};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

QueueHandle_t instructionQueue;
QueueHandle_t apiJobQueue;
QueueHandle_t apiResultQueue;

AppState state = ST_HOME;
String numberInput = "";

volatile bool apiBusy = false;
volatile bool scalePaused = false;
volatile bool scaleIdle = false;
volatile bool tareRequested = false;
volatile bool tareDone = false;

volatile float liveWeight = 0;
volatile float stableWeight = 0;
volatile bool stableReady = false;

int forceSaveIndex = -1;
unsigned long forceSaveUntil = 0;
unsigned long lastDisplayRefresh = 0;
unsigned long messageUntil = 0;

void pushInstruction(InstructionType type, int value = 0) {
  Instruction ins;
  ins.type = type;
  ins.value = value;
  xQueueSend(instructionQueue, &ins, 0);
}

void pushApiJob(ApiJobType type) {
  ApiJob job;
  job.type = type;
  xQueueSend(apiJobQueue, &job, 0);
}

void showTemp(const String &line0, const String &line1, unsigned long ms = 1200) {
  printLine(0, line0);
  printLine(1, line1);
  messageUntil = millis() + ms;
}

bool messageActive() {
  return millis() < messageUntil;
}

bool hasScaleMap() {
  return itemCount > 0 && strlen(activeBatchId) > 0;
}

void requestTare(const String &line0 = "TARE...", const String &line1 = "Jangan sentuh") {
  tareDone = false;
  tareRequested = true;
  state = ST_TARING;
  showTemp(line0, line1, 600);
}

void refreshMainDisplay() {
  if (apiBusy || messageActive()) {
    return;
  }

  if (millis() - lastDisplayRefresh < DISPLAY_REFRESH_MS) {
    return;
  }

  lastDisplayRefresh = millis();

  if (state == ST_HOME) {
    showHomeScreen();
    return;
  }

  if (state == ST_TARGET_READY) {
    showTargetReadyScreen();
    return;
  }

  if (state == ST_TARING) {
    printLine(0, "TARE...");
    printLine(1, "Tunggu");
    return;
  }

  if (state == ST_WEIGHING) {
    currentWeight = liveWeight;
    displayCurrentItem();
    return;
  }

  if (state == ST_API_BUSY) {
    printLine(0, "API PROSES...");
    printLine(1, "Tunggu");
  }
}

void afterApiDone(ApiResult result) {
  apiBusy = false;

  if (result.type == API_LOAD_BATCH) {
    if (result.ok && hasScaleMap()) {
      state = ST_TARGET_READY;
      showTemp("TARGET SIAP", "#=MULAI", 1000);
    } else {
      state = ST_HOME;
      showTemp("BATCH BELUM ADA", "Siapkan di APK", 1800);
    }
    return;
  }

  if (result.type == API_SEND_PHASE) {
    if (!result.ok) {
      state = hasScaleMap() ? ST_WEIGHING : ST_HOME;
      showTemp("KIRIM GAGAL", "Coba D lagi", 1500);
      return;
    }

    if (!hasScaleMap()) {
      state = ST_HOME;
      showTemp("SEMUA TERKIRIM", "Cek web", 1500);
      return;
    }

    if (firstMissingIndex() >= 0) {
      weighingStarted = true;
      state = ST_WEIGHING;
      showTemp("LANJUT TIMBANG", phaseDisplayName(currentIndex), 1000);
    } else {
      state = ST_TARGET_READY;
      showTemp("FASE TERKIRIM", "Selesai", 1200);
    }
  }
}

void processApiResult() {
  ApiResult result;
  while (xQueueReceive(apiResultQueue, &result, 0) == pdTRUE) {
    afterApiDone(result);
  }
}

void startLoadBatch() {
  if (apiBusy) {
    showTemp("API MASIH JALAN", "Tunggu");
    return;
  }

  apiBusy = true;
  state = ST_API_BUSY;
  showTemp("AMBIL TARGET", "Tunggu...", 500);
  pushApiJob(API_LOAD_BATCH);
}

void startWeighing() {
  if (!hasScaleMap()) {
    startLoadBatch();
    return;
  }

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0) {
    currentIndex = pendingSend;
    state = ST_TARGET_READY;
    showTemp("FASE LENGKAP", "D=KIRIM " + phaseDisplayName(pendingSend), 1500);
    return;
  }

  int nextMissing = firstMissingIndex();
  if (nextMissing < 0) {
    state = ST_TARGET_READY;
    showTemp("SEMUA TERKIRIM", "#=AMBIL BARU", 1500);
    return;
  }

  currentIndex = nextMissing;
  weighingStarted = true;
  state = ST_WEIGHING;
  showTemp("MULAI TIMBANG", phaseDisplayName(currentIndex), 800);
}

void showSummaryNonBlocking() {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0) {
    currentIndex = pendingSend;
    showTemp("FASE LENGKAP", "D=KIRIM " + phaseDisplayName(pendingSend), 1500);
    return;
  }

  if (!hasMissingItems() && !hasUnsyncedSavedItems()) {
    showTemp("SEMUA TERKIRIM", "#=AMBIL BARU", 1500);
    state = ST_TARGET_READY;
    return;
  }

  showTemp("PROGRESS FASE", String(savedCountInPhase(currentIndex)) + "/" + String(phaseItemCount(currentIndex)) + " D=KIRIM", 1500);
}

void saveCurrentAndNext() {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  if (state != ST_WEIGHING) {
    showTemp("BELUM MULAI", "#=MULAI");
    return;
  }

  int savedIndex = currentIndex;

  if (isSyncedItem(savedIndex)) {
    showTemp("SDH TERKIRIM", "#" + twoDigit(scaleItems[savedIndex].kode));
    return;
  }

  if (!stableReady) {
    showTemp("TUNGGU STABIL", "Berat berubah");
    return;
  }

  float weight = stableWeight;
  bool forceSave = forceSaveIndex == savedIndex && millis() <= forceSaveUntil;

  if (!forceSave && !isWeightWithinTolerance(savedIndex, weight)) {
    forceSaveIndex = savedIndex;
    forceSaveUntil = millis() + WEIGHT_OVERRIDE_MS;
    showTemp("CEK SELISIH", "B=SIMPAN " + kgText(weight), 2200);
    return;
  }

  forceSaveIndex = -1;
  forceSaveUntil = 0;

  scaleItems[savedIndex].weight = weight;
  scaleItems[savedIndex].saved = true;
  scaleItems[savedIndex].synced = false;
  saveLocalCache();

  showTemp("SIMPAN #" + twoDigit(scaleItems[savedIndex].kode), kgText(weight), 1000);

  int nextInPhase = firstMissingIndexInPhase(savedIndex);
  if (nextInPhase >= 0) {
    currentIndex = nextInPhase;
    requestTare("AUTO TARE", "Bahan fase ini");
  } else {
    currentIndex = savedIndex;
    state = ST_TARGET_READY;
    showTemp("FASE LENGKAP", "D=KIRIM " + phaseDisplayName(savedIndex), 1500);
  }
}

void sendCurrentPhase() {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  if (apiBusy) {
    showTemp("API MASIH JALAN", "Tunggu");
    return;
  }

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0) {
    currentIndex = pendingSend;
  }

  int missing = firstMissingIndexInPhase(currentIndex);
  if (missing >= 0) {
    currentIndex = missing;
    weighingStarted = true;
    state = ST_WEIGHING;
    showTemp("FASE BLM LENGKAP", String(savedCountInPhase(currentIndex)) + "/" + String(phaseItemCount(currentIndex)), 1500);
    return;
  }

  apiBusy = true;
  state = ST_API_BUSY;
  showTemp("KIRIM FASE", phaseDisplayName(currentIndex), 800);
  pushApiJob(API_SEND_PHASE);
}

void previousItem() {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  if (currentIndex > 0) {
    currentIndex--;
  }

  weighingStarted = true;
  state = ST_WEIGHING;
  displayCurrentItem();
}

void clearCurrentItem() {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  if (isSyncedItem(currentIndex)) {
    showTemp("SDH TERKIRIM", "Tidak dihapus");
    return;
  }

  scaleItems[currentIndex].weight = 0;
  scaleItems[currentIndex].saved = false;
  scaleItems[currentIndex].synced = false;
  saveLocalCache();

  weighingStarted = true;
  state = ST_WEIGHING;
  showTemp("HAPUS ITEM", "#" + twoDigit(scaleItems[currentIndex].kode), 900);
}

void selectItemByNumber(int target) {
  if (!hasScaleMap()) {
    showTemp("BATCH BELUM ADA", "#=AMBIL TARGET");
    return;
  }

  if (target < 1 || target > itemCount) {
    showTemp("ITEM INVALID", "1-" + String(itemCount));
    return;
  }

  int targetIndex = target - 1;
  int requiredIndex = firstMissingIndex();

  if (requiredIndex >= 0 && !samePhaseIndex(targetIndex, requiredIndex) && !isSyncedItem(targetIndex)) {
    currentIndex = requiredIndex;
    weighingStarted = true;
    state = ST_WEIGHING;
    showTemp("IKUT URUTAN", phaseDisplayName(requiredIndex), 1200);
    return;
  }

  if (hasUnsyncedSavedItemInPhase(currentIndex) && !samePhaseIndex(currentIndex, targetIndex)) {
    showTemp("KIRIM FASE DULU", "Tekan D");
    return;
  }

  currentIndex = targetIndex;
  weighingStarted = true;
  state = ST_WEIGHING;
  displayCurrentItem();
}

void processInstruction(Instruction ins) {
  if (apiBusy && ins.type != INS_CANCEL) {
    showTemp("API MASIH JALAN", "Tunggu");
    return;
  }

  switch (ins.type) {
    case INS_LOAD_BATCH:
      if (allItemsSynced()) {
        resetLocalDataAfterSend();
      }
      startLoadBatch();
      break;

    case INS_START:
      startWeighing();
      break;

    case INS_SELECT_ITEM:
      selectItemByNumber(ins.value);
      break;

    case INS_SAVE_WEIGHT:
      saveCurrentAndNext();
      break;

    case INS_SEND_PHASE:
      sendCurrentPhase();
      break;

    case INS_PREV_ITEM:
      previousItem();
      break;

    case INS_CLEAR_ITEM:
      clearCurrentItem();
      break;

    case INS_TARE:
      requestTare();
      break;

    case INS_CANCEL:
      numberInput = "";
      state = hasScaleMap() ? ST_TARGET_READY : ST_HOME;
      showStartPrompt();
      break;

    case INS_SUMMARY:
      showSummaryNonBlocking();
      break;

    default:
      break;
  }
}

void processInstructionQueue() {
  Instruction ins;
  while (xQueueReceive(instructionQueue, &ins, 0) == pdTRUE) {
    processInstruction(ins);
  }
}

void handleKeypadNonBlocking() {
  char key = keypad.getKey();
  if (!key) {
    return;
  }

  Serial.print("Tombol: ");
  Serial.println(key);

  if (key >= '0' && key <= '9') {
    if (numberInput.length() < 2) {
      numberInput += key;
      printLine(0, "PILIH ITEM");
      printLine(1, "#" + numberInput + "  #=OK");
      messageUntil = millis() + 3000;
    }
    return;
  }

  if (key == '#') {
    if (numberInput.length() > 0) {
      int target = numberInput.toInt();
      numberInput = "";
      pushInstruction(INS_SELECT_ITEM, target);
      return;
    }

    if (!hasScaleMap()) {
      pushInstruction(INS_LOAD_BATCH);
      return;
    }

    if (state == ST_HOME || state == ST_TARGET_READY) {
      pushInstruction(INS_START);
    } else {
      pushInstruction(INS_SUMMARY);
    }
    return;
  }

  if (key == 'A') {
    pushInstruction(INS_TARE);
    return;
  }

  if (key == 'B') {
    pushInstruction(INS_SAVE_WEIGHT);
    return;
  }

  if (key == 'C') {
    pushInstruction(INS_PREV_ITEM);
    return;
  }

  if (key == 'D') {
    pushInstruction(INS_SEND_PHASE);
    return;
  }

  if (key == '*') {
    if (numberInput.length() > 0) {
      numberInput = "";
      showStartPrompt();
    } else {
      pushInstruction(INS_CLEAR_ITEM);
    }
  }
}

void processTareDone() {
  if (!tareDone) {
    return;
  }

  tareDone = false;
  currentWeight = 0;
  displayWeight = 0;
  displayWeightReady = false;
  stableReady = false;

  if (hasScaleMap()) {
    weighingStarted = true;
    state = ST_WEIGHING;
    showTemp("TARE SELESAI", "Lanjut timbang", 800);
  } else {
    state = ST_HOME;
    showTemp("TARE SELESAI", "#=AMBIL TARGET", 800);
  }
}

void scaleTask(void *param) {
  const int window = 6;
  float samples[window];
  int sampleCount = 0;
  int pos = 0;

  for (;;) {
    if (scalePaused) {
      scaleIdle = true;
      vTaskDelay(pdMS_TO_TICKS(20));
      continue;
    }

    scaleIdle = false;

    if (tareRequested) {
      tareRequested = false;
      scale.tare(AUTO_TARE_SAMPLES);
      liveWeight = 0;
      stableWeight = 0;
      stableReady = false;
      sampleCount = 0;
      pos = 0;
      tareDone = true;
      vTaskDelay(pdMS_TO_TICKS(50));
      continue;
    }

    float weight = normalizeWeight(scale.get_units(FAST_WEIGHT_SAMPLES));
    weight = smoothDisplayWeight(weight);
    liveWeight = weight;

    samples[pos] = weight;
    pos = (pos + 1) % window;
    if (sampleCount < window) {
      sampleCount++;
    }

    if (sampleCount >= window) {
      float minValue = samples[0];
      float maxValue = samples[0];
      float total = 0;

      for (int i = 0; i < window; i++) {
        if (samples[i] < minValue) {
          minValue = samples[i];
        }
        if (samples[i] > maxValue) {
          maxValue = samples[i];
        }
        total += samples[i];
      }

      if ((maxValue - minValue) <= STABLE_DELTA_KG) {
        stableWeight = total / window;
        stableReady = true;
      } else {
        stableReady = false;
      }
    }

    vTaskDelay(pdMS_TO_TICKS(WEIGHT_READ_INTERVAL_MS));
  }
}

void apiTask(void *param) {
  ApiJob job;

  for (;;) {
    if (xQueueReceive(apiJobQueue, &job, portMAX_DELAY) != pdTRUE) {
      continue;
    }

    ApiResult result;
    result.type = job.type;
    result.ok = false;

    if (job.type == API_LOAD_BATCH) {
      result.ok = loadScaleMap(true);
    }

    if (job.type == API_SEND_PHASE) {
      scalePaused = true;
      while (!scaleIdle) {
        vTaskDelay(pdMS_TO_TICKS(20));
      }

      int sentPhaseIndex = currentIndex;
      sendBulkData();
      result.ok = itemCount == 0 || isPhaseSynced(sentPhaseIndex);

      scalePaused = false;
    }

    xQueueSend(apiResultQueue, &result, 0);
  }
}

void setup() {
  Serial.begin(115200);
  delay(800);

  setupDisplay();
  setupScale();

  instructionQueue = xQueueCreate(12, sizeof(Instruction));
  apiJobQueue = xQueueCreate(4, sizeof(ApiJob));
  apiResultQueue = xQueueCreate(4, sizeof(ApiResult));

  xTaskCreatePinnedToCore(scaleTask, "scaleTask", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(apiTask, "apiTask", 12288, NULL, 1, NULL, 0);

  connectWiFi();

  if (loadLocalCache()) {
    state = ST_TARGET_READY;
    showTemp("DATA TERSIMPAN", "D=KIRIM/#=LANJUT", 1500);
  } else {
    state = ST_HOME;
    showHomeScreen();
  }
}

void loop() {
  handleKeypadNonBlocking();
  processInstructionQueue();
  processApiResult();
  processTareDone();
  refreshMainDisplay();

  delay(5);
}
