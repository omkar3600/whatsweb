"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, LayoutDashboard, MessageSquare, Megaphone,
    Users, Zap, Check, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans antialiased">
            {/* Minimal Header */}
            <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                        W
                    </div>
                    <span className="font-bold text-base tracking-tight text-slate-900">
                        WhatsHub
                    </span>
                </Link>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium gap-1.5 shadow-2xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Go Back</span>
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-lg mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
                {/* Status Code */}
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-4">
                    404 • Page Not Found
                </span>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                    Left on single grey tick 🩶
                </h1>

                <p className="text-sm text-slate-600 leading-relaxed mb-8 max-w-md">
                    This message was deleted, moved, or never dispatched. Don&apos;t worry, your WhatsApp campaigns and inbox are right where you left them.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs mb-10">
                    <Link
                        href="/dashboard"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-4 transition-colors shadow-xs"
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Go to Dashboard</span>
                    </Link>

                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="w-full border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs h-10 shadow-2xs"
                    >
                        Previous Page
                    </Button>
                </div>

                {/* Helpful Quick Links */}
                <div className="w-full border-t border-slate-200 pt-6 text-left">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3 text-center sm:text-left">
                        Jump to section
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                        <Link
                            href="/inbox"
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/30 transition-all text-xs font-medium text-slate-700 hover:text-emerald-700 group shadow-2xs"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                            <span className="truncate">Live Inbox</span>
                        </Link>

                        <Link
                            href="/campaigns"
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/30 transition-all text-xs font-medium text-slate-700 hover:text-emerald-700 group shadow-2xs"
                        >
                            <Megaphone className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                            <span className="truncate">Campaigns</span>
                        </Link>

                        <Link
                            href="/contacts"
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/30 transition-all text-xs font-medium text-slate-700 hover:text-emerald-700 group shadow-2xs"
                        >
                            <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                            <span className="truncate">Contacts</span>
                        </Link>

                        <Link
                            href="/automations"
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500/40 hover:bg-emerald-50/30 transition-all text-xs font-medium text-slate-700 hover:text-emerald-700 group shadow-2xs"
                        >
                            <Zap className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                            <span className="truncate">Automations</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Simple Footer */}
            <footer className="w-full max-w-5xl mx-auto px-6 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>WhatsHub WhatsApp Business Platform</span>
                <div className="flex items-center gap-4 text-xs">
                    <Link href="/privacy-policy" className="hover:text-slate-700">Privacy</Link>
                    <span>•</span>
                    <Link href="/terms-of-service" className="hover:text-slate-700">Terms</Link>
                    <span>•</span>
                    <Link href="/dashboard" className="text-emerald-600 hover:underline">Dashboard</Link>
                </div>
            </footer>
        </div>
    );
}
