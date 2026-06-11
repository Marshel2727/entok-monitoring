import { api } from './api';
import { PopulasiLog } from '../types';

export interface PopulationPhase {
  id: string;
  phase_id?: string;
  phase: string;
  total_ducks: number;
  last_updated: string;
}

export const populationService = {
  getPopulations: async () => {
    const res = await api.get<{ status: string; data: { [key: string]: number } }>('/populations');
    
    // Convert backend's key-value dict to array of PopulationPhase
    return Object.entries(res.data).map(([phase, total]) => ({
      id: phase,
      phase,
      total_ducks: total,
      last_updated: 'Baru saja',
    }));
  },

  updatePopulation: async (fase: string, nilaiBaru: number) => {
    return api.post<{ status: string; message: string; data: any }>('/populations', {
      fase,
      nilaiBaru,
    });
  },

  getLogs: async () => {
    const res = await api.get<{ status: string; data: PopulasiLog[] }>('/populations/logs');
    return res.data;
  },

  deleteLog: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/populations/logs/${id}`);
  },
};
