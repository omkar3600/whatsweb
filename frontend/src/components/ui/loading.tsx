"use client";

import { MessageSquare, Loader2 } from "lucide-react";

export function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 animate-in fade-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping duration-[2000ms]" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                    <MessageSquare className="h-8 w-8 text-white animate-pulse" />
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight">WhatsWeb</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <span>Securing workspace</span>
                    <div className="flex gap-1">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function FullPageLoading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xs">
            <Loading />
        </div>
    );
}

export function PageLoading({ label = "Loading workspace..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[55vh] gap-4 animate-in fade-in duration-300">
            <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <div className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                </div>
            </div>
        </div>
    );
}

export function ButtonLoader({ className = "h-4 w-4" }: { className?: string }) {
    return <Loader2 className={`${className} animate-spin shrink-0`} />;
}

// ─── Reusable Skeletons ───────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="w-full space-y-3 p-4 bg-card border border-border/80 rounded-xl shadow-xs">
            <div className="h-8 w-full bg-muted/40 rounded-lg animate-pulse mb-4" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2.5 px-3 border-b border-border/40 animate-pulse">
                    <div className="h-4 w-4 bg-muted/70 rounded shrink-0" />
                    <div className="h-8 w-8 bg-muted/80 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-32 bg-muted/80 rounded" />
                        <div className="h-3 w-24 bg-muted/50 rounded" />
                    </div>
                    <div className="h-3.5 w-28 bg-muted/60 rounded hidden sm:block" />
                    <div className="h-5 w-16 bg-muted/70 rounded-md hidden md:block" />
                    <div className="h-4 w-12 bg-muted/80 rounded shrink-0 ml-auto" />
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/80 bg-card p-5 space-y-3 animate-pulse">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1.5">
                            <div className="h-4 w-36 bg-muted/80 rounded" />
                            <div className="h-3 w-24 bg-muted/50 rounded" />
                        </div>
                        <div className="h-5 w-16 bg-muted/70 rounded-full" />
                    </div>
                    <div className="h-12 bg-muted/30 rounded-lg" />
                    <div className="flex justify-between items-center pt-2">
                        <div className="h-6 w-20 bg-muted/60 rounded-md" />
                        <div className="h-7 w-7 bg-muted/70 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ConversationSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2 p-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 animate-pulse">
                    <div className="h-10 w-10 bg-muted/80 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <div className="h-3.5 w-28 bg-muted/80 rounded" />
                            <div className="h-2.5 w-10 bg-muted/50 rounded" />
                        </div>
                        <div className="h-3 w-3/4 bg-muted/50 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
