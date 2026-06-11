const ASSET = "C:/PROJECT WEB/ENTOK/frontend/public/images";

const P = {
  bg: "#F5FAF7",
  paper: "#FFFFFF",
  ink: "#10223D",
  muted: "#667085",
  faint: "#E6F0EA",
  line: "#D6E5DC",
  green: "#19C866",
  greenDark: "#079B4F",
  mint: "#E8FFF1",
  mint2: "#D8F8E5",
  amber: "#F8B84E",
  amberSoft: "#FFF2D3",
  red: "#EA3A3A",
  blue: "#2F80ED",
  slate: "#2C3652",
  transparent: "#00000000",
};

const IMAGES = {
  duckHero: `${ASSET}/muscovy_duck_home.png`,
  duckAdult: `${ASSET}/entok_jumbo_dewasa.png`,
  corn: `${ASSET}/jagung_giling.png`,
  azolla: `${ASSET}/azolla_microphylla.png`,
  bsf: `${ASSET}/larva_bsf.png`,
  dod: `${ASSET}/bibit_dod_unggul.png`,
};

function shape(slide, ctx, x, y, w, h, fill = P.paper, line = P.line, width = 1) {
  return ctx.addShape(slide, {
    x,
    y,
    w,
    h,
    fill,
    line: ctx.line(line, width),
  });
}

function text(slide, ctx, value, x, y, w, h, options = {}) {
  return ctx.addText(slide, {
    text: value,
    x,
    y,
    w,
    h,
    fontSize: options.size ?? 22,
    color: options.color ?? P.ink,
    bold: options.bold ?? false,
    typeface: options.face ?? ctx.fonts.body,
    align: options.align ?? "left",
    valign: options.valign ?? "top",
    fill: options.fill ?? P.transparent,
    line: options.line ?? ctx.line(P.transparent, 0),
    insets: options.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
    name: options.name,
  });
}

function baseSlide(presentation, ctx, section = "ENTOK CUSTOMER DECK") {
  const slide = presentation.slides.add();
  shape(slide, ctx, 0, 0, ctx.W, ctx.H, P.bg, P.transparent, 0);
  shape(slide, ctx, 0, 0, 12, ctx.H, P.green, P.transparent, 0);
  text(slide, ctx, section, 64, 30, 360, 20, {
    size: 11,
    color: P.greenDark,
    bold: true,
  });
  text(slide, ctx, String(ctx.slideNumber).padStart(2, "0"), 1185, 656, 40, 20, {
    size: 11,
    color: P.muted,
    align: "right",
  });
  shape(slide, ctx, 64, 674, 1080, 1.5, P.line, P.transparent, 0);
  return slide;
}

function titleBlock(slide, ctx, kicker, title, subtitle) {
  text(slide, ctx, kicker, 64, 58, 440, 24, { size: 12, color: P.greenDark, bold: true });
  text(slide, ctx, title, 64, 88, 760, 136, {
    size: 38,
    color: P.ink,
    bold: true,
    face: ctx.fonts.title,
  });
  if (subtitle) {
    text(slide, ctx, subtitle, 66, 236, 690, 42, { size: 15.5, color: P.muted });
  }
}

function pill(slide, ctx, value, x, y, w, fill = P.mint, color = P.greenDark) {
  text(slide, ctx, value, x, y, w, 32, {
    size: 13,
    bold: true,
    color,
    fill,
    line: ctx.line(P.transparent, 0),
    align: "center",
    valign: "middle",
    insets: { left: 10, right: 10, top: 0, bottom: 0 },
  });
}

function miniMetric(slide, ctx, value, label, x, y, w, color = P.greenDark) {
  text(slide, ctx, value, x, y, w, 38, { size: 30, color, bold: true, face: ctx.fonts.title });
  text(slide, ctx, label, x, y + 42, w, 36, { size: 13, color: P.muted });
}

function bullet(slide, ctx, value, x, y, w, options = {}) {
  shape(slide, ctx, x, y + 8, 8, 8, options.dot ?? P.green, P.transparent, 0);
  text(slide, ctx, value, x + 18, y, w - 18, options.h ?? 44, {
    size: options.size ?? 16,
    color: options.color ?? P.ink,
  });
}

async function photo(slide, ctx, imagePath, x, y, w, h, label) {
  shape(slide, ctx, x - 6, y - 6, w + 12, h + 12, P.paper, P.line, 1);
  await ctx.addImage(slide, { path: imagePath, x, y, w, h, fit: "cover", alt: label });
}

function card(slide, ctx, x, y, w, h, options = {}) {
  shape(slide, ctx, x + 6, y + 8, w, h, "#DCE8E1", P.transparent, 0);
  shape(slide, ctx, x, y, w, h, options.fill ?? P.paper, options.line ?? P.line, options.lineWidth ?? 1);
}

function numberedStep(slide, ctx, n, title, body, x, y, w, h, color = P.green) {
  card(slide, ctx, x, y, w, h);
  shape(slide, ctx, x + 18, y + 20, 34, 34, color, P.transparent, 0);
  text(slide, ctx, String(n), x + 18, y + 25, 34, 20, {
    size: 16,
    color: P.paper,
    bold: true,
    align: "center",
    valign: "middle",
  });
  text(slide, ctx, title, x + 66, y + 16, w - 88, 42, { size: 17.5, bold: true, color: P.ink });
  text(slide, ctx, body, x + 66, y + 64, w - 84, h - 72, { size: 12.2, color: P.muted });
}

function flowLine(slide, ctx, x1, y1, x2, y2, color = P.green) {
  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
    shape(slide, ctx, Math.min(x1, x2), y1, Math.abs(x2 - x1), 3, color, P.transparent, 0);
    text(slide, ctx, ">", Math.max(x1, x2) - 6, y1 - 14, 18, 24, { size: 18, color, bold: true });
  } else {
    shape(slide, ctx, x1, Math.min(y1, y2), 3, Math.abs(y2 - y1), color, P.transparent, 0);
    text(slide, ctx, "v", x1 - 7, Math.max(y1, y2) - 14, 18, 24, { size: 17, color, bold: true });
  }
}

function dataBox(slide, ctx, title, detail, x, y, w, h, accent = P.green) {
  shape(slide, ctx, x, y, w, h, P.paper, P.line, 1);
  shape(slide, ctx, x, y, 7, h, accent, P.transparent, 0);
  text(slide, ctx, title, x + 22, y + 16, w - 36, 24, { size: 18, color: P.ink, bold: true });
  text(slide, ctx, detail, x + 22, y + 45, w - 38, h - 54, { size: 13.5, color: P.muted });
}

export async function addCover(presentation, ctx) {
  const slide = presentation.slides.add();
  shape(slide, ctx, 0, 0, ctx.W, ctx.H, "#F3FAF5", P.transparent, 0);
  shape(slide, ctx, 0, 0, 455, ctx.H, P.ink, P.transparent, 0);
  shape(slide, ctx, 455, 0, 20, ctx.H, P.green, P.transparent, 0);
  await ctx.addImage(slide, { path: IMAGES.duckHero, x: 520, y: 70, w: 650, h: 385, fit: "cover", alt: "Peternakan entok" });
  shape(slide, ctx, 520, 455, 650, 3, P.green, P.transparent, 0);
  await photo(slide, ctx, IMAGES.corn, 520, 495, 145, 105, "Jagung pakan");
  await photo(slide, ctx, IMAGES.azolla, 690, 495, 145, 105, "Azolla");
  await photo(slide, ctx, IMAGES.bsf, 860, 495, 145, 105, "Larva BSF");
  await photo(slide, ctx, IMAGES.duckAdult, 1030, 495, 140, 105, "Entok dewasa");

  text(slide, ctx, "ENTOK", 64, 62, 260, 56, { size: 50, color: P.paper, bold: true, face: ctx.fonts.title });
  text(slide, ctx, "Smart Farm Management", 66, 122, 310, 32, { size: 18, color: "#BFEAD0", bold: true });
  text(slide, ctx, "Sistem untuk mengontrol pakan, tugas harian, timbangan, dan stok kandang dari satu alur kerja.", 66, 202, 330, 156, {
    size: 27,
    color: P.paper,
    bold: true,
    face: ctx.fonts.title,
  });
  text(slide, ctx, "Deck customer - kegunaan dan cara kerja", 66, 390, 300, 28, { size: 16, color: "#D6E5DC" });
  pill(slide, ctx, "PPTX editable - siap import ke Canva", 66, 440, 270, P.amberSoft, "#7A5300");
  miniMetric(slide, ctx, "4", "area inti: pakan, stok, tugas, laporan", 66, 535, 150, P.green);
  miniMetric(slide, ctx, "1x", "stok dipotong saat finalisasi batch", 245, 535, 150, P.amber);
  return slide;
}

export async function addProblemMap(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "WHY IT MATTERS");
  titleBlock(slide, ctx, "MASALAH CUSTOMER", "Operasional kandang sering rapih di kepala, tetapi tercecer di proses harian.", "ENTOK dibuat untuk mengubah pekerjaan rutin menjadi data yang bisa diaudit tanpa membuat penjaga kerja dua kali.");

  const pain = [
    ["Catatan manual", "Jadwal, SOP, dan status tugas sering tersebar di buku, chat, atau ingatan petugas.", P.green],
    ["Racikan pakan tidak terlihat", "Target bahan dan hasil timbang sulit dibandingkan saat pakan sedang disiapkan.", P.amber],
    ["Stok rawan dobel potong", "Jika stok dikurangi dari banyak titik, laporan bisa tampak benar tetapi fisik berbeda.", P.red],
    ["Pengawas terlambat tahu", "Masalah di lapangan baru terlihat setelah pekerjaan selesai atau stok sudah menipis.", P.blue],
  ];
  pain.forEach((item, i) => {
    const x = 64 + (i % 2) * 412;
    const y = 308 + Math.floor(i / 2) * 150;
    card(slide, ctx, x, y, 360, 116);
    shape(slide, ctx, x + 20, y + 22, 8, 70, item[2], P.transparent, 0);
    text(slide, ctx, item[0], x + 44, y + 20, 280, 28, { size: 22, bold: true });
    text(slide, ctx, item[1], x + 44, y + 55, 280, 46, { size: 14.5, color: P.muted });
  });

  shape(slide, ctx, 910, 270, 260, 270, P.ink, P.transparent, 0);
  text(slide, ctx, "Tanpa sistem", 940, 300, 180, 30, { size: 18, color: P.amber, bold: true });
  text(slide, ctx, "Customer melihat hasil akhir, bukan proses penyebabnya.", 940, 346, 190, 98, {
    size: 24,
    color: P.paper,
    bold: true,
    face: ctx.fonts.title,
  });
  text(slide, ctx, "Akibatnya keputusan stok, jadwal, dan evaluasi petugas cenderung reaktif.", 940, 468, 190, 50, { size: 13, color: "#C7D5CE" });
  return slide;
}

export async function addSystemMap(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "PRODUCT SYSTEM");
  titleBlock(slide, ctx, "APA ITU ENTOK", "ENTOK menjadi operating layer antara pengawas, penjaga, timbangan, dan stok.", "Bukan hanya dashboard: sistem mengikat rencana, pelaksanaan, data timbang, dan transaksi stok.");

  dataBox(slide, ctx, "Pengawas", "Setup populasi, fase usia, formulasi pakan, stok, tugas, SOP, dan akun penjaga.", 76, 315, 260, 125, P.blue);
  dataBox(slide, ctx, "Penjaga mobile", "Melihat tugas hari ini, mengikuti SOP, membuka batch pakan, lalu menandai selesai.", 510, 315, 260, 125, P.green);
  dataBox(slide, ctx, "Timbangan 2", "Mengirim bahan dan berat timbang ke batch racikan yang sedang disiapkan.", 944, 315, 260, 125, P.amber);
  flowLine(slide, ctx, 350, 378, 500, 378, P.green);
  flowLine(slide, ctx, 784, 378, 934, 378, P.green);

  shape(slide, ctx, 280, 506, 720, 82, P.paper, P.line, 1);
  text(slide, ctx, "Database operasional", 310, 524, 190, 24, { size: 20, bold: true });
  text(slide, ctx, "tasks - checklist_execution - feeding_batches - batch_items - feeds - stock_transactions - activity_logs", 310, 553, 615, 28, {
    size: 13,
    color: P.muted,
  });
  flowLine(slide, ctx, 640, 450, 640, 506, P.green);

  const outcomes = [
    ["Kontrol stok", "finalisasi batch memotong stok satu kali"],
    ["Kepatuhan SOP", "penjaga bekerja dari panduan yang sama"],
    ["Visibilitas", "pengawas melihat progres dan status"],
  ];
  outcomes.forEach((o, i) => {
    const x = 85 + i * 372;
    shape(slide, ctx, x, 610, 302, 42, i === 1 ? P.mint : P.paper, P.line, 1);
    text(slide, ctx, o[0], x + 16, 619, 110, 20, { size: 15, bold: true, color: P.greenDark });
    text(slide, ctx, o[1], x + 128, 619, 150, 20, { size: 12.5, color: P.muted });
  });
  return slide;
}

export async function addValueBridge(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "CUSTOMER VALUE");
  titleBlock(slide, ctx, "KEGUNAAN UTAMA", "ENTOK membantu customer mengubah rutinitas kandang menjadi kontrol operasional.", "Setiap fitur diposisikan ke hasil yang terasa di lapangan, bukan sekadar menu aplikasi.");

  const rows = [
    ["Checklist harian", "Tugas penjaga jelas per waktu", "Lebih mudah memastikan pekerjaan benar-benar jalan"],
    ["Batch racikan pakan", "Target vs timbang terlihat sebelum finalisasi", "Mengurangi salah racik dan salah potong stok"],
    ["Inventori pakan", "Stok masuk, stok keluar, dan ambang aman tercatat", "Keputusan belanja pakan lebih cepat"],
    ["Dashboard pengawas", "Data populasi, berat, stok, dan aktivitas terkumpul", "Pengawasan tidak harus selalu berada di kandang"],
  ];
  const x = 90;
  const y = 292;
  const widths = [245, 350, 430];
  text(slide, ctx, "FITUR", x, y, widths[0], 28, { size: 13, bold: true, color: P.greenDark });
  text(slide, ctx, "CARA MEMBANTU", x + widths[0], y, widths[1], 28, { size: 13, bold: true, color: P.greenDark });
  text(slide, ctx, "DAMPAK KE CUSTOMER", x + widths[0] + widths[1], y, widths[2], 28, { size: 13, bold: true, color: P.greenDark });
  rows.forEach((r, i) => {
    const yy = y + 38 + i * 70;
    shape(slide, ctx, x - 14, yy - 10, 1080, 64, i % 2 === 0 ? P.paper : "#FAFEFB", P.line, 1);
    text(slide, ctx, r[0], x, yy + 5, widths[0] - 20, 28, { size: 17, bold: true });
    text(slide, ctx, r[1], x + widths[0], yy + 3, widths[1] - 30, 34, { size: 15, color: P.slate });
    text(slide, ctx, r[2], x + widths[0] + widths[1], yy + 3, widths[2] - 30, 34, { size: 15, color: P.muted });
  });

  shape(slide, ctx, 89, 616, 1082, 34, P.ink, P.transparent, 0);
  text(slide, ctx, "Kalimat jualnya sederhana: pekerjaan harian lebih terkendali, stok lebih dipercaya, dan pengawas punya bukti operasional.", 118, 623, 1020, 20, {
    size: 15,
    color: P.paper,
    bold: true,
    align: "center",
  });
  return slide;
}

export async function addDailyWorkflow(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "HOW IT WORKS");
  titleBlock(slide, ctx, "ALUR HARIAN", "Dari rencana ke eksekusi, semua langkah penting masuk ke satu siklus operasional.", "Customer melihat proses kandang sebagai loop yang berulang dan bisa dievaluasi.");

  const steps = [
    ["1", "Setup", "Populasi, fase, bahan, tugas, dan SOP disiapkan."],
    ["2", "Jalankan", "Penjaga melihat tugas yang waktunya tiba."],
    ["3", "Racik", "Batch mencatat target dan hasil timbang."],
    ["4", "Finalisasi", "Stok dipotong saat batch sudah final."],
    ["5", "Pantau", "Dashboard menampilkan progress dan log terbaru."],
  ];
  steps.forEach((s, i) => {
    const x = 86 + i * 225;
    shape(slide, ctx, x, 320, 168, 168, P.paper, P.line, 1);
    shape(slide, ctx, x + 18, 338, 38, 38, i === 2 ? P.amber : P.green, P.transparent, 0);
    text(slide, ctx, s[0], x + 18, 345, 38, 20, { size: 18, color: P.paper, bold: true, align: "center" });
    text(slide, ctx, s[1], x + 18, 394, 132, 28, { size: 22, bold: true });
    text(slide, ctx, s[2], x + 18, 424, 132, 48, { size: 12.5, color: P.muted });
    if (i < steps.length - 1) flowLine(slide, ctx, x + 176, 404, x + 218, 404, P.green);
  });

  shape(slide, ctx, 94, 550, 1070, 62, P.mint, P.line, 1);
  text(slide, ctx, "Catatan penting untuk customer", 122, 565, 220, 22, { size: 17, color: P.greenDark, bold: true });
  text(slide, ctx, "ENTOK tidak mengganti cara kerja kandang. Sistem merapikan titik keputusan: kapan tugas dikerjakan, apa target racikan, kapan stok dipotong, dan siapa yang melakukan.", 354, 562, 760, 34, {
    size: 15,
    color: P.slate,
  });
  return slide;
}

export async function addBatchDeepDive(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "FEEDING BATCH LOGIC");
  titleBlock(slide, ctx, "CARA KERJA BATCH PAKAN", "Batch racikan adalah pagar agar stok tidak dipotong sebelum racikan benar-benar siap.", "Inilah bagian yang paling penting untuk menjelaskan logika Beri Pakan ke customer.");

  await photo(slide, ctx, IMAGES.corn, 72, 295, 160, 110, "Jagung giling");
  numberedStep(slide, ctx, 1, "Target dibuat", "Dari populasi, fase usia, dan formulasi.", 270, 292, 210, 112, P.green);
  numberedStep(slide, ctx, 2, "Data timbang masuk", "Timbangan 2 mengisi berat aktual.", 515, 292, 210, 112, P.amber);
  numberedStep(slide, ctx, 3, "Sistem bandingkan", "Target vs aktual tampil sebelum final.", 760, 292, 210, 112, P.blue);
  numberedStep(slide, ctx, 4, "Finalisasi", "Stok dipotong sekali saat batch FINAL.", 1005, 292, 200, 112, P.greenDark);
  flowLine(slide, ctx, 480, 348, 510, 348, P.green);
  flowLine(slide, ctx, 725, 348, 755, 348, P.green);
  flowLine(slide, ctx, 970, 348, 1000, 348, P.green);

  shape(slide, ctx, 72, 468, 1132, 142, P.paper, P.line, 1);
  text(slide, ctx, "Contoh pembanding per bahan", 96, 488, 250, 24, { size: 18, bold: true });
  const cols = [96, 285, 455, 630, 820, 1010];
  const headers = ["Bahan", "Target", "Timbang", "Terpotong", "Selisih", "Status"];
  headers.forEach((h, i) => text(slide, ctx, h, cols[i], 522, 130, 20, { size: 12, bold: true, color: P.muted }));
  const sample = [
    ["dedak", "0,60 kg", "0,60 kg", "0,60 kg", "0,00 kg", "MASUK"],
    ["jagung", "0,60 kg", "0,58 kg", "0,58 kg", "-0,02 kg", "CEK"],
  ];
  sample.forEach((row, r) => {
    const yy = 548 + r * 26;
    row.forEach((cell, c) => text(slide, ctx, cell, cols[c], yy, c === 0 ? 150 : 130, 20, {
      size: 13.5,
      bold: c === 0 || c === 5,
      color: c === 4 && cell.startsWith("-") ? P.red : c === 5 ? P.greenDark : P.ink,
    }));
  });
  shape(slide, ctx, 72, 618, 1132, 38, P.ink, P.transparent, 0);
  text(slide, ctx, "Logika bisnis: satu tugas Beri Pakan idealnya punya batch sendiri. Jika ada Beri Pakan kedua, batch pertama tidak otomatis dianggap cukup.", 98, 627, 1080, 20, {
    size: 15,
    color: P.paper,
    bold: true,
    align: "center",
  });
  return slide;
}

export async function addDataConnection(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "BACKEND AND DATABASE");
  titleBlock(slide, ctx, "BUKAN TAMPILAN DOANG", "Data yang customer lihat berasal dari service, API, dan tabel database yang saling terhubung.", "Slide ini menjawab pertanyaan penting: apa yang terjadi ketika penjaga menekan finalisasi atau selesai.");

  const boxes = [
    ["tasks", "jadwal dan SOP tugas", 74, 292, P.blue],
    ["checklist_execution", "status selesai per tanggal", 74, 454, P.blue],
    ["feeding_batches", "batch racikan per tanggal dan task", 400, 292, P.green],
    ["feeding_batch_items", "target, timbang, potong, selisih", 400, 454, P.green],
    ["timbangan_readings", "data berat dari perangkat", 728, 292, P.amber],
    ["feeds + transactions", "stok pakan dan histori potong", 728, 454, P.red],
  ];
  boxes.forEach(([t, d, x, y, c]) => dataBox(slide, ctx, t, d, x, y, 248, 104, c));
  flowLine(slide, ctx, 322, 346, 392, 346, P.green);
  flowLine(slide, ctx, 648, 346, 720, 346, P.green);
  flowLine(slide, ctx, 522, 398, 522, 452, P.green);
  flowLine(slide, ctx, 648, 506, 720, 506, P.green);
  flowLine(slide, ctx, 198, 398, 198, 452, P.blue);

  shape(slide, ctx, 1010, 290, 180, 266, P.ink, P.transparent, 0);
  text(slide, ctx, "Saat finalisasi", 1035, 316, 130, 24, { size: 17, color: P.amber, bold: true });
  bullet(slide, ctx, "Validasi batch", 1035, 365, 125, { dot: P.green, color: P.paper, size: 13, h: 28 });
  bullet(slide, ctx, "Potong stok feed", 1035, 408, 125, { dot: P.green, color: P.paper, size: 13, h: 28 });
  bullet(slide, ctx, "Catat transaksi", 1035, 451, 125, { dot: P.green, color: P.paper, size: 13, h: 28 });
  bullet(slide, ctx, "Buka izin checklist selesai", 1035, 494, 125, { dot: P.green, color: P.paper, size: 13, h: 38 });

  text(slide, ctx, "Artinya kalau batch belum ada atau belum final, tombol selesai Beri Pakan memang seharusnya ditahan oleh backend.", 94, 606, 1030, 34, {
    size: 19,
    color: P.slate,
    bold: true,
    align: "center",
  });
  return slide;
}

export async function addMobileKeeper(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "MOBILE EXPERIENCE");
  titleBlock(slide, ctx, "PENGALAMAN PENJAGA DI HP", "Mobile dibuat simpel, tetapi fitur inti tetap lengkap.", "Customer bisa melihat bahwa penjaga tidak perlu membuka dashboard berat untuk menyelesaikan tugas lapangan.");

  shape(slide, ctx, 116, 288, 280, 354, P.ink, P.transparent, 0);
  shape(slide, ctx, 132, 306, 248, 316, "#F9FFF9", P.transparent, 0);
  shape(slide, ctx, 132, 306, 248, 54, P.green, P.transparent, 0);
  text(slide, ctx, "Checklist Kegiatan", 154, 322, 150, 18, { size: 13, color: P.paper, bold: true });
  text(slide, ctx, "Kamis, 02 Juni 2026", 154, 340, 150, 14, { size: 9.5, color: P.paper });
  shape(slide, ctx, 154, 374, 202, 58, P.paper, P.line, 1);
  text(slide, ctx, "25%", 170, 392, 46, 18, { size: 18, bold: true, align: "center" });
  text(slide, ctx, "Progress Hari Ini\n1/4 kegiatan selesai", 226, 386, 110, 34, { size: 10.5, bold: true, color: P.greenDark });

  const taskY = [444, 505, 566];
  const task = [["Beri Pakan", "03:00 WITA", "FINAL", P.green], ["Batch Racikan", "siap difinalisasi", "SIAP", P.amber], ["Bersihkan Kandang", "14:00 WITA", "BELUM", P.muted]];
  task.forEach((t, i) => {
    shape(slide, ctx, 154, taskY[i], 202, 54, i === 1 ? P.paper : "#B8FF9E", i === 1 ? P.line : P.green, 1);
    text(slide, ctx, t[0], 170, taskY[i] + 9, 100, 16, { size: 11, bold: true });
    text(slide, ctx, t[1], 170, taskY[i] + 27, 105, 14, { size: 8.5, color: P.muted });
    text(slide, ctx, t[2], 296, taskY[i] + 16, 42, 14, { size: 8, bold: true, color: t[3], align: "center" });
  });
  shape(slide, ctx, 132, 622, 248, 1, P.green, P.transparent, 0);

  const callouts = [
    ["Dashboard ringkas", "Penjaga langsung melihat progres, tugas berikutnya, dan tips hari ini."],
    ["Checklist per jadwal", "Status waktunya, belum waktunya, selesai, dan panduan SOP tetap tersedia."],
    ["Batch di bawah Beri Pakan", "Racikan muncul sebagai dropdown kontekstual, bukan panel besar yang membingungkan."],
    ["Validasi final", "Tombol selesai ditahan sampai batch pakan terkait sudah FINAL."],
  ];
  callouts.forEach((c, i) => {
    const x = 490 + (i % 2) * 330;
    const y = 300 + Math.floor(i / 2) * 145;
    card(slide, ctx, x, y, 280, 104);
    text(slide, ctx, c[0], x + 22, y + 18, 220, 24, { size: 20, bold: true, color: P.ink });
    text(slide, ctx, c[1], x + 22, y + 50, 225, 38, { size: 13.5, color: P.muted });
  });

  shape(slide, ctx, 490, 602, 610, 42, P.mint, P.line, 1);
  text(slide, ctx, "Pesan UX untuk customer: mobile dibuat untuk eksekusi cepat, desktop untuk kontrol penuh.", 520, 614, 550, 18, {
    size: 16,
    bold: true,
    color: P.greenDark,
    align: "center",
  });
  return slide;
}

export async function addSupervisorLoop(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "SUPERVISOR OPERATING LOOP");
  titleBlock(slide, ctx, "DASHBOARD PENGAWAS", "Pengawas memakai ENTOK untuk menutup loop antara rencana, stok, dan evaluasi.", null);

  const centerX = 610;
  const centerY = 418;
  shape(slide, ctx, centerX - 120, centerY - 54, 240, 108, P.ink, P.transparent, 0);
  text(slide, ctx, "Dashboard\nPengawas", centerX - 100, centerY - 34, 200, 58, {
    size: 28,
    color: P.paper,
    bold: true,
    face: ctx.fonts.title,
    align: "center",
  });
  const nodes = [
    ["Populasi & fase", "jumlah entok per umur", 134, 286, P.blue],
    ["Formulasi pakan", "target gram per ekor", 498, 232, P.green],
    ["Stok & timbangan", "feed stock dan readings", 850, 286, P.amber],
    ["Tugas penjaga", "jadwal dan SOP harian", 826, 518, P.green],
    ["Laporan aktivitas", "log dan histori transaksi", 310, 518, P.red],
  ];
  nodes.forEach(([t, d, x, y, c]) => {
    dataBox(slide, ctx, t, d, x, y, 250, 86, c);
  });
  flowLine(slide, ctx, 384, 329, 488, 386, P.green);
  flowLine(slide, ctx, 622, 318, 622, 365, P.green);
  flowLine(slide, ctx, 850, 330, 732, 386, P.green);
  flowLine(slide, ctx, 826, 547, 730, 456, P.green);
  flowLine(slide, ctx, 560, 515, 560, 476, P.green);

  shape(slide, ctx, 80, 620, 1080, 34, P.paper, P.line, 1);
  text(slide, ctx, "Keputusan yang didukung: kapan beli pakan, apakah SOP berjalan, apakah racikan sesuai target, dan apakah berat entok berkembang.", 100, 628, 1030, 16, {
    size: 14.5,
    color: P.slate,
    align: "center",
  });
  return slide;
}

export async function addOnboarding(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "CUSTOMER ONBOARDING");
  titleBlock(slide, ctx, "CARA MULAI", "Implementasi ENTOK dimulai dari data sederhana yang memang sudah dimiliki customer.", "Tujuannya bukan membuat customer sibuk input data, tetapi membuat kebiasaan kandang masuk ke sistem.");

  const steps = [
    ["01", "Daftarkan kandang", "Masukkan populasi entok dan fase usia yang dipakai di operasional."],
    ["02", "Rapikan pakan", "Input bahan, stok awal, ambang batas, dan formulasi per fase."],
    ["03", "Buat SOP harian", "Susun tugas penjaga, jadwal, instruksi, foto acuan, dan panduan kerja."],
    ["04", "Hubungkan timbangan", "Timbangan 2 mengirim data bahan racikan ke batch pakan."],
    ["05", "Mulai audit ringan", "Pantau checklist, stok, batch, log, dan data berat dari dashboard."],
  ];
  steps.forEach((s, i) => {
    const y = 278 + i * 72;
    shape(slide, ctx, 92, y, 1030, 54, i % 2 === 0 ? P.paper : "#FBFEFC", P.line, 1);
    text(slide, ctx, s[0], 116, y + 11, 54, 28, { size: 25, bold: true, color: i === 3 ? P.amber : P.greenDark, face: ctx.fonts.title });
    text(slide, ctx, s[1], 205, y + 11, 250, 24, { size: 19, bold: true });
    text(slide, ctx, s[2], 488, y + 13, 560, 22, { size: 14.5, color: P.muted });
  });

  shape(slide, ctx, 92, 651, 1030, 4, P.green, P.transparent, 0);
  return slide;
}

export async function addDecisionMatrix(presentation, ctx) {
  const slide = baseSlide(presentation, ctx, "CUSTOMER DECISION");
  titleBlock(slide, ctx, "SEBELUM VS DENGAN ENTOK", "Nilainya paling terasa saat customer membandingkan cara kerja lama dengan alur yang terukur.", "Perbandingan ini bisa dipakai sebagai slide penjualan saat demo.");

  const y = 278;
  shape(slide, ctx, 88, y, 500, 330, P.paper, P.line, 1);
  shape(slide, ctx, 638, y, 500, 330, P.mint, P.green, 1);
  text(slide, ctx, "Tanpa ENTOK", 118, y + 28, 260, 38, { size: 30, bold: true, face: ctx.fonts.title, color: P.slate });
  text(slide, ctx, "Dengan ENTOK", 668, y + 28, 260, 38, { size: 30, bold: true, face: ctx.fonts.title, color: P.greenDark });
  const left = [
    "Status tugas dicatat manual atau lewat chat.",
    "Racikan pakan sulit dibandingkan dengan target.",
    "Stok bisa berubah tanpa jejak finalisasi yang jelas.",
    "Pengawas harus sering menanyakan update lapangan.",
  ];
  const right = [
    "Checklist harian punya status per tanggal dan per tugas.",
    "Batch menampilkan target, timbang, terpotong, dan selisih.",
    "Stok dipotong satu kali saat batch final.",
    "Dashboard dan log memberi bukti operasional.",
  ];
  left.forEach((v, i) => bullet(slide, ctx, v, 126, y + 106 + i * 48, 390, { dot: P.red, h: 34 }));
  right.forEach((v, i) => bullet(slide, ctx, v, 676, y + 106 + i * 48, 390, { dot: P.green, h: 34 }));

  shape(slide, ctx, 177, 634, 878, 38, P.ink, P.transparent, 0);
  text(slide, ctx, "ENTOK menjual rasa aman operasional: pekerjaan terlihat, stok lebih terpercaya, dan keputusan lebih cepat.", 202, 642, 830, 18, {
    size: 16,
    color: P.paper,
    bold: true,
    align: "center",
  });
  return slide;
}

export async function addClosing(presentation, ctx) {
  const slide = presentation.slides.add();
  shape(slide, ctx, 0, 0, ctx.W, ctx.H, P.ink, P.transparent, 0);
  shape(slide, ctx, 0, 0, 12, ctx.H, P.green, P.transparent, 0);
  await ctx.addImage(slide, { path: IMAGES.duckAdult, x: 780, y: 78, w: 350, h: 255, fit: "cover", alt: "Entok jumbo" });
  shape(slide, ctx, 780, 333, 350, 4, P.green, P.transparent, 0);
  await ctx.addImage(slide, { path: IMAGES.dod, x: 780, y: 374, w: 350, h: 178, fit: "cover", alt: "Bibit entok" });

  text(slide, ctx, "NEXT STEP", 74, 72, 240, 24, { size: 13, color: P.amber, bold: true });
  text(slide, ctx, "Jadikan demo sebagai simulasi operasional harian.", 74, 112, 610, 116, {
    size: 44,
    color: P.paper,
    bold: true,
    face: ctx.fonts.title,
  });
  text(slide, ctx, "Alur demo yang disarankan: pengawas setup data, penjaga membuka checklist, batch pakan dibuat, Timbangan 2 mengisi data, batch difinalisasi, stok terpotong, lalu dashboard memperbarui kondisi.", 76, 286, 590, 84, {
    size: 16,
    color: "#D6E5DC",
  });

  const checklist = [
    "Tentukan data awal customer",
    "Pilih contoh jadwal Beri Pakan",
    "Simulasikan batch racikan",
    "Tunjukkan stok sebelum dan sesudah finalisasi",
    "Tutup dengan dashboard pengawas",
  ];
  checklist.forEach((v, i) => {
    shape(slide, ctx, 80, 410 + i * 38, 22, 22, P.green, P.transparent, 0);
    text(slide, ctx, "v", 83, 413 + i * 38, 16, 14, { size: 13, color: P.paper, bold: true, align: "center" });
    text(slide, ctx, v, 120, 408 + i * 38, 470, 26, { size: 16, color: P.paper });
  });

  shape(slide, ctx, 74, 645, 1050, 1.5, "#496075", P.transparent, 0);
  text(slide, ctx, "Deliverable: PPTX editable yang bisa di-import ke Canva untuk finishing visual atau presentasi customer.", 76, 662, 720, 18, {
    size: 12,
    color: "#AFC1B8",
  });
  return slide;
}
