"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, Search,
  RefreshCw, Building, Mail, Phone, Users, X
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'resolved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/demo-requests');
      setRequests(data || []);
    } catch (err: any) {
      toast.error('Failed to load demo requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/admin/demo-requests/${id}/resolve`);
      toast.success('Request marked as resolved');
      fetchRequests();
    } catch (err: any) {
      toast.error('Failed to resolve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/admin/demo-requests/${id}/reject`);
      toast.success('Request rejected');
      fetchRequests();
    } catch (err: any) {
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesTab = (req.status || 'pending') === tab;
    const matchesQuery =
      req.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.phone?.includes(searchQuery);

    return matchesTab && matchesQuery;
  });

  const pendingCount = requests.filter(r => (r.status || 'pending') === 'pending').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Demo & Registration Requests"
        subtitle="Review, approve or reject inbound enterprise demo signups and leads."
        badge={`${pendingCount} Pending`}
        icon={ClipboardList}
        actions={
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-80 border border-border rounded-lg px-3 py-1.5 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search lead name, email, company..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs font-medium w-full sm:w-auto">
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1 rounded-md transition-all ${
              tab === 'pending' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-3 py-1 rounded-md transition-all ${
              tab === 'resolved' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setTab('rejected')}
            className={`px-3 py-1 rounded-md transition-all ${
              tab === 'rejected' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading demo requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No {tab} requests</p>
            <p className="text-[11px]">There are currently no demo requests in this status category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                  <th className="p-3 pl-4">Lead Contact</th>
                  <th className="p-3">Company / Business</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Team Size</th>
                  <th className="p-3">Requested At</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4">
                      <div>
                        <p className="font-bold text-foreground">{req.name || 'Anonymous Lead'}</p>
                        <p className="text-[11px] text-muted-foreground">{req.email}</p>
                      </div>
                    </td>
                    <td className="p-3 text-foreground font-medium">
                      {req.businessName || 'Not specified'}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">
                      {req.phone || 'N/A'}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">
                      {req.teamSize || '1-10'}
                    </td>
                    <td className="p-3 text-muted-foreground text-[11px]">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      {req.status === 'pending' || !req.status ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleResolve(req.id)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Resolve</span>
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground font-semibold text-[11px] transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          req.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          {req.status === 'resolved' ? 'Resolved' : 'Rejected'}
                        </span>
                      )}
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
