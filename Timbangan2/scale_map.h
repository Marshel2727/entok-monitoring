#ifndef SCALE_MAP_H
#define SCALE_MAP_H

#include <Preferences.h>
#include "config.h"

#ifndef WEIGHT_TOLERANCE_PERCENT
#define WEIGHT_TOLERANCE_PERCENT 35.0
#endif

#ifndef WEIGHT_TOLERANCE_MIN_KG
#define WEIGHT_TOLERANCE_MIN_KG 0.030
#endif

#ifndef WEIGHT_OVERRIDE_MS
#define WEIGHT_OVERRIDE_MS 6000
#endif

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
  bool synced;
};

ScaleItem scaleItems[MAX_ITEMS];
char activeBatchId[60] = "";

int itemCount = 0;
int currentIndex = 0;
String jumpInput = "";
float currentWeight = 0;
unsigned long lastWeightRead = 0;
bool weighingStarted = false;

const uint32_t SCALE_CACHE_VERSION = 20260630;

struct ScaleCacheSnapshot {
  uint32_t version;
  int itemCount;
  int currentIndex;
  char activeBatchId[60];
  ScaleItem items[MAX_ITEMS];
};

ScaleCacheSnapshot cacheSnapshot;

void setText(char* dest, size_t size, const char* value) {
  strncpy(dest, value ? value : "", size - 1);
  dest[size - 1] = '\0';
}

void saveLocalCache() {
  cacheSnapshot.version = SCALE_CACHE_VERSION;
  cacheSnapshot.itemCount = itemCount;
  cacheSnapshot.currentIndex = currentIndex;
  setText(cacheSnapshot.activeBatchId, sizeof(cacheSnapshot.activeBatchId), activeBatchId);

  for (int i = 0; i < MAX_ITEMS; i++) {
    cacheSnapshot.items[i] = scaleItems[i];
  }

  Preferences prefs;
  if (prefs.begin("timb2", false)) {
    prefs.putBytes("snapshot", &cacheSnapshot, sizeof(cacheSnapshot));
    prefs.end();
  }
}

void clearLocalCache() {
  Preferences prefs;
  if (prefs.begin("timb2", false)) {
    prefs.remove("snapshot");
    prefs.end();
  }
}

bool loadLocalCache() {
  Preferences prefs;
  if (!prefs.begin("timb2", true)) {
    return false;
  }

  if (prefs.getBytesLength("snapshot") != sizeof(ScaleCacheSnapshot)) {
    prefs.end();
    return false;
  }

  size_t readBytes = prefs.getBytes("snapshot", &cacheSnapshot, sizeof(cacheSnapshot));
  prefs.end();

  if (readBytes != sizeof(cacheSnapshot) || cacheSnapshot.version != SCALE_CACHE_VERSION) {
    return false;
  }

  if (cacheSnapshot.itemCount <= 0 || cacheSnapshot.itemCount > MAX_ITEMS) {
    return false;
  }

  itemCount = cacheSnapshot.itemCount;
  currentIndex = cacheSnapshot.currentIndex;
  if (currentIndex < 0 || currentIndex >= itemCount) {
    currentIndex = 0;
  }

  setText(activeBatchId, sizeof(activeBatchId), cacheSnapshot.activeBatchId);
  for (int i = 0; i < itemCount; i++) {
    scaleItems[i] = cacheSnapshot.items[i];
  }

  jumpInput = "";
  currentWeight = 0;
  weighingStarted = false;
  return strlen(activeBatchId) > 0;
}

float weightToleranceKg(float target) {
  float tolerance = target * (WEIGHT_TOLERANCE_PERCENT / 100.0);
  if (tolerance < WEIGHT_TOLERANCE_MIN_KG) {
    tolerance = WEIGHT_TOLERANCE_MIN_KG;
  }
  return tolerance;
}

bool isWeightWithinTolerance(int index, float weight) {
  if (index < 0 || index >= itemCount) {
    return true;
  }

  float target = scaleItems[index].target;
  if (target <= 0) {
    return true;
  }

  float diff = weight - target;
  if (diff < 0) {
    diff = -diff;
  }

  return diff <= weightToleranceKg(target);
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

bool hasMissingItems() {
  return firstMissingIndex() >= 0;
}

bool isSyncedItem(int index) {
  if (index < 0 || index >= itemCount) {
    return false;
  }

  return scaleItems[index].saved && scaleItems[index].synced;
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

bool hasUnsyncedSavedItemInPhase(int index) {
  int start = phaseStartIndex(index);
  int end = phaseEndIndex(index);

  for (int i = start; i < end; i++) {
    if (scaleItems[i].saved && !scaleItems[i].synced) {
      return true;
    }
  }

  return false;
}

int firstUnsyncedSavedIndex() {
  for (int i = 0; i < itemCount; i++) {
    if (scaleItems[i].saved && !scaleItems[i].synced) {
      return i;
    }
  }

  return -1;
}

int firstCompleteUnsyncedPhaseIndex() {
  for (int i = 0; i < itemCount; i++) {
    if (scaleItems[i].saved && !scaleItems[i].synced && firstMissingIndexInPhase(i) < 0) {
      return i;
    }
  }

  return -1;
}

bool hasUnsyncedSavedItems() {
  return firstUnsyncedSavedIndex() >= 0;
}

bool allItemsSynced() {
  return itemCount > 0 && firstMissingIndex() < 0 && !hasUnsyncedSavedItems();
}

bool isPhaseSynced(int index) {
  int start = phaseStartIndex(index);
  int end = phaseEndIndex(index);

  for (int i = start; i < end; i++) {
    if (!scaleItems[i].saved || !scaleItems[i].synced) {
      return false;
    }
  }

  return end > start;
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
