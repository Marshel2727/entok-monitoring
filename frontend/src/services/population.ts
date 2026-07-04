import { api } from './api';
import { PopulasiLog } from '../types';

export interface PopulationPhase {
  id: string;
  phase_id?: string;
  phase: string;
  total_ducks: number;
  last_updated: string;
}

export type PopulationUpdateMode = 'ADD' | 'SUBTRACT' | 'SET';

export const populationService = {
  getPopulations: async () => {
    const res = await api.getCached<{ status: string; data: { [key: string]: number } }>('/populations', 30000);
    
    // Convert backend's key-value dict to array of PopulationPhase
    return Object.entries(res.data).map(([phase, total]) => ({
      id: phase,
      phase,
      total_ducks: total,
      last_updated: 'Baru saja',
    }));
  },

  updatePopulation: async (fase: string, jumlah: number, mode: PopulationUpdateMode = 'SET') => {
    return api.post<{ status: string; message: string; data: unknown }>('/populations', {
      fase,
      mode,
      jumlah,
      ...(mode === 'SET' ? { nilaiBaru: jumlah } : {}),
    });
  },

  getLogs: async () => {
    const res = await api.getCached<{ status: string; data: PopulasiLog[] }>('/populations/logs', 15000);
    return res.data;
  },

  deleteLog: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/populations/logs/${id}`);
  },
};
