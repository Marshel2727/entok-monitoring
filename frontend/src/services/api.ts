export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = (() => {
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return '';
  }
})();

export function resolveAssetUrl(src?: string, fallback = '') {
  if (!src) return fallback;
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  if (src.startsWith('/static/')) {
    return `${API_ORIGIN}${src}`;
  }
  return src;
}

interface RequestOptions extends RequestInit {
  body?: any;
}

type CacheEntry<T> = {
  expiresAt: number;
  promise?: Promise<T>;
  value?: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('entok_jwt_token');
}

function cacheKey(endpoint: string, token: string | null) {
  return `${BASE_URL}${endpoint}::${token || 'public'}`;
}

export function clearApiCache() {
  responseCache.clear();
}

export async function cachedApiCall<T>(
  endpoint: string,
  ttlMs = 30000,
  options: RequestOptions = {}
): Promise<T> {
  if (ttlMs <= 0) {
    return apiCall<T>(endpoint, { ...options, method: 'GET' });
  }

  const token = getAuthToken();
  const key = cacheKey(endpoint, token);
  const now = Date.now();
  const cached = responseCache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    if (cached.value !== undefined) return cached.value;
    if (cached.promise) return cached.promise;
  }

  const promise = apiCall<T>(endpoint, { ...options, method: 'GET' })
    .then((data) => {
      responseCache.set(key, {
        expiresAt: Date.now() + ttlMs,
        value: data,
      });
      return data;
    })
    .catch((error) => {
      responseCache.delete(key);
      throw error;
    });

  responseCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

export async function apiCall<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const method = (config.method || 'GET').toUpperCase();
    
    if (response.status === 401) {
      // Clear token and redirect if unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('entok_jwt_token');
        localStorage.removeItem('entok_is_logged_in');
        localStorage.removeItem('entok_user_role');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    if (method !== 'GET') {
      clearApiCache();
    }

    return data as T;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  getCached: <T>(endpoint: string, ttlMs?: number, options?: RequestInit) =>
    cachedApiCall<T>(endpoint, ttlMs, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body: any, options?: RequestInit) => 
    apiCall<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T>(endpoint: string, body: any, options?: RequestInit) => 
    apiCall<T>(endpoint, { ...options, method: 'PUT', body }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};
