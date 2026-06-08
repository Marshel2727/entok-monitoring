'use client';

import React, { useEffect, useState } from 'react';
import { populationService } from '@/services/population';
import { PopulasiLog } from '@/types';
import KelolaPopulasiPage from '@/components/populasi/KelolaPopulasiPage';

export default function PopulasiPage() {
  const [populations, setPopulations] = useState<any[]>([]);
  const [logs, setLogs] = useState<PopulasiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopulations();
  }, []);

  const fetchPopulations = async () => {
    setLoading(true);
    try {
      const [popRes, logsRes] = await Promise.all([
        populationService.getPopulations(),
        populationService.getLogs(),
      ]);
      setPopulations(popRes || []);
      setLogs(logsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFasePopulasi = async (fase: string, newVal: number) => {
    try {
      await populationService.updatePopulation(fase, newVal);
      await fetchPopulations();
    } catch (err) {
      console.error(err);
      alert('Gagal mengupdate populasi. Silakan coba lagi.');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus log riwayat ini?')) {
      try {
        await populationService.deleteLog(id);
        await fetchPopulations();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus log riwayat. Silakan coba lagi.');
      }
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA POPULASI BEBEK... ]
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
    <KelolaPopulasiPage
      jumlahStarter={jumlahStarter}
      jumlahGrower1={jumlahGrower1}
      jumlahGrower2={jumlahGrower2}
      jumlahFinisher={jumlahFinisher}
      populasiHistory={logs}
      onUpdateFasePopulasi={handleUpdateFasePopulasi}
      onDeleteLog={handleDeleteLog}
    />
  );
}

