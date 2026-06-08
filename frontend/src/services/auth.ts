import { api } from './api';
import { User, KeeperAccountItem } from '../types';

export const authService = {
  login: async (username: string, password: string) => {
    return api.post<{
      status: string;
      message: string;
      data: {
        token: string;
        user: {
          id: string;
          name?: string;
          nama: string;
          username: string;
          role: 'PENGAWAS' | 'PENJAGA';
        };
      };
    }>('/auth/login', { username, password });
  },

  registerKeeper: async (data: Partial<KeeperAccountItem>) => {
    // Maps KeeperAccountItem to backend expectations: name, username, password, shift, status
    const payload = {
      name: data.nama,
      username: data.username,
      password: data.kataSandi,
      shift: data.shift ? data.shift.toUpperCase().replace('-', '_') : 'PAGI',
      status: data.status ? data.status.toUpperCase() : 'AKTIF',
    };
    return api.post<{ status: string; message: string }>('/auth/register', payload);
  },

  getKeepers: async () => {
    const res = await api.get<{ status: string; data: User[] }>('/auth/users');
    return res.data;
  },

  updateKeeper: async (id: string, data: Partial<KeeperAccountItem>) => {
    const payload = {
      name: data.nama,
      username: data.username,
      password: data.kataSandi || undefined,
      shift: data.shift ? data.shift.toUpperCase().replace('-', '_') : undefined,
      status: data.status ? data.status.toUpperCase() : undefined,
    };
    return api.put<{ status: string; message: string }>(`/auth/users/${id}`, payload);
  },

  deleteKeeper: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/auth/users/${id}`);
  },
};
