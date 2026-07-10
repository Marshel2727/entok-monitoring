#ifndef DISPLAY_HELPER_H
#define DISPLAY_HELPER_H

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "config.h"
#include "scale_map.h"

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

String kgTextRounded(float value) {
  return kgText(roundToStep(value, WEIGHT_ROUND_STEP_KG));
}

void printLine(int row, String text) {
  if (text.length() > LCD_COLS) {
    text = text.substring(0, LCD_COLS);
  }

  lcd.setCursor(0, row);
  lcd.print(text);

  for (int i = text.length(); i < LCD_COLS; i++) {
    lcd.print(" ");
  }
}

void showHomeScreen() {
  printLine(0, "SIAPKAN BATCH");
  printLine(1, "#=AMBIL TARGET");
}

void showTargetReadyScreen() {
  int pendingIndex = firstCompleteUnsyncedPhaseIndex();
  if (pendingIndex >= 0) {
    currentIndex = pendingIndex;
    printLine(0, "FASE LENGKAP");
    printLine(1, "D=KIRIM " + phaseDisplayName(pendingIndex));
    return;
  }

  int nextIndex = firstMissingIndex();
  if (itemCount > 0 && nextIndex < 0) {
    printLine(0, "SEMUA TERKIRIM");
    printLine(1, "#=AMBIL BARU");
    return;
  }

  printLine(0, "TARGET SIAP");
  if (nextIndex >= 0) {
    printLine(1, "#=MULAI " + phaseDisplayName(nextIndex));
  } else {
    printLine(1, "#=MULAI " + String(itemCount) + " item");
  }
}

void showStartPrompt() {
  if (itemCount == 0) {
    showHomeScreen();
  } else {
    showTargetReadyScreen();
  }
}

void displayCurrentItem() {
  if (itemCount == 0) {
    showHomeScreen();
    return;
  }

  ScaleItem item = scaleItems[currentIndex];

  String line1 = String(item.phaseShort) + " " + String(item.labelShort) + " #" + twoDigit(item.kode);

  if (item.saved) {
    line1 += " OK";
  }

  // B: harus tampilkan berat bahan SAAT INI saja (naik dari 0), bukan total
  // kumulatif di wadah -- kalau tidak, penjaga bandingkan angka total vs
  // target per-item dan salah baca kapan harus berhenti menuang.
  float liveIncrement = currentWeight - phaseBaselineWeight;
  if (liveIncrement < 0) {
    // Clamp tampilan ke 0 kalau noise sesaat bikin selisih negatif.
    // TRADE-OFF: ini menyembunyikan potensi anomali dari pandangan penjaga --
    // nilai yang benar2 disimpan (completeSave) TIDAK terpengaruh clamp ini.
    liveIncrement = 0;
  }

  String line2 = "B:" + kgTextRounded(liveIncrement) + " T:" + kgText(item.target);

  printLine(0, line1);
  printLine(1, line2);
}

void setupDisplay() {
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  printLine(0, "TIMBANGAN 2");
  printLine(1, "START...");
}

#endif