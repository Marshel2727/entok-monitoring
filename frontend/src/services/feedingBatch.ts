import { api } from './api';

export interface FeedingBatchIngredient {
  id: number;
  batch_id: string;
  feed_id: string | null;
  feed_name: string;
  phase: string;
  population_count: number;
  target_consumption: number;
  planned_amount: number;
  weighed_amount: number;
  deducted_amount: number;
  variance_amount: number;
  unit: string;
}

export interface FeedingBatch {
  id: string;
  tanggal: string;
  keeper_id: string | null;
  status: 'PREPARING' | 'FINALIZED' | 'CANCELLED';
  tolerance_percent: number;
  created_at: string | null;
  finalized_at: string | null;
  notes: string | null;
  ingredients: FeedingBatchIngredient[];
}

export const feedingBatchService = {
  getTodayBatch: async (dateStr?: string) => {
    const endpoint = dateStr
      ? `/feeding-batches/today?date=${encodeURIComponent(dateStr)}`
      : '/feeding-batches/today';
    const res = await api.get<{ status: string; data: FeedingBatch | null }>(endpoint);
    return res.data;
  },

  createBatch: async (dateStr?: string) => {
    const res = await api.post<{ status: string; message: string; data: FeedingBatch }>(
      '/feeding-batches',
      { date: dateStr }
    );
    return res.data;
  },

  recordWeight: async (batchId: string, ingredientId: number, amount: number, timbanganId = 2) => {
    const res = await api.post<{ status: string; message: string; data: FeedingBatch }>(
      `/feeding-batches/${batchId}/weights`,
      {
        ingredient_id: ingredientId,
        amount,
        timbangan_id: timbanganId,
      }
    );
    return res.data;
  },

  recordScaleReading: async (payload: {
    timbangan_id?: string | number;
    phase: string;
    label: string;
    value: number;
    mode?: 'SET' | 'ADD';
    date?: string;
  }) => {
    const res = await api.post<{ status: string; message: string; data: FeedingBatch }>(
      '/feeding-batches/scale-readings',
      payload
    );
    return res.data;
  },

  finalizeBatch: async (batchId: string) => {
    const res = await api.post<{ status: string; message: string; data: FeedingBatch }>(
      `/feeding-batches/${batchId}/finalize`,
      {}
    );
    return res.data;
  },

  cancelBatch: async (batchId: string) => {
    const res = await api.post<{ status: string; message: string; data: FeedingBatch }>(
      `/feeding-batches/${batchId}/cancel`,
      {}
    );
    return res.data;
  },
};
