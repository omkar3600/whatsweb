"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, RotateCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
    useEffect(() => {
        const handleOnline = () => {
            window.location.href = '/dashboard';
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between p-6 font-sans antialiased">
            {/* Header */}
            <header className="w-full max-w-xl mx-auto flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    W
                </div>
                <span className="font-bold text-sm tracking-tight text-slate-900">
                    WhatsHub
                </span>
            </header>

            {/* Main */}
            <main className="max-w-sm w-full mx-auto text-center py-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-5">
                    <WifiOff className="w-5 h-5" />
                </div>

                <h1 className="text-xl font-bold text-slate-900 mb-2">
                    You&apos;re offline
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Please check your internet connection. We&apos;ll automatically reconnect when you&apos;re back online.
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 shadow-2xs"
                    >
                        <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                        <span>Try again</span>
                    </Button>

                    <Link
                        href="/dashboard"
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs h-9 transition-colors shadow-2xs"
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Go to Dashboard</span>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="text-center text-xs text-slate-400">
                WhatsHub
            </footer>
        </div>
    );
}
