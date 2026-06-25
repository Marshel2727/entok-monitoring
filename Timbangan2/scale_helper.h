#ifndef SCALE_HELPER_H
#define SCALE_HELPER_H

#include "HX711.h"
#include "config.h"
#include "display_helper.h"

HX711 scale;

#ifndef FAST_WEIGHT_SAMPLES
#define FAST_WEIGHT_SAMPLES 15
#endif

#ifndef STABLE_WEIGHT_WINDOWS
#define STABLE_WEIGHT_WINDOWS 7
#endif

#ifndef STABLE_WEIGHT_SAMPLES
#define STABLE_WEIGHT_SAMPLES 15
#endif

#ifndef STABLE_WEIGHT_DELAY_MS
#define STABLE_WEIGHT_DELAY_MS 60
#endif

#ifndef TARE_SAMPLES
#define TARE_SAMPLES 50
#endif

#ifndef AUTO_TARE_SAMPLES
#define AUTO_TARE_SAMPLES 35
#endif

bool displayWeightReady = false;
float displayWeight = 0;

float clampNoise(float weight) {
  if (weight < 0) {
    weight = 0;
  }

  if (weight < ZERO_THRESHOLD) {
    weight = 0;
  }

  return weight;
}

float smoothDisplayWeight(float weight) {
  weight = clampNoise(weight);

  if (!displayWeightReady) {
    displayWeight = weight;
    displayWeightReady = true;
    return displayWeight;
  }

  if (weight == 0) {
    displayWeight = 0;
    return displayWeight;
  }

  displayWeight = (displayWeight * 0.65) + (weight * 0.35);
  return clampNoise(displayWeight);
}

void setupScale() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);

  printLine(0, "TARE AWAL");
  printLine(1, "Kosongkan alat");
  delay(3000);

  scale.tare(TARE_SAMPLES);
  displayWeightReady = false;
  displayWeight = 0;

  printLine(0, "TARE SELESAI");
  printLine(1, "");
  delay(1000);
}

float normalizeWeight(float weight) {
  return clampNoise(weight);
}

float readWeightFast() {
  float weight = scale.get_units(FAST_WEIGHT_SAMPLES);
  return smoothDisplayWeight(weight);
}

float readWeightStable() {
  const int count = STABLE_WEIGHT_WINDOWS;
  float data[count];

  for (int i = 0; i < count; i++) {
    data[i] = normalizeWeight(scale.get_units(STABLE_WEIGHT_SAMPLES));
    delay(STABLE_WEIGHT_DELAY_MS);
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

  if (count <= 2) {
    return normalizeWeight(data[count / 2]);
  }

  float total = 0;
  for (int i = 1; i < count - 1; i++) {
    total += data[i];
  }

  float stable = total / (count - 2);
  displayWeight = stable;
  displayWeightReady = true;
  return normalizeWeight(stable);
}

void doTare() {
  printLine(0, "TARE...");
  printLine(1, "Jangan sentuh");
  delay(500);

  scale.tare(AUTO_TARE_SAMPLES);
  currentWeight = 0;
  displayWeight = 0;
  displayWeightReady = false;

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

