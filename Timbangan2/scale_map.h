#ifndef SCALE_MAP_H
#define SCALE_MAP_H

#include "config.h"

struct ScaleItem {
  int kode;
  char phase[32];
  char phaseShort[8];
  char label[32];
  char labelShort[8];
  char phaseId[60];
  float target;
  float weight;
  bool saved;
};

ScaleItem scaleItems[MAX_ITEMS];
char activeBatchId[60] = "";

int itemCount = 0;
int currentIndex = 0;
String jumpInput = "";
float currentWeight = 0;
unsigned long lastWeightRead = 0;
bool weighingStarted = false;

void setText(char* dest, size_t size, const char* value) {
  strncpy(dest, value ? value : "", size - 1);
  dest[size - 1] = '\0';
}

int savedCount() {
  int total = 0;

  for (int i = 0; i < itemCount; i++) {
    if (scaleItems[i].saved) {
      total++;
    }
  }

  return total;
}

int firstUnsavedIndex() {
  for (int i = 0; i < itemCount; i++) {
    if (!scaleItems[i].saved) {
      return i;
    }
  }

  return 0;
}

int firstMissingIndex() {
  for (int i = 0; i < itemCount; i++) {
    if (!scaleItems[i].saved) {
      return i;
    }
  }

  return -1;
}

String twoDigit(int value) {
  if (value < 10) {
    return "0" + String(value);
  }

  return String(value);
}

String kgText(float value) {
  if (value >= 10) {
    return String(value, 2);
  }

  return String(value, 3);
}

#endif
