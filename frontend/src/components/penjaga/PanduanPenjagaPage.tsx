"use client";

import React from 'react';
import { LuPrinter } from 'react-icons/lu';
import { FeedItem, FormulasiItem } from '@/types';

interface PanduanPenjagaPageProps {
  feedList: FeedItem[];
  formulasiList: FormulasiItem[];
  jumlahStarter: number;
  jumlahGrower1: number;
  jumlahGrower2: number;
  jumlahFinisher: number;
}

export default function PanduanPenjagaPage({ 
  feedList, 
  formulasiList, 
  jumlahStarter, 
  jumlahGrower1, 
  jumlahGrower2, 
  jumlahFinisher 
}: PanduanPenjagaPageProps) {
  const handlePrint = () => {
    window.print();
  };

  // Helper to check stock status and return stock warning message if needed
  const getStockCheck = (namaPakan: string, requiredKg: number) => {
    const feed = feedList.find(f => f.nama.toLowerCase() === namaPakan.toLowerCase() || f.nama.toLowerCase() === (namaPakan.toLowerCase() + ' beras'));
    if (!feed) {
      return { isEnough: false, text: "Tidak Terdaftar", color: "var(--danger)" };
    }
    if (feed.stok < requiredKg) {
      return { 
        isEnough: false, 
        text: `Stok Kurang (${feed.stok.toFixed(1)}/${requiredKg.toFixed(1)} KG)`, 
        color: "var(--warning)" 
      };
    }
    return { 
      isEnough: true, 
      text: `Stok Cukup (${feed.stok.toFixed(1)} KG)`, 
      color: "var(--accent-light)" 
    };
  };

  const getPhasePopulation = (faseStr: string) => {
    if (faseStr.startsWith("Starter")) return jumlahStarter;
    if (faseStr.startsWith("Grower 1")) return jumlahGrower1;
    if (faseStr.startsWith("Grower 2")) return jumlahGrower2;
    if (faseStr.startsWith("Finisher")) return jumlahFinisher;
    return 0;
  };

  const totalBebek = jumlahStarter + jumlahGrower1 + jumlahGrower2 + jumlahFinisher;

  return (
    <div className="content-wrapper print-area" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: 0 }}>
      
      {/* Page Header (Hidden on print via CSS but let's declare it clearly) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-main-title" style={{ fontSize: '24px', letterSpacing: '1px' }}>Acuan Pakan Penjaga</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ACUAN TIMBANGAN DAN COMPOSITION CAMPURAN HARIAN BEBEK ENTOK
          </p>
        </div>
        
        <button className="retro-btn" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
          <LuPrinter size={14} />
          <span>Cetak Acuan Pakan</span>
        </button>
      </div>

      {/* Calculator Setup Panel */}
      <div className="panel no-print" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            <span className="form-label" style={{ fontSize: '10px' }}>STATUS POPULASI SAAT INI (TOTAL: {totalBebek} EKOR)</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)' }}>
                Starter: <strong style={{ color: 'var(--text-primary)' }}>{jumlahStarter} ekor</strong>
              </div>
              <div style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)' }}>
                Grower 1: <strong style={{ color: 'var(--text-primary)' }}>{jumlahGrower1} ekor</strong>
              </div>
              <div style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)' }}>
                Grower 2: <strong style={{ color: 'var(--text-primary)' }}>{jumlahGrower2} ekor</strong>
              </div>
              <div style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-input)' }}>
                Finisher: <strong style={{ color: 'var(--text-primary)' }}>{jumlahFinisher} ekor</strong>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <p>💡 <strong>Informasi Penjaga:</strong></p>
            <p style={{ marginTop: '4px' }}>
              Timbangan bahan campuran di bawah dihitung otomatis menyesuaikan dengan jumlah bebek di <strong>masing-masing kelompok umur (fase)</strong>. Pengaturan populasi dikelola melalui menu <strong>KELOLA POPULASI</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Print Only Header (Visible only when printing) */}
      <div className="print-only" style={{ display: 'none', borderBottom: '2px solid black', paddingBottom: '12px', marginBottom: '20px', fontFamily: 'monospace' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>LEMBAR ACUAN PENCAMPURAN PAKAN</h2>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>
          Dibuat pada: {new Date().toLocaleDateString('id-ID')} · Total Populasi: <strong>{totalBebek} Ekor Bebek</strong>
        </p>
      </div>

      {/* Formulations Grid */}
      <div className="duck-guide-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {formulasiList.length === 0 ? (
          <div className="panel" style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum Ada Formulasi yang Dibuat Sebagai Acuan
          </div>
        ) : (
          formulasiList.map((item) => {
            const phasePop = getPhasePopulation(item.fase);
            const totalPakanFlockKg = (item.targetKonsumsi * phasePop) / 1000;

            return (
              <div key={item.id} className="panel guide-card" style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* Guide Card Header */}
                <div className="panel-header" style={{ padding: '14px 20px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                      {item.fase.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      KATEGORI: {item.kategori.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="panel-body" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Intake details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', border: '1px dashed var(--border)', padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>KONSUMSI / EKOR</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.targetKonsumsi} Gram / Hari</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>TOTAL {phasePop} EKOR</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-light)' }}>{totalPakanFlockKg.toFixed(2)} KG / Hari</span>
                    </div>
                  </div>

                  {/* Mixing Breakdown */}
                  <div>
                    <span className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '9px' }}>
                      📋 DOSIS CAMPURAN BAHAN (TIMBANG SECARA AKURAT):
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(item.komposisi).map(([namaPakan, pct]) => {
                        const ingKg = (pct / 100) * totalPakanFlockKg;
                        const stockCheck = getStockCheck(namaPakan, ingKg);

                        return (
                          <div 
                            key={namaPakan} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '10px 12px', 
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              backgroundColor: 'var(--bg-input)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <span style={{ 
                                fontSize: '12px', 
                                color: 'var(--text-primary)',
                                fontWeight: 'bold'
                              }}>
                                • {namaPakan}
                              </span>
                            </div>

                            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                                {ingKg.toFixed(2)} KG <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({pct}%)</span>
                              </div>
                              
                              <span className="no-print" style={{ fontSize: '9px', color: stockCheck.color, fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                                {stockCheck.text}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alternative feeds recommendation */}
                  {item.pakanAlternatif.length > 0 && item.pakanAlternatif[0] !== "-" && (
                    <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--warning-light)' }}>🌱 Pakan Alternatif Tersedia: </span>
                      <span>{item.pakanAlternatif.join(', ')}</span>
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
