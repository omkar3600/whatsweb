"use client";

import { useState, useEffect } from 'react';
import { WifiOff, X, RefreshCw } from 'lucide-react';

export function OfflineDetector() {
    const [isOffline, setIsOffline] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Register Service Worker for offline PWA fallback
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.error('[SW] Registration failed:', err);
                });
            });
        }

        const handleOffline = () => {
            setIsOffline(true);
            setDismissed(false);
        };

        const handleOnline = () => {
            setIsOffline(false);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline || dismissed) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 duration-200">
            <div className="bg-white border border-slate-200 text-slate-900 p-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-red-50 text-red-600 shrink-0">
                        <WifiOff className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-900">
                            You are currently offline
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Auto-sync will resume when reconnected
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                    >
                        Retry
                    </button>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
