'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import {
  Plus, Workflow, Edit2, Copy, Trash, Sparkles, Search, CheckCircle2,
  Zap, Play, Activity, Clock, ShieldCheck, Flame, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { data: shopData } = useSWR<any>('/shops/me');
  const shopId = shopData?.shop?.id;

  const fetchWorkflows = async () => {
    if (!shopId) return;
    try {
      const res = await fetch(`${API_BASE}/workflows?shopId=${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (e) {
      console.error('Failed to load workflows', e);
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      fetchWorkflows();
    }
  }, [shopId]);

  const createWorkflow = async () => {
    if (!shopId) return;
    try {
      const res = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, name: 'New Automation Workflow' })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Workflow created');
        window.location.href = `/workflows/${data.id}/builder`;
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create workflow');
    }
  };

  const filteredWorkflows = workflows.filter((wf) => {
    if (statusFilter !== 'All' && wf.status !== statusFilter.toLowerCase()) return false;
    if (search) {
      return wf.name?.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const activeCount = workflows.filter((w) => w.status === 'published' || w.status === 'active').length;
  const draftCount = workflows.filter((w) => w.status === 'draft').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Workflows & Automation Engine</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              VISUAL ENGINE 2.0
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Build, simulate, and deploy multi-step visual WhatsApp automations, AI intent routers, and CRM workflows.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <button
            onClick={createWorkflow}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* ── Executive Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Active Workflows</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{draftCount} drafts in progress</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Executions Today</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">1,284</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">+18% vs yesterday</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Success Rate</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">98.4%</p>
            <p className="text-[10px] text-muted-foreground font-medium">Auto-retry active</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Leads Processed</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">450</p>
            <p className="text-[10px] text-muted-foreground font-medium">Intent routed</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name..."
            className="w-full rounded-lg border border-border bg-card py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['All', 'Published', 'Draft', 'Paused'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Workflow Card Grid ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-card animate-pulse p-4 space-y-3" />
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Workflow className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Workflows Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create your first visual workflow automation to start processing customer journeys.
          </p>
          <button
            onClick={createWorkflow}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" /> Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((wf) => {
            const isPublished = wf.status === 'published' || wf.status === 'active';
            const isPaused = wf.status === 'paused';

            return (
              <div
                key={wf.id}
                className="group p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Workflow className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">{wf.name}</h3>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {wf._count?.instances || 0} active instances
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPublished
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : isPaused
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {wf.status || 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <Link
                    href={`/workflows/${wf.id}/builder`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Builder <ArrowRight className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
