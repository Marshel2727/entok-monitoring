"use client";

import React, { useState } from 'react';
import { 
  LuTrendingUp, 
  LuDownload, 
  LuScale
} from 'react-icons/lu';
import { FeedItem, FormulasiItem, ActivityLog, TimbanganReading } from '@/types';
import { FeedTransaction } from '@/services/feed';

interface FeedChartsPageProps {
  feedList: FeedItem[];
  formulasiList: FormulasiItem[];
  jumlahStarter: number;
  jumlahGrower1: number;
  jumlahGrower2: number;
  jumlahFinisher: number;
  jumlahBebek: number;
  activityHistory: ActivityLog[];
  feedTransactions: FeedTransaction[];
  entokReadings: TimbanganReading[];
}

type PeriodTab = 'HARIAN' | 'MINGGUAN' | 'BULANAN';

const WITA_TIME_ZONE = 'Asia/Makassar';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

const getPeriodDays = (tab: PeriodTab) => {
  if (tab === 'MINGGUAN') return 7;
  if (tab === 'BULANAN') return 30;
  return 1;
};

const parseUtcTimestamp = (value?: string) => {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getWitaDayNumber = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WITA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return Math.floor(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day')) / MS_PER_DAY);
};

const getWitaDayLabel = (dayNumber: number) => {
  return DAY_LABELS[new Date(dayNumber * MS_PER_DAY).getUTCDay()];
};

const formatWitaShortDate = (date: Date) => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(date);
};

const formatKg = (value: number) => value.toFixed(1).replace('.', ',');

const isDedakName = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return normalized === 'dedak' || normalized === 'dedak beras' || normalized.includes('dedak');
};

const normalizeFeedLabel = (name: string) => {
  let keyName = name.trim().toUpperCase();
  if (keyName.includes("PELET") || keyName.includes("BR-11")) keyName = "PELET/BR-11";
  if (keyName.includes("MAGGOT") || keyName.includes("BSF")) keyName = "BSF";
  if (keyName.includes("DAUN TALAS")) keyName = "D. TALAS";
  return keyName;
};

export default function FeedChartsPage({ 
  feedList, 
  formulasiList,
  jumlahStarter,
  jumlahGrower1,
  jumlahGrower2,
  jumlahFinisher,
  jumlahBebek,
  feedTransactions,
  entokReadings
}: FeedChartsPageProps) {
  const [nutritionTab, setNutritionTab] = useState<'HARIAN' | 'MINGGUAN' | 'BULANAN'>('HARIAN');
  const [consumptionTab, setConsumptionTab] = useState<'HARIAN' | 'MINGGUAN' | 'BULANAN'>('HARIAN');
  const [dateRange, setDateRange] = useState('HARI INI');
  const [activeScale, setActiveScale] = useState('SEMUA TIMBANGAN');

  const nutritionTargets = {
    PROTEIN: 18,
    KARBOHIDRAT: 55,
    LEMAK: 5,
    SERAT: 8,
    MINERAL: 4
  };

  // Vibrant color helpers for charts
  const getNutritionColor = (name: string) => {
    const n = name.toUpperCase();
    if (n === 'PROTEIN') return '#10b981';      // Emerald Green
    if (n === 'KARBOHIDRAT') return '#f97316';   // Orange
    if (n === 'LEMAK') return '#eab308';          // Yellow
    if (n === 'SERAT') return '#06b6d4';          // Teal
    if (n === 'MINERAL') return '#a855f7';        // Purple
    return 'var(--accent)';
  };

  const getFeedColor = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('DEDAK')) return '#f59e0b';     // Amber/Orange-Yellow
    if (n.includes('JAGUNG')) return '#fbbf24';    // Warm Yellow
    if (n.includes('BSF') || n.includes('MAGGOT')) return '#8b5cf6'; // Violet/BSF Purple
    if (n.includes('AZOLLA') || n.includes('KANGKUNG') || n.includes('GEDEBOG') || n.includes('TALAS')) return '#10b981'; // Green
    if (n.includes('IKAN') || n.includes('RUCAH')) return '#3b82f6'; // Blue
    if (n.includes('PELET') || n.includes('BR-11')) return '#ec4899'; // Pink
    return 'var(--accent)';
  };

  // Dynamic stock for Dedak from feedList
  const dedakFeed = feedList.find(f => isDedakName(f.nama));
  const dedakStock = dedakFeed ? `${formatKg(dedakFeed.stok)} kg` : '0,0 kg';
  const dedakStokVal = dedakFeed ? dedakFeed.stok : 0;
  const feedById = new Map(feedList.map((feed) => [feed.id, feed]));
  const todayWitaDay = getWitaDayNumber(new Date());

  const getTransactionType = (transaction: FeedTransaction) => {
    return transaction.type || (transaction.transaction_type === 'STOCK_OUT' ? 'OUT' : 'IN');
  };

  const isFeedConsumptionTransaction = (transaction: FeedTransaction) => {
    const description = (transaction.description || '').toLowerCase();
    return getTransactionType(transaction) === 'OUT'
      && (description.includes('pakan harian') || description.includes('finalisasi racikan pakan'));
  };

  const getTransactionFeedName = (transaction: FeedTransaction) => {
    return transaction.feed_name || feedById.get(transaction.feed_id)?.nama || '';
  };

  const getTransactionDayNumber = (transaction: FeedTransaction) => {
    const transactionDate = parseUtcTimestamp(transaction.created_at);
    return transactionDate ? getWitaDayNumber(transactionDate) : null;
  };

  const getOutgoingTransactionsForPeriod = (tab: PeriodTab) => {
    const periodDays = getPeriodDays(tab);
    const todayWitaDay = getWitaDayNumber(new Date());

    return feedTransactions.filter((transaction) => {
      if (!isFeedConsumptionTransaction(transaction)) return false;

      const transactionDayNumber = getTransactionDayNumber(transaction);
      if (transactionDayNumber === null) return false;

      const ageInDays = todayWitaDay - transactionDayNumber;
      return ageInDays >= 0 && ageInDays < periodDays;
    });
  };

  const getTransactionTotalsForPeriod = (tab: PeriodTab) => {
    const totals: { [key: string]: number } = {};

    getOutgoingTransactionsForPeriod(tab).forEach((transaction) => {
      const feedName = getTransactionFeedName(transaction) || 'LAINNYA';
      const keyName = normalizeFeedLabel(feedName);
      totals[keyName] = (totals[keyName] || 0) + Number(transaction.amount || 0);
    });

    return totals;
  };

  const getKnownConsumptionNames = () => {
    const names = new Set<string>();

    formulasiList.forEach((form) => {
      Object.keys(form.komposisi).forEach((name) => names.add(normalizeFeedLabel(name)));
    });
    feedList.forEach((feed) => names.add(normalizeFeedLabel(feed.nama)));
    ['DEDAK', 'JAGUNG', 'AZOLLA', 'KANGKUNG', 'BSF', 'D. TALAS'].forEach((name) => names.add(name));

    return Array.from(names);
  };

  const getDedakUsedToday = () => {
    const totals = getTransactionTotalsForPeriod('HARIAN');
    return Object.entries(totals).reduce((sum, [name, value]) => {
      return name.includes('DEDAK') ? sum + value : sum;
    }, 0);
  };

  // Nutrition data is calculated from feed nutrition values and active formulations.
  const getNutritionData = () => {
    const feedByName = new Map(feedList.map((feed) => [feed.nama.trim().toLowerCase(), feed]));
    const totals = {
      PROTEIN: 0,
      KARBOHIDRAT: 0,
      LEMAK: 0,
      SERAT: 0,
      MINERAL: 0
    };

    let totalKg = 0;
    let hasNutritionData = false;

    formulasiList.forEach((form) => {
      let pop = 0;
      if (form.fase.startsWith("Starter")) pop = jumlahStarter;
      else if (form.fase.startsWith("Grower 1")) pop = jumlahGrower1;
      else if (form.fase.startsWith("Grower 2")) pop = jumlahGrower2;
      else if (form.fase.startsWith("Finisher")) pop = jumlahFinisher;

      Object.entries(form.komposisi).forEach(([namaPakan, pct]) => {
        const feed = feedByName.get(namaPakan.trim().toLowerCase());
        const nutrisi = feed?.nutrisi;
        const kg = (form.targetKonsumsi * pop * (pct / 100)) / 1000;

        if (!nutrisi || kg <= 0) return;

        const hasAnyValue = Object.values(nutrisi).some((value) => Number(value) > 0);
        if (!hasAnyValue) return;

        hasNutritionData = true;
        totalKg += kg;
        totals.PROTEIN += kg * ((nutrisi.protein || 0) / 100);
        totals.KARBOHIDRAT += kg * ((nutrisi.karbohidrat || 0) / 100);
        totals.LEMAK += kg * ((nutrisi.lemak || 0) / 100);
        totals.SERAT += kg * ((nutrisi.serat || 0) / 100);
        totals.MINERAL += kg * ((nutrisi.mineral || 0) / 100);
      });
    });

    if (!hasNutritionData || totalKg <= 0) {
      return [];
    }

    return (Object.keys(totals) as Array<keyof typeof totals>).map((name) => {
      const actualPercent = (totals[name] / totalKg) * 100;
      const targetPercent = nutritionTargets[name];
      const adequacy = Math.round((actualPercent / targetPercent) * 100);

      return {
        name,
        value: adequacy,
        barValue: Math.min(100, adequacy),
        actualPercent,
        targetPercent
      };
    });
  };

  // Consumption data depending on active tab
  const getConsumptionData = () => {
    const transactionTotals = getTransactionTotalsForPeriod(consumptionTab);
    const list = Object.entries(transactionTotals).map(([name, val]) => ({
      name,
      value: val,
      unit: 'KG'
    }));

    list.sort((a, b) => b.value - a.value);

    getKnownConsumptionNames().forEach((name) => {
      if (list.length >= 6) return;
      if (!list.find((item) => item.name === name)) {
        list.push({ name, value: 0, unit: 'KG' });
      }
    });

    return list.slice(0, 6);
  };

  const netDedakChangeByDay = feedTransactions.reduce<Record<number, number>>((acc, transaction) => {
    if (!isDedakName(getTransactionFeedName(transaction))) return acc;

    const dayNumber = getTransactionDayNumber(transaction);
    if (dayNumber === null) return acc;

    const amount = Number(transaction.amount || 0);
    const netAmount = getTransactionType(transaction) === 'IN' ? amount : -amount;
    acc[dayNumber] = (acc[dayNumber] || 0) + netAmount;
    return acc;
  }, {});

  let stockCursor = dedakStokVal;
  const dedakStockByDay = new Map<number, number>();
  dedakStockByDay.set(todayWitaDay, stockCursor);
  for (let dayNumber = todayWitaDay - 1; dayNumber >= todayWitaDay - 6; dayNumber -= 1) {
    const nextDayNumber = dayNumber + 1;
    stockCursor -= netDedakChangeByDay[nextDayNumber] || 0;
    dedakStockByDay.set(dayNumber, Math.max(0, stockCursor));
  }

  const dedakStockData = Array.from({ length: 7 }, (_, index) => {
    const dayNumber = todayWitaDay - (6 - index);
    return {
      day: getWitaDayLabel(dayNumber),
      stock: dedakStockByDay.get(dayNumber) || 0,
      isHighlight: dayNumber === todayWitaDay,
    };
  });

  const normalizedEntokReadings = entokReadings
    .map((reading) => {
      const date = parseUtcTimestamp(reading.recorded_at || reading.timestamp);
      const value = Number(reading.value ?? reading.weight ?? 0);
      return { date, value };
    })
    .filter((reading): reading is { date: Date; value: number } => {
      return Boolean(reading.date) && Number.isFinite(reading.value) && reading.value > 0;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const growthData = normalizedEntokReadings.slice(-7).map((reading, index, arr) => ({
    day: formatWitaShortDate(reading.date),
    growth: reading.value,
    isHighlight: index === arr.length - 1,
  }));

  const latestGrowthReading = normalizedEntokReadings.at(-1);
  const maxStockVal = Math.max(...dedakStockData.map(d => d.stock), 1);
  const maxGrowthVal = Math.max(...growthData.map(d => d.growth), 3);
  const nutritionData = getNutritionData();
  const nutritionTargetReached = nutritionData.length > 0 && nutritionData.every((nut) => nut.value >= 100);

  return (
    <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: 0 }}>
      
      {/* Top Header Section */}
      <div className="dashboard-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-main-title" style={{ fontSize: '24px', letterSpacing: '1px' }}>Monitoring Entok</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            GRAFIK PANGAN - ANALISIS PERANGKAT IOT
          </p>
        </div>
        
        {/* Dropdown Filters and Export Button */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontFamily: 'var(--font-mono)' }}>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', background: 'var(--bg-input)' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="HARI INI">[ Rentang Tanggal ]</option>
            <option value="7D">7 HARI TERAKHIR</option>
            <option value="30D">30 HARI TERAKHIR</option>
          </select>

          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', background: 'var(--bg-input)' }}
            value={activeScale}
            onChange={(e) => setActiveScale(e.target.value)}
          >
            <option value="SEMUA TIMBANGAN">[ Pilih Timbangan ]</option>
            <option value="T1">TIMBANGAN 1 (STOK DEDAK)</option>
            <option value="T3">TIMBANGAN 3 (PERTUMBUHAN)</option>
          </select>

          <button className="retro-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}>
            <LuDownload size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-kpi-grid">
        <div className="panel kpi-card">
          <span className="kpi-value">
            {getDedakUsedToday().toFixed(1).replace('.', ',') + ' kg'}
          </span>
          <span className="kpi-label">DEDAK TERPAKAI / HARI INI</span>
        </div>
        <div className="panel kpi-card">
          <span className="kpi-value" style={{ color: 'var(--warning)' }}>{dedakStock}</span>
          <span className="kpi-label">SISA STOK DEDAK</span>
        </div>
        <div className="panel kpi-card">
          <span className="kpi-value" style={{ color: 'var(--accent-light)' }}>2,3 kg</span>
          <span className="kpi-label">BERAT RATA-RATA / PER EKOR ENTOK</span>
        </div>
        <div className="panel kpi-card">
          <span className="kpi-value">{jumlahBebek} EKOR</span>
          <span className="kpi-label">STOK ENTOK</span>
        </div>
      </div>

      {/* Chart Section Grid */}
      <div className="dashboard-charts-grid">
        
        {/* Timbangan 1 Chart */}
        <div className="panel chart-container">
          <div className="panel-header" style={{ padding: '12px 18px' }}>
            <div className="panel-title" style={{ fontSize: '11px' }}>
              <LuScale size={14} />
              <span>TIMBANGAN 1: STOK DEDAK (KG)</span>
            </div>
          </div>
          <div className="chart-body" style={{ padding: '20px 20px 10px 20px', display: 'flex', flexDirection: 'column', height: 'auto' }}>
            {/* SVG Rendered Custom Retro Outlined Bar Chart */}
            <div style={{ height: '160px', position: 'relative', width: '100%' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
                {/* Horizontal dotted grid lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="140" x2="400" y2="140" stroke="var(--border)" strokeWidth="1" />

                {/* Draw SVG Outline Bars */}
                {dedakStockData.map((data, index) => {
                  const barWidth = 32;
                  const spacing = (400 - (dedakStockData.length * barWidth)) / (dedakStockData.length + 1);
                  const x = spacing + index * (barWidth + spacing);
                  const barHeight = (data.stock / maxStockVal) * 120;
                  const y = 140 - barHeight;
                  const color = data.isHighlight ? '#a855f7' : 'var(--accent)';
                  const glowColor = data.isHighlight ? 'rgba(168, 85, 247, 0.15)' : 'var(--accent-glow)';

                  return (
                    <g key={data.day} className="chart-bar-group">
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        fill={glowColor}
                        stroke={color} 
                        strokeWidth="2"
                        rx="2"
                      />
                      <text 
                        x={x + barWidth/2} 
                        y={y - 8} 
                        fill={color} 
                        fontSize="9" 
                        fontFamily="var(--font-mono)" 
                        textAnchor="middle"
                        fontWeight="bold"
                        className="chart-tooltip"
                      >
                        {formatKg(data.stock)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {/* X Axis Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {dedakStockData.map((d) => (
                <span key={d.day} style={{ width: '32px', textAlign: 'center', color: d.isHighlight ? '#c084fc' : 'inherit' }}>{d.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Timbangan 3 Chart */}
        <div className="panel chart-container">
          <div className="panel-header" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between' }}>
            <div className="panel-title" style={{ fontSize: '11px' }}>
              <LuTrendingUp size={14} />
              <span>TIMBANGAN 3: KURVA PERTUMBUHAN</span>
            </div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {latestGrowthReading ? `[ UPDATE: ${formatWitaShortDate(latestGrowthReading.date)} ]` : '[ BELUM ADA DATA ]'}
            </span>
          </div>
          <div className="chart-body" style={{ padding: '20px 20px 10px 20px', display: 'flex', flexDirection: 'column', height: 'auto' }}>
            {growthData.length === 0 ? (
              <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                [ BELUM ADA DATA TIMBANGAN ENTOK ]
              </div>
            ) : (
            <div style={{ height: '160px', position: 'relative', width: '100%' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
                {/* Horizontal dotted grid lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="140" x2="400" y2="140" stroke="var(--border)" strokeWidth="1" />

                {/* Draw SVG Outline Bars */}
                {growthData.map((data, index) => {
                  const barWidth = 32;
                  const spacing = (400 - (growthData.length * barWidth)) / (growthData.length + 1);
                  const x = spacing + index * (barWidth + spacing);
                  const barHeight = (data.growth / maxGrowthVal) * 120;
                  const y = 140 - barHeight;
                  const color = data.isHighlight ? '#a855f7' : 'var(--accent)';
                  const glowColor = data.isHighlight ? 'rgba(168, 85, 247, 0.15)' : 'var(--accent-glow)';

                  return (
                    <g key={data.day} className="chart-bar-group">
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        fill={glowColor}
                        stroke={color} 
                        strokeWidth="2"
                        rx="2"
                      />
                      <text 
                        x={x + barWidth/2} 
                        y={y - 8} 
                        fill={color} 
                        fontSize="9" 
                        fontFamily="var(--font-mono)" 
                        textAnchor="middle"
                        fontWeight="bold"
                        className="chart-tooltip"
                      >
                        {formatKg(data.growth)} kg
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            )}
            {/* X Axis Labels */}
            {growthData.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {growthData.map((d) => (
                  <span key={d.day} style={{ width: '32px', textAlign: 'center', color: d.isHighlight ? '#c084fc' : 'inherit' }}>{d.day}</span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Metrics Columns Section */}
      <div className="dashboard-metrics-grid">
        
        {/* Monitoring Nutrisi Panel */}
        <div className="panel">
          <div className="panel-header" style={{ padding: '12px 20px' }}>
            <div className="panel-title" style={{ fontSize: '12px' }}>
              MONITORING NUTRISI
            </div>
            <div className="mini-tab-container">
              {(['HARIAN', 'MINGGUAN', 'BULANAN'] as const).map(tab => (
                <button 
                  key={tab}
                  className={`mini-tab ${nutritionTab === tab ? 'active' : ''}`}
                  onClick={() => setNutritionTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {nutritionData.length === 0 ? (
              <div style={{ padding: '18px', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7 }}>
                Data nutrisi belum lengkap. Isi kandungan protein, karbohidrat, lemak, serat, dan mineral pada menu Feed Management.
              </div>
            ) : nutritionData.map((nut) => (
              <div key={nut.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{nut.name}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{nut.value}%</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Aktual {nut.actualPercent.toFixed(1)}% / Target {nut.targetPercent}%
                </div>
                <div className="retro-progress-bar-bg">
                  <div 
                    className="retro-progress-bar-fill" 
                    style={{ width: `${nut.barValue}%`, backgroundColor: getNutritionColor(nut.name) }}
                  />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '11px', color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              {nutritionData.length === 0
                ? 'Menunggu data nutrisi bahan pakan'
                : `Berdasarkan formulasi ${nutritionTab.toLowerCase()} - ${nutritionTargetReached ? 'Target terpenuhi' : 'Perlu penyesuaian'}`}
            </div>
            <div style={{ display: 'none' }}>
              Total per ekor/hari - Target terpenuhi ✓
            </div>
          </div>
        </div>

        {/* Konsumsi Pakan Harian Panel */}
        <div className="panel">
          <div className="panel-header" style={{ padding: '12px 20px' }}>
            <div className="panel-title" style={{ fontSize: '12px' }}>
              KONSUMSI PAKAN HARIAN
            </div>
            <div className="mini-tab-container">
              {(['HARIAN', 'MINGGUAN', 'BULANAN'] as const).map(tab => (
                <button 
                  key={tab}
                  className={`mini-tab ${consumptionTab === tab ? 'active' : ''}`}
                  onClick={() => setConsumptionTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {getConsumptionData().map((feed) => {
              // Map max ranges to calculate bar percentage widths dynamically
              const maxVal = consumptionTab === 'MINGGUAN' ? 30 : consumptionTab === 'BULANAN' ? 120 : 4;
              const barPercent = Math.min((feed.value / maxVal) * 100, 100);

              return (
                <div key={feed.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{feed.name}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{feed.value.toFixed(1)} {feed.unit}</span>
                  </div>
                  <div className="retro-progress-bar-bg">
                    <div 
                      className="retro-progress-bar-fill" 
                      style={{ width: `${barPercent}%`, backgroundColor: getFeedColor(feed.name) }}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-light)', fontWeight: 'bold' }}>STATUS: OPERATIONAL</span>
              <span style={{ color: 'var(--text-muted)' }}>UNIT: KILOGRAMS (KG)</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
