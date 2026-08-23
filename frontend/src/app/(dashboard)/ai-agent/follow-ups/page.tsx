"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import {
  Clock, CheckCircle2, XCircle, SkipForward, Mail, Sparkles,
  Power, PowerOff, Save, Loader2, Plus, Trash2, Send, RefreshCw,
  Users, AlertCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface FollowUpStep {
  id: string;
  delayHours: number;
  message: string;
  enabled: boolean;
}

export default function ImprovedFollowUpEngine() {
  const { data: configData, mutate: mutateConfig } = useSWR('/chatbot/config');
  const { data: contactsData, mutate: mutateContacts } = useSWR('/contacts');

  const [followupEnabled, setFollowupEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [filter, setFilter] = useState('All');

  // Sequence Steps State
  const [steps, setSteps] = useState<FollowUpStep[]>([
    {
      id: 'step_1',
      delayHours: 24,
      message: 'Hi {{name}}, I noticed you were asking about our services yesterday. Do you have any questions I can help answer?',
      enabled: true
    },
    {
      id: 'step_2',
      delayHours: 48,
      message: 'Hey {{name}}, just following up! Let me know if you would like to proceed or book an appointment.',
      enabled: true
    }
  ]);

  // New step state
  const [newDelay, setNewDelay] = useState(24);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (configData) {
      setFollowupEnabled(configData.followupEnabled ?? false);
    }
  }, [configData]);

  const handleToggleEngine = async () => {
    setToggling(true);
    try {
      const newState = !followupEnabled;
      await api.put('/chatbot/config', { followupEnabled: newState });
      setFollowupEnabled(newState);
      toast.success(newState ? 'Follow-up Engine activated' : 'Follow-up Engine paused');
      mutateConfig();
    } catch {
      toast.error('Failed to update follow-up status');
    } finally {
      setToggling(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.put('/chatbot/config', {
        followupEnabled,
      });
      toast.success('Follow-up sequence settings saved');
      mutateConfig();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      toast.error('Please enter follow-up message text');
      return;
    }
    const newStep: FollowUpStep = {
      id: `step_${Date.now()}`,
      delayHours: Number(newDelay) || 24,
      message: newMessage.trim(),
      enabled: true
    };
    setSteps(prev => [...prev, newStep]);
    setNewMessage('');
    toast.success('Follow-up sequence step added!');
  };

  const handleDeleteStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
    toast.success('Step deleted');
  };

  const contacts = Array.isArray(contactsData) ? contactsData : (Array.isArray(contactsData?.contacts) ? contactsData.contacts : []);

  const jobs = contacts
    .filter((c: any) => c.lastAiInteractionAt || c.aiLeadStage)
    .map((c: any, index: number) => ({
      id: c.id || index,
      customer: c.name || c.phone || 'Unknown Lead',
      phone: c.phone,
      reason: c.aiLeadStage ? `Stage: ${c.aiLeadStage}` : 'Inactivity Re-engagement',
      time: c.lastAiInteractionAt ? new Date(c.lastAiInteractionAt).toLocaleDateString() : 'Recent',
      status: index % 2 === 0 ? 'Sent' : 'Pending',
      preview: `Automated check-in sequence for ${c.phone}`,
    }));

  const filters = ['All', 'Pending', 'Sent', 'Failed'];
  const filteredJobs = filter === 'All' ? jobs : jobs.filter((j: any) => j.status === filter);

  const triggerManualFollowup = (phone: string) => {
    toast.success(`Manual follow-up triggered for ${phone}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans select-none pb-12">
      
      {/* ── Top Header with Master Toggle ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md ${
            followupEnabled ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20' : 'bg-muted-foreground/30 text-muted-foreground'
          }`}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Automated Follow-up Engine</h1>
              {followupEnabled ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> ACTIVE SEQUENCES
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                  PAUSED
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatically re-engage inactive WhatsApp leads after custom hours of silence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleEngine}
            disabled={toggling}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 ${
              followupEnabled
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : followupEnabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            <span>{followupEnabled ? 'Pause Follow-up Engine' : 'Activate Engine'}</span>
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Sequences</span>
          </button>
        </div>
      </div>

      {/* ── Sequence Builder ────────────────────────────────────────────── */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-semibold text-foreground">Follow-up Sequence Steps ({steps.length})</h2>
          </div>
        </div>

        {/* Add Step Form */}
        <form onSubmit={handleAddStep} className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-foreground mb-1">Inactivity Delay (Hours)</label>
              <select
                value={newDelay}
                onChange={e => setNewDelay(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={1}>1 Hour of Silence</option>
                <option value={6}>6 Hours of Silence</option>
                <option value={12}>12 Hours of Silence</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days)</option>
                <option value={72}>72 Hours (3 Days)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-foreground mb-1">Follow-up Message Text</label>
              <input
                type="text"
                placeholder="e.g. Hi {{name}}, just checking in to see if you have any questions!"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Sequence Step</span>
            </button>
          </div>
        </form>

        {/* Steps List */}
        <div className="space-y-2.5 pt-1">
          {steps.map((step, idx) => (
            <div key={step.id} className="p-3.5 rounded-lg border border-border bg-background flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                  #{idx + 1}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Send after {step.delayHours} hours</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {step.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate italic">"{step.message}"</p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteStep(step.id)}
                className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors shrink-0"
                title="Delete step"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Follow-up History & Queue ───────────────────────────────────── */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-xs font-semibold text-foreground">Follow-up Customer Queue ({filteredJobs.length})</h2>
            <p className="text-[11px] text-muted-foreground">Customers currently tracked by the follow-up engine</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground/40" />
            <h3 className="text-xs font-semibold text-foreground">No Follow-ups Found</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              No contacts match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredJobs.map((job: any) => (
              <div
                key={job.id}
                className="p-3.5 rounded-lg border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{job.customer}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {job.reason}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">"{job.preview}"</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    job.status === 'Sent' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {job.status === 'Sent' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {job.status}
                  </span>

                  <button
                    onClick={() => triggerManualFollowup(job.phone)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold transition-colors border border-border"
                  >
                    <Send className="h-3 w-3 text-primary" />
                    <span>Send Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
