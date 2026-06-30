#include "HX711.h"

#define DT_PIN 16
#define SCK_PIN 17

HX711 scale;

// Mulai dari hasil kalibrasi kamu
float calibration_factor = -22077.0;

void printHelp() {
  Serial.println();
  Serial.println("=== KALIBRASI INTERAKTIF TIMBANGAN 2 ===");
  Serial.println("Target beban referensi: 1.450 kg");
  Serial.println();
  Serial.println("q  tambah 10000");
  Serial.println("w  kurang 10000");
  Serial.println("+  tambah 1000");
  Serial.println("-  kurang 1000");
  Serial.println("a  tambah 100");
  Serial.println("z  kurang 100");
  Serial.println("s  tambah 10");
  Serial.println("x  kurang 10");
  Serial.println("d  tambah 1");
  Serial.println("c  kurang 1");
  Serial.println("f  tambah 0.1");
  Serial.println("v  kurang 0.1");
  Serial.println("g  tambah 0.001");
  Serial.println("b  kurang 0.001");
  Serial.println("t  tare ulang");
  Serial.println("p  print final factor");
  Serial.println();
}

void printStatus(float berat) {
  Serial.print("Berat: ");
  Serial.print(berat, 3);
  Serial.print(" kg | calibration_factor: ");
  Serial.println(calibration_factor, 6);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  scale.begin(DT_PIN, SCK_PIN);

  Serial.println("=== KALIBRASI INTERAKTIF TIMBANGAN 2 ===");
  Serial.println("Menunggu HX711 siap...");

  int retry = 0;
  while (!scale.is_ready() && retry < 30) {
    Serial.println("HX711 belum siap...");
    delay(500);
    retry++;
  }

  if (!scale.is_ready()) {
    Serial.println("HX711 tidak terbaca. Cek kabel DT/SCK/VCC/GND.");
    while (1) {
      delay(1000);
    }
  }

  Serial.println("HX711 siap.");

  scale.set_scale(calibration_factor);

  Serial.println("Pastikan timbangan kosong...");
  delay(3000);

  scale.tare(30);

  Serial.println("TARE selesai.");
  Serial.println("Sekarang taruh beban referensi 1.45 kg.");
  printHelp();
}

void loop() {
  if (!scale.is_ready()) {
    Serial.println("HX711 tidak siap");
    delay(500);
    return;
  }

  if (Serial.available()) {
    char cmd = Serial.read();

    if (cmd == 'q') calibration_factor += 10000;
    else if (cmd == 'w') calibration_factor -= 10000;
    else if (cmd == '+') calibration_factor += 1000;
    else if (cmd == '-') calibration_factor -= 1000;
    else if (cmd == 'a') calibration_factor += 100;
    else if (cmd == 'z') calibration_factor -= 100;
    else if (cmd == 's') calibration_factor += 10;
    else if (cmd == 'x') calibration_factor -= 10;
    else if (cmd == 'd') calibration_factor += 1;
    else if (cmd == 'c') calibration_factor -= 1;
    else if (cmd == 'f') calibration_factor += 0.1;
    else if (cmd == 'v') calibration_factor -= 0.1;
    else if (cmd == 'g') calibration_factor += 0.001;
    else if (cmd == 'b') calibration_factor -= 0.001;
    else if (cmd == 't') {
      Serial.println("Tare ulang. Kosongkan timbangan...");
      delay(3000);
      scale.tare(30);
      Serial.println("TARE selesai. Taruh lagi beban 1.45 kg.");
    }
    else if (cmd == 'p') {
      Serial.print("FINAL calibration_factor: ");
      Serial.println(calibration_factor, 6);
    }

    if (calibration_factor == 0) {
      calibration_factor = -1;
    }

    scale.set_scale(calibration_factor);
  }

  float berat = scale.get_units(20);

  if (berat > -0.005 && berat < 0.005) {
    berat = 0;
  }

  printStatus(berat);

  delay(500);
}
