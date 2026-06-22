'use client';

import React, { useEffect, useState } from 'react';
import { feedService } from '@/services/feed';
import { activityService } from '@/services/activity';
import { clearApiCache } from '@/services/api';
import { subscribeRealtime } from '@/services/realtime';
import { FeedItem, ActivityLog } from '@/types';
import NotifikasiPage from '@/components/notification/NotifikasiPage';
import { useFeedback } from '@/components/shared/FeedbackProvider';

const NOTIFIKASI_REALTIME_EVENTS = [
  'feed_inventory_updated',
  'feed_stock_updated',
  'feeding_batch_updated',
] as const;

export default function NotifikasiRoute() {
  const { showToast } = useFeedback();
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [feedRes, logsRes] = await Promise.all([
        feedService.getFeeds(),
        activityService.getActivities(),
      ]);
      setFeeds(feedRes || []);
      setLogs(logsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    return subscribeRealtime(NOTIFIKASI_REALTIME_EVENTS, () => {
      clearApiCache();
      fetchData(false);
    });
  }, []);

  const handleRestockFeed = async (id: string, amount: number) => {
    try {
      await feedService.restockFeed(id, amount, 'Restock cepat dari notifikasi');
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal melakukan restock. Silakan coba lagi.');
    }
  };

  const handleClearLogs = async () => {
    try {
      await activityService.clearActivities();
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal membersihkan log riwayat. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA NOTIFIKASI &amp; LOG... ]
      </div>
    );
  }

  return (
    <NotifikasiPage
      feedList={feeds}
      activityHistory={logs}
      onRestockFeed={handleRestockFeed}
      onClearHistory={handleClearLogs}
    />
  );
}
