'use client';

import { useCallback, useEffect, useState } from 'react';
import { LuActivity, LuDatabase, LuRadio, LuRefreshCw, LuWifi, LuWifiOff } from 'react-icons/lu';

import { subscribeRealtime } from '@/services/realtime';
import { SystemHealth, systemHealthService } from '@/services/systemHealth';


function formatTime(value: string | null) {
  if (!value) return 'Belum pernah terhubung';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}


export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setHealth(await systemHealthService.getHealth());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca kesehatan sistem.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(true), 0);
    const timer = window.setInterval(() => void refresh(false), 10000);
    const unsubscribe = subscribeRealtime(['scale_status_updated'], () => void refresh(false));
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [refresh]);

  if (loading) {
    return <div className="panel" style={{ padding: 24 }}>Memeriksa kesehatan sistem...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="panel" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>STATUS KESELURUHAN</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <LuActivity size={22} color={health?.overall_status === 'UP' ? '#15D36B' : '#f59e0b'} />
            <strong style={{ fontSize: 20 }}>{health?.overall_status === 'UP' ? 'NORMAL' : 'PERLU DIPERIKSA'}</strong>
          </div>
        </div>
        <button className="icon-button" onClick={() => void refresh(true)} title="Perbarui status" aria-label="Perbarui status">
          <LuRefreshCw size={18} />
        </button>
      </section>

      {error && <div className="panel" style={{ padding: 16, borderColor: 'var(--danger)', color: 'var(--danger)' }}>{error}</div>}

      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <div>
            <LuDatabase size={18} color={health?.database.status === 'UP' ? '#15D36B' : '#ef4444'} />
            <div style={{ marginTop: 8, fontWeight: 800 }}>DATABASE {health?.database.status}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{health?.database.latency_ms} ms</div>
          </div>
          <div>
            <LuRadio size={18} color="#15D36B" />
            <div style={{ marginTop: 8, fontWeight: 800 }}>REALTIME {health?.realtime.status}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{health?.realtime.async_mode}</div>
          </div>
          <div>
            <LuWifi size={18} color="#15D36B" />
            <div style={{ marginTop: 8, fontWeight: 800 }}>PERANGKAT {health?.devices_online}/{health?.devices_total}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>online saat ini</div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              {['Perangkat', 'Status', 'Terakhir Terhubung', 'Firmware', 'IP', 'Kredensial'].map((label) => (
                <th key={label} style={{ padding: '14px 16px', fontSize: 11, color: 'var(--text-secondary)' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(health?.devices || []).map((device) => (
              <tr key={device.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 800 }}>{device.nama}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: device.status === 'ONLINE' ? '#15D36B' : '#ef4444' }}>
                    {device.status === 'ONLINE' ? <LuWifi size={15} /> : <LuWifiOff size={15} />}
                    {device.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>{formatTime(device.last_seen_at)}</td>
                <td style={{ padding: '14px 16px' }}>{device.firmware_version || '-'}</td>
                <td style={{ padding: '14px 16px' }}>{device.last_ip || '-'}</td>
                <td style={{ padding: '14px 16px', color: device.device_key_revoked ? '#ef4444' : 'var(--text-primary)' }}>
                  {device.device_key_revoked ? 'DICABUT' : device.credential_configured ? `AKTIF (${device.device_key_prefix})` : 'LEGACY'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
        Zona kandang: {health?.farm_timezone} | Waktu server: {formatTime(health?.server_time_utc || null)}
      </div>
    </div>
  );
}
