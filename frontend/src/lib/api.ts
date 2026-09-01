import axios from 'axios';

export const getCleanUrl = (url?: string, fallback = 'http://localhost:3001'): string => {
    if (!url) return fallback;
    return url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
};

export const API_BASE_URL = getCleanUrl(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:3001');
export const SOCKET_BASE_URL = getCleanUrl(process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL, 'http://localhost:3001');

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export const fetcher = (url: string) => api.get(url).then(res => res.data);

// Lightweight in-memory traffic instrumentation for development & diagnostics
if (typeof window !== 'undefined') {
    (window as any).__WHATSWEB_TRAFFIC__ = (window as any).__WHATSWEB_TRAFFIC__ || {
        totalRequests: 0,
        totalBytes: 0,
        byFeature: {} as Record<string, { requests: number; bytes: number; maxBytes: number }>,
        recent: [] as Array<{ time: string; feature: string; url: string; bytes: number; durationMs: number }>,
    };
}

function classifyFrontendFeature(url: string = ''): string {
    const u = url.toLowerCase();
    if (u.includes('/conversations') || u.includes('/messages') || u.includes('/chat')) return 'inbox';
    if (u.includes('/contacts')) return 'contacts';
    if (u.includes('/campaigns')) return 'campaigns';
    if (u.includes('/shops/me') || u.includes('/shops/overview')) return 'dashboard';
    if (u.includes('/media')) return 'storage_media';
    if (u.includes('/whatsapp')) return 'whatsapp_api';
    if (u.includes('/ai') || u.includes('/chatbot')) return 'ai_agent';
    if (u.includes('/workflows')) return 'workflows';
    if (u.includes('/auth') || u.includes('/users/me')) return 'authentication';
    return 'other';
}

api.interceptors.request.use((config: any) => {
    config._startTime = Date.now();
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response: any) => {
        if (typeof window !== 'undefined' && response.config) {
            const durationMs = Date.now() - (response.config._startTime || Date.now());
            const url = response.config.url || '';
            const feature = classifyFrontendFeature(url);
            
            let bytes = 0;
            if (response.headers && response.headers['content-length']) {
                bytes = parseInt(response.headers['content-length'], 10) || 0;
            } else if (response.data) {
                try {
                    bytes = typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length;
                } catch {
                    bytes = 0;
                }
            }

            const store = (window as any).__WHATSWEB_TRAFFIC__;
            if (store) {
                store.totalRequests += 1;
                store.totalBytes += bytes;
                const featStats = store.byFeature[feature] || { requests: 0, bytes: 0, maxBytes: 0 };
                featStats.requests += 1;
                featStats.bytes += bytes;
                featStats.maxBytes = Math.max(featStats.maxBytes, bytes);
                store.byFeature[feature] = featStats;

                if (store.recent.length >= 200) store.recent.shift();
                store.recent.push({
                    time: new Date().toISOString(),
                    feature,
                    url: url.split('?')[0],
                    bytes,
                    durationMs,
                });
            }

            const isDebug = localStorage.getItem('TRAFFIC_DEBUG') === 'true' || process.env.NODE_ENV === 'development';
            if (isDebug && bytes > 500 * 1024) {
                console.warn(`[TRAFFIC_WARNING] Large response on ${url}: ${(bytes / 1024).toFixed(1)} KB in ${durationMs}ms`);
            }
        }
        return response;
    },
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
            window.dispatchEvent(new StorageEvent('storage', { key: 'access_token' }));
            if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
                import('sonner').then(({ toast }) => {
                    toast.error('Session expired. Please log in again.');
                });
                window.location.href = '/login';
            }
        } else if (typeof window !== 'undefined' && error.response?.status === 403) {
            const errorCode = error.response?.data?.code;
            if (errorCode === 'ACCOUNT_SUSPENDED') {
                window.location.href = '/blocked?reason=suspended_backend';
            } else if (errorCode === 'SUBSCRIPTION_EXPIRED') {
                window.location.href = '/blocked?reason=expired';
            }
        }
        return Promise.reject(error);
    }
);

