'use client';

import React, { useEffect, useState } from 'react';
import { feedService, FeedTransaction } from '@/services/feed';
import { populationService } from '@/services/population';
import { timbanganService } from '@/services/timbangan';
import { FeedItem, Timbangan, TimbanganReading } from '@/types';
import { LuActivity, LuScale, LuTrendingUp, LuWifi } from 'react-icons/lu';

const WITA_TIME_ZONE = 'Asia/Makassar';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const TARGET_PANEN_KG = 3.0;

function parseUtcTimestamp(value?: string) {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWitaDayNumber(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WITA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return Math.floor(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day')) / MS_PER_DAY);
}

function getWitaDayLabel(dayNumber: number) {
  const date = new Date(dayNumber * MS_PER_DAY);
  return DAY_LABELS[date.getUTCDay()];
}

function formatWitaShortDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatKg(value: number) {
  return value.toFixed(1).replace('.', ',');
}

function isDedakName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === 'dedak' || normalized === 'dedak beras' || normalized.includes('dedak');
}

function getTransactionType(transaction: FeedTransaction) {
  return transaction.type || (transaction.transaction_type === 'STOCK_OUT' ? 'OUT' : 'IN');
}

function isFeedConsumptionTransaction(transaction: FeedTransaction) {
  const description = (transaction.description || '').toLowerCase();
  return getTransactionType(transaction) === 'OUT'
    && (description.includes('pakan harian') || description.includes('finalisasi racikan pakan'));
}

export default function DashboardHome() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [populations, setPopulations] = useState<any[]>([]);
  const [timbangans, setTimbangans] = useState<Timbangan[]>([]);
  const [feedTransactions, setFeedTransactions] = useState<FeedTransaction[]>([]);
  const [entokReadings, setEntokReadings] = useState<TimbanganReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData(isInitial = false) {
      if (isInitial) setLoading(true);

      try {
        const [feedsRes, popRes, timbRes, txRes, entokRes] = await Promise.allSettled([
          feedService.getFeeds(),
          populationService.getPopulations(),
          timbanganService.getTimbangans(),
          feedService.getTransactions(),
          timbanganService.getReadings({ label: 'Entok', limit: 100 }),
        ]);

        if (!active) return;

        setFeeds(feedsRes.status === 'fulfilled' ? feedsRes.value || [] : []);
        setPopulations(popRes.status === 'fulfilled' ? popRes.value || [] : []);
        setTimbangans(timbRes.status === 'fulfilled' ? timbRes.value || [] : []);
        setFeedTransactions(txRes.status === 'fulfilled' ? txRes.value || [] : []);
        setEntokReadings(entokRes.status === 'fulfilled' ? entokRes.value || [] : []);

        [feedsRes, popRes, timbRes, txRes, entokRes].forEach((result) => {
          if (result.status === 'rejected') {
            console.error('Failed to load a dashboard data source:', result.reason);
          }
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboardData(true);
    const refreshTimer = window.setInterval(() => fetchDashboardData(false), 15000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA DASHBOARD... ]
      </div>
    );
  }

  const getFaseTotal = (phaseName: string) => {
    const found = populations.find((p) => p.phase.startsWith(phaseName));
    return found ? found.total_ducks : 0;
  };

  const jumlahStarter = getFaseTotal('Starter');
  const jumlahGrower1 = getFaseTotal('Grower 1');
  const jumlahGrower2 = getFaseTotal('Grower 2');
  const jumlahFinisher = getFaseTotal('Finisher');
  const totalBebek = jumlahStarter + jumlahGrower1 + jumlahGrower2 + jumlahFinisher;

  const feedById = new Map(feeds.map((feed) => [feed.id, feed]));
  const todayWitaDay = getWitaDayNumber(new Date());
  const outgoingTransactions = feedTransactions
    .map((transaction) => ({
      transaction,
      date: parseUtcTimestamp(transaction.created_at),
    }))
    .filter(({ transaction, date }) => isFeedConsumptionTransaction(transaction) && date);

  const getFeedName = (transaction: FeedTransaction) => {
    return transaction.feed_name || feedById.get(transaction.feed_id)?.nama || '';
  };

  const sumOutgoing = (predicate: (transaction: FeedTransaction, dayNumber: number) => boolean) => {
    return outgoingTransactions.reduce((sum, { transaction, date }) => {
      const dayNumber = getWitaDayNumber(date as Date);
      return predicate(transaction, dayNumber) ? sum + Number(transaction.amount || 0) : sum;
    }, 0);
  };

  const dedakTerpakaiHariIni = sumOutgoing((transaction, dayNumber) => {
    return dayNumber === todayWitaDay && isDedakName(getFeedName(transaction));
  });

  const weeklyConsumption = Array.from({ length: 7 }, (_, index) => {
    const dayNumber = todayWitaDay - (6 - index);
    const value = sumOutgoing((transaction, txDayNumber) => {
      return txDayNumber === dayNumber && isDedakName(getFeedName(transaction));
    });

    return {
      label: getWitaDayLabel(dayNumber),
      value,
      isToday: dayNumber === todayWitaDay,
    };
  });

  const maxVal = Math.max(1, ...weeklyConsumption.map((d) => d.value));

  const totalFeed7Days = sumOutgoing((_transaction, dayNumber) => {
    const ageInDays = todayWitaDay - dayNumber;
    return ageInDays >= 0 && ageInDays < 7;
  });

  const dedakFeed = feeds.find((f) => isDedakName(f.nama));
  const dedakStok = dedakFeed ? dedakFeed.stok : 0;
  const formattedDedakStok = formatKg(dedakStok);
  const ambangBatas = dedakFeed ? dedakFeed.ambangBatas : 5.0;

  let badgeText = dedakFeed ? 'Aman' : 'Belum Ada';
  let badgeColor = dedakFeed ? 'var(--accent-light)' : 'var(--text-muted)';
  let badgeBg = dedakFeed ? 'var(--accent-glow)' : 'transparent';
  let badgeBorder = dedakFeed ? 'var(--accent)' : 'var(--border)';

  if (dedakFeed && dedakStok <= ambangBatas) {
    badgeText = 'Kritis';
    badgeColor = 'var(--danger)';
    badgeBg = 'var(--danger-glow)';
    badgeBorder = 'var(--danger)';
  } else if (dedakFeed && dedakStok <= ambangBatas * 2.5) {
    badgeText = 'Hampir Habis';
    badgeColor = 'var(--warning)';
    badgeBg = 'var(--warning-glow)';
    badgeBorder = 'var(--warning)';
  }

  const normalizedEntokReadings = entokReadings
    .map((reading) => {
      const date = parseUtcTimestamp(reading.recorded_at || reading.timestamp);
      const value = Number(reading.value ?? reading.weight ?? 0);
      return { value, date };
    })
    .filter((reading): reading is { value: number; date: Date } => {
      return Boolean(reading.date) && Number.isFinite(reading.value) && reading.value > 0;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const latestWeightReading = normalizedEntokReadings.at(-1);
  const avgWeight = latestWeightReading?.value ?? null;
  const formattedAvgWeight = avgWeight === null ? '--' : formatKg(avgWeight);
  const growthProgress = normalizedEntokReadings.slice(-7).map((reading, index, arr) => ({
    label: formatWitaShortDate(reading.date),
    value: reading.value,
    isLatest: index === arr.length - 1,
  }));

  const maxGrowthVal = Math.max(TARGET_PANEN_KG, ...growthProgress.map((g) => g.value));
  const firstGrowthReading = normalizedEntokReadings.find((reading) => {
    const ageInDays = todayWitaDay - getWitaDayNumber(reading.date);
    return ageInDays >= 0 && ageInDays < 7;
  }) || normalizedEntokReadings[0];

  const lastGrowthReading = latestWeightReading;
  const growthDaySpan = firstGrowthReading && lastGrowthReading
    ? Math.max(1, getWitaDayNumber(lastGrowthReading.date) - getWitaDayNumber(firstGrowthReading.date))
    : 0;
  const growthPerDay = firstGrowthReading && lastGrowthReading && lastGrowthReading.value > firstGrowthReading.value
    ? (lastGrowthReading.value - firstGrowthReading.value) / growthDaySpan
    : 0;
  const weeklyTrend = growthPerDay * 7;

  const totalWeightGain7Days = firstGrowthReading && lastGrowthReading && totalBebek > 0
    ? Math.max(0, (lastGrowthReading.value - firstGrowthReading.value) * totalBebek)
    : 0;
  const fcr = totalFeed7Days > 0 && totalWeightGain7Days > 0
    ? totalFeed7Days / totalWeightGain7Days
    : null;
  const fcrValue = fcr === null ? '--' : fcr.toFixed(2);
  const fcrTarget = fcr === null ? 'BUTUH DATA BERAT' : 'TARGET: < 2.30';

  const estimasiPanen = (() => {
    if (avgWeight === null) return '--';
    if (avgWeight >= TARGET_PANEN_KG) return 'SIAP';
    if (growthPerDay <= 0) return 'BUTUH DATA';
    return `${Math.ceil((TARGET_PANEN_KG - avgWeight) / growthPerDay)} HARI`;
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      <div className="dashboard-kpi-grid-5">
        <div className="panel kpi-card">
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {formatKg(dedakTerpakaiHariIni)} kg
          </div>
          <div className="kpi-label">DEDAK TERPAKAI / HARI INI</div>
        </div>

        <div className="panel kpi-card" style={{ position: 'relative' }}>
          <div className="kpi-value" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span>{formattedDedakStok} kg</span>
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                border: `1px solid ${badgeBorder}`,
                color: badgeColor,
                backgroundColor: badgeBg,
                borderRadius: '3px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              {badgeText}
            </span>
          </div>
          <div className="kpi-label">SISA STOK DEDAK</div>
        </div>

        <div className="panel kpi-card">
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {formattedAvgWeight}{avgWeight === null ? '' : ' kg'}
          </div>
          <div className="kpi-label">BERAT RATA-RATA / PER ENTOK</div>
        </div>

        <div className="panel kpi-card">
          <div className="kpi-value" style={{ color: fcr === null ? 'var(--text-muted)' : 'var(--accent-light)' }}>
            {fcrValue}
          </div>
          <div className="kpi-label">{fcrTarget}</div>
        </div>

        <div className="panel kpi-card">
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {estimasiPanen}
          </div>
          <div className="kpi-label">ESTIMASI PANEN</div>
        </div>
      </div>

      <div className="dashboard-charts-grid">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuTrendingUp size={16} style={{ color: 'var(--accent-light)' }} />
              <span>GRAFIK KONSUMSI DEDAK - 7 HARI TERAKHIR</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '24px', flex: 1 }}>
            <div style={{ position: 'relative', width: '100%', height: '160px' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none">
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="75" x2="480" y2="75" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="130" x2="480" y2="130" stroke="var(--border)" strokeWidth="1" />

                {weeklyConsumption.map((d, i) => {
                  const barWidth = 36;
                  const x = 45 + i * (barWidth + 24);
                  const maxPlotHeight = 100;
                  const barHeight = (d.value / maxVal) * maxPlotHeight;
                  const y = 130 - barHeight;

                  return (
                    <g key={`${d.label}-${i}`} className="chart-bar-group">
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="rgba(30, 41, 59, 0.4)"
                        stroke="var(--border)"
                        strokeWidth="1.5"
                        rx="2"
                      />

                      {d.isToday && (
                        <rect
                          x={x + 2}
                          y={y + 2}
                          width={barWidth - 4}
                          height={Math.max(0, barHeight - 4)}
                          fill="var(--accent-glow)"
                          stroke="var(--accent-light)"
                          strokeWidth="1.5"
                          rx="1"
                        />
                      )}

                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        fill="var(--text-secondary)"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        {formatKg(d.value)}
                      </text>

                      <text
                        x={x + barWidth / 2}
                        y="148"
                        fill="var(--text-muted)"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuActivity size={16} style={{ color: 'var(--accent-light)' }} />
              <span>PERKEMBANGAN BERAT ENTOK</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {growthProgress.length === 0 ? (
              <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                [ BELUM ADA DATA TIMBANGAN ENTOK ]
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '120px' }}>
                <svg width="100%" height="100%" viewBox="0 0 420 120" preserveAspectRatio="none">
                  <line x1="30" y1="15" x2="400" y2="15" stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="30" y1="95" x2="400" y2="95" stroke="var(--border)" strokeWidth="1" />

                  {growthProgress.map((g, i) => {
                    const barWidth = 28;
                    const spacing = growthProgress.length > 1 ? 24 : 0;
                    const x = growthProgress.length > 1 ? 35 + i * (barWidth + spacing) : 196;
                    const maxPlotHeight = 80;
                    const barHeight = (g.value / maxGrowthVal) * maxPlotHeight;
                    const y = 95 - barHeight;

                    return (
                      <g key={`${g.label}-${i}`} className="chart-bar-group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill="rgba(30, 41, 59, 0.4)"
                          stroke="var(--border)"
                          strokeWidth="1.5"
                          rx="2"
                        />

                        {g.isLatest && (
                          <rect
                            x={x + 2}
                            y={y + 2}
                            width={barWidth - 4}
                            height={Math.max(0, barHeight - 4)}
                            fill="rgba(96, 165, 250, 0.1)"
                            stroke="#60a5fa"
                            strokeWidth="1.5"
                            rx="1"
                          />
                        )}

                        <text
                          x={x + barWidth / 2}
                          y={y - 6}
                          fill="var(--text-secondary)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                          textAnchor="middle"
                        >
                          {formatKg(g.value)} kg
                        </text>

                        <text
                          x={x + barWidth / 2}
                          y="110"
                          fill="var(--text-muted)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                          textAnchor="middle"
                        >
                          {g.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            <div
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-input)',
                padding: '10px 14px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: growthProgress.length >= 2 && weeklyTrend > 0 ? 'var(--accent-light)' : 'var(--text-muted)',
                borderRadius: 'var(--radius)',
                display: 'inline-block'
              }}
            >
              {growthProgress.length >= 2 && weeklyTrend > 0
                ? `[ Tren naik ${formatKg(weeklyTrend)} kg / minggu ]`
                : '[ Butuh minimal 2 pembacaan berat ]'}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LuScale size={16} style={{ color: 'var(--accent-light)' }} />
            <span>STATUS TIMBANGAN</span>
          </div>
        </div>

        <div className="retro-table-container">
          <table className="retro-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>NAMA TIMBANGAN IOT</th>
                <th style={{ width: '30%' }}>TIPE KONEKSI</th>
                <th style={{ textAlign: 'right', paddingRight: '40px' }}>STATUS PERANGKAT</th>
              </tr>
            </thead>
            <tbody>
              {timbangans.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    [ TIDAK ADA ALAT REGISTERED ]
                  </td>
                </tr>
              ) : (
                timbangans.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{t.nama}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {t.ip_address || (t.nama.toLowerCase().includes('kandang') ? 'BLUETOOTH BLE' : 'WIFI (ESP8266)')}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '40px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: t.status === 'ONLINE' ? 'var(--accent-light)' : 'var(--warning)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                        <LuWifi size={13} style={{ opacity: t.status === 'ONLINE' ? 1 : 0.5 }} />
                        <span>[ {t.status} ]</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
