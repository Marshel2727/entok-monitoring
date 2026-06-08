'use client';

import React, { useEffect, useState } from 'react';
import { feedService } from '@/services/feed';
import { timbanganService } from '@/services/timbangan';
import { formulationService } from '@/services/formulation';
import { feedingBatchService } from '@/services/feedingBatch';
import { populationService, PopulationPhase } from '@/services/population';
import KelolaPakanPage from '@/components/feed/KelolaPakanPage';
import { FeedItem, FormulasiItem, Timbangan } from '@/types';

export default function PakanPage() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [timbangans, setTimbangans] = useState<Timbangan[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [populations, setPopulations] = useState<PopulationPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const [res, timbanganRes, formulationRes, populationRes] = await Promise.all([
        feedService.getFeeds(),
        timbanganService.getTimbangans(),
        formulationService.getFormulations(),
        populationService.getPopulations(),
      ]);
      setFeeds(res || []);
      setTimbangans(timbanganRes || []);
      setFormulations(formulationRes || []);
      setPopulations(populationRes || []);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat inventaris pakan dari database');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeed = async (feed: FeedItem) => {
    try {
      const res = await feedService.saveFeed(feed);
      if (res.status === 'success') {
        fetchFeeds(); // Refresh lists
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan bahan pakan.');
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      const res = await feedService.deleteFeed(id);
      if (res.status === 'success') {
        fetchFeeds(); // Refresh lists
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus bahan pakan.');
    }
  };

  const handleRestockFeed = async (id: string, amount: number) => {
    try {
      const res = await feedService.restockFeed(id, amount, 'Restock cepat melalui gudang');
      if (res.status === 'success') {
        fetchFeeds(); // Refresh lists
      }
    } catch (err: any) {
      alert(err.message || 'Gagal merestock pakan.');
    }
  };

  const handleScaleReading = async (
    timbanganId: string | number,
    value: number,
    label?: string,
    feedId?: string,
    phase?: string
  ) => {
    try {
      const selectedScale = timbangans.find((item) => String(item.id) === String(timbanganId));
      const res = selectedScale?.tipe === 'MULTI'
        ? await feedingBatchService.recordScaleReading({
            timbangan_id: timbanganId,
            phase: phase || '',
            label: label || '',
            value,
            mode: 'SET',
          })
        : await timbanganService.postReading(timbanganId, value, label, feedId, 'kg');

      if (res.status === 'success') {
        await fetchFeeds();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pembacaan timbangan.');
    }
  };

  const handleScaleComposition = async (timbanganId: string | number, phase: string) => {
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
      const batch = await feedingBatchService.createBatch(today);
      if (batch.status !== 'PREPARING') {
        throw new Error('Batch racikan hari ini sudah final. Buat hari baru atau batalkan batch yang masih diracik.');
      }

      const normalizePhase = (value: string) => {
        const phaseLower = value.trim().toLowerCase();
        if (phaseLower.includes('starter')) return 'starter';
        if (phaseLower.includes('grower 1') || phaseLower.includes('grower1')) return 'grower 1';
        if (phaseLower.includes('grower 2') || phaseLower.includes('grower2')) return 'grower 2';
        if (phaseLower.includes('finisher')) return 'finisher';
        return phaseLower;
      };

      const phaseItems = (batch.ingredients || []).filter((item) => {
        return normalizePhase(item.phase) === normalizePhase(phase);
      });

      if (phaseItems.length === 0) {
        throw new Error(`Tidak ada target komposisi batch untuk fase "${phase}".`);
      }

      for (const item of phaseItems) {
        await feedingBatchService.recordScaleReading({
          timbangan_id: timbanganId,
          phase: item.phase,
          label: item.feed_name,
          value: item.planned_amount,
          mode: 'SET',
          date: today,
        });
      }

      await fetchFeeds();
    } catch (err: any) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        [ MEMUAT DATA INVENTARIS PAKAN... ]
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', padding: '24px' }}>
        [ ERROR: {error} ]
      </div>
    );
  }

  return (
    <KelolaPakanPage 
      feedList={feeds}
      timbanganList={timbangans}
      formulasiList={formulations}
      populationList={populations}
      onSaveFeed={handleSaveFeed}
      onDeleteFeed={handleDeleteFeed}
      onRestockFeed={handleRestockFeed}
      onScaleReading={handleScaleReading}
      onScaleComposition={handleScaleComposition}
    />
  );
}
