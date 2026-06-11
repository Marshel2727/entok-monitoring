'use client';

import React, { useState } from 'react';
import { 
  LuBird, 
  LuEgg, 
  LuTrash2, 
  LuFileText,
  LuSparkles 
} from 'react-icons/lu';
import { PopulasiLog } from '@/types';

interface KelolaPopulasiPageProps {
  jumlahStarter: number;
  jumlahGrower1: number;
  jumlahGrower2: number;
  jumlahFinisher: number;
  populasiHistory: PopulasiLog[];
  onUpdateFasePopulasi: (fase: string, newVal: number) => void;
  onDeleteLog: (id: string) => void;
}

const FASE_OPTIONS = [
  "Starter (1-14 Hari)",
  "Grower 1 (15-35 Hari)",
  "Grower 2 (36-60 Hari)",
  "Finisher (>60 Hari)"
];

export default function KelolaPopulasiPage({
  jumlahStarter,
  jumlahGrower1,
  jumlahGrower2,
  jumlahFinisher,
  populasiHistory,
  onUpdateFasePopulasi,
  onDeleteLog
}: KelolaPopulasiPageProps) {
  const [selectedFase, setSelectedFase] = useState<string>("");
  const [popInput, setPopInput] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFase) {
      alert("Pilih Usia / Fase terlebih dahulu!");
      return;
    }
    const val = parseInt(popInput);
    if (isNaN(val) || val < 0) {
      alert("Masukkan jumlah entok yang valid (minimal 0)!");
      return;
    }
    
    onUpdateFasePopulasi(selectedFase, val);
    setPopInput("");
  };

  const getFaseCount = (fase: string) => {
    if (fase.startsWith("Starter")) return jumlahStarter;
    if (fase.startsWith("Grower 1")) return jumlahGrower1;
    if (fase.startsWith("Grower 2")) return jumlahGrower2;
    if (fase.startsWith("Finisher")) return jumlahFinisher;
    return 0;
  };

  const jumlahBibit = jumlahStarter + jumlahGrower1;
  const jumlahInduk = jumlahGrower2 + jumlahFinisher;
  const totalBebek = jumlahBibit + jumlahInduk;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {/* Unified Form Section */}
      <div className="panel" style={{ padding: '24px' }}>
        <div style={{ fontSize: '11px', color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '10px', marginBottom: '20px' }}>
          FORM PENGISIAN JUMLAH ENTOK BERDASARKAN UMUR
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Usia Entok (Fase)</label>
              <select 
                className="form-select" 
                value={selectedFase} 
                onChange={(e) => setSelectedFase(e.target.value)}
                required
              >
                <option value="" disabled>Pilih Usia / Fase</option>
                {FASE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Masukkan Jumlah Entok (Ekor)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder={selectedFase ? `Saat ini: ${getFaseCount(selectedFase)} ekor` : "Pilih fase terlebih dahulu"}
                  value={popInput}
                  onChange={(e) => setPopInput(e.target.value)}
                  min="0"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="retro-btn" style={{ padding: '0 20px', fontWeight: 'bold', minWidth: '120px', cursor: 'pointer' }}>
                  PERBARUI
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: KPI Cards & Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Jumlah Induk */}
          <div className="panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.1, color: 'var(--accent-light)' }}>
              <LuBird size={48} />
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              JUMLAH INDUKAN (GROWER 2 + FINISHER)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px' }}>
              {jumlahInduk} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Ekor</span>
            </div>
          </div>

          {/* Card 2: Jumlah Bibit */}
          <div className="panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.1, color: '#60a5fa' }}>
              <LuEgg size={44} />
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              JUMLAH BIBIT / DOD (STARTER + GROWER 1)
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px' }}>
              {jumlahBibit} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Ekor</span>
            </div>
          </div>

          {/* Detailed Age-Phase Breakdown Grid */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
              📊 RINCIAN POPULASI PER USIA
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              {FASE_OPTIONS.map((fase) => {
                const count = getFaseCount(fase);
                return (
                  <div key={fase} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{fase}:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{count} Ekor</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Info total */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)', fontSize: '11px', fontFamily: 'var(--font-mono)', gap: '8px' }}>
            <LuSparkles size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Total Populasi: <strong>{totalBebek} Ekor</strong>. Mixer guide akan menghitung pakan secara spesifik per fase.
            </span>
          </div>

        </div>

        {/* Right Column: History table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuFileText size={16} style={{ color: 'var(--accent-light)' }} />
              <span>RIWAYAT PERUBAHAN POPULASI</span>
            </div>
          </div>

          <div className="retro-table-container">
            <table className="retro-table">
              <thead>
                <tr>
                  <th>FASE USIA</th>
                  <th>NILAI LAMA</th>
                  <th>NILAI BARU</th>
                  <th>SELISIH</th>
                  <th>WAKTU</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {populasiHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '24px' }}>
                      BELUM ADA RIWAYAT PERUBAHAN POPULASI
                    </td>
                  </tr>
                ) : (
                  populasiHistory.map((log) => {
                    const isIncrease = log.selisih.startsWith('+');
                    const diffColor = isIncrease ? 'var(--accent-light)' : 'var(--danger)';
                    
                    return (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '12px' }}>
                          {log.kategori}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{log.nilaiLama} ekor</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{log.nilaiBaru} ekor</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: diffColor, fontWeight: 'bold' }}>
                          {log.selisih}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {log.waktu}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => onDeleteLog(log.id)}
                            title="Hapus Log"
                            style={{ padding: '6px 10px', fontSize: '10px', cursor: 'pointer' }}
                          >
                            <LuTrash2 size={13} style={{ marginRight: '4px' }} />
                            <span>DELETE</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
