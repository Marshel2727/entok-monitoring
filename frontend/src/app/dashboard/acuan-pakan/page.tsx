'use client';

import React, { useEffect, useState } from 'react';
import { feedService } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { populationService, PopulationPhase } from '@/services/population';
import PanduanPenjagaPage from '@/components/penjaga/PanduanPenjagaPage';
import { FeedItem, FormulasiItem } from '@/types';

export default function AcuanPakanRoute() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [populations, setPopulations] = useState<PopulationPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [feedsRes, formsRes, popRes] = await Promise.all([
          feedService.getFeeds(),
          formulationService.getFormulations(),
          populationService.getPopulations(),
        ]);
        
        setFeeds(feedsRes || []);
        setFormulations(formsRes || []);
        setPopulations(popRes || []);
      } catch (err) {
        console.error('Failed to load guide data:', err);
        setError('Gagal memuat acuan pakan dari database');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        Memuat data acuan pakan...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', padding: '24px' }}>
        Gagal: {error}
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

  return (
    <PanduanPenjagaPage 
      feedList={feeds}
      formulasiList={formulations}
      jumlahStarter={jumlahStarter}
      jumlahGrower1={jumlahGrower1}
      jumlahGrower2={jumlahGrower2}
      jumlahFinisher={jumlahFinisher}
    />
  );
}
