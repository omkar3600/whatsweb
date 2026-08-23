import axios from 'axios';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    withCredentials: true,
});

export const fetcher = (url: string) => api.get(url).then(res => res.data);

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
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

