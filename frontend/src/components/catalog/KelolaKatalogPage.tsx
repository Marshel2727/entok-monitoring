'use client';

import React, { useState } from 'react';
import { LuPencil, LuTrash2, LuStore, LuImage, LuPlus, LuX } from 'react-icons/lu';
import { KatalogItem } from '@/types';
import { resolveAssetUrl } from '@/services/api';

interface KelolaKatalogPageProps {
  katalogList: KatalogItem[];
  onSaveKatalog: (item: KatalogItem) => void;
  onDeleteKatalog: (id: string) => void;
}

const PREDEFINED_IMAGES = [
  { label: 'Entok Jumbo Dewasa', value: '/images/entok_jumbo_dewasa.png' },
  { label: 'Bibit DOD Unggul', value: '/images/bibit_dod_unggul.png' },
  { label: 'Entok Rambon', value: '/images/entok_rambon.png' },
  { label: 'Induk Muscovy Duck', value: '/images/muscovy_duck_home.png' },
  { label: 'Bebek Putih Login', value: '/images/white_duck_login.png' },
  { label: 'Larva BSF Maggot', value: '/images/larva_bsf.png' },
  { label: 'Azolla Microphylla', value: '/images/azolla_microphylla.png' },
  { label: 'Jagung Giling Pakan', value: '/images/jagung_giling.png' }
];

export default function KelolaKatalogPage({
  katalogList,
  onSaveKatalog,
  onDeleteKatalog
}: KelolaKatalogPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<KatalogItem | null>(null);
  
  // Form States
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [harga, setHarga] = useState(0);
  const [stok, setStok] = useState(0);
  const [satuan, setSatuan] = useState('Ekor');
  const [tag, setTag] = useState<string>('NEW');
  const [img, setImg] = useState('/images/entok_jumbo_dewasa.png');

  const openAddModal = () => {
    setEditItem(null);
    setNama('');
    setDeskripsi('');
    setHarga(150000);
    setStok(10);
    setSatuan('Ekor');
    setTag('NEW');
    setImg('/images/entok_jumbo_dewasa.png');
    setIsModalOpen(true);
  };

  const openEditModal = (item: KatalogItem) => {
    setEditItem(item);
    setNama(item.nama);
    setDeskripsi(item.deskripsi);
    setHarga(item.harga);
    setStok(item.stok);
    setSatuan(item.satuan);
    setTag(item.tag);
    setImg(item.img);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Ukuran file terlalu besar. Maksimal 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgElement = document.createElement("img");
        imgElement.src = event.target?.result as string;
        
        imgElement.onload = () => {
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = imgElement.width;
          let height = imgElement.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(imgElement, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
            setImg(compressedBase64);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !deskripsi || harga <= 0 || stok < 0) {
      alert("Mohon lengkapi formulir dengan data yang valid.");
      return;
    }

    const newItem: KatalogItem = {
      id: editItem ? editItem.id : '',
      nama,
      deskripsi,
      harga,
      stok,
      satuan,
      tag,
      img
    };

    onSaveKatalog(newItem);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${name}" dari katalog?`)) {
      onDeleteKatalog(id);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getTagColorClass = (tagValue: string) => {
    switch (tagValue) {
      case 'TANGGUH': return 'success-badge-outline';
      case 'READY': return 'warning-badge-outline';
      case 'LIMITED': return 'danger-glow';
      case 'NEW': return 'info-badge-outline';
      default: return '';
    }
  };

  const getTagColorStyle = (tagValue: string) => {
    switch (tagValue) {
      case 'TANGGUH': return { color: '#34d399', borderColor: '#10b981' };
      case 'READY': return { color: '#fbbf24', borderColor: '#fbbf24' };
      case 'LIMITED': return { color: '#ef4444', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' };
      case 'NEW': return { color: '#60a5fa', borderColor: '#60a5fa' };
      default: return {};
    }
  };

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div className="panel">
        {/* Panel Header */}
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
            <LuStore size={18} style={{ color: 'var(--accent-light)' }} />
            <span>PENGELOLAAN KATALOG PRODUK WEBSITE PUBLIK</span>
          </div>
          <button className="retro-btn" onClick={openAddModal} style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            <LuPlus size={14} style={{ marginRight: '4px' }} /> TAMBAH PRODUK
          </button>
        </div>

        {/* Retro Table */}
        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>FOTO</th>
                <th>NAMA PRODUK</th>
                <th style={{ maxWidth: '300px' }}>DESKRIPSI</th>
                <th>HARGA</th>
                <th>STOK</th>
                <th style={{ width: '100px', textAlign: 'center' }}>TAG STATUS</th>
                <th style={{ width: '120px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {katalogList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    [ TIDAK ADA DATA PRODUK KATALOG ]
                  </td>
                </tr>
              ) : (
                katalogList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        display: 'inline-block'
                      }}>
                        <img src={resolveAssetUrl(item.img, '/images/entok_jumbo_dewasa.png')} alt={item.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-light)' }}>
                      {item.nama}
                    </td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: 'var(--text-secondary)' }} title={item.deskripsi}>
                      {item.deskripsi}
                    </td>
                    <td style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                      {formatRupiah(item.harga)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.stok} {item.satuan}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`validation-badge ${getTagColorClass(item.tag)}`} style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: '9px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        border: '1px solid',
                        ...getTagColorStyle(item.tag)
                      }}>
                        {item.tag}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button 
                          className="action-btn" 
                          onClick={() => openEditModal(item)}
                          title="Edit Produk"
                          style={{ padding: '6px 8px' }}
                        >
                          <LuPencil size={14} />
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          onClick={() => handleDelete(item.id, item.nama)}
                          title="Hapus Produk"
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

        {/* Panel Footer */}
        <div className="panel-footer" style={{ fontFamily: 'var(--font-mono)' }}>
          <div>TOTAL PRODUK: {katalogList.length}</div>
          <div>DATABASE STATUS: SYNCED</div>
        </div>
      </div>

      {/* CRUD Add/Edit Dialog Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', border: '1px solid var(--border)' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="modal-icon">
                    <LuStore size={20} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ fontFamily: 'var(--font-mono)' }}>
                      {editItem ? 'EDIT PRODUK KATALOG' : 'TAMBAH PRODUK KATALOG'}
                    </h3>
                    <div className="modal-subtitle">ATUR SPESIFIKASI DAN HARGA KATALOG</div>
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

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Nama Produk</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Masukkan nama produk..."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Produk</label>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    placeholder="Tuliskan deskripsi lengkap produk..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    style={{ resize: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px' }}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Harga Produk (Rp)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={harga}
                      onChange={(e) => setHarga(parseInt(e.target.value) || 0)}
                      min={0}
                      required
                    />
                  </div>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px', margin: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Stok</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={stok}
                        onChange={(e) => setStok(parseInt(e.target.value) || 0)}
                        min={0}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Satuan</label>
                      <select 
                        className="form-select"
                        value={satuan}
                        onChange={(e) => setSatuan(e.target.value)}
                      >
                        <option value="Ekor">Ekor</option>
                        <option value="Box">Box</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                  <div className="form-group">
                    <label className="form-label">Tag Status</label>
                    <select 
                      className="form-select"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                    >
                      <option value="NEW">NEW</option>
                      <option value="READY">READY</option>
                      <option value="TANGGUH">TANGGUH</option>
                      <option value="LIMITED">LIMITED</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Aset Foto / Gambar Produk</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* File upload trigger */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: '1.5px dashed var(--border)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--accent-light)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s',
                        flexGrow: 1,
                        whiteSpace: 'nowrap'
                      }}
                      className="upload-btn-label"
                      >
                        <LuImage size={14} />
                        UNGGAH FOTO
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleImageUpload} 
                        />
                      </label>

                      {/* Dropdown selector fallback */}
                      <select 
                        className="form-select"
                        value={img.startsWith('data:image') ? '' : img}
                        onChange={(e) => { if (e.target.value) setImg(e.target.value); }}
                        style={{ fontSize: '11px', maxWidth: '140px' }}
                      >
                        <option value="" disabled>{img.startsWith('data:image') ? '[ File Diunggah ]' : '-- Pustaka Default --'}</option>
                        {PREDEFINED_IMAGES.map((imgItem) => (
                          <option key={imgItem.value} value={imgItem.value}>
                            {imgItem.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Photo preview */}
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px',
                  backgroundColor: 'rgba(256, 256, 256, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                  }}>
                    <img src={resolveAssetUrl(img, '/images/entok_jumbo_dewasa.png')} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ minWidth: 0, flexGrow: 1 }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Preview Gambar Terpilih</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'var(--accent-light)', 
                      fontFamily: 'var(--font-mono)',
                      wordBreak: 'break-all',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.2'
                    }} title={img}>
                      {img.startsWith('data:image') ? `${img.substring(0, 50)}... (Base64 Data)` : img}
                    </span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="retro-btn" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ marginRight: '8px' }}
                >
                  BATAL
                </button>
                <button 
                  type="submit" 
                  className="retro-btn" 
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent-light)' }}
                >
                  SIMPAN PRODUK
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
