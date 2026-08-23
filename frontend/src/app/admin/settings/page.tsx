"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Settings, Shield, User as UserIcon, Lock, Save, Loader2,
  Eye, EyeOff, Trash2, Plus, RefreshCw, Key, CheckCircle2, Server
} from 'lucide-react';
import { useAuth } from '@/components/providers';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const PLATFORM_CONFIG_FIELDS = [
  {
    key: 'META_APP_ID',
    label: 'Meta App ID',
    description: 'Your Facebook App ID from developers.facebook.com',
    isSecret: false,
    placeholder: 'e.g. 1234567890',
  },
  {
    key: 'META_APP_SECRET',
    label: 'Meta App Secret',
    description: 'Your Facebook App Secret — used for webhook signature verification.',
    isSecret: true,
    placeholder: '••••••••••••••••',
  },
  {
    key: 'META_CONFIG_ID',
    label: 'Meta Embedded Signup Config ID',
    description: 'WhatsApp Embedded Signup flow configuration ID.',
    isSecret: false,
    placeholder: 'e.g. 1234567890',
  },
  {
    key: 'WEBHOOK_VERIFY_TOKEN',
    label: 'Webhook Verify Token',
    description: 'The token you register in the Meta webhook dashboard to verify ownership.',
    isSecret: false,
    placeholder: 'e.g. my_secure_verify_token_123',
  },
  {
    key: 'META_API_VERSION',
    label: 'Meta Graph API Version',
    description: 'API version used for all WhatsApp Cloud API calls.',
    isSecret: false,
    placeholder: 'e.g. v18.0',
  },
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'platform' | 'security' | 'system'>('platform');

  // Platform Config State
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Security Form State
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get('/admin/platform-config');
      const map: Record<string, string> = {};
      const saved = new Set<string>();
      for (const row of res.data) {
        map[row.key] = row.isSecret ? '' : row.value;
        saved.add(row.key);
      }
      setConfigs(map);
      setSavedKeys(saved);
    } catch (e: any) {
      toast.error('Failed to load platform configuration');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (field: typeof PLATFORM_CONFIG_FIELDS[0]) => {
    const value = configs[field.key];
    if (!value?.trim()) {
      toast.error(`${field.label} cannot be empty`);
      return;
    }
    setSavingKey(field.key);
    try {
      await api.put(`/admin/platform-config/${field.key}`, {
        value: value.trim(),
        isSecret: field.isSecret,
      });
      setSavedKeys(prev => new Set(prev).add(field.key));
      toast.success(`${field.label} updated`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || `Failed to save ${field.label}`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteConfig = async (field: typeof PLATFORM_CONFIG_FIELDS[0]) => {
    setDeletingKey(field.key);
    try {
      await api.delete(`/admin/platform-config/${field.key}`);
      setSavedKeys(prev => {
        const next = new Set(prev);
        next.delete(field.key);
        return next;
      });
      setConfigs(prev => ({ ...prev, [field.key]: '' }));
      toast.success(`${field.label} reset to env default`);
    } catch (e: any) {
      toast.error(`Failed to delete ${field.label}`);
    } finally {
      setDeletingKey(null);
    }
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPass(true);
    try {
      await api.post('/users/change-password', {
        oldPassword: passData.oldPassword,
        newPassword: passData.newPassword,
      });
      toast.success('Admin password updated successfully');
      setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Configuration & Settings"
        subtitle="Configure Meta Graph API credentials, webhook verification keys, and admin security settings."
        badge="System Control"
        icon={Settings}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit text-xs font-semibold">
        <button
          onClick={() => setTab('platform')}
          className={`px-4 py-2 rounded-lg transition-all ${
            tab === 'platform' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Meta WhatsApp Credentials
        </button>
        <button
          onClick={() => setTab('security')}
          className={`px-4 py-2 rounded-lg transition-all ${
            tab === 'security' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Admin Security & Password
        </button>
        <button
          onClick={() => setTab('system')}
          className={`px-4 py-2 rounded-lg transition-all ${
            tab === 'system' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Platform Limits & Environment
        </button>
      </div>

      {/* Tab 1: Meta Credentials */}
      {tab === 'platform' && (
        <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Global Meta Cloud API Integration</h2>
              <p className="text-xs text-muted-foreground">Values updated here override backend `.env` file variables instantly.</p>
            </div>
            <button
              onClick={loadConfigs}
              disabled={loadingConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingConfig ? 'animate-spin' : ''}`} />
              <span>Reload Config</span>
            </button>
          </div>

          <div className="space-y-4">
            {PLATFORM_CONFIG_FIELDS.map((field) => {
              const isSaved = savedKeys.has(field.key);
              const isSaving = savingKey === field.key;
              const isDeleting = deletingKey === field.key;
              const isRevealed = revealedKeys.has(field.key);

              return (
                <div key={field.key} className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground flex items-center gap-2">
                        {field.label}
                        <span className="font-mono text-[10px] text-muted-foreground font-normal">({field.key})</span>
                        {isSaved && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Custom Overridden
                          </span>
                        )}
                      </label>
                      <p className="text-[11px] text-muted-foreground">{field.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type={field.isSecret && !isRevealed ? 'password' : 'text'}
                        value={configs[field.key] || ''}
                        onChange={e => setConfigs({ ...configs, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
                      />
                      {field.isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(field.key)}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleSaveConfig(field)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span>Save</span>
                    </button>

                    {isSaved && (
                      <button
                        onClick={() => handleDeleteConfig(field)}
                        disabled={isDeleting}
                        className="p-2 rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Revert to .env default"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Admin Security */}
      {tab === 'security' && (
        <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-6 max-w-xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">Change Super Admin Password</h2>
            <p className="text-xs text-muted-foreground">Update your master administrator account password.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passData.oldPassword}
                onChange={e => setPassData({ ...passData, oldPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">New Password</label>
              <input
                type="password"
                required
                value={passData.newPassword}
                onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passData.confirmPassword}
                onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPass}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
              >
                {savingPass ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                <span>Update Admin Password</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Platform Environment & Limits */}
      {tab === 'system' && (
        <div className="p-6 rounded-xl border border-border bg-card shadow-2xs space-y-6 max-w-xl">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">System Limits & Platform Defaults</h2>
            <p className="text-xs text-muted-foreground">Default rate limiting and trial configurations.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <p className="font-bold text-foreground">API Rate Limiter Threshold</p>
              <p className="text-muted-foreground text-[11px]">Default: 120 requests / 60 seconds per IP address</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <p className="font-bold text-foreground">Default Tenant Trial Duration</p>
              <p className="text-muted-foreground text-[11px]">Default: 30 days active subscription upon shop creation</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-1">
              <p className="font-bold text-foreground">PgBouncer Connection Pool Mode</p>
              <p className="text-muted-foreground text-[11px]">Transaction Pooling on Port 6543 (Supabase PostgreSQL)</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
