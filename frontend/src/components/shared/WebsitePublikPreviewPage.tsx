'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { feedService } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { catalogService } from '@/services/catalog';
import { taskService } from '@/services/task';
import { populationService } from '@/services/population';
import PublicLayout from '@/components/shared/PublicLayout';
import { FeedItem, FormulasiItem, KatalogItem, PenjagaTaskItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface PopulationPhase {
  phase: string;
  total_ducks: number;
}

export default function WebsitePublikPreviewPage() {
  const router = useRouter();
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [catalogs, setCatalogs] = useState<KatalogItem[]>([]);
  const [tasks, setTasks] = useState<PenjagaTaskItem[]>([]);
  const [populations, setPopulations] = useState<PopulationPhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (userRole !== 'PENGAWAS') {
      router.push('/penjaga');
      return;
    }

    async function fetchData() {
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
        console.error('Failed to load website preview data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoading, isLoggedIn, userRole, router]);

  if (isLoading || loading || !isLoggedIn || userRole !== 'PENGAWAS') {
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
        [ MEMUAT PRATINJAU WEBSITE PUBLIK... ]
      </div>
    );
  }

  const getFaseTotal = (phaseName: string) => {
    const found = populations.find((p) => p.phase.startsWith(phaseName));
    return found ? found.total_ducks : 0;
  };

  return (
    <PublicLayout
      feedList={feeds}
      formulasiList={formulations}
      katalogList={catalogs}
      tasksList={tasks}
      isPreview={true}
      onBackToDashboard={() => router.push('/dashboard')}
      jumlahStarter={getFaseTotal('Starter') || 15}
      jumlahGrower1={getFaseTotal('Grower 1') || 25}
      jumlahGrower2={getFaseTotal('Grower 2') || 18}
      jumlahFinisher={getFaseTotal('Finisher') || 10}
    />
  );
}
