'use client';

import React, { useEffect, useState } from 'react';
import { feedService } from '@/services/feed';
import { activityService } from '@/services/activity';
import { FeedItem, ActivityLog } from '@/types';
import NotifikasiPage from '@/components/notification/NotifikasiPage';

export default function NotifikasiRoute() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleRestockFeed = async (id: string, amount: number) => {
    try {
      await feedService.restockFeed(id, amount, 'Restock cepat dari notifikasi');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal melakukan restock. Silakan coba lagi.');
    }
  };

  const handleClearLogs = async () => {
    try {
      await activityService.clearActivities();
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan log riwayat. Silakan coba lagi.');
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

