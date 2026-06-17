#ifndef SCALE_HELPER_H
#define SCALE_HELPER_H

#include "HX711.h"
#include "config.h"
#include "display_helper.h"

HX711 scale;

void setupScale() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);

  printLine(0, "TARE AWAL");
  printLine(1, "Kosongkan alat");
  delay(3000);

  scale.tare(50);

  printLine(0, "TARE SELESAI");
  printLine(1, "");
  delay(1000);
}

float normalizeWeight(float weight) {
  if (weight < 0) {
    weight = 0;
  }

  if (weight < ZERO_THRESHOLD) {
    weight = 0;
  }

  return weight;
}

float readWeightFast() {
  float weight = scale.get_units(10);
  return normalizeWeight(weight);
}

float readWeightStable() {
  const int count = 5;
  float data[count];

  for (int i = 0; i < count; i++) {
    data[i] = scale.get_units(10);
    delay(40);
  }

  for (int i = 0; i < count - 1; i++) {
    for (int j = i + 1; j < count; j++) {
      if (data[j] < data[i]) {
        float temp = data[i];
        data[i] = data[j];
        data[j] = temp;
      }
    }
  }

  return normalizeWeight(data[count / 2]);
}

void doTare() {
  printLine(0, "TARE...");
  printLine(1, "Jangan sentuh");
  delay(500);

  scale.tare(30);
  currentWeight = 0;

  printLine(0, "TARE SELESAI");
  printLine(1, "");
  delay(700);

  if (weighingStarted) {
    displayCurrentItem();
  } else {
    showStartPrompt();
  }
}

#endif

