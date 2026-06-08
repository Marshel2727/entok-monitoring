import { api } from './api';
import { KatalogItem } from '../types';

export const catalogService = {
  getCatalogs: async () => {
    const res = await api.get<{ status: string; data: KatalogItem[] }>('/catalogs');
    return res.data;
  },

  saveCatalog: async (item: Partial<KatalogItem>) => {
    const payload = {
      id: item.id,
      nama: item.nama,
      deskripsi: item.deskripsi,
      harga: item.harga,
      stok: item.stok,
      satuan: item.satuan,
      tag: item.tag,
      img: item.img,
    };
    return api.post<{ status: string; message: string; data: KatalogItem }>('/catalogs', payload);
  },

  deleteCatalog: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/catalogs/${id}`);
  },
};
