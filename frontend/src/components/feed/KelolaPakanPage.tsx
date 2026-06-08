'use client';

import React, { useEffect, useState } from 'react';
import { LuPlus, LuPencil, LuTrash2, LuLock, LuX, LuTriangleAlert } from 'react-icons/lu';
import { FeedItem, FormulasiItem, Timbangan } from '@/types';

interface KelolaPakanPageProps {
  feedList: FeedItem[];
  timbanganList?: Timbangan[];
  formulasiList?: FormulasiItem[];
  populationList?: { phase: string; total_ducks: number }[];
  onSaveFeed: (feed: FeedItem) => void;
  onDeleteFeed: (id: string) => void;
  onRestockFeed: (id: string, amount: number) => void;
  onScaleReading?: (timbanganId: string | number, value: number, label?: string, feedId?: string, phase?: string) => Promise<void>;
  onScaleComposition?: (timbanganId: string | number, phase: string) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  "Energi & Karbohidrat",
  "Protein Hewani/Nabati",
  "Hijauan & Serat"
];

const EMPTY_NUTRITION = {
  protein: '0',
  karbohidrat: '0',
  lemak: '0',
  serat: '0',
  mineral: '0'
};

const NUTRITION_FIELDS = [
  { key: 'protein', label: 'Protein' },
  { key: 'karbohidrat', label: 'Karbohidrat' },
  { key: 'lemak', label: 'Lemak' },
  { key: 'serat', label: 'Serat' },
  { key: 'mineral', label: 'Mineral' }
] as const;

type NutritionForm = typeof EMPTY_NUTRITION;

const toNutritionPayload = (values: NutritionForm) => ({
  protein: parseFloat(values.protein) || 0,
  karbohidrat: parseFloat(values.karbohidrat) || 0,
  lemak: parseFloat(values.lemak) || 0,
  serat: parseFloat(values.serat) || 0,
  mineral: parseFloat(values.mineral) || 0
});

const nutritionToForm = (feed?: FeedItem | null): NutritionForm => ({
  protein: String(feed?.nutrisi?.protein ?? 0),
  karbohidrat: String(feed?.nutrisi?.karbohidrat ?? 0),
  lemak: String(feed?.nutrisi?.lemak ?? 0),
  serat: String(feed?.nutrisi?.serat ?? 0),
  mineral: String(feed?.nutrisi?.mineral ?? 0)
});

export default function KelolaPakanPage({ 
  feedList, 
  timbanganList = [],
  formulasiList = [],
  populationList = [],
  onSaveFeed, 
  onDeleteFeed, 
  onRestockFeed,
  onScaleReading,
  onScaleComposition
}: KelolaPakanPageProps) {
  // Local States
  const [quickFeedId, setQuickFeedId] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [scaleTimbanganId, setScaleTimbanganId] = useState('');
  const [scaleFeedId, setScaleFeedId] = useState('');
  const [scalePhase, setScalePhase] = useState('');
  const [scaleValue, setScaleValue] = useState('');
  const [isScaleSaving, setIsScaleSaving] = useState(false);
  const [isCompositionSaving, setIsCompositionSaving] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<FeedItem | null>(null);

  // Form Fields for Add
  const [addNama, setAddNama] = useState('');
  const [addKategori, setAddKategori] = useState('Energi & Karbohidrat');
  const [addStokAwal, setAddStokAwal] = useState('0.0');
  const [addAmbangBatas, setAddAmbangBatas] = useState('5.0');
  const [addNutrisi, setAddNutrisi] = useState<NutritionForm>(EMPTY_NUTRITION);

  // Form Fields for Edit
  const [editNama, setEditNama] = useState('');
  const [editKategori, setEditKategori] = useState('');
  const [editAmbangBatas, setEditAmbangBatas] = useState('');
  const [editNutrisi, setEditNutrisi] = useState<NutritionForm>(EMPTY_NUTRITION);

  // Find Dedak item to render in the dedicated live scale panel
  const dedakItem = feedList.find(f => f.nama.toLowerCase() === 'dedak' || f.nama.toLowerCase() === 'dedak beras') || feedList[0];
  const selectedScale = timbanganList.find((item) => String(item.id) === scaleTimbanganId) || null;
  const selectedScaleFeed = feedList.find((item) => item.id === scaleFeedId) || null;
  const selectedScaleFormulation = formulasiList.find((form) => form.fase === scalePhase) || null;
  const compositionNames = selectedScaleFormulation
    ? Object.keys(selectedScaleFormulation.komposisi).map((name) => name.trim().toLowerCase())
    : [];
  const scaleFeedOptions = selectedScale?.tipe === 'MULTI' && compositionNames.length > 0
    ? feedList.filter((feed) => compositionNames.includes(feed.nama.trim().toLowerCase()))
    : feedList;
  const selectedScaleLabel = selectedScale?.tipe === 'DEDICATED'
    ? selectedScale.default_label || selectedScale.nama
    : selectedScaleFeed?.nama;

  const getPhasePopulation = (phase: string) => {
    const phaseLower = phase.trim().toLowerCase();
    const found = populationList.find((item) => {
      const itemPhase = item.phase.trim().toLowerCase();
      return itemPhase.includes(phaseLower) || phaseLower.includes(itemPhase);
    });
    return found?.total_ducks || 0;
  };

  const getCompositionTargetKg = (feedName: string) => {
    if (!selectedScaleFormulation) return 0;

    const matchedEntry = Object.entries(selectedScaleFormulation.komposisi).find(([name]) => {
      return name.trim().toLowerCase() === feedName.trim().toLowerCase();
    });

    if (!matchedEntry) return 0;

    const percentage = Number(matchedEntry[1] || 0);
    const population = getPhasePopulation(selectedScaleFormulation.fase);
    return (Number(selectedScaleFormulation.targetKonsumsi || 0) * population * (percentage / 100)) / 1000;
  };

  const selectedTargetKg = selectedScaleFeed ? getCompositionTargetKg(selectedScaleFeed.nama) : 0;

  useEffect(() => {
    if (selectedScale?.tipe === 'MULTI' && selectedScaleFeed && selectedTargetKg > 0) {
      setScaleValue(selectedTargetKg.toFixed(2));
    }
  }, [selectedScale?.tipe, selectedScaleFeed?.id, selectedTargetKg]);
  
  // State for category filtering
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');

  // Filter manual feeds (excluding Dedak) and apply category filtering
  const manualFeeds = feedList.filter(f => {
    const isNotDedak = dedakItem ? f.id !== dedakItem.id : true;
    if (!isNotDedak) return false;
    if (selectedCategoryFilter === 'Semua') return true;
    return f.kategori === selectedCategoryFilter;
  });

  // Pagination implementation based on manual feeds
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(manualFeeds.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedFeeds = manualFeeds.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Handlers
  const handleQuickRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFeedId || !quickAmount) return;
    const amount = parseFloat(quickAmount) || 0;
    if (amount <= 0) return;

    onRestockFeed(quickFeedId, amount);
    setQuickAmount('');
    alert(`Berhasil restock pakan!`);
  };

  const handleScaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onScaleReading || !selectedScale) return;

    const value = parseFloat(scaleValue);
    if (!Number.isFinite(value) || value < 0) {
      alert('Nilai timbangan harus berupa angka 0 atau lebih.');
      return;
    }

    if (selectedScale.tipe === 'MULTI' && !selectedScaleFeed) {
      alert('Pilih bahan pakan untuk Timbangan 2 / multi.');
      return;
    }

    if (selectedScale.tipe === 'MULTI' && !scalePhase) {
      alert('Pilih fase usia untuk racikan Timbangan 2.');
      return;
    }

    setIsScaleSaving(true);
    try {
      await onScaleReading(selectedScale.id, value, selectedScaleLabel, selectedScaleFeed?.id, scalePhase);
      setScaleValue(selectedScale.tipe === 'MULTI' && selectedTargetKg > 0 ? selectedTargetKg.toFixed(2) : '');
      alert(selectedScale.tipe === 'MULTI'
        ? 'Data racikan dari Timbangan 2 berhasil masuk ke batch.'
        : 'Pembacaan timbangan berhasil disimpan.');
    } finally {
      setIsScaleSaving(false);
    }
  };

  const handleScaleCompositionSubmit = async () => {
    if (!onScaleComposition || !selectedScale || selectedScale.tipe !== 'MULTI') return;

    if (!scalePhase) {
      alert('Pilih fase usia dulu.');
      return;
    }

    if (!window.confirm(`Masukkan semua bahan fase "${scalePhase}" sesuai komposisi target batch?`)) {
      return;
    }

    setIsCompositionSaving(true);
    try {
      await onScaleComposition(selectedScale.id, scalePhase);
      alert('Semua bahan fase ini berhasil masuk ke batch sesuai komposisi.');
    } catch (err: any) {
      alert(err.message || 'Gagal memasukkan komposisi ke batch.');
    } finally {
      setIsCompositionSaving(false);
    }
  };

  const openAddModal = () => {
    setAddNama('');
    setAddKategori('Energi & Karbohidrat');
    setAddStokAwal('0.0');
    setAddAmbangBatas('5.0');
    setAddNutrisi(EMPTY_NUTRITION);
    setIsAddOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNama) return;

    const newItem: FeedItem = {
      id: '', // Will be generated by backend
      nama: addNama,
      kategori: addKategori,
      stok: parseFloat(addStokAwal) || 0,
      ambangBatas: parseFloat(addAmbangBatas) || 0,
      nutrisi: toNutritionPayload(addNutrisi)
    };

    onSaveFeed(newItem);
    setIsAddOpen(false);
  };

  const openEditModal = (feed: FeedItem) => {
    setSelectedFeed(feed);
    setEditNama(feed.nama);
    setEditKategori(feed.kategori);
    setEditAmbangBatas(feed.ambangBatas.toString());
    setEditNutrisi(nutritionToForm(feed));
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeed || !editNama) return;

    const updatedItem: FeedItem = {
      ...selectedFeed,
      nama: editNama.trim(),
      kategori: editKategori,
      ambangBatas: parseFloat(editAmbangBatas) || 0,
      nutrisi: toNutritionPayload(editNutrisi)
    };

    onSaveFeed(updatedItem);
    setIsEditOpen(false);
  };

  const openDeleteModal = (feed: FeedItem) => {
    setSelectedFeed(feed);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedFeed) {
      onDeleteFeed(selectedFeed.id);
      setIsDeleteOpen(false);
      
      const tempTotalPages = Math.ceil((manualFeeds.length - 1) / itemsPerPage);
      if (currentPage > tempTotalPages && tempTotalPages > 0) {
        setCurrentPage(tempTotalPages);
      }
    }
  };

  const getStockStatus = (feed: FeedItem) => {
    const isSafe = feed.stok >= feed.ambangBatas;
    const diff = Math.abs(feed.stok - feed.ambangBatas);
    const ratio = feed.ambangBatas > 0 ? (feed.stok / feed.ambangBatas) * 100 : 100;
    const barWidth = Math.min(100, Math.max(0, ratio));

    return {
      isSafe,
      diff: diff.toFixed(1),
      barWidth: `${barWidth}%`,
      statusText: isSafe ? 'Stok Aman' : 'Stok Kritis',
      badgeClass: isSafe ? 'valid' : 'invalid',
      surplusText: isSafe ? `+${diff.toFixed(1)} KG Surplus` : `-${diff.toFixed(1)} KG Defisit`
    };
  };

  const currentStatus = selectedFeed ? getStockStatus(selectedFeed) : null;

  return (
    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div className="panel-title" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>⚙️ PENGELOLAAN PAKAN &amp; INVENTARIS</span>
          </div>
          <button className="retro-btn" onClick={openAddModal} style={{ color: 'var(--accent-light)', cursor: 'pointer' }}>
            + TAMBAH PAKAN
          </button>
        </div>

        {/* Quick Restock Form */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            FORM RESTOCK CEPAT
          </div>
          <form onSubmit={handleQuickRestock} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Jenis Pakan</label>
              <select 
                className="form-select"
                value={quickFeedId}
                onChange={(e) => setQuickFeedId(e.target.value)}
                required
              >
                <option value="" disabled>[ Pilih Jenis Pakan ]</option>
                {feedList.map(feed => (
                  <option key={feed.id} value={feed.id}>{feed.nama} ({feed.kategori})</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Jumlah (kg)</label>
              <input
                type="number"
                className="form-input"
                placeholder="> [ Jumlah Stok Masuk (kg) ]"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                min="0.1"
                step="any"
                required
              />
            </div>

            <button type="submit" className="retro-btn" style={{ height: '38px', padding: '0 24px', cursor: 'pointer' }}>
              [ Simpan Restock ]
            </button>
          </form>
        </div>

        {/* Manual Scale Simulation */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--accent-light)', marginBottom: '8px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            SIMULASI INPUT TIMBANGAN IOT
          </div>
          <form onSubmit={handleScaleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Unit Timbangan</label>
              <select
                className="form-select"
                value={scaleTimbanganId}
                onChange={(e) => {
                  setScaleTimbanganId(e.target.value);
                  setScaleFeedId('');
                  setScalePhase('');
                }}
                required
              >
                <option value="" disabled>[ Pilih Timbangan ]</option>
                {timbanganList.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nama} - {item.tipe}{item.default_label ? ` (${item.default_label})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedScale?.tipe === 'MULTI' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="form-label" style={{ fontSize: '9px' }}>Fase Usia</label>
                <select
                  className="form-select"
                  value={scalePhase}
                  onChange={(e) => {
                    setScalePhase(e.target.value);
                    setScaleFeedId('');
                  }}
                  required
                >
                  <option value="" disabled>[ Pilih Fase ]</option>
                  {formulasiList.map((form) => (
                    <option key={form.id} value={form.fase}>{form.fase}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Label / Bahan</label>
              {selectedScale?.tipe === 'MULTI' ? (
                <select
                  className="form-select"
                  value={scaleFeedId}
                  onChange={(e) => setScaleFeedId(e.target.value)}
                  required
                  disabled={!scalePhase}
                >
                  <option value="" disabled>{scalePhase ? '[ Pilih Bahan ]' : '[ Pilih Fase Dulu ]'}</option>
                  {scaleFeedOptions.map((feed) => (
                    <option key={feed.id} value={feed.id}>{feed.nama}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  value={selectedScaleLabel || ''}
                  disabled
                  placeholder="[ Otomatis dari timbangan ]"
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="form-label" style={{ fontSize: '9px' }}>Nilai Aktual (kg)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="any"
                value={scaleValue}
                onChange={(e) => setScaleValue(e.target.value)}
                placeholder="0.0"
                required
              />
            </div>

            <button
              type="submit"
              className="retro-btn"
              disabled={!onScaleReading || isScaleSaving}
              style={{ height: '38px', padding: '0 18px', cursor: onScaleReading && !isScaleSaving ? 'pointer' : 'not-allowed', alignSelf: 'end' }}
            >
              {isScaleSaving ? '[ MENYIMPAN... ]' : '[ Kirim Reading ]'}
            </button>
          </form>
          {selectedScale?.tipe === 'MULTI' && selectedScaleFormulation && (
            <div style={{
              marginTop: '14px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1fr) auto',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--accent-light)', fontWeight: 'bold', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  KOMPOSISI AKTIF: {selectedScaleFormulation.fase}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                  Populasi: {getPhasePopulation(selectedScaleFormulation.fase)} ekor | Target: {selectedScaleFormulation.targetKonsumsi} gr/ekor
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(selectedScaleFormulation.komposisi).map(([name, pct]) => (
                    <span key={name} style={{
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: '999px',
                      padding: '4px 8px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {name}: {getCompositionTargetKg(name).toFixed(2)} kg <span style={{ color: 'var(--text-muted)' }}>({Number(pct).toFixed(0)}%)</span>
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="retro-btn"
                onClick={handleScaleCompositionSubmit}
                disabled={!onScaleComposition || isCompositionSaving}
                style={{
                  height: '38px',
                  padding: '0 18px',
                  color: 'var(--accent-light)',
                  cursor: onScaleComposition && !isCompositionSaving ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap'
                }}
              >
                {isCompositionSaving ? '[ MEMASUKKAN... ]' : '[ Masukkan Sesuai Komposisi ]'}
              </button>
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Timbangan 1 mengoreksi stok fisik. Timbangan 2 mengirim bahan + fase ke batch racikan; stok dipotong saat batch difinalisasi. Timbangan 3 hanya masuk grafik pertumbuhan.
          </div>
        </div>

        {/* Dedicated Live IoT Scale Panel (Timbangan 1 - Dedak) */}
        {dedakItem && (
          <div style={{ 
            padding: '24px', 
            borderBottom: '1px solid var(--border)', 
            backgroundColor: 'rgba(21, 211, 107, 0.02)',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.5fr 1.5fr 2fr 2fr', 
              alignItems: 'center', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--accent-light)' }}>
                {dedakItem.nama}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {dedakItem.kategori}
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: 'var(--accent-light)',
                textShadow: '0 0 10px rgba(21, 211, 107, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <span>{dedakItem.stok.toFixed(1)}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>KG</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '8px' }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)',
                  display: 'inline-block'
                }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Timbangan 1: online
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Inventory Section Header with Category Filter */}
        <div style={{ 
          padding: '12px 24px', 
          fontWeight: 'bold', 
          fontSize: '11px', 
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span>INVENTARIS PAKAN SAAT INI</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Saring Kategori:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '10px',
                padding: '4px 8px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Semua">Semua Kategori</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Feed Inventory Table */}
        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>NO</th>
                <th>NAMA BAHAN</th>
                <th>KATEGORI</th>
                <th>SISA (KG)</th>
                <th style={{ textAlign: 'center', width: '120px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {displayedFeeds.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    [ INVENTARIS PAKAN KOSONG ]
                  </td>
                </tr>
              ) : (
                displayedFeeds.map((feed, idx) => {
                  const isLow = feed.stok <= feed.ambangBatas;
                  return (
                    <tr key={feed.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{startIndex + idx + 1}</td>
                      <td className="active-phase" style={{ color: isLow ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {feed.nama}
                      </td>
                      <td>{feed.kategori}</td>
                      <td style={{ fontWeight: 'bold', color: isLow ? 'var(--danger)' : 'var(--accent-light)' }}>
                        {feed.stok.toFixed(1)}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button 
                            className="action-btn" 
                            onClick={() => openEditModal(feed)}
                            title="Edit Detail"
                            style={{ padding: '6px 8px' }}
                          >
                            <LuPencil size={14} />
                          </button>
                          <button 
                            className="action-btn delete-btn" 
                            onClick={() => openDeleteModal(feed)}
                            title="Hapus"
                            style={{ padding: '6px 8px' }}
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

        {/* Table Footer / Pagination */}
        <div className="panel-footer">
          <div>TOTAL: {manualFeeds.length} BAHAN TERDAFTAR (HALAMAN {currentPage} DARI {totalPages || 1})</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="action-btn" 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              [ &lt; PREV ]
            </button>
            <button 
              className="action-btn" 
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              [ NEXT &gt; ]
            </button>
          </div>
        </div>
      </div>

      {/* 1. Modal Tambah Jenis Pakan */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ position: 'relative' }}>
              <div className="modal-title-container">
                <div className="modal-icon"><LuPlus /></div>
                <div>
                  <h2 className="modal-title">Tambah Jenis Pakan</h2>
                  <div className="modal-subtitle">Input detail inventaris pakan baru.</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddOpen(false)}
                style={{ position: 'absolute', right: '20px', top: '20px', width: '30px', height: '30px', border: 'none', background: 'none', fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Tutup"
              >
                <LuX size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nama Pakan</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="pur ayam, pur fase 1, dll"
                    value={addNama}
                    onChange={(e) => setAddNama(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori Pakan</label>
                  <select
                    className="form-select"
                    value={addKategori}
                    onChange={(e) => setAddKategori(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Stok Awal (KG)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={addStokAwal === '0.0' ? '' : addStokAwal}
                      onChange={(e) => setAddStokAwal(e.target.value)}
                      placeholder="0.0"
                      min="0"
                      step="any"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ambang Batas Min (KG)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={addAmbangBatas}
                      onChange={(e) => setAddAmbangBatas(e.target.value)}
                      placeholder="5.0"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kandungan Nutrisi (% bahan kering)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                    {NUTRITION_FIELDS.map((field) => (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{field.label}</span>
                        <input
                          type="number"
                          className="form-input"
                          value={addNutrisi[field.key]}
                          onChange={(e) => setAddNutrisi((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          min="0"
                          max="100"
                          step="0.1"
                          style={{ fontSize: '11px', padding: '8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ flexDirection: 'column', gap: '12px', borderTop: 'none', padding: '16px 24px 24px' }}>
                <button
                  type="submit"
                  className="retro-btn btn-large"
                  style={{ width: '100%', backgroundColor: 'var(--accent)', color: 'white', borderColor: 'var(--accent-dark)', cursor: 'pointer' }}
                >
                  Simpan Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Edit Detail Pakan */}
      {isEditOpen && selectedFeed && currentStatus && (
        <div className="modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ position: 'relative' }}>
              <div className="modal-title-container">
                <div className="modal-icon"><LuPencil /></div>
                <div>
                  <h2 className="modal-title">Edit Detail Pakan</h2>
                  <div className="modal-subtitle">Atur ambang batas dan inventaris pakan.</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditOpen(false)}
                style={{ position: 'absolute', right: '20px', top: '20px', width: '30px', height: '30px', border: 'none', background: 'none', fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Tutup"
              >
                <LuX size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nama Pakan</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori Pakan</label>
                  <select
                    className="form-select"
                    value={editKategori}
                    onChange={(e) => setEditKategori(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Stok Saat Ini (KG) <LuLock size={10} style={{ color: 'var(--text-muted)' }} />
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={selectedFeed.stok}
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Batas Minimum (KG)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editAmbangBatas}
                      onChange={(e) => setEditAmbangBatas(e.target.value)}
                      placeholder="5.0"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kandungan Nutrisi (% bahan kering)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
                    {NUTRITION_FIELDS.map((field) => (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{field.label}</span>
                        <input
                          type="number"
                          className="form-input"
                          value={editNutrisi[field.key]}
                          onChange={(e) => setEditNutrisi((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          min="0"
                          max="100"
                          step="0.1"
                          style={{ fontSize: '11px', padding: '8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Bar Status Card */}
                <div className={`validation-badge ${currentStatus.badgeClass}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!currentStatus.isSafe && <LuTriangleAlert size={14} />}
                      Status: {currentStatus.statusText}
                    </span>
                    <span>{currentStatus.surplusText}</span>
                  </div>
                  
                  <div style={{ height: '10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: currentStatus.barWidth, 
                        backgroundColor: currentStatus.isSafe ? 'var(--accent)' : 'var(--danger)',
                        boxShadow: currentStatus.isSafe ? '0 0 8px var(--accent)' : '0 0 8px var(--danger)',
                        transition: 'width 0.3s ease' 
                      }} 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    <span>0 KG</span>
                    <span style={{ color: 'var(--warning-light)' }}>BATAS: {parseFloat(editAmbangBatas || '0').toFixed(1)} KG</span>
                    <span>STOK: {selectedFeed.stok.toFixed(1)} KG</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ flexDirection: 'column', gap: '12px', borderTop: 'none', padding: '16px 24px 24px' }}>
                <button
                  type="submit"
                  className="retro-btn btn-large"
                  style={{ width: '100%', backgroundColor: 'var(--accent)', color: 'white', borderColor: 'var(--accent-dark)', cursor: 'pointer' }}
                >
                  📋 Perbarui Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Konfirmasi Hapus */}
      {isDeleteOpen && selectedFeed && (
        <div className="modal-overlay" onClick={() => setIsDeleteOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', border: '1px solid var(--border)' }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  color: 'var(--danger)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <LuTrash2 size={24} />
              </div>

              <h2 className="modal-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
                Hapus Data Pakan?
              </h2>
              
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
                Apakah Anda yakin ingin menghapus <strong>&quot;{selectedFeed.nama}&quot;</strong> dari inventaris? Tindakan ini akan menghapus semua log histori timbangan yang terkait dengan pakan ini.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="retro-btn"
                  onClick={() => setIsDeleteOpen(false)}
                  style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="retro-btn"
                  onClick={handleDeleteConfirm}
                  style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger-light)', cursor: 'pointer' }}
                >
                  Ya, Hapus Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
