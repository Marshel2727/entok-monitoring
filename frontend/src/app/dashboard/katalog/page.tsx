'use client';

import React, { useEffect, useState } from 'react';
import { catalogService } from '@/services/catalog';
import KelolaKatalogPage from '@/components/catalog/KelolaKatalogPage';
import { KatalogItem } from '@/types';

export default function KatalogPage() {
  const [catalogs, setCatalogs] = useState<KatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    setLoading(true);
    try {
      const res = await catalogService.getCatalogs();
      setCatalogs(res || []);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat katalog produk dari database');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCatalog = async (item: KatalogItem) => {
    try {
      const res = await catalogService.saveCatalog(item);
      if (res.status === 'success') {
        fetchCatalogs(); // Refresh lists
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan produk.');
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    try {
      const res = await catalogService.deleteCatalog(id);
      if (res.status === 'success') {
        fetchCatalogs(); // Refresh lists
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus produk.');
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        [ MEMUAT DATA KATALOG... ]
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', padding: '24px' }}>
        [ ERROR: {error} ]
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
