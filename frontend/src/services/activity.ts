import { api } from './api';
import { ActivityLog } from '../types';

export const activityService = {
  getActivities: async () => {
    const res = await api.get<{ status: string; data: ActivityLog[] }>('/activities');
    return res.data;
  },

  clearActivities: async () => {
    return api.delete<{ status: string; message: string }>('/activities');
  },
};
