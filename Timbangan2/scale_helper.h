#ifndef SCALE_HELPER_H
#define SCALE_HELPER_H

#include "HX711.h"
#include "config.h"
#include "display_helper.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

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

float normalizeWeight(float weight) {
  return clampNoise(weight);
}

float readWeightFastBlocking() {
  float weight = scale.get_units(FAST_WEIGHT_SAMPLES);
  return smoothDisplayWeight(weight);
}

float readWeightStableBlocking() {
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

static portMUX_TYPE hx711Mux = portMUX_INITIALIZER_UNLOCKED;

enum HxCommand { HX_IDLE, HX_CMD_STABLE, HX_CMD_TARE };

volatile HxCommand hxCommand = HX_IDLE;
volatile bool hxResultReady = false;
volatile float hxResultWeight = 0;
volatile float hxLiveWeight = 0;

TaskHandle_t hx711TaskHandle = NULL;

void hx711TaskFn(void *pvParameters) {
  for (;;) {
    HxCommand cmd;
    portENTER_CRITICAL(&hx711Mux);
    cmd = hxCommand;
    portEXIT_CRITICAL(&hx711Mux);

    if (cmd == HX_CMD_STABLE) {
      float result = readWeightStableBlocking();
      portENTER_CRITICAL(&hx711Mux);
      hxResultWeight = result;
      hxResultReady = true;
      hxCommand = HX_IDLE;
      portEXIT_CRITICAL(&hx711Mux);
    } else if (cmd == HX_CMD_TARE) {
      scale.tare(AUTO_TARE_SAMPLES);
      portENTER_CRITICAL(&hx711Mux);
      hxResultWeight = 0;
      hxResultReady = true;
      hxCommand = HX_IDLE;
      portEXIT_CRITICAL(&hx711Mux);
    } else {
      float w = readWeightFastBlocking();
      portENTER_CRITICAL(&hx711Mux);
      hxLiveWeight = w;
      portEXIT_CRITICAL(&hx711Mux);
    }

    vTaskDelay(1);
  }
}

void startHx711Task() {
  xTaskCreatePinnedToCore(hx711TaskFn, "hx711Task", 4096, NULL, 1, &hx711TaskHandle, 0);
}

float getLiveWeight() {
  float w;
  portENTER_CRITICAL(&hx711Mux);
  w = hxLiveWeight;
  portEXIT_CRITICAL(&hx711Mux);
  return w;
}

void requestStableRead() {
  portENTER_CRITICAL(&hx711Mux);
  hxResultReady = false;
  hxCommand = HX_CMD_STABLE;
  portEXIT_CRITICAL(&hx711Mux);
}

void requestTare() {
  portENTER_CRITICAL(&hx711Mux);
  hxResultReady = false;
  hxCommand = HX_CMD_TARE;
  portEXIT_CRITICAL(&hx711Mux);
}

bool pollHxResult(float &outWeight) {
  bool ready;
  float w;

  portENTER_CRITICAL(&hx711Mux);
  ready = hxResultReady;
  w = hxResultWeight;
  if (ready) {
    hxResultReady = false;
  }
  portEXIT_CRITICAL(&hx711Mux);

  if (ready) {
    outWeight = w;
  }
  return ready;
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

#endif