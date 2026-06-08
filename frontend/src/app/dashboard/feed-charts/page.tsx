'use client';

import React, { useEffect, useState } from 'react';
import { feedService, FeedTransaction } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { populationService } from '@/services/population';
import { activityService } from '@/services/activity';
import { timbanganService } from '@/services/timbangan';
import FeedChartsPage from '@/components/dashboard/FeedChartsPage';
import { FeedItem, FormulasiItem, ActivityLog, TimbanganReading } from '@/types';

export default function FeedChartsRoute() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [populations, setPopulations] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [transactions, setTransactions] = useState<FeedTransaction[]>([]);
  const [entokReadings, setEntokReadings] = useState<TimbanganReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchData(isInitial = false) {
      if (isInitial) setLoading(true);
      try {
        const [feedsRes, formsRes, popRes, txRes, entokRes, actRes] = await Promise.allSettled([
          feedService.getFeeds(),
          formulationService.getFormulations(),
          populationService.getPopulations(),
          feedService.getTransactions(),
          timbanganService.getReadings({ label: 'Entok', limit: 100 }),
          activityService.getActivities(),
        ]);
        
        if (feedsRes.status === 'rejected') throw feedsRes.reason;
        if (formsRes.status === 'rejected') throw formsRes.reason;
        if (popRes.status === 'rejected') throw popRes.reason;
        if (txRes.status === 'rejected') throw txRes.reason;

        if (!active) return;

        setFeeds(feedsRes.value || []);
        setFormulations(formsRes.value || []);
        setPopulations(popRes.value || []);
        setTransactions(txRes.value || []);
        setEntokReadings(entokRes.status === 'fulfilled' ? entokRes.value || [] : []);
        setActivities(actRes.status === 'fulfilled' ? actRes.value || [] : []);

        if (entokRes.status === 'rejected') {
          console.error('Failed to load entok weight readings:', entokRes.reason);
        }
        if (actRes.status === 'rejected') {
          console.error('Failed to load activity data:', actRes.reason);
        }
      } catch (err: any) {
        console.error('Failed to load charts data:', err);
        if (active) setError('Gagal memuat data grafik dari database');
      } finally {
        if (active) setLoading(false);
      }
    }

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
        [ MEMUAT DATA GRAFIK PANGAN... ]
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
      jumlahStarter={jumlahStarter}
      jumlahGrower1={jumlahGrower1}
      jumlahGrower2={jumlahGrower2}
      jumlahFinisher={jumlahFinisher}
      jumlahBebek={totalBebek}
      activityHistory={activities}
      feedTransactions={transactions}
      entokReadings={entokReadings}
    />
  );
}
