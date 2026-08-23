"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, Search, Code, Eye, X, ChevronDown
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface WebhookLog {
  id: string;
  shopId: string | null;
  phoneNumberId: string | null;
  eventType: string;
  waMessageId: string | null;
  processingStatus: string;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  payload: any;
}

interface DeadLetterEvent {
  id: string;
  sourceType: string;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  status: string;
  createdAt: string;
  originalPayload: any;
}

export default function WebhookLogsPage() {
  const [tab, setTab] = useState<'failures' | 'deadletter'>('failures');
  const [failures, setFailures] = useState<WebhookLog[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayload, setSelectedPayload] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [failRes, dlRes] = await Promise.all([
        api.get('/admin/webhook-failures').catch(() => ({ data: [] })),
        api.get('/admin/dead-letter-events').catch(() => ({ data: [] })),
      ]);
      setFailures(failRes.data || []);
      setDeadLetters(dlRes.data || []);
    } catch (err: any) {
      toast.error('Failed to fetch webhook logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredFailures = failures.filter(f =>
    f.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.shopId?.includes(searchQuery)
  );

  const filteredDeadLetters = deadLetters.filter(d =>
    d.sourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Webhook & Dead Letter Logs"
        subtitle="Monitor failed webhook dispatches, processing exceptions, and dead letter event queues."
        badge={`${failures.length} Failures Logged`}
        icon={Activity}
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        }
      />

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-80 border border-border rounded-lg px-3 py-1.5 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search event type, error or shop ID..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs font-medium w-full sm:w-auto">
          <button
            onClick={() => setTab('failures')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              tab === 'failures' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Webhook Failures ({failures.length})
          </button>
          <button
            onClick={() => setTab('deadletter')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              tab === 'deadletter' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dead Letter Queue ({deadLetters.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading webhook audit logs...
          </div>
        ) : tab === 'failures' ? (
          filteredFailures.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
              <p className="font-semibold text-foreground">No Webhook Failures</p>
              <p className="text-[11px]">All webhook events have been processed cleanly.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                    <th className="p-3 pl-4">Event Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Error Message</th>
                    <th className="p-3">Retries</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3 pr-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredFailures.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-foreground">
                        {log.eventType || 'unknown'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          {log.processingStatus}
                        </span>
                      </td>
                      <td className="p-3 text-rose-500 font-mono text-[11px] max-w-xs truncate">
                        {log.errorMessage || 'Unknown error'}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {log.retryCount}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={() => setSelectedPayload(log.payload || { info: 'No payload data recorded' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px]"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredDeadLetters.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
              <p className="font-semibold text-foreground">Dead Letter Queue Empty</p>
              <p className="text-[11px]">No unhandled dead letter events requiring intervention.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                    <th className="p-3 pl-4">Source Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Error Description</th>
                    <th className="p-3">Retry / Max</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3 pr-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDeadLetters.map((dl) => (
                    <tr key={dl.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-foreground">
                        {dl.sourceType || 'dead_letter'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {dl.status}
                        </span>
                      </td>
                      <td className="p-3 text-rose-500 font-mono text-[11px] max-w-xs truncate">
                        {dl.errorMessage || 'Max retries exhausted'}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {dl.retryCount} / {dl.maxRetries}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(dl.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={() => setSelectedPayload(dl.originalPayload || { info: 'No raw payload recorded' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px]"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* JSON Payload Inspector Drawer */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-foreground">Event Payload JSON</h2>
              </div>
              <button onClick={() => setSelectedPayload(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-muted text-foreground font-mono text-[11px] max-h-96 overflow-y-auto border border-border">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
