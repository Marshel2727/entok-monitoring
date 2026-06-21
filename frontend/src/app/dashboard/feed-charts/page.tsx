'use client';

import React, { useEffect, useState } from 'react';
import { feedService, FeedTransaction } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { populationService, type PopulationPhase } from '@/services/population';
import { timbanganService } from '@/services/timbangan';
import FeedChartsPage from '@/components/dashboard/FeedChartsPage';
import { FeedItem, FormulasiItem, TimbanganReading } from '@/types';

interface FeedChartsCachePayload {
  cachedAt: number;
  feeds: FeedItem[];
  formulations: FormulasiItem[];
  populations: PopulationPhase[];
  transactions: FeedTransaction[];
  entokReadings: TimbanganReading[];
}

const FEED_CHARTS_CACHE_KEY = 'entok_feed_charts_cache_v2';
const FEED_CHARTS_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFeedChartsCachePayload(value: unknown): value is FeedChartsCachePayload {
  if (!isRecord(value)) return false;

  return typeof value.cachedAt === 'number'
    && Array.isArray(value.feeds)
    && Array.isArray(value.formulations)
    && Array.isArray(value.populations)
    && Array.isArray(value.transactions)
    && Array.isArray(value.entokReadings);
}

function readFeedChartsCache() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(FEED_CHARTS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isFeedChartsCachePayload(parsed)) return null;
    if (Date.now() - parsed.cachedAt > FEED_CHARTS_CACHE_MAX_AGE_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeFeedChartsCache(payload: FeedChartsCachePayload) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(FEED_CHARTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Cache is an optimization only; storage quota/privacy mode should not break the page.
  }
}

export default function FeedChartsRoute() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [populations, setPopulations] = useState<PopulationPhase[]>([]);
  const [transactions, setTransactions] = useState<FeedTransaction[]>([]);
  const [entokReadings, setEntokReadings] = useState<TimbanganReading[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let hasVisibleData = false;

    function applyPayload(payload: FeedChartsCachePayload) {
      if (!active) return;

      hasVisibleData = true;
      setFeeds(payload.feeds);
      setFormulations(payload.formulations);
      setPopulations(payload.populations);
      setTransactions(payload.transactions);
      setEntokReadings(payload.entokReadings);
      setLastSyncedAt(payload.cachedAt);
      setError('');
      setLoading(false);
    }

    async function fetchData(isInitial = false) {
      if (isInitial && !hasVisibleData) setLoading(true);
      if (!isInitial || hasVisibleData) setIsRefreshing(true);

      try {
        const [feedsRes, formsRes, popRes, txRes, entokRes] = await Promise.allSettled([
          feedService.getFeeds(),
          formulationService.getFormulations(),
          populationService.getPopulations(),
          feedService.getTransactions(),
          timbanganService.getReadings({ label: 'Entok', limit: 100 }),
        ]);
        
        if (feedsRes.status === 'rejected') throw feedsRes.reason;
        if (formsRes.status === 'rejected') throw formsRes.reason;
        if (popRes.status === 'rejected') throw popRes.reason;
        if (txRes.status === 'rejected') throw txRes.reason;

        if (!active) return;

        const payload: FeedChartsCachePayload = {
          cachedAt: Date.now(),
          feeds: feedsRes.value || [],
          formulations: formsRes.value || [],
          populations: popRes.value || [],
          transactions: txRes.value || [],
          entokReadings: entokRes.status === 'fulfilled' ? entokRes.value || [] : [],
        };

        applyPayload(payload);
        writeFeedChartsCache(payload);

        if (entokRes.status === 'rejected') {
          console.error('Failed to load entok weight readings:', entokRes.reason);
        }
      } catch (err: unknown) {
        console.error('Failed to load charts data:', err);
        if (active && !hasVisibleData) setError('Gagal memuat data grafik dari database');
      } finally {
        if (active) setLoading(false);
        if (active) setIsRefreshing(false);
      }
    }

    const cached = readFeedChartsCache();
    if (cached) applyPayload(cached);

    fetchData(true);
    const refreshTimer = window.setInterval(() => fetchData(false), 15000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        Memuat data grafik pangan...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', padding: '24px' }}>
        Error: {error}
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

  return (
    <FeedChartsPage 
      feedList={feeds}
      formulasiList={formulations}
      jumlahBebek={totalBebek}
      feedTransactions={transactions}
      entokReadings={entokReadings}
      lastSyncedAt={lastSyncedAt}
      isRefreshing={isRefreshing}
    />
  );
}
