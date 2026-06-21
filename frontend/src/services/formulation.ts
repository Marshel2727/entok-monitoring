import { api } from './api';
import { FormulasiItem } from '../types';

export const formulationService = {
  getFormulations: async () => {
    const res = await api.getCached<{ status: string; data: FormulasiItem[] }>('/formulations', 60000);
    return res.data;
  },

  saveFormulation: async (formulasi: Partial<FormulasiItem>) => {
    const payload = {
      fase: formulasi.fase,
      kategori: formulasi.kategori,
      targetKonsumsi: formulasi.targetKonsumsi,
      komposisi: formulasi.komposisi,
      pakanAlternatif: formulasi.pakanAlternatif || [],
    };
    if (formulasi.id) {
      Object.assign(payload, { id: formulasi.id });
    }
    return api.post<{ status: string; message: string; data: FormulasiItem }>('/formulations', payload);
  },

  deleteFormulation: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/formulations/${id}`);
  },
};
