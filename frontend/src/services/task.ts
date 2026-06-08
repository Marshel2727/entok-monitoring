import { api } from './api';
import { PenjagaTaskItem } from '../types';

export interface DailyChecklistItem {
  task_id: string;
  nama: string;
  waktu: string;
  deskripsi: string;
  img: string;
  is_completed: boolean;
  completed_at: string | null;
  execution_id: string;
  infoDetail: string;
  langkah: { no: number; text: string; thumbnailImg: string }[];
  perhatikan: string;
  catatan: string;
}

export const taskService = {
  getTasks: async () => {
    const res = await api.get<{ status: string; data: PenjagaTaskItem[] }>('/tasks');
    return res.data;
  },

  saveTask: async (task: Partial<PenjagaTaskItem>) => {
    const payload = {
      id: task.id,
      nama: task.nama,
      waktu: task.waktu,
      deskripsi: task.deskripsi,
      img: task.img,
      infoDetail: task.infoDetail,
      langkah: task.langkah || [],
      perhatikan: task.perhatikan,
      catatan: task.catatan,
    };
    return api.post<{ status: string; message: string; data: PenjagaTaskItem }>('/tasks', payload);
  },

  deleteTask: async (id: string) => {
    return api.delete<{ status: string; message: string }>(`/tasks/${id}`);
  },

  getChecklist: async (dateStr?: string) => {
    const endpoint = dateStr ? `/tasks/checklist?date=${dateStr}` : '/tasks/checklist';
    const res = await api.get<{ status: string; data: DailyChecklistItem[] }>(endpoint);
    return res.data;
  },

  toggleChecklist: async (taskId: string, dateStr: string, isCompleted: boolean) => {
    return api.post<{
      status: string;
      message: string;
      data: {
        task_id: string;
        is_completed: boolean;
        completed_at: string | null;
      };
    }>('/tasks/checklist/toggle', {
      task_id: taskId,
      date: dateStr,
      is_completed: isCompleted,
    });
  },

  resetChecklist: async (dateStr: string) => {
    return api.post<{
      status: string;
      message: string;
      data: {
        date: string;
        reset_tasks: number;
        cancelled_batches: number;
      };
    }>('/tasks/checklist/reset', {
      date: dateStr,
    });
  },
};
