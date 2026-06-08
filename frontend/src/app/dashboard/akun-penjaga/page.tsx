'use client';

import React, { useEffect, useState } from 'react';
import { authService } from '@/services/auth';
import { User, KeeperAccountItem } from '@/types';
import KelolaAkunPenjagaPage from '@/components/keeper/KelolaAkunPenjagaPage';

export default function AkunPenjagaPage() {
  const [keepers, setKeepers] = useState<KeeperAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeepers();
  }, []);

  const fetchKeepers = async () => {
    setLoading(true);
    try {
      const res = await authService.getKeepers();
      
      const mapped = (res || [])
        .filter((u) => u.role === 'PENJAGA')
        .map((u) => ({
          id: u.id || '',
          nama: u.nama || (u as any).name || '',
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
  };

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
      alert('Gagal menyimpan akun penjaga. Silakan coba lagi.');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await authService.deleteKeeper(id);
      await fetchKeepers();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus akun penjaga. Silakan coba lagi.');
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

