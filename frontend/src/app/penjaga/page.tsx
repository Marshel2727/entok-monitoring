'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { taskService, DailyChecklistItem } from '@/services/task';
import { feedService } from '@/services/feed';
import { formulationService } from '@/services/formulation';
import { populationService, PopulationPhase } from '@/services/population';
import { feedingBatchService, FeedingBatch } from '@/services/feedingBatch';
import { clearApiCache } from '@/services/api';
import { subscribeRealtime } from '@/services/realtime';
import { FeedItem, FormulasiItem, PenjagaTaskItem } from '@/types';
import ChecklistPenjagaPage from '@/components/penjaga/ChecklistPenjagaPage';

const PORTAL_REALTIME_EVENTS = [
  'feeding_batch_updated',
  'feed_inventory_updated',
  'feed_stock_updated',
  'scale_reading_created',
] as const;

export default function PenjagaPortal() {
  const { isLoggedIn, userRole, logout, isLoading } = useAuth();
  const router = useRouter();

  const [checklist, setChecklist] = useState<DailyChecklistItem[]>([]);
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [formulations, setFormulations] = useState<FormulasiItem[]>([]);
  const [populations, setPopulations] = useState<PopulationPhase[]>([]);
  const [tasks, setTasks] = useState<PenjagaTaskItem[]>([]);
  const [feedingBatches, setFeedingBatches] = useState<FeedingBatch[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(true);

  async function fetchDailyData(showLoading = true) {
    if (showLoading) setLoadingPortal(true);
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' }); // YYYY-MM-DD format
      const [checkRes, feedsRes, formulationRes, populationRes, tasksRes, batchRes] = await Promise.allSettled([
        taskService.getChecklist(today),
        feedService.getFeeds(),
        formulationService.getFormulations(),
        populationService.getPopulations(),
        taskService.getTasks(),
        feedingBatchService.getTodayBatches(today),
      ]);
      setChecklist(checkRes.status === 'fulfilled' ? checkRes.value || [] : []);
      setFeeds(feedsRes.status === 'fulfilled' ? feedsRes.value || [] : []);
      setFormulations(formulationRes.status === 'fulfilled' ? formulationRes.value || [] : []);
      setPopulations(populationRes.status === 'fulfilled' ? populationRes.value || [] : []);
      setTasks(tasksRes.status === 'fulfilled' ? tasksRes.value || [] : []);
      const loadedBatches = batchRes.status === 'fulfilled' ? batchRes.value || [] : [];
      setFeedingBatches(loadedBatches);

      [checkRes, feedsRes, formulationRes, populationRes, tasksRes, batchRes].forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Failed to load a keeper portal data source:', result.reason);
        }
      });
    } catch (err) {
      console.error('Failed to fetch keeper portal data:', err);
    } finally {
      if (showLoading) setLoadingPortal(false);
    }
  }

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        router.push('/login');
      } else if (userRole !== 'PENJAGA' && userRole !== 'PENGAWAS') {
        router.push('/dashboard');
      } else {
        const timer = window.setTimeout(() => {
          void fetchDailyData();
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [isLoggedIn, userRole, isLoading, router]);

  useEffect(() => {
    if (isLoading || !isLoggedIn || (userRole !== 'PENJAGA' && userRole !== 'PENGAWAS')) {
      return;
    }

    const timer = window.setInterval(() => {
      fetchDailyData(false);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isLoggedIn, userRole, isLoading]);

  useEffect(() => {
    if (isLoading || !isLoggedIn || (userRole !== 'PENJAGA' && userRole !== 'PENGAWAS')) {
      return;
    }

    return subscribeRealtime(PORTAL_REALTIME_EVENTS, () => {
      clearApiCache();
      fetchDailyData(false);
    });
  }, [isLoggedIn, userRole, isLoading]);

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    await taskService.toggleChecklist(taskId, today, isCompleted);
    await fetchDailyData();
  };

  const handleCreateFeedingBatch = async (taskId?: string, taskExecutionId?: string) => {
    if (!taskId && !taskExecutionId) {
      throw new Error('Batch racikan harus dibuat dari misi pakan tertentu.');
    }

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    await feedingBatchService.createBatch(today, taskId, taskExecutionId);
    await fetchDailyData();
  };

  const handleFinalizeFeedingBatch = async (batchId?: string) => {
    if (!batchId) return;
    await feedingBatchService.finalizeBatch(batchId);
    await fetchDailyData();
  };

  const handleCancelFeedingBatch = async (batchId?: string) => {
    if (!batchId) return;
    await feedingBatchService.cancelBatch(batchId);
    await fetchDailyData();
  };

  const handleResetDaily = async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' });
    await taskService.resetChecklist(today);
    await fetchDailyData();
  };

  if (isLoading || loadingPortal) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        backgroundColor: '#f7f9fc',
        color: '#718096',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        MEMUAT PORTAL OPERASIONAL...
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
    <ChecklistPenjagaPage
      checklist={checklist}
      feedingBatches={feedingBatches}
      feedList={feeds}
      formulasiList={formulations}
      tasksList={tasks}
      onToggleTask={handleToggleTask}
      onCreateFeedingBatch={handleCreateFeedingBatch}
      onFinalizeFeedingBatch={handleFinalizeFeedingBatch}
      onCancelFeedingBatch={handleCancelFeedingBatch}
      onResetDaily={handleResetDaily}
      onLogout={userRole === 'PENGAWAS' ? () => router.push('/dashboard') : logout}
      isStandalone={userRole === 'PENGAWAS'}
      backButtonLabel={userRole === 'PENGAWAS' ? "Kembali ke Dashboard" : undefined}
      jumlahStarter={jumlahStarter}
      jumlahGrower1={jumlahGrower1}
      jumlahGrower2={jumlahGrower2}
      jumlahFinisher={jumlahFinisher}
    />
  );
}
