import { api } from './api';
import { Timbangan, TimbanganReading } from '../types';

export const timbanganService = {
  getTimbangans: async () => {
    const res = await api.get<{ status: string; data: Timbangan[] }>('/timbangan');
    return res.data;
  },

  getTimbangan: async (id: string) => {
    const res = await api.get<{ status: string; data: Timbangan }>(`/timbangan/${id}`);
    return res.data;
  },

  getLatestReading: async (timbanganId: string, label?: string) => {
    let endpoint = `/timbangan/readings?timbangan_id=${timbanganId}&limit=1`;
    if (label) {
      endpoint += `&label=${label}`;
    }
    const res = await api.get<{ status: string; data: TimbanganReading[] }>(endpoint);
    return res.data;
  },

  getReadings: async (params: { timbanganId?: string | number; label?: string; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.timbanganId) query.set('timbangan_id', String(params.timbanganId));
    if (params.label) query.set('label', params.label);
    if (params.limit) query.set('limit', String(params.limit));

    const endpoint = `/timbangan/readings${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await api.get<{ status: string; data: TimbanganReading[] }>(endpoint);
    return res.data;
  },

  postReading: async (timbanganId: string | number, weight: number, label?: string, feedId?: string, unit = 'kg') => {
    const payload = {
      timbangan_id: Number(timbanganId),
      value: weight,
      label,
      feed_id: feedId,
      unit,
    };
    return api.post<{ status: string; message: string; data: TimbanganReading }>('/timbangan/readings', payload);
  },
};
