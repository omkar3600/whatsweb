"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, fetcher } from '@/lib/api';
import { SWRConfig } from 'swr';

// ─── Auth Context ────────────────────────────────────────────────────────────

interface AuthContextType {
    user: any;
    loading: boolean;
    login: (user: any, access_token?: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ─── Theme Context ───────────────────────────────────────────────────────────

interface ThemeContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Read saved preference or system preference
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = saved || (systemDark ? 'dark' : 'light');
        setTheme(resolved);
        document.documentElement.classList.toggle('dark', resolved === 'dark');
    }, []);

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─── Auth Provider ───────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Initial auth state load from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');
        const publicPaths = ['/login', '/demo', '/', '/privacy-policy', '/terms-of-service'];
        
        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                const role = parsedUser.role?.toLowerCase() || 'user';
                const normalizedUser = { ...parsedUser, role };
                setUser(normalizedUser);
                if (pathname === '/login' || pathname === '/') {
                    const target = role === 'admin' ? '/admin/shops' : '/dashboard';
                    router.replace(target);
                }
            } catch (e) {
                localStorage.removeItem('user');
                localStorage.removeItem('access_token');
                setUser(null);
                if (!publicPaths.includes(pathname)) {
                    router.push('/login');
                }
            }
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
            setUser(null);
            if (!publicPaths.includes(pathname)) {
                router.push('/login');
            }
        }
        setLoading(false);
    }, []);

    // Redirect authenticated user if navigating to /login or /
    useEffect(() => {
        if (!loading && user) {
            const token = localStorage.getItem('access_token');
            if (token && (pathname === '/login' || pathname === '/')) {
                const role = user.role?.toLowerCase() || 'user';
                const target = role === 'admin' ? '/admin/shops' : '/dashboard';
                router.replace(target);
            }
        }
    }, [pathname, user, loading]);

    // Cross-tab authentication synchronization via storage event listener
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'user' || e.key === 'access_token' || e.key === null) {
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('access_token');
                const publicPaths = ['/login', '/demo', '/', '/privacy-policy', '/terms-of-service'];
                if (storedUser && token) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        const role = parsedUser.role?.toLowerCase() || 'user';
                        const normalizedUser = { ...parsedUser, role };
                        setUser(normalizedUser);
                        if (pathname === '/login' || pathname === '/') {
                            const target = role === 'admin' ? '/admin/shops' : '/dashboard';
                            router.replace(target);
                        }
                    } catch (e) {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                    if (!publicPaths.includes(pathname)) {
                        router.push('/login');
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [pathname]);

    // Session validation without breaking user object reference equality on every click
    useEffect(() => {
        const publicPaths = ['/login', '/demo', '/', '/privacy-policy', '/terms-of-service'];
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');
        if (!storedUser || !token || publicPaths.includes(pathname)) return;

        try {
            const parsedUser = JSON.parse(storedUser);
            const role = parsedUser.role?.toLowerCase() || 'user';
            if (role === 'admin') return;

            api.get('/users/me').then(res => {
                const shop = res.data?.shop;
                if (shop) {
                    if (shop.status !== 'active') {
                        if (!pathname.startsWith('/blocked')) window.location.href = '/blocked?reason=suspended_frontend';
                    } else if (shop.subscription?.expiryDate && new Date(shop.subscription.expiryDate) < new Date()) {
                        if (!pathname.startsWith('/blocked')) window.location.href = '/blocked?reason=expired';
                    } else if (pathname.startsWith('/blocked')) {
                        window.location.href = '/dashboard';
                    }

                    // Preserve exact object reference if shop properties have not changed
                    setUser((prev: any) => {
                        if (!prev) return { ...parsedUser, role, shop };
                        if (JSON.stringify(prev.shop) !== JSON.stringify(shop)) {
                            const fresh = { ...prev, role, shop };
                            localStorage.setItem('user', JSON.stringify(fresh));
                            return fresh;
                        }
                        return prev;
                    });
                }
            }).catch(() => {});
        } catch (e) {}
    }, [pathname]);

    const login = (user: any, access_token?: string) => {
        const role = user?.role?.toLowerCase() || 'user';
        const normalizedUser = { ...user, role };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        if (access_token) {
            localStorage.setItem('access_token', access_token);
        }
        setUser(normalizedUser);
        if (role === 'admin') router.push('/admin/shops');
        else router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        window.dispatchEvent(new StorageEvent('storage', { key: 'access_token' }));
        setUser(null);
        // Add an API call to logout if backend supports cookie clearing, or just redirect
        api.post('/auth/logout').catch(() => {});
        router.push('/login');
    };

    return (
        <SWRConfig value={{ fetcher, revalidateOnFocus: false, dedupingInterval: 30000 }}>
            <ThemeProvider>
                <AuthContext.Provider value={{ user, loading, login, logout }}>
                    {children}
                </AuthContext.Provider>
            </ThemeProvider>
        </SWRConfig>
    );
};

export const useAuth = () => useContext(AuthContext);
