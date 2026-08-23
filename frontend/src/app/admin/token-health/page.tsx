"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Shield, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Clock, Building, Key, Share2, Search, X
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface TokenInfo {
  shopId?: string;
  shopName: string;
  wabaId: string;
  businessName: string;
  status: string;
  tokenHealth: string;
  tokenExpiry: string | null;
}

export default function TokenHealthPage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/token-health');
      setTokens(res.data || []);
    } catch (err: any) {
      toast.error('Failed to fetch token health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const healthIcon = (health: string) => {
    switch (health) {
      case 'valid': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'expiring_soon': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'expired': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const validCount = tokens.filter(t => t.tokenHealth === 'valid').length;
  const expiringCount = tokens.filter(t => t.tokenHealth === 'expiring_soon').length;
  const expiredCount = tokens.filter(t => t.tokenHealth === 'expired').length;

  const filteredTokens = tokens.filter(tok => {
    const matchesQuery =
      tok.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tok.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tok.wabaId?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (healthFilter === 'valid') return tok.tokenHealth === 'valid';
    if (healthFilter === 'expiring') return tok.tokenHealth === 'expiring_soon';
    if (healthFilter === 'expired') return tok.tokenHealth === 'expired';

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Token & WABA Connection Health"
        subtitle="Monitor WhatsApp Business access tokens and connection statuses across all tenant accounts."
        badge={`${tokens.length} Accounts Monitored`}
        icon={Shield}
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Valid & Active Tokens</p>
            <p className="text-2xl font-bold text-foreground mt-1">{validCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Expiring Soon (≤ 7 Days)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{expiringCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Expired Tokens</p>
            <p className="text-2xl font-bold text-foreground mt-1">{expiredCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-80 border border-border rounded-lg px-3 py-1.5 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tenant name, business, WABA ID..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs font-medium w-full sm:w-auto">
          {['all', 'valid', 'expiring', 'expired'].map(hf => (
            <button
              key={hf}
              onClick={() => setHealthFilter(hf)}
              className={`px-3 py-1 rounded-md capitalize transition-all ${
                healthFilter === hf ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {hf}
            </button>
          ))}
        </div>
      </div>

      {/* Token Health Table */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading token health data...
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No Access Tokens Found</p>
            <p className="text-[11px]">No tenant access tokens match your filter query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                  <th className="p-3 pl-4">Tenant / Business</th>
                  <th className="p-3">WABA ID</th>
                  <th className="p-3">Meta Business Name</th>
                  <th className="p-3">WABA Status</th>
                  <th className="p-3">Token Health</th>
                  <th className="p-3 pr-4 text-right">Token Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTokens.map((token, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4 font-bold text-foreground">
                      {token.shopName || 'Unnamed Shop'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {token.wabaId || 'N/A'}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {token.businessName || 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        token.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-bold">
                        {healthIcon(token.tokenHealth)}
                        <span className="capitalize">{token.tokenHealth.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right font-mono text-[11px] text-muted-foreground">
                      {token.tokenExpiry
                        ? new Date(token.tokenExpiry).toLocaleDateString()
                        : 'Never / Permanent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
