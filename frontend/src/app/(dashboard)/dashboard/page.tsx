"use client";
import { useMemo } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import Link from 'next/link';
import {
    MessageSquare, Users, Megaphone, Zap, Send, CheckCheck, Eye,
    AlertCircle, Activity, ArrowRight, RefreshCw, ArrowUpRight,
    MoveUpRight, Bot, GitFork, Inbox, BarChart3, Shield,
    CheckCircle2, XCircle, TrendingUp, Clock, Loader2,
    Image as ImageIcon, Settings, Key, BotMessageSquare, Share2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

// ─── Skeleton Components ────────────────────────────────────────────────────────
function SkeletonPulse({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-muted rounded-lg ${className || ''}`} />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="flex items-center justify-between gap-4 pb-2">
                <div className="space-y-2">
                    <SkeletonPulse className="h-6 w-48" />
                    <SkeletonPulse className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                    <SkeletonPulse className="h-9 w-9 rounded-lg" />
                    <SkeletonPulse className="h-9 w-32 rounded-lg" />
                </div>
            </div>

            {/* Quick Actions skeleton */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <SkeletonPulse key={i} className="h-10 rounded-lg" />
                ))}
            </div>

            {/* KPI skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <SkeletonPulse className="h-3 w-24" />
                        <SkeletonPulse className="h-7 w-16" />
                        <SkeletonPulse className="h-3 w-28" />
                    </div>
                ))}
            </div>

            {/* Chart + Delivery skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 rounded-xl border border-border bg-card p-5">
                    <SkeletonPulse className="h-4 w-36 mb-1" />
                    <SkeletonPulse className="h-3 w-56 mb-6" />
                    <SkeletonPulse className="h-[240px] w-full rounded-lg" />
                </div>
                <div className="lg:col-span-4 rounded-xl border border-border bg-card p-5 space-y-4">
                    <SkeletonPulse className="h-4 w-28" />
                    <SkeletonPulse className="h-20 w-20 rounded-full mx-auto" />
                    <SkeletonPulse className="h-3 w-full" />
                    <SkeletonPulse className="h-3 w-full" />
                    <SkeletonPulse className="h-3 w-full" />
                </div>
            </div>

            {/* Campaigns skeleton */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <SkeletonPulse className="h-4 w-36" />
                {[1,2,3].map(i => <SkeletonPulse key={i} className="h-14 rounded-lg" />)}
            </div>
        </div>
    );
}

// ─── Custom Chart Tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[150px]">
                <p className="font-semibold text-foreground border-b border-border pb-1.5">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground capitalize">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-foreground tabular-nums">{entry.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

// ─── Campaign Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; dot: string }> = {
        completed:  { label: 'Completed',  cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
        processing: { label: 'Processing', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse' },
        scheduled:  { label: 'Scheduled',  cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
        aborted:    { label: 'Aborted',    cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
        failed:     { label: 'Failed',     cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
    };
    const item = map[status] || map.scheduled;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${item.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
            {item.label}
        </span>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function ShopDashboard() {
    const { data, mutate, isValidating } = useSWR<any>('/shops/me');

    // Traffic insight from real data — hook must be before any early return
    const messageVolume = data?.messageVolume || [];
    const trafficInsight = useMemo(() => {
        if (!messageVolume || messageVolume.length === 0) return null;
        const maxDay = messageVolume.reduce((max: any, d: any) => (d.outbound > (max?.outbound || 0) ? d : max), messageVolume[0]);
        const totalOutThisWeek = messageVolume.reduce((sum: number, d: any) => sum + (d.outbound || 0), 0);
        const totalInThisWeek = messageVolume.reduce((sum: number, d: any) => sum + (d.inbound || 0), 0);
        if (totalOutThisWeek === 0) return null;
        return {
            peakDay: maxDay?.date || 'N/A',
            peakValue: maxDay?.outbound || 0,
            totalOut: totalOutThisWeek,
            totalIn: totalInThisWeek,
        };
    }, [messageVolume]);

    if (!data) return <DashboardSkeleton />;

    const { stats = {}, campaignFunnel = {}, recentCampaigns = [] } = data;

    // Derived metrics
    const totalSent = campaignFunnel?.sent || 0;
    const totalDelivered = campaignFunnel?.delivered || 0;
    const totalRead = campaignFunnel?.read || 0;
    const totalFailed = campaignFunnel?.failed || 0;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    // Time-based greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const userName = data.shop?.shopName || 'WhatsHub';

    // System status from WhatsApp accounts
    const whatsappAccounts = data.shop?.whatsappAccounts || [];
    const hasConnectedAccount = whatsappAccounts.length > 0;
    const systemStatus = hasConnectedAccount
        ? { label: 'All systems operational', color: 'emerald', ok: true }
        : { label: 'WhatsApp not connected', color: 'amber', ok: false };

    // Today's outbound from messageVolume
    const todayOutbound = messageVolume?.length > 0 ? messageVolume[messageVolume.length - 1]?.outbound || 0 : 0;



    // Attention items
    const attentionItems: { icon: any; label: string; severity: 'warning' | 'danger'; href?: string }[] = [];
    if (!hasConnectedAccount) {
        attentionItems.push({ icon: AlertCircle, label: 'WhatsApp account not connected', severity: 'danger', href: '/connect-whatsapp' });
    }
    if (deliveryRate > 0 && deliveryRate < 90) {
        attentionItems.push({ icon: AlertCircle, label: `Delivery rate is ${deliveryRate}% — below healthy threshold`, severity: 'warning', href: '/campaigns' });
    }
    const failedCampaigns = recentCampaigns.filter((c: any) => c.status === 'aborted' || c.status === 'failed');
    if (failedCampaigns.length > 0) {
        attentionItems.push({ icon: XCircle, label: `${failedCampaigns.length} campaign${failedCampaigns.length > 1 ? 's' : ''} failed or aborted`, severity: 'danger', href: '/campaigns' });
    }
    if (totalFailed > 0 && totalSent > 0 && (totalFailed / totalSent) > 0.05) {
        attentionItems.push({ icon: AlertCircle, label: `${totalFailed.toLocaleString()} messages failed across campaigns`, severity: 'warning', href: '/campaigns' });
    }

    // KPI data
    const kpis = [
        {
            name: 'Total Outbound',
            value: (stats.totalMessages || 0).toLocaleString(),
            subtext: todayOutbound > 0 ? `+${todayOutbound.toLocaleString()} sent today` : 'No outbound today',
            icon: Send,
            trend: todayOutbound > 0 ? 'up' : 'neutral',
        },
        {
            name: 'Total Audience',
            value: (stats.totalContacts || 0).toLocaleString(),
            subtext: `${(stats.contactGrowth || 0) > 0 ? '+' : ''}${stats.contactGrowth || 0}% this month`,
            icon: Users,
            trend: (stats.contactGrowth || 0) > 0 ? 'up' : 'neutral',
        },
        {
            name: 'Active Templates',
            value: (stats.totalTemplates || 0).toLocaleString(),
            subtext: 'Approved & ready',
            icon: Zap,
            trend: 'neutral',
        },
        {
            name: 'Delivery Rate',
            value: `${deliveryRate}%`,
            subtext: 'Across all broadcasts',
            icon: Activity,
            trend: deliveryRate > 90 ? 'up' : deliveryRate > 70 ? 'neutral' : 'down',
            valueColor: deliveryRate > 90 ? 'text-emerald-600 dark:text-emerald-400' : deliveryRate > 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400',
        },
    ];

    // Quick actions
    const quickActions = [
        { name: 'Inbox', href: '/inbox', icon: MessageSquare, desc: 'Live conversations' },
        { name: 'Contacts', href: '/contacts', icon: Users, desc: 'Manage audience' },
        { name: 'Campaigns', href: '/campaigns', icon: Megaphone, desc: 'Broadcast messages' },
        { name: 'Templates', href: '/templates', icon: Zap, desc: 'Message templates' },
        { name: 'Workflows', href: '/workflows', icon: GitFork, desc: 'Automation flows' },
        { name: 'AI Agent & Config', href: '/ai-agent/config', icon: BotMessageSquare, desc: 'Business profile & rules' },
        { name: 'Follow-up Engine', href: '/ai-agent/follow-ups', icon: Clock, desc: 'Re-engagement rules' },
        { name: 'Media', href: '/media', icon: ImageIcon, desc: 'Media assets' },
        { name: 'Auto-Replies', href: '/automations', icon: Bot, desc: 'Auto-responders' },
        { name: 'API Keys', href: '/api-keys', icon: Key, desc: 'API credentials' },
        { name: 'WhatsApp', href: '/connect-whatsapp', icon: Share2, desc: 'Connection setup' },
        { name: 'Settings', href: '/settings', icon: Settings, desc: 'Workspace config' },
    ];

    // Delivery funnel circumference for ring
    const ringRadius = 36;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (deliveryRate / 100) * ringCircumference;

    return (
        <div className="space-y-5 pb-12 animate-in fade-in duration-300 max-w-7xl mx-auto px-1">

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 1 — WORKSPACE HEADER
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                        {greeting}, <span className="text-primary">{userName}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Your WhatsApp performance at a glance</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* System Status */}
                    <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                        systemStatus.ok
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${systemStatus.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {systemStatus.label}
                    </span>

                    <button
                        onClick={() => mutate()}
                        disabled={isValidating}
                        className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        title="Refresh metrics"
                    >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    </button>

                    <Link
                        href="/campaigns"
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                    >
                        <Megaphone className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New Campaign</span>
                        <span className="sm:hidden">Campaign</span>
                    </Link>
                </div>
            </div>

            {/* Mobile system status */}
            <div className="sm:hidden -mt-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                    systemStatus.ok
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${systemStatus.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {systemStatus.label}
                </span>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 2 — QUICK ACTIONS
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link
                            key={action.name}
                            href={action.href}
                            className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted hover:border-primary/30 transition-all shadow-2xs"
                        >
                            <div className="p-1.5 rounded-md bg-muted/50 text-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="block text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">{action.name}</span>
                                <span className="hidden sm:block text-[9px] text-muted-foreground truncate">{action.desc}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 3 — EXECUTIVE KPI STRIP
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={i}
                            className="bg-card border border-border rounded-xl p-4 shadow-2xs hover:border-primary/30 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.name}</span>
                                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors">
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <span className={`text-2xl font-bold tracking-tight ${(kpi as any).valueColor || 'text-foreground'}`}>
                                    {kpi.value}
                                </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                {kpi.trend === 'up' && <MoveUpRight className="h-3 w-3 text-emerald-500 shrink-0" />}
                                {kpi.trend === 'down' && <TrendingUp className="h-3 w-3 text-rose-500 shrink-0 rotate-180" />}
                                <span className="truncate">{kpi.subtext}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 3 — MESSAGE TRAFFIC + DELIVERY HEALTH
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Traffic Chart (8 cols) */}
                <div className="lg:col-span-8 bg-card border border-border rounded-xl p-5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Message Traffic</h2>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Outbound & inbound activity over the last 7 days</p>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-muted-foreground">Outbound</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                                <span className="text-muted-foreground">Inbound</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[240px] w-full">
                        {typeof window !== 'undefined' ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={messageVolume || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#71717a" stopOpacity={0.12}/>
                                            <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                                    <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground text-[10px]" tickLine={false} axisLine={false} dy={8} />
                                    <YAxis stroke="currentColor" className="text-muted-foreground text-[10px]" tickLine={false} axisLine={false} />
                                    <RechartsTooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="outbound" name="Outbound" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradOut)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#10b981', fill: 'var(--color-card, #fff)' }} />
                                    <Area type="monotone" dataKey="inbound" name="Inbound" stroke="#71717a" strokeWidth={1.5} fillOpacity={1} fill="url(#gradIn)" dot={false} activeDot={{ r: 3, strokeWidth: 2, stroke: '#71717a', fill: 'var(--color-card, #fff)' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading chart...
                            </div>
                        )}
                    </div>

                    {/* Traffic Insight */}
                    {trafficInsight && trafficInsight.totalOut > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                                Outbound peaked on <span className="font-medium text-foreground">{trafficInsight.peakDay}</span> with{' '}
                                <span className="font-medium text-foreground">{trafficInsight.peakValue.toLocaleString()}</span> messages
                                {trafficInsight.totalIn > 0 && <> · <span className="font-medium text-foreground">{trafficInsight.totalIn.toLocaleString()}</span> inbound this week</>}
                            </span>
                        </div>
                    )}
                </div>

                {/* Delivery Health (4 cols) */}
                <div className="lg:col-span-4 bg-card border border-border rounded-xl p-5 shadow-2xs flex flex-col">
                    <h2 className="text-sm font-semibold text-foreground">Delivery Health</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">Lifetime message funnel</p>

                    {/* Ring indicator */}
                    <div className="flex items-center justify-center my-2">
                        <div className="relative">
                            <svg width="96" height="96" viewBox="0 0 96 96">
                                <circle cx="48" cy="48" r={ringRadius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="6" />
                                <circle
                                    cx="48" cy="48" r={ringRadius}
                                    fill="none"
                                    stroke={deliveryRate > 90 ? '#10b981' : deliveryRate > 70 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={ringCircumference}
                                    strokeDashoffset={ringOffset}
                                    transform="rotate(-90 48 48)"
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-xl font-bold ${deliveryRate > 90 ? 'text-emerald-600 dark:text-emerald-400' : deliveryRate > 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {deliveryRate}%
                                </span>
                                <span className="text-[9px] text-muted-foreground font-medium">DELIVERY</span>
                            </div>
                        </div>
                    </div>

                    {/* Funnel bars */}
                    <div className="space-y-3 mt-auto">
                        <div>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                                <div className="flex items-center gap-1.5">
                                    <Send className="h-3 w-3 text-primary" />
                                    <span className="font-medium text-foreground">Sent</span>
                                </div>
                                <span className="font-bold text-foreground tabular-nums">{totalSent.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                                <div className="flex items-center gap-1.5">
                                    <CheckCheck className="h-3 w-3 text-emerald-500" />
                                    <span className="font-medium text-foreground">Delivered</span>
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">{deliveryRate}%</span>
                                </div>
                                <span className="font-bold text-foreground tabular-nums">{totalDelivered.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${deliveryRate}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                                <div className="flex items-center gap-1.5">
                                    <Eye className="h-3 w-3 text-blue-500" />
                                    <span className="font-medium text-foreground">Read</span>
                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 rounded">{readRate}%</span>
                                </div>
                                <span className="font-bold text-foreground tabular-nums">{totalRead.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${readRate}%` }} />
                            </div>
                        </div>

                        {totalFailed > 0 && (
                            <div className="pt-2 border-t border-border/50">
                                <div className="flex justify-between items-center text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <XCircle className="h-3 w-3 text-rose-500" />
                                        <span className="font-medium text-rose-600 dark:text-rose-400">Failed</span>
                                    </div>
                                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{totalFailed.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 5 — RECENT CAMPAIGNS
            ═══════════════════════════════════════════════════════════════════ */}
                <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Recent Campaigns</h2>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Latest broadcast activity</p>
                        </div>
                        <Link href="/campaigns" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {recentCampaigns && recentCampaigns.length > 0 ? (
                            <div className="divide-y divide-border/60">
                                {recentCampaigns.map((camp: any) => {
                                    const cStats = camp.stats || {};
                                    const cSent = cStats.sent || 0;
                                    const cDel = cStats.delivered || 0;
                                    const cRate = cSent > 0 ? Math.round((cDel / cSent) * 100) : 0;

                                    let dateStr = '';
                                    try {
                                        let raw = camp.createdAt;
                                        if (typeof raw === 'string' && !raw.includes('T')) raw = raw.replace(' ', 'T');
                                        const d = new Date(raw);
                                        dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    } catch { }

                                    return (
                                        <Link
                                            key={camp.id}
                                            href={`/campaigns/${camp.id}`}
                                            className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                        {camp.name}
                                                    </span>
                                                    <StatusBadge status={camp.status} />
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    {dateStr && <span>{dateStr}</span>}
                                                    {cSent > 0 && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{cSent.toLocaleString()} sent</span>
                                                            <span>·</span>
                                                            <span>{cDel.toLocaleString()} delivered</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {cSent > 0 && (
                                                    <span className={`text-xs font-bold tabular-nums ${cRate > 90 ? 'text-emerald-600 dark:text-emerald-400' : cRate > 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {cRate}%
                                                    </span>
                                                )}
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Megaphone className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No campaigns yet</p>
                                <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">Launch your first WhatsApp campaign to start broadcasting messages.</p>
                                <Link href="/campaigns" className="mt-3 text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm">
                                    Create Campaign
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 5 — ATTENTION CENTER
            ═══════════════════════════════════════════════════════════════════ */}
            {attentionItems.length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5 shadow-2xs">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
                    </div>
                    <div className="space-y-2">
                        {attentionItems.map((item, i) => {
                            const Icon = item.icon;
                            const cls = `flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                item.severity === 'danger'
                                    ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10'
                                    : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                            }`;
                            const content = (
                                <>
                                    <Icon className={`h-3.5 w-3.5 shrink-0 ${item.severity === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
                                    <span className="text-xs text-foreground flex-1">{item.label}</span>
                                    {item.href && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                                </>
                            );
                            return item.href ? (
                                <Link key={i} href={item.href} className={cls}>{content}</Link>
                            ) : (
                                <div key={i} className={cls}>{content}</div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">Everything looks good — no issues detected.</span>
                </div>
            )}
        </div>
    );
}
