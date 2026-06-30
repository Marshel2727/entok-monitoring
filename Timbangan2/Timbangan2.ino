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

  weighingStarted = true;
  currentIndex = firstUnsavedIndex();
  currentWeight = readWeightFast();
  displayCurrentItem();
}

void saveCurrentAndNext() {
  if (!requireStarted()) {
    return;
  }

  int savedIndex = currentIndex;
  float stableWeight = readWeightStable();

  scaleItems[savedIndex].weight = stableWeight;
  scaleItems[savedIndex].saved = true;

  printLine(0, "SIMPAN #" + twoDigit(scaleItems[savedIndex].kode));
  printLine(1, String(scaleItems[savedIndex].labelShort) + " " + String(stableWeight, 3));
  delay(1000);

  int nextInPhase = firstMissingIndexInPhase(savedIndex);
  if (nextInPhase >= 0) {
    printLine(0, "AUTO TARE...");
    printLine(1, "Bahan fase ini");
    scale.tare(AUTO_TARE_SAMPLES);
    currentWeight = 0;
    displayWeight = 0;
    displayWeightReady = false;

    currentIndex = nextInPhase;
    delay(700);
    displayCurrentItem();
  } else {
    currentIndex = savedIndex;
    printLine(0, "FASE LENGKAP");
    printLine(1, "D=KIRIM " + phaseDisplayName(savedIndex));
    delay(1500);
  }
}

void previousItem() {
  if (!requireStarted()) {
    return;
  }

  if (currentIndex > 0) {
    currentIndex--;
  }

  displayCurrentItem();
}

void clearCurrentItem() {
  if (!requireStarted()) {
    return;
  }

  scaleItems[currentIndex].weight = 0;
  scaleItems[currentIndex].saved = false;

  printLine(0, "HAPUS ITEM");
  printLine(1, "#" + twoDigit(scaleItems[currentIndex].kode));
  delay(800);

  displayCurrentItem();
}

void jumpToItem() {
  int target = jumpInput.toInt();
  jumpInput = "";

  if (itemCount == 0) {
    showHomeScreen();
    return;
  }

  if (target < 1 || target > itemCount) {
    printLine(0, "ITEM INVALID");
    printLine(1, "1-" + String(itemCount));
    delay(1000);
    showStartPrompt();
    return;
  }

  currentIndex = target - 1;
  weighingStarted = true;
  displayCurrentItem();
}

void showSummary() {
  if (itemCount == 0) {
    showHomeScreen();
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

void handleKeypad() {
  char key = keypad.getKey();

  if (!key) {
    return;
  }

  Serial.print("Tombol: ");
  Serial.println(key);

  if (key >= '0' && key <= '9') {
    if (jumpInput.length() < 2) {
      jumpInput += key;
    }

    printLine(0, "PILIH ITEM");
    printLine(1, "#" + jumpInput + "  #=OK");
    return;
  }

  if (key == 'A') {
    doTare();
  } else if (key == 'B') {
    saveCurrentAndNext();
  } else if (key == 'C') {
    previousItem();
  } else if (key == 'D') {
    sendBulkData();
  } else if (key == '*') {
    if (jumpInput.length() > 0) {
      jumpInput = "";
      showStartPrompt();
    } else {
      clearCurrentItem();
    }
  } else if (key == '#') {
    if (jumpInput.length() > 0) {
      jumpToItem();
    } else if (itemCount == 0) {
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
  connectWiFi();
  showHomeScreen();
}

void loop() {
  handleKeypad();

  if (weighingStarted && millis() - lastWeightRead >= DISPLAY_REFRESH_MS) {
    lastWeightRead = millis();
    currentWeight = readWeightFast();

    if (itemCount > 0) {
      displayCurrentItem();
    }
  }
}
