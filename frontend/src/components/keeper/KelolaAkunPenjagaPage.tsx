'use client';

import React, { useState } from 'react';
import { LuPencil, LuTrash2, LuUsers, LuPlus, LuX, LuEye, LuEyeOff, LuSearch } from 'react-icons/lu';
import { KeeperAccountItem } from '@/types';

interface KelolaAkunPenjagaPageProps {
  keeperAccounts: KeeperAccountItem[];
  onSaveAccount: (item: KeeperAccountItem) => void;
  onDeleteAccount: (id: string) => void;
}

export default function KelolaAkunPenjagaPage({
  keeperAccounts,
  onSaveAccount,
  onDeleteAccount
}: KelolaAkunPenjagaPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<KeeperAccountItem | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<{ [key: string]: boolean }>({});
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Core Form States
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [shift, setShift] = useState<string>('Pagi');
  const [status, setStatus] = useState<string>('Aktif');

  const openAddModal = () => {
    setEditItem(null);
    setNama('');
    setUsername('');
    setKataSandi('');
    setShift('Pagi');
    setStatus('Aktif');
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: KeeperAccountItem) => {
    setEditItem(item);
    setNama(item.nama);
    setUsername(item.username);
    setKataSandi(item.kataSandi || '');
    setShift(item.shift);
    setStatus(item.status);
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !username || (!editItem && !kataSandi)) {
      alert("Mohon lengkapi seluruh formulir akun.");
      return;
    }

    const todayStr = editItem ? editItem.tanggalBergabung : new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const newItem: KeeperAccountItem = {
      id: editItem ? editItem.id : '',
      nama,
      username: username.trim().toLowerCase(),
      kataSandi: kataSandi.trim(),
      shift,
      status,
      tanggalBergabung: todayStr
    };

    onSaveAccount(newItem);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun penjaga "${name}"?`)) {
      onDeleteAccount(id);
    }
  };

  // Filter accounts based on search term
  const filteredAccounts = keeperAccounts.filter(acc => 
    acc.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div className="panel">
        {/* Panel Header */}
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
            <LuUsers size={18} style={{ color: 'var(--accent-light)' }} />
            <span>PENGELOLAAN AKUN &amp; KREDENSIAL PENJAGA KANDANG</span>
          </div>
          <button className="retro-btn" onClick={openAddModal} style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            <LuPlus size={14} style={{ marginRight: '4px' }} /> TAMBAH AKUN
          </button>
        </div>

        {/* Search Bar Panel Area */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(256, 256, 256, 0.01)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <LuSearch size={16} />
            </span>
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
              placeholder="Cari berdasarkan nama atau username penjaga..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <button 
              className="retro-btn" 
              style={{ padding: '6px 12px', fontSize: '11px', height: '36px', cursor: 'pointer' }}
              onClick={() => setSearchTerm('')}
            >
              Reset
            </button>
          )}
        </div>

        {/* Table representation of keeper accounts */}
        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th>NAMA PENJAGA</th>
                <th>USERNAME (LOGIN ID)</th>
                <th>KATA SANDI</th>
                <th style={{ width: '130px', textAlign: 'center' }}>SHIFT KERJA</th>
                <th style={{ width: '130px', textAlign: 'center' }}>STATUS</th>
                <th style={{ width: '160px', textAlign: 'center' }}>BERGABUNG</th>
                <th style={{ width: '120px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {searchTerm ? 'Tidak Ada Hasil Pencarian Penjaga' : 'Tidak Ada Data Akun Penjaga'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((item) => {
                  const isVisible = showPasswordMap[item.id] || false;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {item.nama}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>
                        {item.username}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'transparent' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {item.kataSandi ? (isVisible ? item.kataSandi : '••••••••') : 'Tersimpan aman'}
                          </span>
                          <span style={{ fontSize: '13px' }}>
                            {isVisible ? item.kataSandi || '••••••••' : '••••••••'}
                          </span>
                          <button 
                            type="button"
                            onClick={() => togglePasswordVisibility(item.id)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--text-secondary)', 
                              cursor: 'pointer',
                              display: item.kataSandi ? 'flex' : 'none',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title={isVisible ? "Sembunyikan Sandi" : "Tampilkan Sandi"}
                          >
                            {isVisible ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(256, 256, 256, 0.03)',
                          border: '1px solid var(--border)',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          color: 'var(--text-primary)'
                        }}>
                          {item.shift}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`validation-badge ${item.status === 'Aktif' ? 'success-badge-outline' : 'danger-glow'}`} style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: '9px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          border: '1px solid',
                          color: item.status === 'Aktif' ? '#34d399' : '#ef4444',
                          borderColor: item.status === 'Aktif' ? '#10b981' : '#ef4444',
                          backgroundColor: item.status === 'Aktif' ? 'transparent' : 'rgba(239, 68, 68, 0.1)'
                        }}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {item.tanggalBergabung}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button 
                            className="action-btn" 
                            onClick={() => openEditModal(item)}
                            title="Edit Akun"
                            style={{ padding: '6px 8px', cursor: 'pointer' }}
                          >
                            <LuPencil size={14} />
                          </button>
                          <button 
                            className="action-btn delete-btn" 
                            onClick={() => handleDelete(item.id, item.nama)}
                            title="Hapus Akun"
                            style={{ padding: '6px 8px', cursor: 'pointer' }}
                          >
                            <LuTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Panel Footer */}
        <div className="panel-footer" style={{ fontFamily: 'var(--font-mono)' }}>
          <div>TOTAL PENJAGA: {filteredAccounts.length}</div>
          <div>OTENTIKASI PORTAL: INTEGRATED SYNC</div>
        </div>
      </div>

      {/* CRUD Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', border: '1px solid var(--border)' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="modal-icon">
                    <LuUsers size={20} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ fontFamily: 'var(--font-mono)' }}>
                      {editItem ? 'EDIT AKUN PENJAGA' : 'TAMBAH AKUN PENJAGA'}
                    </h3>
                    <div className="modal-subtitle">ATUR HAK AKSES DAN KREDENSIAL PENJAGA</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <LuX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Penjaga</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Contoh: Pak Joko..."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Username (Login ID)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: joko..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kata Sandi</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showFormPassword ? "text" : "password"}
                        className="form-input"
                        placeholder={editItem ? "Masukkan kata sandi baru (kosongkan jika tidak diubah)..." : "Masukkan kata sandi..."}
                        value={kataSandi}
                        onChange={(e) => setKataSandi(e.target.value)}
                        required={!editItem}
                        style={{ paddingRight: '38px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword((prev) => !prev)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px'
                        }}
                        title={showFormPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                      >
                        {showFormPassword ? <LuEyeOff size={15} /> : <LuEye size={15} />}
                      </button>
                    </div>
                    {editItem && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                        Sandi lama tidak dapat dilihat. Isi kolom ini hanya jika ingin mengganti sandi.
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Shift Kerja</label>
                    <select 
                      className="form-select"
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                    >
                      <option value="Pagi">Pagi</option>
                      <option value="Sore">Sore</option>
                      <option value="Full-Time">Full-Time</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status Akun</label>
                    <select 
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="retro-btn" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                >
                  BATAL
                </button>
                <button 
                  type="submit" 
                  className="retro-btn" 
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent-light)', cursor: 'pointer' }}
                >
                  SIMPAN AKUN
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
