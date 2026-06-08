"use client";

import React, { useState, useEffect } from 'react';
import { 
  LuCheck, 
  LuClock, 
  LuCompass, 
  LuRotateCcw, 
  LuSun, 
  LuSignal, 
  LuWifi, 
  LuBattery, 
  LuLayoutDashboard, 
  LuClipboardList, 
  LuBookOpen,
  LuSparkles,
  LuLogOut,
  LuArrowLeft
} from 'react-icons/lu';
import { FeedItem, FormulasiItem, PenjagaTaskItem, PanduanLangkah } from '@/types';
import { DailyChecklistItem } from '@/services/task';
import { FeedingBatch } from '@/services/feedingBatch';
import { resolveAssetUrl } from '@/services/api';

interface ChecklistPenjagaPageProps {
  feedList: FeedItem[];
  formulasiList: FormulasiItem[];
  tasksList?: PenjagaTaskItem[];
  isStandalone?: boolean;
  onLogout?: () => void;
  isPublic?: boolean;
  backButtonLabel?: string;
  onAddActivityLog?: (tipe: 'RESTOCK' | 'FORMULASI' | 'INVENTARIS' | 'SISTEM', deskripsi: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  jumlahStarter?: number;
  jumlahGrower1?: number;
  jumlahGrower2?: number;
  jumlahFinisher?: number;
  checklist?: DailyChecklistItem[];
  feedingBatch?: FeedingBatch | null;
  onToggleTask?: (taskId: string, isCompleted: boolean) => Promise<void>;
  onCreateFeedingBatch?: () => Promise<void>;
  onFinalizeFeedingBatch?: () => Promise<void>;
  onCancelFeedingBatch?: () => Promise<void>;
  onResetDaily?: () => Promise<void>;
}

export default function ChecklistPenjagaPage({ 
  feedList, 
  formulasiList,
  tasksList: rawTasksList = [],
  isStandalone = false,
  onLogout,
  isPublic = false,
  backButtonLabel,
  onAddActivityLog,
  theme = 'dark',
  onToggleTheme,
  jumlahStarter = 15,
  jumlahGrower1 = 25,
  jumlahGrower2 = 18,
  jumlahFinisher = 10,
  checklist,
  feedingBatch,
  onToggleTask,
  onCreateFeedingBatch,
  onFinalizeFeedingBatch,
  onCancelFeedingBatch,
  onResetDaily
}: ChecklistPenjagaPageProps) {
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
    const sourceTasks: PenjagaTaskItem[] = rawTasksList.length > 0
      ? rawTasksList
      : (checklist ?? []).map((item) => ({
          id: item.task_id,
          nama: item.nama,
          waktu: item.waktu,
          deskripsi: item.deskripsi,
          img: item.img,
          infoDetail: item.infoDetail,
          langkah: item.langkah,
          perhatikan: item.perhatikan,
          catatan: item.catatan,
        }));

    return [...sourceTasks].sort((a, b) => parseTimeToMinutes(a.waktu) - parseTimeToMinutes(b.waktu));
  }, [rawTasksList, checklist]);

  const [activeTab, setActiveTab] = useState<'home' | 'checklist' | 'panduan'>('home');
  const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [panduanTab, setPanduanTab] = useState<'kerja' | 'nutrisi'>('kerja');
  const [selectedPanduan, setSelectedPanduan] = useState<PenjagaTaskItem | null>(null);
  const [showRacikanDropdown, setShowRacikanDropdown] = useState(false);
  const [keeperName, setKeeperName] = useState('Penjaga');

  const getPopulasiByFase = (fase: string) => {
    const faseLower = fase.toLowerCase();
    if (faseLower.includes('starter')) return jumlahStarter;
    if (faseLower.includes('grower 1')) return jumlahGrower1;
    if (faseLower.includes('grower 2')) return jumlahGrower2;
    if (faseLower.includes('finisher')) return jumlahFinisher;
    return 10;
  };

  const calculateIngredientWeight = (targetKonsumsi: number, fase: string, percentage: number) => {
    const populasi = getPopulasiByFase(fase);
    const weightKg = (targetKonsumsi * populasi * percentage) / 100000;
    return `${weightKg.toFixed(2).replace('.', ',')} kg`;
  };

  const getStokBahan = (name: string) => {
    const feed = feedList.find(f => f.nama.toLowerCase() === name.toLowerCase());
    return feed ? `${feed.stok.toFixed(1).replace('.', ',')} kg` : '0 kg';
  };

  const formatBatchKg = (value?: number) => {
    const numeric = Number(value || 0);
    return `${numeric.toFixed(2).replace('.', ',')} kg`;
  };

  const getBatchVarianceColor = (variance: number) => {
    const absVariance = Math.abs(Number(variance || 0));
    if (absVariance <= 0.05) return '#15D36B';
    if (absVariance <= 0.15) return '#f59e0b';
    return '#e53e3e';
  };

  const handleCreateBatch = async () => {
    try {
      await onCreateFeedingBatch?.();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat batch racikan.');
    }
  };

  const handleFinalizeBatch = async () => {
    if (!window.confirm('Finalisasi racikan akan memotong stok sesuai hasil timbang. Lanjutkan?')) {
      return;
    }

    try {
      await onFinalizeFeedingBatch?.();
    } catch (err: any) {
      alert(err.message || 'Gagal finalisasi racikan.');
    }
  };

  const handleCancelBatch = async () => {
    if (!window.confirm('Batalkan batch racikan hari ini?')) {
      return;
    }

    try {
      await onCancelFeedingBatch?.();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan batch racikan.');
    }
  };

  const getBatchItemsByPhase = () => {
    const groups: { phase: string; items: NonNullable<FeedingBatch['ingredients']> }[] = [];
    const phaseIndex = new Map<string, number>();

    (feedingBatch?.ingredients || []).forEach((item) => {
      const phase = item.phase || 'Gabungan';
      if (!phaseIndex.has(phase)) {
        phaseIndex.set(phase, groups.length);
        groups.push({ phase, items: [] });
      }
      groups[phaseIndex.get(phase) as number].items.push(item);
    });

    return groups;
  };

  const getBatchTotalsByFeed = () => {
    const totals = new Map<string, {
      feedName: string;
      planned: number;
      weighed: number;
      deducted: number;
    }>();

    (feedingBatch?.ingredients || []).forEach((item) => {
      const key = item.feed_id || item.feed_name.toLowerCase();
      const current = totals.get(key) || {
        feedName: item.feed_name,
        planned: 0,
        weighed: 0,
        deducted: 0,
      };

      current.planned += Number(item.planned_amount || 0);
      current.weighed += Number(item.weighed_amount || 0);
      current.deducted += Number(item.deducted_amount || 0);
      totals.set(key, current);
    });

    return Array.from(totals.values()).sort((a, b) => a.feedName.localeCompare(b.feedName));
  };

  const renderFeedingBatchPanel = () => {
    const isPreparing = feedingBatch?.status === 'PREPARING';
    const isFinalized = feedingBatch?.status === 'FINALIZED';
    const groupedItems = getBatchItemsByPhase();
    const totalItems = getBatchTotalsByFeed();

    return (
      <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              BATCH RACIKAN & PEMBANDING STOK
            </h3>
            <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px', lineHeight: '1.4' }}>
              Data timbang masuk otomatis dari Timbangan 2. Stok dipotong satu kali saat batch difinalisasi.
            </p>
          </div>
          {feedingBatch && (
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              color: isFinalized ? '#155724' : '#856404',
              backgroundColor: isFinalized ? '#d4edda' : '#fff3cd',
              border: `1px solid ${isFinalized ? '#15D36B' : '#f59e0b'}`,
              borderRadius: '999px',
              padding: '4px 10px',
              whiteSpace: 'nowrap'
            }}>
              {isFinalized ? 'FINAL' : 'DIRACIK'}
            </span>
          )}
        </div>

        {!feedingBatch && (
          <div style={{
            border: '1px dashed #cbd5e0',
            borderRadius: '10px',
            padding: '16px',
            backgroundColor: '#f8f9fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <span style={{ fontSize: '12px', color: '#4a5568', lineHeight: '1.5' }}>
              Menunggu data dari Timbangan 2. Target bisa disiapkan dulu dari formulasi dan populasi hari ini.
            </span>
            <button
              onClick={handleCreateBatch}
              disabled={!onCreateFeedingBatch}
              style={{
                border: '1px solid #15D36B',
                backgroundColor: '#15D36B',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: onCreateFeedingBatch ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap'
              }}
            >
              SIAPKAN TARGET
            </button>
          </div>
        )}

        {feedingBatch && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {groupedItems.map((group) => (
                <div key={group.phase} style={{ border: '1px solid #edf2f7', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: '#f0fff4',
                    borderBottom: '1px solid #edf2f7'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#15D36B', textTransform: 'uppercase' }}>
                      {group.phase}
                    </span>
                    <span style={{ fontSize: '10px', color: '#718096', fontWeight: '800' }}>
                      {group.items[0]?.population_count || 0} ekor - target {group.items[0]?.target_consumption || 0} gr/ekor
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #edf2f7' }}>
                          {['Bahan', 'Target', 'Dari Timbangan', 'Terpotong', 'Selisih', 'Status'].map((header) => (
                            <th key={header} style={{
                              padding: '9px 8px',
                              textAlign: header === 'Bahan' ? 'left' : 'right',
                              fontSize: '9px',
                              color: '#718096',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => {
                          const hasScaleData = Number(item.weighed_amount || 0) > 0;
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: '800', color: '#2d3748' }}>
                                {item.feed_name}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '12px', color: '#2d3748' }}>
                                {formatBatchKg(item.planned_amount)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: hasScaleData ? '#2d3748' : '#a0aec0' }}>
                                {formatBatchKg(item.weighed_amount)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '12px', color: '#2d3748' }}>
                                {formatBatchKg(item.deducted_amount)}
                              </td>
                              <td style={{
                                padding: '10px 8px',
                                textAlign: 'right',
                                fontSize: '12px',
                                fontWeight: '800',
                                color: getBatchVarianceColor(item.variance_amount)
                              }}>
                                {item.variance_amount > 0 ? '+' : ''}{formatBatchKg(item.variance_amount)}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: '800',
                                  color: hasScaleData ? '#155724' : '#856404',
                                  backgroundColor: hasScaleData ? '#d4edda' : '#fff3cd',
                                  borderRadius: '999px',
                                  padding: '3px 8px'
                                }}>
                                  {hasScaleData ? 'MASUK' : 'MENUNGGU'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', backgroundColor: '#f8f9fc', borderBottom: '1px solid #edf2f7', fontSize: '10px', fontWeight: '900', color: '#2d3748', textTransform: 'uppercase' }}>
                Total pemotongan stok saat finalisasi
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {totalItems.map((item) => (
                    <tr key={item.feedName} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '9px 12px', fontSize: '12px', fontWeight: '800', color: '#2d3748' }}>{item.feedName}</td>
                      <td style={{ padding: '9px 12px', fontSize: '12px', color: '#718096', textAlign: 'right' }}>Target {formatBatchKg(item.planned)}</td>
                      <td style={{ padding: '9px 12px', fontSize: '12px', color: '#2d3748', fontWeight: '800', textAlign: 'right' }}>
                        Potong {formatBatchKg(isFinalized ? item.deducted : item.weighed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#718096' }}>
                Toleransi selisih: {feedingBatch.tolerance_percent}% per bahan.
              </span>
              {isPreparing && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancelBatch}
                    disabled={!onCancelFeedingBatch}
                    style={{
                      border: '1px solid #e53e3e',
                      backgroundColor: '#ffffff',
                      color: '#e53e3e',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: onCancelFeedingBatch ? 'pointer' : 'not-allowed'
                    }}
                  >
                    BATAL
                  </button>
                  <button
                    onClick={handleFinalizeBatch}
                    disabled={!onFinalizeFeedingBatch}
                    style={{
                      border: '1px solid #15D36B',
                      backgroundColor: '#15D36B',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: onFinalizeFeedingBatch ? 'pointer' : 'not-allowed'
                    }}
                  >
                    FINALISASI & POTONG STOK
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMobileFeedingBatchPanel = () => {
    const isPreparing = feedingBatch?.status === 'PREPARING';
    const isFinalized = feedingBatch?.status === 'FINALIZED';
    const groupedItems = getBatchItemsByPhase();
    const totalItems = getBatchTotalsByFeed();
    const hasBatchItems = Boolean(feedingBatch && feedingBatch.ingredients.length > 0);

    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '14px',
        border: '1px solid #edf2f7',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: '#2d3748', textTransform: 'uppercase' }}>
              Batch Racikan
            </div>
            <div style={{ fontSize: '9px', color: '#718096', marginTop: '2px', lineHeight: '1.4' }}>
              Finalisasi dulu sebelum tugas Beri Pakan selesai.
            </div>
          </div>
          <span style={{
            fontSize: '8px',
            fontWeight: '900',
            color: isFinalized ? '#155724' : '#856404',
            backgroundColor: isFinalized ? '#d4edda' : '#fff3cd',
            border: `1px solid ${isFinalized ? '#15D36B' : '#f59e0b'}`,
            borderRadius: '999px',
            padding: '3px 8px',
            whiteSpace: 'nowrap'
          }}>
            {isFinalized ? 'FINAL' : feedingBatch ? 'DIRACIK' : 'BELUM ADA'}
          </span>
        </div>

        {!feedingBatch && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '10px', color: '#718096', lineHeight: '1.5', backgroundColor: '#f8f9fc', borderRadius: '8px', padding: '10px' }}>
              Target racikan belum disiapkan. Data Timbangan 2 akan masuk ke batch setelah target tersedia.
            </div>
            <button
              onClick={handleCreateBatch}
              disabled={!onCreateFeedingBatch}
              style={{
                width: '100%',
                border: 'none',
                backgroundColor: '#15D36B',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '11px',
                fontWeight: '900',
                cursor: onCreateFeedingBatch ? 'pointer' : 'not-allowed'
              }}
            >
              Siapkan Target Racikan
            </button>
          </div>
        )}

        {feedingBatch && (
          <>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupedItems.map((group) => (
                <div key={group.phase} style={{ border: '1px solid #edf2f7', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    backgroundColor: '#f0fff4',
                    color: '#15D36B',
                    fontSize: '9px',
                    fontWeight: '900',
                    textTransform: 'uppercase'
                  }}>
                    <span>{group.phase}</span>
                    <span style={{ color: '#718096' }}>{group.items[0]?.population_count || 0} ekor</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.items.map((item) => {
                      const hasScaleData = Number(item.weighed_amount || 0) > 0;
                      return (
                        <div key={item.id} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: '8px',
                          padding: '9px 10px',
                          borderTop: '1px solid #edf2f7',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#2d3748' }}>{item.feed_name}</div>
                            <div style={{ fontSize: '9px', color: '#718096', marginTop: '2px' }}>
                              Target {formatBatchKg(item.planned_amount)} | Selisih{' '}
                              <span style={{ color: getBatchVarianceColor(item.variance_amount), fontWeight: '900' }}>
                                {item.variance_amount > 0 ? '+' : ''}{formatBatchKg(item.variance_amount)}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: '900', color: hasScaleData ? '#2d3748' : '#a0aec0' }}>
                              {formatBatchKg(item.weighed_amount)}
                            </div>
                            <div style={{
                              display: 'inline-block',
                              marginTop: '2px',
                              fontSize: '8px',
                              fontWeight: '900',
                              color: hasScaleData ? '#155724' : '#856404',
                              backgroundColor: hasScaleData ? '#d4edda' : '#fff3cd',
                              borderRadius: '999px',
                              padding: '2px 6px'
                            }}>
                              {hasScaleData ? 'MASUK' : 'MENUNGGU'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hasBatchItems && (
              <div style={{ marginTop: '10px', backgroundColor: '#f8f9fc', border: '1px solid #edf2f7', borderRadius: '10px', padding: '10px' }}>
                <div style={{ fontSize: '9px', fontWeight: '900', color: '#718096', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Total potong saat finalisasi
                </div>
                {totalItems.map((item) => (
                  <div key={item.feedName} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#2d3748', padding: '3px 0' }}>
                    <span style={{ fontWeight: '800' }}>{item.feedName}</span>
                    <span>{formatBatchKg(isFinalized ? item.deducted : item.weighed)}</span>
                  </div>
                ))}
              </div>
            )}

            {isPreparing && (
              <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={handleCancelBatch}
                  disabled={!onCancelFeedingBatch}
                  style={{
                    border: '1px solid #e53e3e',
                    backgroundColor: '#ffffff',
                    color: '#e53e3e',
                    borderRadius: '8px',
                    padding: '9px',
                    fontSize: '10px',
                    fontWeight: '900',
                    cursor: onCancelFeedingBatch ? 'pointer' : 'not-allowed'
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleFinalizeBatch}
                  disabled={!onFinalizeFeedingBatch}
                  style={{
                    border: 'none',
                    backgroundColor: '#15D36B',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '9px',
                    fontSize: '10px',
                    fontWeight: '900',
                    cursor: onFinalizeFeedingBatch ? 'pointer' : 'not-allowed'
                  }}
                >
                  Finalisasi & Potong Stok
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderCompositionDropdown = () => (
    <div style={{ marginTop: '10px' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowRacikanDropdown(!showRacikanDropdown);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          backgroundColor: '#eafaf1',
          border: '1px solid #15D36B',
          borderRadius: '8px',
          color: '#15D36B',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚖️ LIHAT ACUAN RACIKAN/KOMPOSISI</span>
        </div>
        <span>{showRacikanDropdown ? '▲' : '▼'}</span>
      </button>
      
      {showRacikanDropdown && (
        <div style={{
          marginTop: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #edf2f7',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px'
        }}>
          {formulasiList.slice(0, 4).map((form) => (
            <div key={form.id} style={{
              padding: '10px',
              borderBottom: '1px solid #f7f9fc',
              backgroundColor: '#f8f9fc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#15D36B' }}>
                  {form.fase} ({getPopulasiByFase(form.fase)} Ekor)
                </span>
                <span style={{ fontSize: '9px', backgroundColor: '#e2e8f0', color: '#4a5568', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  Target: {form.targetKonsumsi} g/ekor (Total: {((form.targetKonsumsi * getPopulasiByFase(form.fase)) / 1000).toFixed(2).replace('.', ',')} kg)
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(1, 1fr)',
                gap: '6px',
                marginTop: '6px',
                fontSize: '9px',
                color: '#718096'
              }}>
                {Object.entries(form.komposisi).map(([name, pct]) => {
                  const requiredWeight = calculateIngredientWeight(form.targetKonsumsi, form.fase, pct);
                  const currentStock = getStokBahan(name);
                  return (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
                      <span>• {name}</span>
                      <span style={{ fontWeight: 'bold', color: '#2d3748' }}>
                        {requiredWeight} <span style={{ fontWeight: 'normal', color: '#718096', fontSize: '8.5px' }}>(Sisa: {currentStock})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 1. Daily Auto-Reset Check inside useEffect
  useEffect(() => {
    const todayISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    const savedDate = localStorage.getItem('entok_penjaga_last_date');
    const savedState = localStorage.getItem('entok_penjaga_tasks_state');

    // Build default checklist completion map dynamically
    const defaultState: { [key: string]: boolean } = {};
    tasksList.forEach(t => {
      defaultState[t.id] = false;
    });

    if (checklist && checklist.length > 0) {
      const apiState = { ...defaultState };
      checklist.forEach(item => {
        apiState[item.task_id] = item.is_completed;
      });
      setCompletedTasks(apiState);
    } else if (savedDate !== todayISO) {
      // New day -> reset all tasks automatically
      setCompletedTasks(defaultState);
      localStorage.setItem('entok_penjaga_tasks_state', JSON.stringify(defaultState));
      localStorage.setItem('entok_penjaga_last_date', todayISO);
    } else if (savedState) {
      // Same day -> load saved tasks state
      try {
        const parsed = JSON.parse(savedState);
        const merged = { ...defaultState, ...parsed };
        setCompletedTasks(merged);
      } catch (e) {
        setCompletedTasks(defaultState);
      }
    } else {
      setCompletedTasks(defaultState);
    }
    
    // Load logged in keeper name safely
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('entok_logged_in_keeper_name');
      if (savedName) {
        setKeeperName(savedName);
      } else {
        setKeeperName('Penjaga');
      }
    }
    
    setHasLoaded(true);
  }, [tasksList, checklist]);

  const saveTasksState = (newTasks: typeof completedTasks) => {
    setCompletedTasks(newTasks);
    localStorage.setItem('entok_penjaga_tasks_state', JSON.stringify(newTasks));
    const todayISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    localStorage.setItem('entok_penjaga_last_date', todayISO);
  };

  // Calculate stats
  const completedCount = tasksList.filter((task) => completedTasks[task.id]).length;
  const totalCount = tasksList.length;
  const hasTasks = totalCount > 0;
  const allTasksComplete = hasTasks && completedCount === totalCount;
  const remainingCount = Math.max(totalCount - completedCount, 0);
  
  // Mathematical correctness: 25%, 50%, 75%, 100%
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active task is the first uncompleted task
  const activeTaskId = tasksList.find(t => !completedTasks[t.id])?.id || null;
  const activeTask = activeTaskId ? tasksList.find(t => t.id === activeTaskId) : null;
  const isFeedingTask = (task?: PenjagaTaskItem | null) => Boolean(task?.nama?.toLowerCase().includes("beri pakan"));
  const isFeedingBatchFinal = feedingBatch?.status === 'FINALIZED';
  const needsFeedingFinalization = (task?: PenjagaTaskItem | null) => isFeedingTask(task) && !isFeedingBatchFinal;

  const tryToggleTask = async (id: string, targetState: boolean): Promise<boolean> => {
    if (isPublic) {
      const updated = {
        ...completedTasks,
        [id]: targetState
      };
      saveTasksState(updated);
      return true;
    }

    const task = tasksList.find(t => t.id === id);
    const taskName = task ? task.nama : `Tugas ${id}`;
    const isBeriPakan = task && task.nama.toLowerCase().includes("beri pakan");

    if (targetState) {
      if (isBeriPakan) {
        if (feedingBatch?.status !== 'FINALIZED') {
          alert('Finalisasi batch racikan pakan terlebih dahulu. Stok dipotong dari tabel pembanding, bukan dari checklist.');
          return false;
        }
      } else {
        if (onAddActivityLog) {
          onAddActivityLog("SISTEM", `[OPERASIONAL] Penjaga menyelesaikan tugas ${taskName}.`);
        }
      }
    } else {
      if (onAddActivityLog) {
        onAddActivityLog("SISTEM", `[OPERASIONAL] Penjaga membatalkan status tugas ${taskName}.`);
      }
    }

    try {
      if (onToggleTask) {
        await onToggleTask(id, targetState);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status tugas.');
      return false;
    }

    const updated = {
      ...completedTasks,
      [id]: targetState
    };
    saveTasksState(updated);
    return true;
  };

  const handleToggleComplete = async (id: string) => {
    const currentState = completedTasks[id];
    await tryToggleTask(id, !currentState);
  };

  const handleMarkActiveComplete = async () => {
    if (activeTaskId) {
      await tryToggleTask(activeTaskId, true);
    }
  };

  const handleResetSimulation = async () => {
    const confirmMsg = feedingBatch
      ? "Apakah Anda yakin ingin mereset seluruh kegiatan hari ini beserta batch racikan pakan? Data stok yang sudah dipotong akan dikembalikan."
      : "Apakah Anda yakin ingin mereset seluruh kegiatan hari ini?";

    if (window.confirm(confirmMsg)) {
      const reset: { [key: string]: boolean } = {};
      tasksList.forEach(t => {
        reset[t.id] = false;
      });

      try {
        if (onResetDaily && !isPublic) {
          await onResetDaily();
        } else if (!isPublic) {
          const completedTaskIds = tasksList
            .filter((task) => completedTasks[task.id])
            .map((task) => task.id);

          if (onToggleTask && completedTaskIds.length > 0) {
            for (const taskId of completedTaskIds) {
              await onToggleTask(taskId, false);
            }
          }

          if (feedingBatch && onCancelFeedingBatch) {
            await onCancelFeedingBatch();
          }
        }
      } catch (err: any) {
        alert(err.message || 'Gagal mereset status tugas.');
        return;
      }

      saveTasksState(reset);
      setActiveTab('home');
    }
  };

  const handleSetCompletedSteps = (steps: number) => {
    const newStates: { [key: string]: boolean } = {};
    tasksList.forEach((t, idx) => {
      newStates[t.id] = idx < steps;
    });
    saveTasksState(newStates);
  };

  const getIndonesianDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return today.toLocaleDateString('id-ID', options);
  };

  const dedakFeed = feedList.find(f => f.nama.toLowerCase() === 'dedak');
  const dedakStock = dedakFeed ? dedakFeed.stok : 56.2;

  // --- SUB-RENDER: PHONE VIEW APP CONTENT ---
  // (Used inside the smartphone mockup OR inside the mobile-view standalone portal)
  const renderPhoneAppContent = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f7f9fc',
      position: 'relative'
    }}>
      {backButtonLabel && onLogout && (
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #edf2f7',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1001
        }} className="no-print">
          <button 
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: '#4a5568',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <LuArrowLeft size={14} /> {backButtonLabel}
          </button>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#718096', backgroundColor: '#edf2f7', padding: '2px 8px', borderRadius: '12px' }}>
            Mode Peninjau (Pengawas)
          </span>
        </div>
      )}
      {/* Scrollable Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: '68px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* TAB 1: HOME VIEW */}
        {activeTab === 'home' && (
          <div>
            {/* Green Header Banner */}
            <div style={{
              backgroundColor: '#15D36B',
              color: '#ffffff',
              padding: '12px 20px 24px 20px',
              borderRadius: '0 0 24px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 10px rgba(21, 211, 107, 0.15)'
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Selamat Pagi, {keeperName}!</h3>
                <p style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>Berikut kegiatan hari ini</p>
              </div>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                border: '1.5px solid #ffffff'
              }}>
                🦆
              </div>
            </div>

            {/* Daily Progress Circle Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              margin: '-16px 16px 16px 16px',
              padding: '16px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              position: 'relative',
              zIndex: 10
            }}>
              <div style={{ position: 'relative', width: '58px', height: '58px', flexShrink: 0 }}>
                <svg width="58" height="58" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#edf2f7"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#15D36B"
                    strokeWidth="3.5"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#2d3748'
                }}>
                  {progressPercent}%
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#2d3748' }}>Progress Hari Ini</h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={handleResetSimulation}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#4a5568',
                        border: '1px solid #cbd5e0',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <LuRotateCcw size={10} /> Reset
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          if (window.confirm("Apakah Anda yakin ingin keluar dari Portal Penjaga?")) {
                            onLogout();
                          }
                        }}
                        style={{
                          backgroundColor: '#e53e3e',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <LuLogOut size={10} /> Keluar
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>
                  {!hasTasks
                    ? "Belum ada tugas hari ini"
                    : allTasksComplete 
                    ? "Semua kegiatan sudah selesai" 
                    : `${remainingCount} kegiatan belum selesai`
                  }
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#15D36B', fontSize: '9px', fontWeight: 'bold' }}>
                  <LuCheck size={10} style={{ strokeWidth: 3 }} />
                  <span>{!hasTasks ? "Menunggu jadwal tugas" : allTasksComplete ? "Kandang Bersih & Aman!" : "Semangat Melakukan kegiatan hari ini"}</span>
                </div>
              </div>
            </div>

            {/* Active Task Card */}
            <div style={{ padding: '0 16px 16px 16px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                border: '1px solid #edf2f7'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px' }}>
                    📢 KEGIATAN DILAKUKAN
                  </span>
                  {activeTask && (
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: '#fff5f5',
                      color: '#e53e3e',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 'bold'
                    }}>
                      {activeTask.waktu}
                    </span>
                  )}
                </div>

                {activeTask ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Task Details Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#2d3748' }}>{activeTask.nama}</h4>
                        <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px', lineHeight: '1.4' }}>
                          {activeTask.deskripsi}
                        </p>
                      </div>
                      <div style={{ width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #edf2f7' }}>
                        <img src={resolveAssetUrl(activeTask.img, '/images/azolla_microphylla.png')} alt={activeTask.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>

                    {/* Integrated Feeding Batch (Only if Active Task is a Feeding Task) */}
                    {isFeedingTask(activeTask) && (
                      <div style={{
                        borderTop: '1px solid #edf2f7',
                        paddingTop: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {/* Status Label Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px' }}>
                            ⚖️ BATCH RACIKAN PAKAN
                          </span>
                          <span style={{
                            fontSize: '8px',
                            fontWeight: '950',
                            color: isFeedingBatchFinal ? '#155724' : feedingBatch ? '#856404' : '#718096',
                            backgroundColor: isFeedingBatchFinal ? '#d4edda' : feedingBatch ? '#fff3cd' : '#f8f9fc',
                            border: `1px solid ${isFeedingBatchFinal ? '#15D36B' : feedingBatch ? '#f59e0b' : '#cbd5e0'}`,
                            borderRadius: '999px',
                            padding: '2px 8px',
                            whiteSpace: 'nowrap'
                          }}>
                            {isFeedingBatchFinal ? 'FINAL' : feedingBatch ? 'DIRACIK' : 'BELUM ADA'}
                          </span>
                        </div>

                        {/* If No Batch Target Prepared Yet */}
                        {!feedingBatch && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {renderCompositionDropdown()}
                            <div style={{ fontSize: '10px', color: '#718096', lineHeight: '1.5', backgroundColor: '#f8f9fc', borderRadius: '8px', padding: '10px' }}>
                              Target racikan belum disiapkan. Data Timbangan 2 akan masuk ke batch setelah target tersedia.
                            </div>
                            <button
                              onClick={handleCreateBatch}
                              disabled={!onCreateFeedingBatch}
                              style={{
                                width: '100%',
                                border: 'none',
                                backgroundColor: '#15D36B',
                                color: '#ffffff',
                                borderRadius: '8px',
                                padding: '10px',
                                fontSize: '11px',
                                fontWeight: '900',
                                cursor: onCreateFeedingBatch ? 'pointer' : 'not-allowed'
                              }}
                            >
                              Siapkan Target Racikan
                            </button>
                          </div>
                        )}

                        {/* If Batch Has Been Prepared */}
                        {feedingBatch && (
                          <>
                            {/* Ingredients Progress Table */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {getBatchItemsByPhase().map((group) => (
                                <div key={group.phase} style={{ border: '1px solid #edf2f7', borderRadius: '10px', overflow: 'hidden' }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    backgroundColor: '#f0fff4',
                                    color: '#15D36B',
                                    fontSize: '9px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase'
                                  }}>
                                    <span>{group.phase}</span>
                                    <span style={{ color: '#718096' }}>{group.items[0]?.population_count || 0} ekor</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {group.items.map((item) => {
                                      const hasScaleData = Number(item.weighed_amount || 0) > 0;
                                      return (
                                        <div key={item.id} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr auto',
                                          gap: '8px',
                                          padding: '8px 10px',
                                          borderTop: '1px solid #edf2f7',
                                          alignItems: 'center'
                                        }}>
                                          <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#2d3748' }}>{item.feed_name}</div>
                                            <div style={{ fontSize: '9px', color: '#718096', marginTop: '2px' }}>
                                              Target {formatBatchKg(item.planned_amount)} | Selisih{' '}
                                              <span style={{ color: getBatchVarianceColor(item.variance_amount), fontWeight: '900' }}>
                                                {item.variance_amount > 0 ? '+' : ''}{formatBatchKg(item.variance_amount)}
                                              </span>
                                            </div>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '900', color: hasScaleData ? '#2d3748' : '#a0aec0' }}>
                                              {formatBatchKg(item.weighed_amount)}
                                            </div>
                                            <div style={{
                                              display: 'inline-block',
                                              marginTop: '2px',
                                              fontSize: '8px',
                                              fontWeight: '900',
                                              color: hasScaleData ? '#155724' : '#856404',
                                              backgroundColor: hasScaleData ? '#d4edda' : '#fff3cd',
                                              borderRadius: '999px',
                                              padding: '2px 6px'
                                            }}>
                                              {hasScaleData ? 'MASUK' : 'MENUNGGU'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Total Deducted Weight Box */}
                            {Boolean(feedingBatch.ingredients.length > 0) && (
                              <div style={{ backgroundColor: '#f8f9fc', border: '1px solid #edf2f7', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ fontSize: '9px', fontWeight: '900', color: '#718096', textTransform: 'uppercase', marginBottom: '6px' }}>
                                  Total potong saat finalisasi
                                </div>
                                {getBatchTotalsByFeed().map((item) => (
                                  <div key={item.feedName} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '10px', color: '#2d3748', padding: '3px 0' }}>
                                    <span style={{ fontWeight: '800' }}>{item.feedName}</span>
                                    <span>{formatBatchKg(isFeedingBatchFinal ? item.deducted : item.weighed)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Batal/Finalisasi Batch Buttons (Only if Status is PREPARING) */}
                            {feedingBatch.status === 'PREPARING' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: '8px', marginTop: '4px' }}>
                                <button
                                  onClick={handleCancelBatch}
                                  disabled={!onCancelFeedingBatch}
                                  style={{
                                    border: '1.5px solid #e53e3e',
                                    backgroundColor: '#ffffff',
                                    color: '#e53e3e',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    cursor: onCancelFeedingBatch ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={handleFinalizeBatch}
                                  disabled={!onFinalizeFeedingBatch}
                                  style={{
                                    border: 'none',
                                    backgroundColor: '#15D36B',
                                    color: '#ffffff',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    cursor: onFinalizeFeedingBatch ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  Finalisasi & Potong Stok
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Standard Checklist Action Buttons (Selesai/Panduan) */}
                    {/* Rendered only if it's NOT a feeding task, OR if it IS a feeding task and the batch is FINALIZED */}
                    {(!isFeedingTask(activeTask) || isFeedingBatchFinal) && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '4px',
                        borderTop: isFeedingTask(activeTask) ? '1px solid #edf2f7' : 'none',
                        paddingTop: isFeedingTask(activeTask) ? '14px' : '0'
                      }}>
                        <button
                          onClick={handleMarkActiveComplete}
                          style={{
                            backgroundColor: '#15D36B',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 3px 8px rgba(21, 211, 107, 0.2)',
                            flex: 1,
                            justifyContent: 'center'
                          }}
                        >
                          <LuCheck size={12} style={{ strokeWidth: 3 }} /> Selesai
                        </button>
                        <button
                          onClick={() => setSelectedPanduan(activeTask)}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#15D36B',
                            border: '1.5px solid #15D36B',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flex: 1,
                            justifyContent: 'center'
                          }}
                        >
                          <LuBookOpen size={12} /> Panduan
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: '#15D36B', fontWeight: 'bold', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span>{hasTasks ? 'SEMUA KEGIATAN SELESAI!' : '[ TIDAK ADA TUGAS HARI INI ]'}</span>
                    <span style={{ fontSize: '10px', color: '#718096', fontWeight: 'normal' }}>
                      {hasTasks ? 'Pekerjaan hari ini selesai. Kandang entok terpantau aman.' : 'Belum ada jadwal tugas rutin untuk tanggal ini.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist items list */}
            <div style={{ padding: '0 16px 10px 16px' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#718096', marginBottom: '8px', letterSpacing: '0.5px' }}>
                CHECKLIST HARI INI
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasksList.map((task) => {
                  const isCompleted = completedTasks[task.id];
                  const isActive = activeTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      onClick={() => handleToggleComplete(task.id)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: isCompleted ? '1.5px solid #15D36B' : isActive ? '1.5px solid #cbd5e0' : '1px solid #edf2f7',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={resolveAssetUrl(task.img, '/images/azolla_microphylla.png')} alt={task.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: isCompleted ? '#718096' : '#2d3748', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                            {task.nama}
                          </div>
                          <div style={{ fontSize: '9px', color: '#a0aec0', marginTop: '1px' }}>{task.waktu}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPanduan(task);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#15D36B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px'
                          }}
                          title="Lihat Panduan Kerja"
                        >
                          <LuBookOpen size={14} />
                        </button>

                        <span style={{
                          fontSize: '8px',
                          backgroundColor: isCompleted ? '#d4edda' : isActive ? '#fff3cd' : '#f1f3f5',
                          color: isCompleted ? '#155724' : isActive ? '#856404' : '#6c757d',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {isCompleted ? 'Selesai' : isActive ? 'Waktunya' : 'Belum Waktunya'}
                        </span>

                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isCompleted ? '1.5px solid #15D36B' : '1.5px solid #cbd5e0',
                          backgroundColor: isCompleted ? '#15D36B' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}>
                          {isCompleted && <LuCheck size={11} style={{ strokeWidth: 3 }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TIMELINE CHECKLIST VIEW */}
        {activeTab === 'checklist' && (
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #edf2f7',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#2d3748' }}>Checklist Kegiatan</h3>
              <p style={{ fontSize: '9px', color: '#718096', fontFamily: 'monospace', marginTop: '2px' }}>
                {getIndonesianDate()}
              </p>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              margin: '12px 16px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #edf2f7'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '30px', height: '30px' }}>
                  <svg width="30" height="30" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#edf2f7" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#15D36B" strokeWidth="4" 
                      strokeDasharray={`${progressPercent}, 100`} 
                    />
                  </svg>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#2d3748', display: 'block' }}>Progress Harian</span>
                  <span style={{ fontSize: '9px', color: '#718096' }}>{completedCount}/{totalCount} selesai</span>
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#15D36B' }}>{progressPercent}%</span>
            </div>

            {tasksList.some((task) => isFeedingTask(task)) && (
              <div style={{ padding: '0 16px 12px 16px' }}>
                {renderMobileFeedingBatchPanel()}
              </div>
            )}

            <div style={{ padding: '0 16px 16px 24px', position: 'relative', marginTop: '10px' }}>
              
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute',
                left: '39px',
                top: '16px',
                bottom: '50px',
                width: '2.5px',
                backgroundColor: '#edf2f7',
                zIndex: 1
              }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 10 }}>
                {tasksList.map((task, index) => {
                  const isCompleted = completedTasks[task.id];
                  const isActive = activeTaskId === task.id;
                  const lineAboveGreen = isCompleted || (index > 0 && completedTasks[tasksList[index - 1].id]);

                  return (
                    <div key={task.id} style={{ display: 'flex', gap: '16px', alignItems: 'start', position: 'relative' }}>
                      
                      {index > 0 && lineAboveGreen && (
                        <div style={{
                          position: 'absolute',
                          left: '15px',
                          top: '-20px',
                          height: '20px',
                          width: '2.5px',
                          backgroundColor: '#15D36B',
                          zIndex: -1
                        }}></div>
                      )}

                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? '#dbfbe3' : isActive ? '#fff3cd' : '#ffffff',
                        border: isCompleted ? '2px solid #15D36B' : isActive ? '2px solid #fbbf24' : '2px solid #cbd5e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCompleted ? '#15D36B' : isActive ? '#fbbf24' : '#a0aec0',
                        zIndex: 10,
                        boxShadow: '0 0 0 3px #ffffff',
                        flexShrink: 0
                      }}>
                        {isCompleted ? (
                          <LuCheck size={14} style={{ strokeWidth: 3 }} />
                        ) : (
                          <LuClock size={12} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          padding: '12px',
                          border: isCompleted ? '1px solid rgba(21, 211, 107, 0.15)' : isActive ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid #edf2f7',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '800', color: isCompleted ? '#718096' : '#2d3748' }}>
                               {task.nama}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPanduan(task);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#15D36B',
                                  cursor: 'pointer',
                                  padding: '2px'
                                }}
                              >
                                <LuBookOpen size={13} />
                              </button>
                              <span style={{
                                fontSize: '8px',
                                backgroundColor: isCompleted ? '#d4edda' : isActive ? '#fff3cd' : '#f1f3f5',
                                color: isCompleted ? '#155724' : isActive ? '#856404' : '#6c757d',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontWeight: 'bold'
                              }}>
                                {isCompleted ? 'Selesai' : isActive ? 'Waktunya' : 'Belum Waktunya'}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: '9px', color: '#a0aec0', marginTop: '2px' }}>{task.waktu}</div>

                          <p style={{ fontSize: '10px', color: '#718096', marginTop: '6px', lineHeight: '1.4' }}>
                            {task.deskripsi}
                          </p>

                          {task.nama.toLowerCase().includes("beri pakan") && renderCompositionDropdown()}

                          {isActive && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                              <button
                                onClick={() => handleToggleComplete(task.id)}
                                style={{
                                  flex: 1,
                                  backgroundColor: needsFeedingFinalization(task) ? '#a0aec0' : '#15D36B',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  boxShadow: needsFeedingFinalization(task) ? 'none' : '0 2px 6px rgba(21, 211, 107, 0.2)'
                                }}
                              >
                                {needsFeedingFinalization(task) ? 'Finalisasi Dulu' : 'Selesai'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPanduan(task);
                                }}
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#15D36B',
                                  border: '1.5px solid #15D36B',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Panduan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PANDUAN PENJAGA / KEEPER'S GUIDE */}
        {activeTab === 'panduan' && (
          <div style={{ padding: '16px' }}>
            {/* Sub-tab Switcher */}
            <div style={{
              display: 'flex',
              backgroundColor: '#edf2f7',
              borderRadius: '8px',
              padding: '2px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setPanduanTab('kerja')}
                style={{
                  flex: 1,
                  backgroundColor: panduanTab === 'kerja' ? '#ffffff' : 'transparent',
                  color: panduanTab === 'kerja' ? '#15D36B' : '#718096',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Panduan Kerja
              </button>
              <button
                onClick={() => setPanduanTab('nutrisi')}
                style={{
                  flex: 1,
                  backgroundColor: panduanTab === 'nutrisi' ? '#ffffff' : 'transparent',
                  color: panduanTab === 'nutrisi' ? '#15D36B' : '#718096',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Racikan Pakan
              </button>
            </div>

            {panduanTab === 'kerja' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasksList.map((guide, idx) => (
                  <div 
                    key={guide.id} 
                    onClick={() => setSelectedPanduan(guide)}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #edf2f7',
                      padding: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={resolveAssetUrl(guide.img, '/images/azolla_microphylla.png')} alt={guide.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: '#15D36B', textTransform: 'uppercase' }}>Panduan {idx + 1}</span>
                      <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#2d3748', marginTop: '1px' }}>
                        {guide.nama}
                      </h4>
                    </div>
                    <span style={{ color: '#15D36B', fontWeight: 'bold', fontSize: '14px' }}>→</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formulasiList.slice(0, 4).map((form) => (
                  <div 
                    key={form.id} 
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #edf2f7',
                      padding: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#15D36B', textTransform: 'uppercase', display: 'block' }}>
                      {form.fase}
                    </span>
                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#2d3748', marginTop: '2px' }}>
                      {form.kategori}
                    </h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#718096', marginTop: '6px', backgroundColor: '#f8f9fa', padding: '6px', borderRadius: '4px' }}>
                      <span>Target: <strong>{form.targetKonsumsi} g/ekor ({getPopulasiByFase(form.fase)} Ekor)</strong></span>
                      <span>Total: <strong>{((form.targetKonsumsi * getPopulasiByFase(form.fase)) / 1000).toFixed(2).replace('.', ',')} kg</strong></span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      {Object.entries(form.komposisi).map(([name, pct]) => {
                        const requiredWeight = calculateIngredientWeight(form.targetKonsumsi, form.fase, pct);
                        const currentStock = getStokBahan(name);
                        return (
                          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4a5568' }}>
                            <span>• {name}</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {requiredWeight} <span style={{ fontWeight: 'normal', color: '#718096', fontSize: '9px' }}>(Sisa: {currentStock})</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Bottom Sticky Tips Card (only on Home & Checklist) */}
        {activeTab !== 'panduan' && (
          <div style={{ padding: '0 16px 16px 16px', marginTop: 'auto' }}>
            <div style={{
              backgroundColor: '#dbfbe3',
              borderRadius: '12px',
              padding: '10px 14px',
              border: '1.5px solid #15D36B',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <div style={{
                backgroundColor: 'rgba(21, 211, 107, 0.15)',
                color: '#15D36B',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LuSun size={15} />
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '800', color: '#155724', textTransform: 'uppercase' }}>TIPS HARI INI</div>
                <div style={{ fontSize: '10px', color: '#155724', marginTop: '2px', lineHeight: '1.4' }}>
                  Pastikan kandang selalu bersih dan kering agar entok sehat.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Smartphone Navigation Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #edf2f7',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
      }}>
        <button 
          onClick={() => setActiveTab('home')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: activeTab === 'home' ? '#15D36B' : '#a0aec0',
            cursor: 'pointer',
            gap: '4px'
          }}
        >
          <LuLayoutDashboard size={18} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}>Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('checklist')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: activeTab === 'checklist' ? '#15D36B' : '#a0aec0',
            cursor: 'pointer',
            gap: '4px'
          }}
        >
          <LuClipboardList size={18} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'checklist' ? 'bold' : 'normal' }}>Checklist</span>
        </button>

        <button 
          onClick={() => setActiveTab('panduan')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: activeTab === 'panduan' ? '#15D36B' : '#a0aec0',
            cursor: 'pointer',
            gap: '4px'
          }}
        >
          <LuBookOpen size={18} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'panduan' ? 'bold' : 'normal' }}>Panduan</span>
        </button>
      </div>
    </div>
  );

  // --- MAIN RENDER LOGIC ---
  return (
    <div className="checklist-page-wrapper" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: isStandalone ? '100vh' : 'auto',
      backgroundColor: isStandalone ? '#f8f9fc' : 'transparent',
      color: isStandalone ? '#1a202c' : (isPublic ? '#2d3748' : 'var(--text-primary)'),
      fontFamily: "var(--font-sans)"
    }}>


      {/* Portal Standalone Main Body */}
      <div style={{
        flex: 1,
        padding: isStandalone ? '24px' : '0px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        {isStandalone && backButtonLabel && onLogout && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print portal-desktop-only">
            <button 
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: '#4a5568',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e0'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <LuArrowLeft size={16} /> {backButtonLabel}
            </button>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#718096', backgroundColor: '#edf2f7', padding: '4px 12px', borderRadius: '20px' }}>
              Mode Peninjau (Pengawas)
            </span>
          </div>
        )}
        
        {/* Laptop Layout (LP) vs Mobile Layout (HP) */}
        <div className="portal-responsive-container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Stats & Active Task */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Progress Panel */}
            <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#edf2f7" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#15D36B" strokeWidth="3.5" 
                      strokeDasharray={`${progressPercent}, 100`} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#2d3748'
                  }}>
                    {progressPercent}%
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--pub-primary)' }}>Progress Checklist Hari Ini</h2>
                  <p style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px' }}>
                    Telah menyelesaikan <strong>{completedCount} dari {totalCount}</strong> tugas rutin harian Anda.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button className="retro-btn" onClick={handleResetSimulation} style={{ display: 'flex', gap: '6px', fontSize: '11px', padding: '4px 10px' }}>
                      <LuRotateCcw size={12} /> Reset Ulang
                    </button>
                    {onLogout && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Apakah Anda yakin ingin keluar dari Portal Penjaga?")) {
                            onLogout();
                          }
                        }}
                        style={{
                          backgroundColor: '#e53e3e',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LuLogOut size={12} /> Keluar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Task Card */}
            <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px', marginBottom: '16px', textTransform: 'uppercase' }}>
                📢 TUGAS YANG HARUS DILAKUKAN SEKARANG
              </h3>
              
              {activeTask ? (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#15D36B' }}>{activeTask.nama}</h4>
                      <span style={{ fontSize: '11px', backgroundColor: '#fff5f5', color: '#e53e3e', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Target: {activeTask.waktu}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4a5568', marginTop: '8px', lineHeight: '1.5' }}>
                      {activeTask.deskripsi}
                    </p>
                    {activeTask.nama.toLowerCase().includes("beri pakan") && renderCompositionDropdown()}
                    
                    <div style={{ margin: '14px 0', padding: '12px', backgroundColor: '#f7f9fc', borderRadius: '8px', fontSize: '12px', color: '#4a5568', borderLeft: '3px solid #15D36B' }}>
                      <strong>💡 Instruksi Detail:</strong> {activeTask.infoDetail}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <button 
                        onClick={handleMarkActiveComplete}
                        style={{
                          backgroundColor: '#15D36B',
                          color: '#ffffff',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 10px rgba(21, 211, 107, 0.2)'
                        }}
                      >
                        <LuCheck size={14} style={{ strokeWidth: 3 }} /> Tandai Selesai
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedPanduan(activeTask);
                        }}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#15D36B',
                          border: '1.5px solid #15D36B',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LuBookOpen size={14} /> Lihat Panduan
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                    <img src={resolveAssetUrl(activeTask.img, '/images/azolla_microphylla.png')} alt={activeTask.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#15D36B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '40px' }}>{hasTasks ? '✓' : '-'}</div>
                  <h4 style={{ fontSize: '18px', fontWeight: '800' }}>{hasTasks ? 'Kerja Bagus! Semua Tugas Selesai.' : 'Tidak Ada Tugas Hari Ini'}</h4>
                  <p style={{ fontSize: '13px', color: '#718096', maxWidth: '400px' }}>
                    {hasTasks
                      ? 'Seluruh checklist harian telah diselesaikan. Kandang bersih, entok terjaga, dan sistem terpantau aman untuk hari ini.'
                      : 'Belum ada jadwal tugas rutin untuk tanggal ini.'}
                  </p>
                </div>
              )}
            </div>

            {/* Tips of the day */}
            <div style={{
              backgroundColor: '#dbfbe3',
              borderRadius: '12px',
              padding: '14px 20px',
              border: '1.5px solid #15D36B',
              display: 'flex',
              gap: '14px',
              alignItems: 'center'
            }}>
              <div style={{
                backgroundColor: 'rgba(21, 211, 107, 0.15)',
                color: '#15D36B',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LuSun size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#155724', textTransform: 'uppercase' }}>TIPS KANDANG HARI INI</div>
                <p style={{ fontSize: '12px', color: '#155724', marginTop: '2px', lineHeight: '1.4' }}>
                  Pastikan kandang selalu bersih dan kering agar entok sehat dan terhindar dari penyakit pernapasan.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Timeline Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px', marginBottom: '20px', textTransform: 'uppercase' }}>
                📋 TIMELINE PROGRESS KEGIATAN
              </h3>
              
              <div style={{ padding: '0 0 0 10px', position: 'relative' }}>
                
                {/* Vertical connecting line */}
                <div style={{
                  position: 'absolute',
                  left: '25px',
                  top: '16px',
                  bottom: '40px',
                  width: '2.5px',
                  backgroundColor: '#edf2f7',
                  zIndex: 1
                }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 10 }}>
                  {tasksList.map((task, index) => {
                    const isCompleted = completedTasks[task.id];
                    const isActive = activeTaskId === task.id;
                    const lineAboveGreen = isCompleted || (index > 0 && completedTasks[tasksList[index - 1].id]);

                    return (
                      <div key={task.id} style={{ display: 'flex', gap: '16px', alignItems: 'start', position: 'relative' }}>
                        
                        {index > 0 && lineAboveGreen && (
                          <div style={{
                            position: 'absolute',
                            left: '15px',
                            top: '-24px',
                            height: '24px',
                            width: '2.5px',
                            backgroundColor: '#15D36B',
                            zIndex: -1
                          }}></div>
                        )}

                        {/* Node Icon */}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isCompleted ? '#dbfbe3' : isActive ? '#fff3cd' : '#ffffff',
                          border: isCompleted ? '2px solid #15D36B' : isActive ? '2px solid #fbbf24' : '2px solid #cbd5e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isCompleted ? '#15D36B' : isActive ? '#fbbf24' : '#a0aec0',
                          zIndex: 10,
                          boxShadow: '0 0 0 3px #ffffff',
                          flexShrink: 0
                        }}>
                          {isCompleted ? (
                            <LuCheck size={14} style={{ strokeWidth: 3 }} />
                          ) : (
                            <LuClock size={12} />
                          )}
                        </div>

                        {/* Task details item */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div 
                            onClick={() => handleToggleComplete(task.id)}
                            style={{
                              border: isCompleted ? '1.5px solid #15D36B' : isActive ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                              backgroundColor: isCompleted ? 'rgba(21, 211, 107, 0.01)' : '#ffffff',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div>
                              <h4 style={{ fontSize: '13px', fontWeight: '800', color: isCompleted ? '#718096' : '#2d3748', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                {task.nama}
                              </h4>
                              <span style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px', display: 'block' }}>⏰ {task.waktu}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '9px',
                                backgroundColor: isCompleted ? '#d4edda' : isActive ? '#fff3cd' : '#f1f3f5',
                                color: isCompleted ? '#155724' : isActive ? '#856404' : '#6c757d',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}>
                                {isCompleted ? 'Selesai' : isActive ? 'Waktunya' : 'Belum Waktunya'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPanduan(task);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#15D36B',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '4px'
                                }}
                                title="Lihat Panduan Kerja"
                              >
                                <LuBookOpen size={16} />
                              </button>
                            </div>
                          </div>
                          {task.nama.toLowerCase().includes("beri pakan") && (
                            <div onClick={(e) => e.stopPropagation()}>
                              {renderCompositionDropdown()}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panduan Kerja Standar Operasional (SOP) */}
            <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px', marginBottom: '16px', textTransform: 'uppercase' }}>
                📋 PANDUAN KERJA STANDAR OPERASIONAL (SOP)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {tasksList.map((guide, idx) => (
                  <div 
                    key={guide.id} 
                    onClick={() => setSelectedPanduan(guide)}
                    style={{ 
                      border: '1px solid #edf2f7', 
                      borderRadius: '12px', 
                      padding: '12px', 
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#15D36B';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 211, 107, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#edf2f7';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.01)';
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={resolveAssetUrl(guide.img, '/images/azolla_microphylla.png')} alt={guide.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#15D36B', textTransform: 'uppercase' }}>SOP {idx + 1}</span>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2d3748', marginTop: '2px' }}>{guide.nama}</div>
                    </div>
                    <span style={{ color: '#15D36B', fontWeight: 'bold' }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            {renderFeedingBatchPanel()}

            {/* Panduan Mixing Guide Card (LP Screen Bottom section) */}
            <div className="panel" style={{ padding: '24px', backgroundColor: '#ffffff', color: '#1a202c', fontFamily: 'var(--font-sans)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#718096', letterSpacing: '0.5px', marginBottom: '16px', textTransform: 'uppercase' }}>
                📋 ACUAN COMPOSITION PAKAN HARI INI
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {formulasiList.slice(0, 4).map((form) => (
                  <div key={form.id} style={{ border: '1px solid #edf2f7', borderRadius: '8px', padding: '10px', backgroundColor: '#f8f9fc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#15D36B', textTransform: 'uppercase' }}>{form.fase} ({getPopulasiByFase(form.fase)} Ekor)</span>
                      <span style={{ fontSize: '9px', color: '#718096', fontWeight: 'bold' }}>Total: {((form.targetKonsumsi * getPopulasiByFase(form.fase)) / 1000).toFixed(2).replace('.', ',')} kg</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#2d3748', marginTop: '2px' }}>Target: {form.targetKonsumsi} gr/ekor</div>
                    <div style={{ fontSize: '10px', color: '#718096', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {Object.entries(form.komposisi).map(([name, pct]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {name}</span>
                          <span style={{ fontWeight: 'bold', color: '#2d3748' }}>{calculateIngredientWeight(form.targetKonsumsi, form.fase, pct)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Fallback Viewport for phone sizing on Portal screen (HP width <= 768px triggers CSS that wraps this) */}
        <div className="portal-mobile-app-only" style={{ display: 'none' }}>
          {renderPhoneAppContent()}
        </div>

      </div>

      {/* Modal Detail Panduan (Styled like green mobile app screenshots) */}
      {selectedPanduan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px'
        }}
        onClick={() => setSelectedPanduan(null)}
        >
          <div style={{
            width: '100%',
            maxWidth: '360px',
            maxHeight: '90vh',
            backgroundColor: '#f7f9fc',
            borderRadius: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#15D36B',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>{selectedPanduan.nama}</span>
              <button 
                onClick={() => setSelectedPanduan(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Main Image */}
            <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
              <img 
                src={resolveAssetUrl(selectedPanduan.img, '/images/azolla_microphylla.png')} 
                alt={selectedPanduan.nama} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>

            {/* Content Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Langkah-langkah Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                border: '1px solid #edf2f7'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15D36B', fontWeight: '800', fontSize: '13px', marginBottom: '14px' }}>
                  <LuClipboardList size={16} style={{ color: '#15D36B' }} />
                  <span>Langkah-langkah</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedPanduan.langkah.map((step) => (
                    <div key={step.no} style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#15D36B',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {step.no}
                        </div>
                        <span style={{ fontSize: '11px', color: '#4a5568', lineHeight: '1.4' }}>
                          {step.text}
                        </span>
                      </div>
                      
                      {/* Round mini thumbnail */}
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '1px solid #edf2f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f7f9fc',
                        flexShrink: 0
                      }}>
                        <img src={resolveAssetUrl(step.thumbnailImg, '/images/azolla_microphylla.png')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perhatikan! Box */}
              <div style={{
                backgroundColor: '#fff9db',
                borderRadius: '12px',
                padding: '12px',
                borderLeft: '4px solid #f59e0b',
                color: '#854d0e',
                fontSize: '11px',
                lineHeight: '1.4'
              }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#b45309' }}>⚠ Perhatikan!</strong>
                {selectedPanduan.perhatikan}
              </div>

              {/* Catatan Box */}
              <div style={{
                backgroundColor: '#eafaf1',
                borderRadius: '12px',
                padding: '12px',
                borderLeft: '4px solid #10b981',
                color: '#065f46',
                fontSize: '11px',
                lineHeight: '1.4'
              }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: '#047857' }}>📖 Catatan</strong>
                {selectedPanduan.catatan}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedPanduan(null)}
                style={{
                  backgroundColor: '#15D36B',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(21, 211, 107, 0.2)',
                  marginTop: '8px'
                }}
              >
                Kembali ke Menu
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
