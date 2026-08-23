"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { logout, user, loading } = useAuth();
    const router = useRouter();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    useEffect(() => {
        if (!loading && user && user.role?.toLowerCase() === 'user') {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loading />
            </div>
        );
    }

    const role = user?.role?.toLowerCase();
    if (!user || role !== 'admin') {
        if (role === 'user') {
            return (
                <div className="flex h-screen items-center justify-center bg-background">
                    <Loading />
                </div>
            );
        }
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-10 text-center font-sans animate-in fade-in duration-300">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 shadow-sm">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Unauthorized Access</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">
                    This section is restricted to system administrators only.
                </p>
                <button 
                    onClick={logout}
                    className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:scale-105 active:scale-95"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            {/* Admin Collapsible Sidebar */}
            <AdminSidebar />

            {/* Main Content Workspace */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Admin Topbar */}
                <AdminTopbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

                {/* Main Scrollable Canvas */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 no-scrollbar bg-muted/20">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Global Command Palette Modal (Ctrl + K) */}
            <AdminCommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
            />
        </div>
    );
}
