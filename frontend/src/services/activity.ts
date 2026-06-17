import { api } from './api';
import { ActivityLog } from '../types';

export const activityService = {
  getActivities: async () => {
    const res = await api.getCached<{ status: string; data: ActivityLog[] }>('/activities', 10000);
    return res.data;
  },

  clearActivities: async () => {
    return api.delete<{ status: string; message: string }>('/activities');
  },
};
