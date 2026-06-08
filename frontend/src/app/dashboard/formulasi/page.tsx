'use client';

import React, { useEffect, useState } from 'react';
import { formulationService } from '@/services/formulation';
import { feedService } from '@/services/feed';
import FormulasiModal from '@/components/formulation/FormulasiModal';
import { FormulasiItem, FeedItem } from '@/types';
import { LuTableProperties, LuPencil, LuTrash2 } from 'react-icons/lu';

export default function FormulasiPage() {
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<FormulasiItem | null>(null);
  const [lastUpdated, setLastUpdated] = useState('Baru saja');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [formsRes, feedsRes] = await Promise.all([
        formulationService.getFormulations(),
        feedService.getFeeds(),
      ]);
      setFormulations(formsRes || []);
      setFeeds(feedsRes || []);
      updateLastUpdatedTime();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateLastUpdatedTime = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(`Pukul ${formattedTime}`);
  };

  const handleOpenAddModal = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: FormulasiItem) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteFormulation = async (id: string, phaseName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus formulasi pakan fase "${phaseName}"?`)) {
      try {
        const res = await formulationService.deleteFormulation(id);
        if (res.status === 'success') {
          fetchData();
        }
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus formulasi.');
      }
    }
  };

  const handleSaveFormulation = async (item: FormulasiItem) => {
    try {
      const res = await formulationService.saveFormulation(item);
      if (res.status === 'success') {
        fetchData();
        setIsModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan formulasi.');
    }
  };

  const formatComposition = (komposisi: { [key: string]: number }) => {
    const entries = Object.entries(komposisi);
    if (entries.length === 0) return "[ Bahan Kosong - Sesuaikan Formulasi ]";
    return entries
      .map(([name, pct]) => `${pct}% ${name}`)
      .join(', ');
  };

  if (loading) return <div>[ MEMUAT DATA FORMULASI NUTRISI... ]</div>;

  return (
    <div className="content-wrapper" style={{ padding: 0 }}>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
            <LuTableProperties size={18} style={{ color: 'var(--accent-light)' }} />
            <span>TABEL MASTER FORMULASI NUTRISI &amp; RANSUM</span>
          </div>
          <button className="retro-btn" onClick={handleOpenAddModal} style={{ cursor: 'pointer' }}>
            + TAMBAH FASE
          </button>
        </div>

        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th>FASE PERTUMBUHAN</th>
                <th>TARGET KONSUMSI/EKOR</th>
                <th>KOMPOSISI RANSUM UTAMA</th>
                <th>PAKAN ALTERNATIF</th>
                <th style={{ textAlign: 'center', width: '120px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {formulations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    [ TIDAK ADA DATA FORMULASI PAKAN ]
                  </td>
                </tr>
              ) : (
                formulations.map((item) => (
                  <tr key={item.id}>
                    <td className="active-phase" style={{ whiteSpace: 'nowrap' }}>
                      <div className="active-phase-wrapper">{item.fase}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.targetKonsumsi} gr/hari</td>
                    <td style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {formatComposition(item.komposisi)}
                    </td>
                    <td>{item.pakanAlternatif.join(', ')}</td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button 
                          className="action-btn" 
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit Formulasi"
                          style={{ padding: '6px 8px' }}
                        >
                          <LuPencil size={14} />
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          onClick={() => handleDeleteFormulation(item.id, item.fase)}
                          title="Hapus Formulasi"
                          style={{ padding: '6px 8px' }}
                        >
                          <LuTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footer" style={{ fontFamily: 'var(--font-mono)' }}>
          <div>TOTAL RECORDS: {formulations.length}</div>
          <div>LAST UPDATED: {lastUpdated.toUpperCase()}</div>
        </div>
      </div>

      <FormulasiModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFormulation}
        editItem={editItem}
        feedList={feeds}
      />
    </div>
  );
}
