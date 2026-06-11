export interface User {
  id?: string;
  nama: string;
  username: string;
  role: 'PENGAWAS' | 'PENJAGA';
  email?: string;
  shift?: string;
  status?: string;
  tanggal_bergabung?: string;
}

export interface FeedItem {
  id: string;
  nama: string;
  kategori: string;
  stok: number;
  ambangBatas: number;
  nutrisi?: {
    protein: number;
    karbohidrat: number;
    lemak: number;
    serat: number;
    mineral: number;
  };
  hargaPerKg?: number; // Optional in UI fallback, maps to price_per_kg
  satuan?: string;     // Optional in UI fallback, maps to unit
}

export interface FormulasiItem {
  id: string;
  phase_id?: string;
  fase: string;
  kategori: string;
  targetKonsumsi: number; // in grams
  komposisi: { [key: string]: number }; // e.g. { "Dedak": 40, "Jagung": 20 }
  pakanAlternatif: string[];
}

export interface ActivityLog {
  id: string;
  waktu: string;
  tipe: 'RESTOCK' | 'FORMULASI' | 'INVENTARIS' | 'SISTEM' | 'OPERASIONAL';
  deskripsi: string;
}

export interface PopulasiLog {
  id: string;
  phase_id?: string;
  kategori: string; // fase
  nilaiLama: number;
  nilaiBaru: number;
  selisih: string;
  waktu: string;
}

export interface KatalogItem {
  id: string;
  nama: string;
  deskripsi: string;
  harga: number;
  stok: number;
  satuan: string;
  tag: string;
  img: string;
}

export interface PanduanLangkah {
  no: number;
  text: string;
  thumbnailImg: string;
}

export interface PenjagaTaskItem {
  id: string;
  nama: string;
  waktu: string; // e.g. "07:00 WITA"
  deskripsi: string;
  img: string;
  infoDetail: string;
  langkah: PanduanLangkah[];
  perhatikan: string;
  catatan: string;
}

export interface KeeperAccountItem {
  id: string;
  nama: string;
  username: string;
  kataSandi?: string;
  shift: string;
  status: string;
  tanggalBergabung: string;
}

export interface Timbangan {
  id: string | number;
  nama: string;
  deskripsi?: string;
  tipe: 'DEDICATED' | 'MULTI';
  ip_address?: string;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE';
  default_label?: string;
  last_reading?: TimbanganReading | null;
  last_active?: string;
}

export interface TimbanganReading {
  id: string;
  timbangan_id: string | number;
  value: number;
  weight?: number;
  unit?: string;
  label?: string; // e.g. "Dedak", "Jagung" (only for MULTI scale)
  feed_id?: string;
  recorded_at?: string;
  timestamp?: string;
}
