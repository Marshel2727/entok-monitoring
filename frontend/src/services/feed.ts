import { api } from './api';
import { FeedItem } from '../types';

export interface FeedTransaction {
  id: string;
  feed_id: string;
  feed_name: string;
  type: 'IN' | 'OUT';
  transaction_type?: 'STOCK_IN' | 'STOCK_OUT';
  amount: number;
  remaining_stock?: number;
  description: string;
  created_at: string;
  user_name: string;
}

export const feedService = {
  getFeeds: async () => {
    const res = await api.get<{ status: string; data: FeedItem[] }>('/feeds');
    return res.data;
  },

  getFeed: async (id: string) => {
    const res = await api.get<{ status: string; data: FeedItem }>(`/feeds/${id}`);
    return res.data;
  },

  saveFeed: async (feed: Partial<FeedItem>) => {
    const payload = {
      id: feed.id,
      nama: feed.nama,
      kategori: feed.kategori,
      stok: feed.stok,
      ambangBatas: feed.ambangBatas,
      nutrisi: feed.nutrisi || {
        protein: 0,
        karbohidrat: 0,
        lemak: 0,
        serat: 0,
        mineral: 0,
      },
      unit: feed.satuan || 'kg',
      price_per_kg: feed.hargaPerKg || 0,
    };
    return api.post<{ status: string; message: string; data: FeedItem }>('/feeds', payload);
  },

  deleteFeed: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/feeds/${id}`);
  },

  restockFeed: async (id: string, amount: number, description: string = '') => {
    return api.post<{ status: string; message: string }>(`/feeds/${id}/restock`, {
      amount,
      description,
    });
  },

  getTransactions: async (feedId?: string) => {
    const endpoint = feedId ? `/feeds/transactions?feed_id=${feedId}` : '/feeds/transactions';
    const res = await api.get<{ status: string; data: FeedTransaction[] }>(endpoint);
    return res.data;
  },
};
