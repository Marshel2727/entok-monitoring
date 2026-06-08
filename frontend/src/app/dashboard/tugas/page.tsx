'use client';

import React, { useEffect, useState } from 'react';
import { taskService } from '@/services/task';
import { PenjagaTaskItem } from '@/types';
import KelolaTugasPage from '@/components/task/KelolaTugasPage';

export default function TugasPage() {
  const [tasks, setTasks] = useState<PenjagaTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskService.getTasks();
      setTasks(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (task: PenjagaTaskItem) => {
    try {
      // Clean task id if empty string
      const payload: Partial<PenjagaTaskItem> = {
        ...task,
        id: task.id || undefined,
      };
      await taskService.saveTask(payload);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan tugas. Silakan coba lagi.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus tugas. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="panel" style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [ MEMUAT DATA TUGAS MASTER... ]
      </div>
    );
  }

  return (
    <KelolaTugasPage
      tasksList={tasks}
      onSaveTask={handleSaveTask}
      onDeleteTask={handleDeleteTask}
    />
  );
}

