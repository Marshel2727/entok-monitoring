'use client';

import React, { useState } from 'react';
import { LuPencil, LuTrash2, LuClipboardList, LuImage, LuPlus, LuX, LuArrowUp, LuArrowDown } from 'react-icons/lu';
import { PenjagaTaskItem, PanduanLangkah } from '@/types';
import { resolveAssetUrl } from '@/services/api';

interface KelolaTugasPageProps {
  tasksList: PenjagaTaskItem[];
  onSaveTask: (item: PenjagaTaskItem) => void;
  onDeleteTask: (id: string) => void;
}

const PREDEFINED_IMAGES = [
  { label: 'Azolla Microphylla', value: '/images/azolla_microphylla.png' },
  { label: 'Jagung Giling Pakan', value: '/images/jagung_giling.png' },
  { label: 'Larva BSF Maggot', value: '/images/larva_bsf.png' },
  { label: 'Entok Jumbo Dewasa', value: '/images/entok_jumbo_dewasa.png' },
  { label: 'Induk Muscovy Duck', value: '/images/muscovy_duck_home.png' },
  { label: 'Bebek Putih Login', value: '/images/white_duck_login.png' },
  { label: 'Entok Rambon', value: '/images/entok_rambon.png' },
  { label: 'Bibit DOD Unggul', value: '/images/bibit_dod_unggul.png' }
];

export default function KelolaTugasPage({
  tasksList: rawTasksList = [],
  onSaveTask,
  onDeleteTask
}: KelolaTugasPageProps) {
  const tasksList = React.useMemo(() => {
    const parseTimeToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const match = timeStr.trim().match(/(\d{1,2})[:.](\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10) || 0;
        const minutes = parseInt(match[2], 10) || 0;
        return hours * 60 + minutes;
      }
      const numbers = timeStr.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const hours = parseInt(numbers[0], 10) || 0;
        const minutes = parseInt(numbers[1], 10) || 0;
        return hours * 60 + minutes;
      }
      return 0;
    };
    return [...rawTasksList].sort((a, b) => parseTimeToMinutes(a.waktu) - parseTimeToMinutes(b.waktu));
  }, [rawTasksList]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PenjagaTaskItem | null>(null);

  // Core Form States
  const [nama, setNama] = useState('');
  const [waktu, setWaktu] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [img, setImg] = useState('/images/azolla_microphylla.png');
  const [infoDetail, setInfoDetail] = useState('');
  const [perhatikan, setPerhatikan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [langkahList, setLangkahList] = useState<PanduanLangkah[]>([]);

  const openAddModal = () => {
    setEditItem(null);
    setNama('');
    setWaktu('08:00 WITA');
    setDeskripsi('');
    setImg('/images/azolla_microphylla.png');
    setInfoDetail('');
    setPerhatikan('');
    setCatatan('');
    setLangkahList([
      { no: 1, text: 'Pilih bahan pakan yang masih segar dan layak digunakan', thumbnailImg: '/images/azolla_microphylla.png' }
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PenjagaTaskItem) => {
    setEditItem(item);
    setNama(item.nama);
    setWaktu(item.waktu);
    setDeskripsi(item.deskripsi);
    setImg(item.img);
    setInfoDetail(item.infoDetail || '');
    setPerhatikan(item.perhatikan || '');
    setCatatan(item.catatan || '');
    setLangkahList(item.langkah ? [...item.langkah] : []);
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

  const handleAddStep = () => {
    const nextNo = langkahList.length + 1;
    setLangkahList([
      ...langkahList,
      { no: nextNo, text: '', thumbnailImg: '/images/azolla_microphylla.png' }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const filtered = langkahList.filter((_, idx) => idx !== index);
    const reordered = filtered.map((step, idx) => ({
      ...step,
      no: idx + 1
    }));
    setLangkahList(reordered);
  };

  const handleStepChange = (index: number, field: keyof PanduanLangkah, value: any) => {
    const updated = langkahList.map((step, idx) => {
      if (idx === index) {
        return { ...step, [field]: value };
      }
      return step;
    });
    setLangkahList(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === langkahList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newList = [...langkahList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Recalculate step numbers
    const reordered = newList.map((step, idx) => ({
      ...step,
      no: idx + 1
    }));
    setLangkahList(reordered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !waktu || !deskripsi) {
      alert("Mohon lengkapi formulir tugas utama.");
      return;
    }

    const newItem: PenjagaTaskItem = {
      id: editItem ? editItem.id : '',
      nama,
      waktu,
      deskripsi,
      img,
      infoDetail,
      langkah: langkahList,
      perhatikan,
      catatan
    };

    onSaveTask(newItem);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus tugas "${name}" dari SOP Penjaga?`)) {
      onDeleteTask(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div className="panel">
        {/* Panel Header */}
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
            <LuClipboardList size={18} style={{ color: 'var(--accent-light)' }} />
            <span>PENGELOLAAN TUGAS &amp; SOP PENJAGA KANDANG</span>
          </div>
          <button className="retro-btn" onClick={openAddModal} style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            <LuPlus size={14} style={{ marginRight: '4px' }} /> TAMBAH TUGAS
          </button>
        </div>

        {/* Tasks Table */}
        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>IKON</th>
                <th style={{ width: '120px' }}>JAM KERJA</th>
                <th>NAMA TUGAS</th>
                <th style={{ maxWidth: '250px' }}>DESKRIPSI TUGAS</th>
                <th style={{ width: '100px', textAlign: 'center' }}>JML LANGKAH</th>
                <th style={{ width: '120px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {tasksList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    TIDAK ADA DATA TUGAS PENJAGA
                  </td>
                </tr>
              ) : (
                tasksList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        display: 'inline-block'
                      }}>
                        <img src={resolveAssetUrl(item.img, '/images/azolla_microphylla.png')} alt={item.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>
                      {item.waktu}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      {item.nama}
                    </td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: 'var(--text-secondary)' }} title={item.deskripsi}>
                      {item.deskripsi}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {item.langkah ? item.langkah.length : 0} Langkah
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <button 
                          className="action-btn" 
                          onClick={() => openEditModal(item)}
                          title="Edit Tugas & SOP"
                          style={{ padding: '6px 8px', cursor: 'pointer' }}
                        >
                          <LuPencil size={14} />
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          onClick={() => handleDelete(item.id, item.nama)}
                          title="Hapus Tugas"
                          style={{ padding: '6px 8px', cursor: 'pointer' }}
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
          <div>TOTAL TUGAS: {tasksList.length}</div>
          <div>STATUS PORTAL: STANDALONE SYNCED</div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', border: '1px solid var(--border)' }}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="modal-icon">
                    <LuClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ fontFamily: 'var(--font-mono)' }}>
                      {editItem ? 'EDIT TUGAS & SOP PENJAGA' : 'TAMBAH TUGAS & SOP PENJAGA'}
                    </h3>
                    <div className="modal-subtitle">ATUR CHECKLIST DAN ALUR DETAIL LANGKAH KERJA</div>
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

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '6px' }}>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Tugas</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: Beri Pakan Sore..."
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Jam Pelaksanaan (WITA)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: 16:00 WITA"
                      value={waktu}
                      onChange={(e) => setWaktu(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Singkat (Tampil di Checklist Card)</label>
                  <textarea 
                    className="form-input" 
                    rows={2}
                    placeholder="Tulis ringkasan singkat tugas untuk checklist penjaga..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    style={{ resize: 'none', fontSize: '13px' }}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Ikon Utama Tugas</label>
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
                        value={img && img.startsWith('data:image') ? '' : img}
                        onChange={(e) => { if (e.target.value) setImg(e.target.value); }}
                        style={{ fontSize: '11px', maxWidth: '180px' }}
                      >
                        <option value="" disabled>{img && img.startsWith('data:image') ? 'File Diunggah' : '-- Pustaka Default --'}</option>
                        {PREDEFINED_IMAGES.map((imgItem) => (
                          <option key={imgItem.value} value={imgItem.value}>
                            {imgItem.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Detail SOP Utama (infoDetail)</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Contoh: Cacah Azolla menjadi 0.5 cm sebelum dicampur."
                      value={infoDetail}
                      onChange={(e) => setInfoDetail(e.target.value)}
                    />
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
                    <img src={resolveAssetUrl(img, '/images/azolla_microphylla.png')} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ minWidth: 0, flexGrow: 1 }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Preview Ikon Tugas</span>
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
                      {img && img.startsWith('data:image') ? `${img.substring(0, 50)}... (Base64 Data)` : img}
                    </span>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Kotak Warning ("Perhatikan!")</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Contoh: Jangan gunakan bahan yang busuk!"
                      value={perhatikan}
                      onChange={(e) => setPerhatikan(e.target.value)}
                      style={{ resize: 'none', fontSize: '12px', borderLeft: '3px solid var(--danger)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kotak Catatan Kerja ("Catatan")</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Contoh: Lakukan pencacahan secukupnya saja..."
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      style={{ resize: 'none', fontSize: '12px', borderLeft: '3px solid var(--success)' }}
                    />
                  </div>
                </div>

                {/* Steps Config Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>
                      LANGKAH-LANGKAH PANDUAN KERJA DETAIL (SOP)
                    </label>
                    <button 
                      type="button" 
                      className="retro-btn" 
                      onClick={handleAddStep}
                      style={{ padding: '4px 10px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      + Tambah Langkah
                    </button>
                  </div>

                  {langkahList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                      Belum ada langkah panduan terdaftar. Klik "+ Tambah Langkah" di atas.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {langkahList.map((step, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          backgroundColor: 'rgba(256,256,256,0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px 12px'
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 'bold',
                            color: 'var(--accent-light)',
                            width: '24px',
                            textAlign: 'center'
                          }}>
                            {step.no}.
                          </span>

                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ flexGrow: 1, fontSize: '12px', padding: '6px 10px' }}
                            placeholder={`Tulis instruksi langkah ${step.no}...`}
                            value={step.text}
                            onChange={(e) => handleStepChange(idx, 'text', e.target.value)}
                            required
                          />

                          <select 
                            className="form-select"
                            style={{ width: '160px', fontSize: '11px', padding: '6px' }}
                            value={step.thumbnailImg}
                            onChange={(e) => handleStepChange(idx, 'thumbnailImg', e.target.value)}
                          >
                            {PREDEFINED_IMAGES.map((imgItem) => (
                              <option key={imgItem.value} value={imgItem.value}>
                                {imgItem.label.substring(0, 16)}...
                              </option>
                            ))}
                          </select>

                          {/* Reorder/Delete Buttons */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button 
                               type="button" 
                               className="action-btn"
                               style={{ padding: '4px', cursor: 'pointer' }}
                               onClick={() => handleMoveStep(idx, 'up')}
                               disabled={idx === 0}
                               title="Naikkan Langkah"
                            >
                              <LuArrowUp size={12} />
                            </button>
                            <button 
                               type="button" 
                               className="action-btn"
                               style={{ padding: '4px', cursor: 'pointer' }}
                               onClick={() => handleMoveStep(idx, 'down')}
                               disabled={idx === langkahList.length - 1}
                               title="Turunkan Langkah"
                            >
                              <LuArrowDown size={12} />
                            </button>
                            <button 
                              type="button" 
                              className="action-btn delete-btn"
                              style={{ padding: '4px', cursor: 'pointer' }}
                              onClick={() => handleRemoveStep(idx)}
                              title="Hapus Langkah"
                            >
                              <LuX size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                  SIMPAN TUGAS &amp; SOP
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
