'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LuTestTube, LuScale, LuCheck, LuTriangleAlert, LuX } from 'react-icons/lu';
import { FeedItem, FormulasiItem } from '@/types';

interface FormulasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: FormulasiItem) => void;
  editItem: FormulasiItem | null;
  feedList: FeedItem[];
}

const FASE_OPTIONS = [
  "Starter (1-14 Hari)",
  "Grower 1 (15-35 Hari)",
  "Grower 2 (36-60 Hari)",
  "Finisher (>60 Hari)"
];

const KATEGORI_OPTIONS = [
  "Energi & Karbohidrat",
  "Protein Hewani/Nabati",
  "Hijauan & Serat"
];

export default function FormulasiModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editItem,
  feedList
}: FormulasiModalProps) {
  const [fase, setFase] = useState('');
  const [kategori, setKategori] = useState('Energi & Karbohidrat');
  const [targetKonsumsi, setTargetKonsumsi] = useState(30.0);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const [totalComposition, setTotalComposition] = useState(0);
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);

  // Dynamically group feed list by formulation category
  const ingredientsByCategory = useMemo(() => {
    const categories: { [key: string]: { key: string; label: string }[] } = {
      "Energi & Karbohidrat": [],
      "Protein Hewani/Nabati": [],
      "Hijauan & Serat": []
    };

    feedList.forEach(feed => {
      const key = `feed_${feed.id}`;
      const label = `${feed.nama.toUpperCase()} (%)`;

      if (categories[feed.kategori]) {
        categories[feed.kategori].push({ key, label });
      } else {
        if (!categories[feed.kategori]) {
          categories[feed.kategori] = [];
        }
        categories[feed.kategori].push({ key, label });
      }
    });

    return categories;
  }, [feedList]);

  // Load values when editing
  useEffect(() => {
    if (editItem) {
      setFase(editItem.fase);
      setKategori(editItem.kategori);
      setTargetKonsumsi(editItem.targetKonsumsi);
      setSelectedAlternatives(editItem.pakanAlternatif.filter(x => x !== "-"));
      
      const initialPercentages: { [key: string]: number } = {};
      
      Object.keys(ingredientsByCategory).forEach(cat => {
        ingredientsByCategory[cat].forEach(ing => {
          const feedId = ing.key.replace('feed_', '');
          const feed = feedList.find(f => f.id === feedId);
          let matchedVal = 0;
          if (feed) {
            matchedVal = editItem.komposisi[feed.nama] || 0;
          }
          initialPercentages[ing.key] = matchedVal;
        });
      });

      setPercentages(initialPercentages);
    } else {
      setFase('');
      setKategori('Energi & Karbohidrat');
      setTargetKonsumsi(30.0);
      setSelectedAlternatives([]);
      
      const defaults: { [key: string]: number } = {};
      Object.keys(ingredientsByCategory).forEach(cat => {
        ingredientsByCategory[cat].forEach(ing => {
          defaults[ing.key] = 0;
        });
      });
      setPercentages(defaults);
    }
  }, [editItem, isOpen, ingredientsByCategory, feedList]);

  // Recalculate total composition globally across all categories
  useEffect(() => {
    let sum = 0;
    Object.keys(ingredientsByCategory).forEach(cat => {
      ingredientsByCategory[cat].forEach(ing => {
        sum += percentages[ing.key] || 0;
      });
    });
    setTotalComposition(Number(sum.toFixed(1)));
  }, [percentages, ingredientsByCategory]);

  if (!isOpen) return null;

  const handlePercentageChange = (key: string, value: string) => {
    if (value === "") {
      setPercentages(prev => ({
        ...prev,
        [key]: 0
      }));
      return;
    }
    const num = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setPercentages(prev => ({
      ...prev,
      [key]: num
    }));
  };

  const toggleAlternative = (alt: string) => {
    if (selectedAlternatives.includes(alt)) {
      setSelectedAlternatives(selectedAlternatives.filter(x => x !== alt));
    } else {
      setSelectedAlternatives([...selectedAlternatives, alt]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalComposition !== 100.0) return;

    const komposisi: { [key: string]: number } = {};

    Object.keys(ingredientsByCategory).forEach(cat => {
      ingredientsByCategory[cat].forEach(ing => {
        const pct = percentages[ing.key] || 0;
        if (pct > 0) {
          const feedId = ing.key.replace('feed_', '');
          const feed = feedList.find(f => f.id === feedId);
          if (feed) {
            komposisi[feed.nama] = pct;
          }
        }
      });
    });

    const item: FormulasiItem = {
      id: editItem ? editItem.id : '',
      fase,
      targetKonsumsi,
      kategori,
      komposisi,
      pakanAlternatif: selectedAlternatives.length > 0 ? selectedAlternatives : ["-"]
    };

    onSave(item);
  };

  const activeIngredients = ingredientsByCategory[kategori] || [];
  const isValid = totalComposition === 100.0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', border: '1px solid var(--border)' }}>
        <div className="modal-header" style={{ position: 'relative' }}>
          <div className="modal-title-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="modal-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LuTestTube size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {editItem ? 'EDIT FORMULASI PAKAN' : 'TAMBAH FORMULASI PAKAN'}
              </h2>
              <div className="modal-subtitle">
                INPUT DETAIL PARAMETER PAKAN KHUSUS KATEGORI: {kategori.toUpperCase()}
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', right: '20px', top: '20px', width: '30px', height: '30px', border: 'none', background: 'none', fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Tutup"
          >
            <LuX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Usia Entok (Fase)</label>
                <select 
                  className="form-select" 
                  value={fase} 
                  onChange={(e) => setFase(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Usia / Fase</option>
                  {FASE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kategori Formulasi</label>
                <select 
                  className="form-select" 
                  value={kategori} 
                  onChange={(e) => setKategori(e.target.value)}
                >
                  {KATEGORI_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="composition-section">
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold' }}>
                🌾 PERSENTASE BAHAN MAKANAN (TOTAL WAJIB 100%)
              </div>
              
              {activeIngredients.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)', fontFamily: 'var(--font-mono)' }}>
                  [ BELUM ADA BAHAN PAKAN TERDAFTAR DI KATEGORI INI ]
                  <br />
                  <span style={{ fontSize: '10px' }}>Silakan tambahkan bahan pakan di tab Kelola Pakan terlebih dahulu.</span>
                </div>
              ) : (
                <div className="composition-grid">
                  {activeIngredients.map((ing) => (
                    <div className="form-group" key={ing.key}>
                      <label className="form-label" style={{ fontSize: '9px' }}>{ing.label}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={percentages[ing.key] === 0 || percentages[ing.key] === undefined ? '' : percentages[ing.key]}
                        onChange={(e) => handlePercentageChange(ing.key, e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="any"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="composition-section" style={{ borderStyle: 'solid', borderColor: 'var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold' }}>
                🌱 PILIH PAKAN ALTERNATIF
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {feedList.map(feed => (
                  <label key={feed.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    <input
                      type="checkbox"
                      checked={selectedAlternatives.includes(feed.nama)}
                      onChange={() => toggleAlternative(feed.nama)}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <span>{feed.nama}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="validation-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Target Konsumsi (Gram/Ekor)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuScale size={16} />
                  </span>
                  <input
                    type="number"
                    className="form-input"
                    value={targetKonsumsi === 0 ? '' : targetKonsumsi}
                    onChange={(e) => setTargetKonsumsi(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ paddingLeft: '36px' }}
                    min="0"
                    step="any"
                    required
                  />
                </div>
              </div>

              <div 
                className={`validation-badge ${isValid ? 'valid' : totalComposition > 100 ? 'invalid' : 'warning'}`}
                style={{ height: '42px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {isValid ? <LuCheck size={16} /> : <LuTriangleAlert size={16} />}
                </span>
                <span>TOTAL KOMPOSISI: {totalComposition}%</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="retro-btn" 
              onClick={onClose}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            >
              [ BATAL ]
            </button>
            <button 
              type="submit" 
              className="retro-btn" 
              disabled={!isValid || !fase}
              style={{ color: isValid && fase ? 'var(--accent-light)' : 'var(--text-muted)', cursor: isValid && fase ? 'pointer' : 'not-allowed' }}
            >
              [ SIMPAN FORMULASI ]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
