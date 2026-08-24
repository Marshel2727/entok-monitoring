'use client';

import React, { useEffect, useState } from 'react';
import { activityService } from '@/services/activity';
import { ActivityLog } from '@/types';
import ActivityHistoryPage from '@/components/activity/ActivityHistoryPage';
import { useFeedback } from '@/components/shared/FeedbackProvider';

export default function RiwayatPage() {
  const { showToast } = useFeedback();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await activityService.getActivities();
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleClearHistory = async () => {
    try {
      await activityService.clearActivities();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal membersihkan log aktivitas. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        Memuat data riwayat aktivitas...
      </div>
    );
  }

  return (
    <ActivityHistoryPage
      history={logs}
      onClearHistory={handleClearHistory}
    />
  );
}
