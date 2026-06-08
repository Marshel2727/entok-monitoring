'use client';

import React, { useState } from 'react';
import { 
  LuBell, 
  LuTriangleAlert, 
  LuInfo, 
  LuCheck, 
  LuZap, 
  LuPlus, 
  LuTrash2 
} from 'react-icons/lu';
import { FeedItem, ActivityLog } from '@/types';

interface NotifikasiPageProps {
  feedList: FeedItem[];
  activityHistory: ActivityLog[];
  onRestockFeed: (id: string, amount: number) => void;
  onClearHistory: () => void;
}

export default function NotifikasiPage({ 
  feedList, 
  activityHistory, 
  onRestockFeed, 
  onClearHistory 
}: NotifikasiPageProps) {
  const [activeTab, setActiveTab] = useState<'SEMUA' | 'PERINGATAN' | 'LOG'>('SEMUA');
  const [restockAmounts, setRestockAmounts] = useState<{ [key: string]: string }>({});

  // 1. Calculate dynamic stock warnings
  const stockWarnings = feedList
    .filter(feed => feed.stok <= feed.ambangBatas)
    .map(feed => ({
      id: `warn-${feed.id}`,
      waktu: "Real-time",
      tipe: "PERINGATAN" as const,
      kategori: feed.kategori,
      deskripsi: `Stok bahan pakan "${feed.nama}" menipis! Sisa stok saat ini ${feed.stok.toFixed(1)} kg, di bawah ambang batas aman ${feed.ambangBatas.toFixed(1)} kg.`,
      feedId: feed.id,
      feedNama: feed.nama,
      stok: feed.stok,
      ambangBatas: feed.ambangBatas
    }));

  // 2. Map activity logs to standard notifications
  const logNotifications = activityHistory.map(log => {
    let type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO';
    if (log.tipe === 'RESTOCK') type = 'SUCCESS';
    if (log.tipe === 'FORMULASI') type = 'INFO';
    if (log.tipe === 'INVENTARIS') type = 'INFO';
    if (log.tipe === 'OPERASIONAL') type = 'INFO';
    
    return {
      id: log.id,
      waktu: log.waktu,
      tipe: type,
      kategori: log.tipe,
      deskripsi: log.deskripsi,
      feedId: undefined,
      feedNama: undefined,
      stok: undefined,
      ambangBatas: undefined
    };
  });

  // Combine alerts (warnings prioritized at top)
  const allNotifications = [...stockWarnings, ...logNotifications];

  // Filter based on tab selection
  const filteredNotifications = allNotifications.filter(item => {
    if (activeTab === 'PERINGATAN') return item.tipe === 'PERINGATAN';
    if (activeTab === 'LOG') return item.tipe !== 'PERINGATAN';
    return true; // SEMUA
  });

  // Handle inline restock action
  const handleInlineRestock = (feedId: string, feedNama: string) => {
    const rawVal = restockAmounts[feedId];
    const amount = parseFloat(rawVal);
    if (isNaN(amount) || amount <= 0) {
      alert("Masukkan jumlah restock yang valid (lebih dari 0)!");
      return;
    }

    onRestockFeed(feedId, amount);
    setRestockAmounts(prev => ({ ...prev, [feedId]: "" }));
    alert(`Berhasil restock ${amount} kg untuk ${feedNama}!`);
  };

  const handleInputChange = (feedId: string, val: string) => {
    setRestockAmounts(prev => ({ ...prev, [feedId]: val }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-main-title" style={{ fontSize: '24px', letterSpacing: '1px' }}>Pusat Notifikasi</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ALARM INVENTARIS PAKAN, LOG SISTEM, DAN REAL-TIME MONITORING
          </p>
        </div>
        
        {activeTab === 'LOG' && activityHistory.length > 0 && (
          <button 
            className="retro-btn" 
            onClick={onClearHistory}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <LuTrash2 size={13} />
            <span>[ HAPUS LOG RIWAYAT ]</span>
          </button>
        )}
      </div>

      {/* System Sync Banner */}
      <div className="panel" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LuZap size={14} style={{ color: 'var(--accent-light)' }} />
            <span>STATUS ALARM INVENTARIS: </span>
            <span style={{ color: stockWarnings.length > 0 ? 'var(--warning)' : 'var(--accent-light)', fontWeight: 'bold' }}>
              {stockWarnings.length > 0 ? `${stockWarnings.length} BAHAN KRITIS` : 'OPTIMAL (AMAN)'}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            DATABASE SYNC: <span style={{ color: 'var(--accent-light)' }}>ONLINE</span> (LAST INDEXED: {new Date().toLocaleDateString('id-ID')})
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mini-tab-container" style={{ alignSelf: 'flex-start', padding: '4px' }}>
        <button 
          className={`mini-tab ${activeTab === 'SEMUA' ? 'active' : ''}`} 
          onClick={() => setActiveTab('SEMUA')}
          style={{ fontSize: '11px', padding: '6px 14px', cursor: 'pointer' }}
        >
          SEMUA ({allNotifications.length})
        </button>
        <button 
          className={`mini-tab ${activeTab === 'PERINGATAN' ? 'active' : ''}`} 
          onClick={() => setActiveTab('PERINGATAN')}
          style={{ fontSize: '11px', padding: '6px 14px', cursor: 'pointer' }}
        >
          PERINGATAN STOK ({stockWarnings.length})
        </button>
        <button 
          className={`mini-tab ${activeTab === 'LOG' ? 'active' : ''}`} 
          onClick={() => setActiveTab('LOG')}
          style={{ fontSize: '11px', padding: '6px 14px', cursor: 'pointer' }}
        >
          RIWAYAT SYSTEM LOG ({logNotifications.length})
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredNotifications.length === 0 ? (
          <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            [ TIDAK ADA NOTIFIKASI DALAM KATEGORI INI ]
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isWarning = item.tipe === 'PERINGATAN';
            const isSuccess = item.tipe === 'SUCCESS';
            
            // Set styles based on notification type
            let cardBorderColor = 'var(--border)';
            let cardBgColor = 'var(--bg-card)';
            let tagColor = 'var(--text-secondary)';
            let iconElement = <LuInfo size={16} style={{ color: 'var(--text-secondary)' }} />;

            if (isWarning) {
              cardBorderColor = 'var(--warning)';
              cardBgColor = 'var(--warning-glow)';
              tagColor = 'var(--warning)';
              iconElement = <LuTriangleAlert size={16} style={{ color: 'var(--warning)' }} />;
            } else if (isSuccess) {
              cardBorderColor = 'var(--accent)';
              cardBgColor = 'var(--accent-glow)';
              tagColor = 'var(--accent-light)';
              iconElement = <LuCheck size={16} style={{ color: 'var(--accent-light)' }} />;
            }

            return (
              <div 
                key={item.id} 
                className="panel" 
                style={{ 
                  borderColor: cardBorderColor, 
                  backgroundColor: cardBgColor,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  
                  {/* Icon + Title Description */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                      {iconElement}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: '1.5' }}>
                        {item.deskripsi}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: tagColor, fontWeight: 'bold' }}>[{item.kategori.toUpperCase()}]</span>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.waktu}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Inline Restock Widget for warnings */}
                {isWarning && item.feedId && (
                  <div 
                    style={{ 
                      marginTop: '6px', 
                      paddingTop: '12px', 
                      borderTop: '1px dashed var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      ⚡ INPUT RESTOCK SEKARANG:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '280px' }}>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Jumlah (kg)"
                        value={restockAmounts[item.feedId] || ""}
                        onChange={(e) => handleInputChange(item.feedId!, e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px', height: '32px' }}
                        min="0.1"
                        step="any"
                      />
                      <button
                        className="retro-btn"
                        onClick={() => handleInlineRestock(item.feedId!, item.feedNama!)}
                        style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        <LuPlus size={12} />
                        <span>TAMBAH</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
