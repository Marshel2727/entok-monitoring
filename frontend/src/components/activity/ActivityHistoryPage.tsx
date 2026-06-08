'use client';

import React, { useState } from 'react';
import { LuHistory, LuTrash2 } from 'react-icons/lu';
import { ActivityLog } from '@/types';

interface ActivityHistoryPageProps {
  history: ActivityLog[];
  onClearHistory: () => void;
}

export default function ActivityHistoryPage({ history, onClearHistory }: ActivityHistoryPageProps) {
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(history.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Backend already sends newest activities first.
  const sortedHistory = [...history];
  const displayedLogs = sortedHistory.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const getBadgeColor = (tipe: string) => {
    switch (tipe) {
      case 'RESTOCK': return 'var(--accent-light)';
      case 'FORMULASI': return 'var(--warning)';
      case 'INVENTARIS': return 'var(--info-light)';
      case 'OPERASIONAL': return '#a78bfa'; // Purple for operasional tasks
      default: return 'var(--text-secondary)';
    }
  };

  const handleClearClick = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat aktivitas?")) {
      onClearHistory();
      setCurrentPage(1);
    }
  };

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div className="panel">
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
            <LuHistory size={18} style={{ color: 'var(--accent-light)' }} />
            <span>RIWAYAT AKTIVITAS &amp; LOG SISTEM</span>
          </div>
          {history.length > 0 && (
            <button className="retro-btn" onClick={handleClearClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <LuTrash2 size={12} />
              <span>[ BERSIHKAN LOG ]</span>
            </button>
          )}
        </div>

        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>WAKTU</th>
                <th style={{ width: '140px' }}>TIPE AKTIVITAS</th>
                <th>KETERANGAN LOG</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    [ BELUM ADA RIWAYAT AKTIVITAS ]
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{log.waktu}</td>
                    <td>
                      <span 
                        style={{ 
                          color: getBadgeColor(log.tipe), 
                          fontWeight: 'bold', 
                          border: `1px solid ${getBadgeColor(log.tipe)}`, 
                          padding: '2px 8px', 
                          fontSize: '10px',
                          borderRadius: '3px'
                        }}
                      >
                        {log.tipe}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{log.deskripsi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footer" style={{ fontFamily: 'var(--font-mono)' }}>
          <div>TOTAL: {history.length} LOG TERATUR (HALAMAN {currentPage} DARI {totalPages || 1})</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="action-btn" onClick={handlePrevPage} disabled={currentPage === 1} style={{ cursor: 'pointer' }}>
              [ &lt; PREV ]
            </button>
            <button className="action-btn" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} style={{ cursor: 'pointer' }}>
              [ NEXT &gt; ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
