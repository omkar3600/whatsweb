"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Key, Trash2, Copy, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ApiKey {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/api-keys');
      setKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName });
      setNewlyGeneratedKey(data.rawKey);
      toast.success('API Key generated successfully');
      fetchKeys();
      setNewKeyName('');
    } catch (error) {
      console.error('Failed to generate API key', error);
      toast.error('Failed to generate API key');
    }
  };

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  const revokeKey = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Revoke API Key',
      description: 'Are you sure you want to revoke this API key? This will immediately break any integrations using it.',
      action: async () => {
        try {
          await api.delete(`/api-keys/${id}`);
          toast.success('API Key revoked');
          fetchKeys();
        } catch (error) {
          console.error('Failed to revoke API key', error);
          toast.error('Failed to revoke API key');
        } finally {
          setConfirmState(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">API Credentials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage API keys to integrate WhatsWeb with external POS systems, CRMs, and custom webhooks.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Key</span>
        </button>
      </div>

      {/* Secret Key Alert Box */}
      {newlyGeneratedKey && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-sm space-y-3">
          <div>
            <h3 className="font-semibold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">Save Your API Key Secret</h3>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
              For security, this token is displayed <strong>only once</strong>. Copy and save it securely before leaving.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 bg-background rounded-lg border border-amber-500/30 flex-1 text-xs overflow-x-auto font-mono text-foreground">
              {newlyGeneratedKey}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(newlyGeneratedKey);
                toast.success('API Key copied to clipboard');
              }}
              className="p-2 border border-amber-500/30 bg-background rounded-lg hover:bg-amber-500/10 transition-colors text-foreground"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setNewlyGeneratedKey(null)}
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            I have stored my API key securely
          </button>
        </div>
      )}

      {/* Keys Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/80">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Key Identifier</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Created Date</th>
              <th className="px-5 py-3.5 font-semibold">Last Access</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading API credentials...</td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-foreground">No API Keys Generated</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Create an API key to securely authenticate external systems with your WhatsWeb workspace.</p>
                </td>
              </tr>
            ) : (
              keys.map(key => (
                <tr key={key.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{key.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      key.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {format(new Date(key.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {key.lastUsedAt ? format(new Date(key.lastUsedAt), 'MMM d, yyyy HH:mm') : 'Never used'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {key.status === 'active' && (
                      <button 
                        onClick={() => revokeKey(key.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors inline-flex"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-base font-semibold text-foreground mb-1">Generate API Key</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter a descriptive label to identify the service using this API key.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Key Label</label>
              <input 
                type="text" 
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g. POS Main Store, Zapier Webhook"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <button 
                onClick={() => setShowModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  generateKey();
                  setShowModal(false);
                }}
                disabled={!newKeyName.trim()}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 transition-all shadow-sm"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmState.open}
        onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
        onConfirm={confirmState.action}
        title={confirmState.title}
        description={confirmState.description}
        variant="destructive"
        confirmText="Revoke API Key"
      />
    </div>
  );
}
