'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { feedService } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { catalogService } from '@/services/catalog';
import { taskService } from '@/services/task';
import { populationService } from '@/services/population';
import PublicLayout from '@/components/shared/PublicLayout';
import { FeedItem, FormulasiItem, KatalogItem, PenjagaTaskItem } from '@/types';

export default function HomeRoute() {
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const router = useRouter();

  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [catalogs, setCatalogs] = useState<KatalogItem[]>([]);
  const [tasks, setTasks] = useState<PenjagaTaskItem[]>([]);
  const [populations, setPopulations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // If logged in, redirect to respective home
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      if (userRole === 'PENGAWAS') {
        router.push('/dashboard');
      } else if (userRole === 'PENJAGA') {
        router.push('/penjaga');
      }
    }
  }, [isLoggedIn, userRole, isLoading, router]);

  useEffect(() => {
    async function fetchPublicData() {
      setLoadingData(true);
      try {
        const [feedsRes, formsRes, catRes, tasksRes, popRes] = await Promise.all([
          feedService.getFeeds().catch(() => []),
          formulationService.getFormulations().catch(() => []),
          catalogService.getCatalogs().catch(() => []),
          taskService.getTasks().catch(() => []),
          populationService.getPopulations().catch(() => []),
        ]);
        
        setFeeds(feedsRes || []);
        setFormulations(formsRes || []);
        setCatalogs(catRes || []);
        setTasks(tasksRes || []);
        setPopulations(popRes || []);
      } catch (err) {
        console.error('Failed to load public landing data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchPublicData();
  }, []);

  if (isLoading || loadingData) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        [ MEMUAT HALAMAN UTAMA... ]
      </div>
    );
  }

  if (isLoggedIn) {
    return null; // Redirecting...
  }

  const getFaseTotal = (phaseName: string) => {
    const found = populations.find((p) => p.phase.startsWith(phaseName));
    return found ? found.total_ducks : 0;
  };

  const jumlahStarter = getFaseTotal('Starter') || 15;
  const jumlahGrower1 = getFaseTotal('Grower 1') || 25;
  const jumlahGrower2 = getFaseTotal('Grower 2') || 18;
  const jumlahFinisher = getFaseTotal('Finisher') || 10;

  return (
    <PublicLayout 
      feedList={feeds}
      formulasiList={formulations}
      katalogList={catalogs}
      tasksList={tasks}
      jumlahStarter={jumlahStarter}
      jumlahGrower1={jumlahGrower1}
      jumlahGrower2={jumlahGrower2}
      jumlahFinisher={jumlahFinisher}
    />
  );
}
