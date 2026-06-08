'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilPage() {
  const { user } = useAuth();
  
  return (
    <div className="panel" style={{ maxWidth: '600px' }}>
      <div className="panel-header">
        <div className="panel-title">👤 PENGATURAN PROFIL PENGAWAS</div>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Nama Pengawas</label>
          <input type="text" className="form-input" defaultValue={user?.nama || ''} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input type="text" className="form-input" defaultValue={user?.username || ''} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Otoritas Peran</label>
          <input type="text" className="form-input" defaultValue={user?.role || ''} disabled />
        </div>
      </div>
    </div>
  );
}
