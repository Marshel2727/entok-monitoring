#include <Keypad.h>
#include "config.h"
#include "scale_map.h"
#include "display_helper.h"
#include "scale_helper.h"
#include "api_client.h"

#ifndef DISPLAY_REFRESH_MS
#define DISPLAY_REFRESH_MS 1000
#endif

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

bool requireStarted() {
  if (itemCount == 0) {
    showHomeScreen();
    return false;
  }

  if (!weighingStarted) {
    showTargetReadyScreen();
    return false;
  }

  return true;
}

void startWeighing() {
  if (itemCount == 0) {
    loadScaleMap(true);
    return;
  }

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0) {
    currentIndex = pendingSend;
    weighingStarted = true;
    printLine(0, "FASE LENGKAP");
    printLine(1, "D=KIRIM " + phaseDisplayName(pendingSend));
    delay(1500);
    return;
  }

  int nextMissing = firstMissingIndex();
  if (nextMissing < 0) {
    weighingStarted = false;
    currentWeight = 0;
    printLine(0, "SEMUA TERKIRIM");
    printLine(1, "#=AMBIL BARU");
    delay(1500);
    showTargetReadyScreen();
    return;
  }

  weighingStarted = true;

  printLine(0, "TARE FASE BARU");
  printLine(1, "Kosongkan wadah");
  currentWeight = 0;
  requestTare();
  appState = APP_WAIT_TARE_AUTO;
  pendingNextIndexAfterTare = nextMissing;
}

void completeSave(int savedIndex, float stableWeight) {
  float incrementRaw = stableWeight - phaseBaselineWeight;

  if (incrementRaw < 0) {
    incrementRaw = 0;
  }

  float roundedWeight = roundToStep(incrementRaw, WEIGHT_ROUND_STEP_KG);

  scaleItems[savedIndex].weight = roundedWeight;
  scaleItems[savedIndex].saved = true;
  scaleItems[savedIndex].synced = false;
  saveLocalCache();

  phaseBaselineWeight = stableWeight;

  printLine(0, "SIMPAN #" + twoDigit(scaleItems[savedIndex].kode));
  printLine(1, String(scaleItems[savedIndex].labelShort) + " " + String(roundedWeight, 3));
  delay(1000);

  int nextInPhase = firstMissingIndexInPhase(savedIndex);
  if (nextInPhase >= 0) {
    currentIndex = nextInPhase;
    displayCurrentItem();
    appState = APP_IDLE;
  } else {
    currentIndex = savedIndex;
    printLine(0, "FASE LENGKAP");
    printLine(1, "D=KIRIM " + phaseDisplayName(savedIndex));
    delay(1500);
    appState = APP_IDLE;
  }
}

void saveCurrentAndNext() {
  if (!requireStarted()) {
    return;
  }

  int savedIndex = currentIndex;
  if (isSyncedItem(savedIndex)) {
    printLine(0, "SUDAH TERKIRIM");
    printLine(1, "#" + twoDigit(scaleItems[savedIndex].kode));
    delay(1200);
    displayCurrentItem();
    return;
  }

  printLine(0, "MENGUKUR...");
  printLine(1, "Mohon tunggu");
  requestStableRead();
  appState = APP_WAIT_STABLE;
  pendingSaveIndex = savedIndex;
}

void showSummary() {
  if (itemCount == 0) {
    showHomeScreen();
    return;
  }

  int pendingSend = firstCompleteUnsyncedPhaseIndex();
  if (pendingSend >= 0) {
    currentIndex = pendingSend;
  }

  if (!hasMissingItems() && !hasUnsyncedSavedItems()) {
    printLine(0, "SEMUA TERKIRIM");
    printLine(1, "#=AMBIL BARU");
    delay(1500);
    showTargetReadyScreen();
    return;
  }

  printLine(0, "PROGRESS FASE");
  printLine(1, String(savedCountInPhase(currentIndex)) + "/" + String(phaseItemCount(currentIndex)) + " D=KIRIM");
  delay(1500);

  if (weighingStarted) {
    displayCurrentItem();
  } else {
    showTargetReadyScreen();
  }
}

void doTare() {
  printLine(0, "TARE...");
  printLine(1, "Jangan sentuh");
  requestTare();
  appState = APP_WAIT_TARE_MANUAL;
}

void showResetTargetPrompt() {
  printLine(0, "RESET TARGET?");
  printLine(1, "C=YA #=BATAL");
}

void requestResetTarget() {
  if (itemCount == 0) {
    printLine(0, "BELUM ADA DATA");
    printLine(1, "#=AMBIL TARGET");
    delay(1200);
    showHomeScreen();
    return;
  }

  resetConfirmPending = true;
  resetConfirmStarted = millis();
  showResetTargetPrompt();
}

void cancelResetTarget() {
  resetConfirmPending = false;
  printLine(0, "RESET BATAL");
  printLine(1, "");
  delay(700);

  if (weighingStarted) {
    displayCurrentItem();
  } else {
    showTargetReadyScreen();
  }
}

void confirmResetTarget() {
  resetConfirmPending = false;
  resetLocalDataAfterSend();
  phaseBaselineWeight = 0;

  printLine(0, "TARGET DIHAPUS");
  printLine(1, "#=AMBIL BARU");
  delay(1200);
  showHomeScreen();
}

void handleKeypad() {
  char key = keypad.getKey();

  if (!key) {
    return;
  }

  Serial.print("Tombol: ");
  Serial.println(key);

  if (appState != APP_IDLE) {
    return;
  }

  if (resetConfirmPending) {
    if (key == 'C') {
      confirmResetTarget();
    } else if (key == '#') {
      cancelResetTarget();
    } else {
      showResetTargetPrompt();
    }
    return;
  }

  if (key == 'A') {
    doTare();
  } else if (key == 'B') {
    saveCurrentAndNext();
  } else if (key == 'C') {
    requestResetTarget();
  } else if (key == 'D') {
    sendBulkData();
  } else if (key == '#') {
    if (itemCount == 0) {
      loadScaleMap(true);
    } else if (allItemsSynced()) {
      resetLocalDataAfterSend();
      loadScaleMap(true);
    } else if (!weighingStarted) {
      startWeighing();
    } else {
      showSummary();
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  setupDisplay();
  setupScale();
  startHx711Task();
  connectWiFi();
  if (loadLocalCache()) {
    printLine(0, "DATA TERSIMPAN");
    printLine(1, "D=KIRIM/#=LANJUT");
    delay(1500);
    showTargetReadyScreen();
  } else {
    showHomeScreen();
  }
}

void loop() {
  handleKeypad();
  serviceDeviceSync();

  if (resetConfirmPending) {
    if (millis() - resetConfirmStarted > RESET_CONFIRM_TIMEOUT_MS) {
      cancelResetTarget();
    }
    return;
  }

  if (appState == APP_WAIT_STABLE) {
    float stableWeight;
    if (pollHxResult(stableWeight)) {
      completeSave(pendingSaveIndex, stableWeight);
    }
    return;
  }

  if (appState == APP_WAIT_TARE_MANUAL) {
    float dummy;
    if (pollHxResult(dummy)) {
      currentWeight = 0;
      phaseBaselineWeight = 0;
      printLine(0, "TARE SELESAI");
      printLine(1, "");
      delay(700);
      appState = APP_IDLE;

      if (weighingStarted) {
        displayCurrentItem();
      } else {
        showStartPrompt();
      }
    }
    return;
  }

  if (appState == APP_WAIT_TARE_AUTO) {
    float dummy;
    if (pollHxResult(dummy)) {
      currentIndex = pendingNextIndexAfterTare;
      phaseBaselineWeight = 0;
      delay(700);
      displayCurrentItem();
      appState = APP_IDLE;
    }
    return;
  }

  if (weighingStarted && millis() - lastWeightRead >= DISPLAY_REFRESH_MS) {
    lastWeightRead = millis();
    currentWeight = getLiveWeight();

    if (itemCount > 0) {
      displayCurrentItem();
    }
  }
}
