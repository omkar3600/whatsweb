"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers";
import { Suspense } from "react";

function BlockedContent() {
    const searchParams = useSearchParams();
    const reason = searchParams.get("reason");
    const { logout, user } = useAuth();
    const router = useRouter();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // If they somehow land here without being logged in, send them away
        if (!localStorage.getItem('access_token')) {
            router.push('/login');
        }
    }, [router]);

    if (!mounted) return null;

    const isSuspended = reason === 'suspended' || reason === 'suspended_frontend' || reason === 'suspended_backend';
    
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-background p-10 text-center font-sans relative overflow-hidden">
            {/* Top red warning bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-destructive" />
            
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive border-4 border-destructive/20 shadow-lg shadow-destructive/10">
                <ShieldAlert className="h-10 w-10" />
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-foreground">
                {isSuspended ? 'Account Suspended' : 'Subscription Expired'}
            </h2>
            
            <p className="max-w-md text-muted-foreground text-lg mb-8 leading-relaxed">
                {isSuspended 
                    ? 'Your account has been temporarily seized. Contact administrator for more information.'
                    : 'Your subscription date is over. Please contact the administrator to renew your access.'}
            </p>
            
            <div className="flex gap-4">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    Check Status Again
                </button>
                <button 
                    onClick={logout} 
                    className="flex items-center gap-2 rounded-xl bg-muted px-8 py-3 text-sm font-bold text-foreground hover:bg-muted/80 transition-colors shadow-sm"
                >
                    <LogOut className="h-4 w-4" />
                    Log Out
                </button>
            </div>
        </div>
    );
}

export default function BlockedPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        }>
            <BlockedContent />
        </Suspense>
    );
}
