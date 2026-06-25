'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { authService } from '@/services/auth';
import { KeeperAccountItem } from '@/types';
import KelolaAkunPenjagaPage from '@/components/keeper/KelolaAkunPenjagaPage';
import { useFeedback } from '@/components/shared/FeedbackProvider';

const mapShiftFromBackend = (val?: string): string => {
  if (!val) return 'Pagi';
  const clean = val.toUpperCase();
  if (clean === 'PAGI') return 'Pagi';
  if (clean === 'SORE') return 'Sore';
  if (clean === 'FULL_TIME') return 'Full-Time';
  return val;
};

const mapStatusFromBackend = (val?: string): string => {
  if (!val) return 'Aktif';
  return val.toUpperCase() === 'AKTIF' ? 'Aktif' : 'Nonaktif';
};

export default function AkunPenjagaPage() {
  const { showToast } = useFeedback();
  const [keepers, setKeepers] = useState<KeeperAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeepers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authService.getKeepers();
      
      const mapped = (res || [])
        .filter((u) => u.role === 'PENJAGA')
        .map((u) => ({
          id: u.id || '',
          nama: u.nama || '',
          username: u.username,
          kataSandi: '', // Password is encrypted, empty string indicates unchanged
          shift: mapShiftFromBackend(u.shift),
          status: mapStatusFromBackend(u.status),
          tanggalBergabung: u.tanggal_bergabung || 'Baru saja',
        }));
      
      setKeepers(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchKeepers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchKeepers]);

  const handleSaveAccount = async (item: KeeperAccountItem) => {
    try {
      if (item.id) {
        // Edit mode
        await authService.updateKeeper(item.id, item);
      } else {
        // Create mode
        await authService.registerKeeper(item);
      }
      await fetchKeepers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menyimpan akun penjaga. Silakan coba lagi.');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await authService.deleteKeeper(id);
      await fetchKeepers();
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal menghapus akun penjaga. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA AKUN PENJAGA... ]
      </div>
    );
  }

  return (
    <KelolaAkunPenjagaPage
      keeperAccounts={keepers}
      onSaveAccount={handleSaveAccount}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
