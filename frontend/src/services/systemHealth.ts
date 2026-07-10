import { api } from './api';

export interface DeviceHealth {
  id: number;
  nama: string;
  tipe: 'DEDICATED' | 'MULTI';
  status: 'ONLINE' | 'OFFLINE';
  last_seen_at: string | null;
  firmware_version: string | null;
  last_ip: string | null;
  credential_configured: boolean;
  device_key_prefix: string | null;
  device_key_revoked: boolean;
}

export interface SystemHealth {
  overall_status: 'UP' | 'DEGRADED';
  database: { status: 'UP' | 'DOWN'; latency_ms: number; error: string | null };
  realtime: { status: 'UP' | 'DOWN'; async_mode: string };
  devices: DeviceHealth[];
  devices_online: number;
  devices_total: number;
  server_time_utc: string;
  farm_time: string;
  farm_timezone: string;
}

export const systemHealthService = {
  getHealth: async () => {
    const response = await api.get<{ status: string; data: SystemHealth }>('/system/health');
    return response.data;
  },
};
