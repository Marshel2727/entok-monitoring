import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './api';

export type RealtimeEventName =
  | 'scale_reading_created'
  | 'scale_status_updated'
  | 'scale_registry_updated'
  | 'feeding_batch_updated'
  | 'feed_inventory_updated'
  | 'feed_stock_updated';

export type RealtimePayload = Record<string, unknown>;

type RealtimeHandler = (eventName: RealtimeEventName, payload: RealtimePayload) => void;

let socket: Socket | null = null;
let socketOrigin = '';

function getRealtimeOrigin() {
  if (typeof window === 'undefined') return '';

  try {
    return new URL(BASE_URL, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('entok_jwt_token');
}

function getRealtimeSocket() {
  const origin = getRealtimeOrigin();
  if (!origin) return null;

  if (!socket || socketOrigin !== origin) {
    socket?.disconnect();
    socketOrigin = origin;
    socket = io(origin, {
      autoConnect: false,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        token: getAuthToken(),
      },
    });
  }

  socket.auth = { token: getAuthToken() };
  return socket;
}

export function subscribeRealtime(events: readonly RealtimeEventName[], handler: RealtimeHandler) {
  if (typeof window === 'undefined') return () => {};

  const realtimeSocket = getRealtimeSocket();
  if (!realtimeSocket) return () => {};

  const listeners = events.map((eventName) => {
    const listener = (payload: RealtimePayload = {}) => handler(eventName, payload);
    realtimeSocket.on(eventName, listener);
    return { eventName, listener };
  });

  if (!realtimeSocket.connected) {
    realtimeSocket.connect();
  }

  return () => {
    listeners.forEach(({ eventName, listener }) => {
      realtimeSocket.off(eventName, listener);
    });
  };
}
