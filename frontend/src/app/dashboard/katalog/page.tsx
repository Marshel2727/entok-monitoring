'use client';

import React, { useEffect, useState } from 'react';
import { catalogService } from '@/services/catalog';
import KelolaKatalogPage from '@/components/catalog/KelolaKatalogPage';
import { KatalogItem } from '@/types';
import { useFeedback } from '@/components/shared/FeedbackProvider';

export default function KatalogPage() {
  const { showToast } = useFeedback();
  const [catalogs, setCatalogs] = useState<KatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

  async function fetchCatalogs() {
    setLoading(true);
    try {
      const res = await catalogService.getCatalogs();
      setCatalogs(res || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat katalog produk dari database');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCatalogs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSaveCatalog = async (item: KatalogItem) => {
    try {
      const res = await catalogService.saveCatalog(item);
      if (res.status === 'success') {
        fetchCatalogs(); // Refresh lists
      }
    } catch (err) {
      showToast('error', errorMessage(err, 'Gagal menyimpan produk.'));
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    try {
      const res = await catalogService.deleteCatalog(id);
      if (res.status === 'success') {
        fetchCatalogs(); // Refresh lists
      }
    } catch (err) {
      showToast('error', errorMessage(err, 'Gagal menghapus produk.'));
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        Memuat data katalog...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', padding: '24px' }}>
        Gagal: {error}
      </div>
    );
  }

  return (
    <KelolaKatalogPage 
      katalogList={catalogs}
      onSaveKatalog={handleSaveCatalog}
      onDeleteKatalog={handleDeleteCatalog}
    />
  );
}
