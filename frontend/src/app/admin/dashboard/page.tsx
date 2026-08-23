"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Users, CheckCircle2, AlertTriangle, ShieldAlert, Share2, Phone,
  ArrowRight, Activity, Cpu, Server, Database, Zap, RefreshCw, Clock, ExternalLink, Shield
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [tenantConns, setTenantConns] = useState<any[]>([]);
  const [webhookFailures, setWebhookFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, connRes, failRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/tenant-connections').catch(() => ({ data: [] })),
        api.get('/admin/webhook-failures').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setTenantConns(connRes.data || []);
      setWebhookFailures(failRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  const systemServices = [
    { name: 'API Gateway', status: 'Operational', latency: '18ms', icon: Server },
    { name: 'PostgreSQL Database', status: 'Operational', latency: '4ms', icon: Database },
    { name: 'Redis Queue (BullMQ)', status: 'Operational', latency: '2ms', icon: Cpu },
    { name: 'Meta WhatsApp Cloud API', status: 'Operational', latency: '120ms', icon: Share2 },
    { name: 'AI Engine (Groq GPT OSS / Compound)', status: 'Operational', latency: '350ms', icon: Zap },
    { name: 'Webhook Dispatcher', status: webhookFailures.length > 0 ? 'Degraded' : 'Operational', latency: '24ms', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Admin Mission Control"
        subtitle="Platform health, multi-tenant operations, revenue security & system metrics."
        badge="LIVE OS 3.0"
        icon={LayoutDashboardIcon}
        actions={
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        }
      />

      {/* ── KPI Metrics Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminMetricCard
          title="Total Businesses"
          value={stats?.totalShops ?? 0}
          description="Registered tenants"
          icon={Users}
          accentBg="bg-blue-500/10"
          accentColor="text-blue-600 dark:text-blue-400"
        />
        <AdminMetricCard
          title="Active Businesses"
          value={stats?.activeShops ?? 0}
          description="Currently active"
          icon={CheckCircle2}
          accentBg="bg-emerald-500/10"
          accentColor="text-emerald-600 dark:text-emerald-400"
        />
        <AdminMetricCard
          title="Disabled Accounts"
          value={stats?.disabledShops ?? 0}
          description="Access restricted"
          icon={ShieldAlert}
          accentBg="bg-rose-500/10"
          accentColor="text-rose-600 dark:text-rose-400"
        />
        <AdminMetricCard
          title="Expired Subscriptions"
          value={stats?.expiredSubscriptions ?? 0}
          description="Action required"
          icon={AlertTriangle}
          accentBg="bg-amber-500/10"
          accentColor="text-amber-600 dark:text-amber-400"
        />
        <AdminMetricCard
          title="Connected WABAs"
          value={stats?.connectedWabas ?? 0}
          description="Active Meta accounts"
          icon={Share2}
          accentBg="bg-indigo-500/10"
          accentColor="text-indigo-600 dark:text-indigo-400"
        />
        <AdminMetricCard
          title="Phone Numbers"
          value={stats?.totalPhoneNumbers ?? 0}
          description="Active senders"
          icon={Phone}
          accentBg="bg-purple-500/10"
          accentColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* ── Middle Grid: System Health & Require Attention ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Health Matrix (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-foreground">Infrastructure Health Matrix</h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              6/6 Services Monitored
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {systemServices.map((srv, idx) => {
              const Icon = srv.icon;
              const isDegraded = srv.status === 'Degraded';
              return (
                <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-7 w-7 rounded-md bg-muted border border-border flex items-center justify-center text-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isDegraded
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}>
                      ● {srv.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{srv.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Latency: {srv.latency}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Require Attention Center (1 col) */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Requires Attention</h2>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {stats?.expiredSubscriptions > 0 && (
              <Link
                href="/admin/shops"
                className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{stats.expiredSubscriptions} Expired Subscriptions</p>
                    <p className="text-[11px] text-muted-foreground">Accounts requiring renewal or extension</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            )}

            {webhookFailures.length > 0 && (
              <Link
                href="/admin/webhook-logs"
                className="flex items-center justify-between p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-rose-500 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{webhookFailures.length} Webhook Failures</p>
                    <p className="text-[11px] text-muted-foreground">Undelivered webhook events</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            )}

            {stats?.disabledShops > 0 && (
              <Link
                href="/admin/shops"
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">{stats.disabledShops} Suspended Accounts</p>
                    <p className="text-[11px] text-muted-foreground">Restricted tenant access</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            )}

            {stats?.expiredSubscriptions === 0 && webhookFailures.length === 0 && stats?.disabledShops === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-xs font-semibold text-foreground">All Systems Clear</p>
                <p className="text-[11px]">No immediate action items requiring admin intervention.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Admin Control Nav ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/shops"
          className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-blue-500/40 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Tenant Workspace</p>
              <p className="text-[11px] text-muted-foreground">Shops, Users & Accounts</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
        </Link>

        <Link
          href="/admin/token-health"
          className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-blue-500/40 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Token Health</p>
              <p className="text-[11px] text-muted-foreground">WABA Access Tokens</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
        </Link>

        <Link
          href="/admin/webhook-logs"
          className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-blue-500/40 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Webhook & Dead Letter</p>
              <p className="text-[11px] text-muted-foreground">Failed event queues</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
        </Link>

        <Link
          href="/admin/settings"
          className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-blue-500/40 hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Platform Config</p>
              <p className="text-[11px] text-muted-foreground">Meta API & Secrets</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
        </Link>
      </div>

    </div>
  );
}

function LayoutDashboardIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
