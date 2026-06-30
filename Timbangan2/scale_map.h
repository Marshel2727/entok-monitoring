#ifndef SCALE_MAP_H
#define SCALE_MAP_H

#include "config.h"

struct ScaleItem {
  int kode;
  int ingredientId;
  char phase[32];
  char phaseShort[8];
  char label[32];
  char labelShort[8];
  char feedId[60];
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

bool samePhaseIndex(int leftIndex, int rightIndex) {
  if (leftIndex < 0 || rightIndex < 0 || leftIndex >= itemCount || rightIndex >= itemCount) {
    return false;
  }

  ScaleItem left = scaleItems[leftIndex];
  ScaleItem right = scaleItems[rightIndex];

  if (strlen(left.phaseId) > 0 && strlen(right.phaseId) > 0) {
    return strcmp(left.phaseId, right.phaseId) == 0;
  }

  return strcmp(left.phase, right.phase) == 0;
}

int phaseStartIndex(int index) {
  if (index < 0 || index >= itemCount) {
    return 0;
  }

  int start = index;
  while (start > 0 && samePhaseIndex(start - 1, index)) {
    start--;
  }

  return start;
}

int phaseEndIndex(int index) {
  if (index < 0 || index >= itemCount) {
    return 0;
  }

  int end = index + 1;
  while (end < itemCount && samePhaseIndex(end, index)) {
    end++;
  }

  return end;
}

int phaseItemCount(int index) {
  return phaseEndIndex(index) - phaseStartIndex(index);
}

int savedCountInPhase(int index) {
  int total = 0;
  int start = phaseStartIndex(index);
  int end = phaseEndIndex(index);

  for (int i = start; i < end; i++) {
    if (scaleItems[i].saved) {
      total++;
    }
  }

  return total;
}

int firstMissingIndexInPhase(int index) {
  int start = phaseStartIndex(index);
  int end = phaseEndIndex(index);

  for (int i = start; i < end; i++) {
    if (!scaleItems[i].saved) {
      return i;
    }
  }

  return -1;
}

String phaseDisplayName(int index) {
  if (index < 0 || index >= itemCount) {
    return "";
  }

  String shortName = String(scaleItems[index].phaseShort);
  shortName.trim();
  if (shortName.length() > 0) {
    return shortName;
  }

  return String(scaleItems[index].phase);
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
