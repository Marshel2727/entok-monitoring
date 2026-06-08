'use client';

import React, { useEffect, useState } from 'react';
import { activityService } from '@/services/activity';
import { ActivityLog } from '@/types';
import ActivityHistoryPage from '@/components/activity/ActivityHistoryPage';

export default function RiwayatPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await activityService.getActivities();
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await activityService.clearActivities();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan log aktivitas. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA RIWAYAT AKTIVITAS... ]
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

