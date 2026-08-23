"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Filter, Edit, Trash2, Key, ShieldCheck,
  PowerOff, Calendar, AlertCircle, RefreshCw, X, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [editingShop, setEditingShop] = useState<any>(null);

  // Forms state
  const [credsData, setCredsData] = useState({
    businessAccountId: '',
    phoneNumberId: '',
    accessToken: '',
  });
  const [savingCreds, setSavingCreds] = useState(false);

  const [shopFormData, setShopFormData] = useState({
    username: '',
    password: '',
    shopName: '',
    phone: '',
    ownerName: '',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/shops');
      setShops(data || []);
    } catch (err: any) {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/shops', shopFormData);
      toast.success('Tenant created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      fetchShops();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create tenant');
    }
  };

  const handleEditClick = (shop: any) => {
    setEditingShop(shop);
    setShopFormData({
      username: shop.owner?.username || '',
      password: '',
      shopName: shop.shopName || '',
      phone: shop.phone || '',
      ownerName: shop.owner?.username || '',
      expiryDate: shop.subscription?.expiryDate
        ? new Date(shop.subscription.expiryDate).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/shops/${editingShop.id}`, shopFormData);
      await api.put(`/admin/shops/${editingShop.id}/subscription`, {
        expiryDate: new Date(shopFormData.expiryDate).toISOString(),
      });
      toast.success('Tenant updated successfully');
      setIsEditModalOpen(false);
      fetchShops();
    } catch (err: any) {
      toast.error('Failed to update tenant');
    }
  };

  const openCredsModal = (shop: any) => {
    setSelectedShop(shop);
    const existing = shop.whatsappAccounts?.[0];
    const defaultPhone = existing?.phoneNumbers?.find((p: any) => p.isDefault) || existing?.phoneNumbers?.[0];
    setCredsData({
      businessAccountId: existing?.businessAccountId || existing?.wabaId || '',
      phoneNumberId: defaultPhone?.phoneNumberId || '',
      accessToken: '',
    });
    setIsCredsModalOpen(true);
  };

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await api.post(`/admin/shops/${selectedShop.id}/whatsapp-credentials`, credsData);
      toast.success('WhatsApp credentials updated');
      setIsCredsModalOpen(false);
      fetchShops();
    } catch (err: any) {
      toast.error('Failed to save credentials');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleToggleStatus = async (shop: any) => {
    const nextStatus = shop.status === 'active' ? 'disabled' : 'active';
    try {
      await api.put(`/admin/shops/${shop.id}/status`, { status: nextStatus });
      toast.success(`Shop ${nextStatus === 'active' ? 'enabled' : 'disabled'}`);
      fetchShops();
    } catch (err: any) {
      toast.error('Failed to update shop status');
    }
  };

  const handleDeleteShop = async () => {
    if (!selectedShop) return;
    try {
      await api.delete(`/admin/shops/${selectedShop.id}`);
      toast.success('Shop deleted permanently');
      setIsDeleteModalOpen(false);
      fetchShops();
    } catch (err: any) {
      toast.error('Failed to delete shop');
    }
  };

  const resetForm = () => {
    setShopFormData({
      username: '',
      password: '',
      shopName: '',
      phone: '',
      ownerName: '',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  // Filtering
  const filteredShops = shops.filter(shop => {
    const matchesSearch =
      shop.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.owner?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phone?.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return shop.status === 'active';
    if (statusFilter === 'disabled') return shop.status === 'disabled';
    if (statusFilter === 'expired') {
      return shop.subscription?.expiryDate && new Date(shop.subscription.expiryDate) < new Date();
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Tenants & User Management"
        subtitle="Manage business accounts, subscription dates, WhatsApp credentials and tenant access."
        badge={`${shops.length} Total Tenants`}
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchShops}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Tenant</span>
            </button>
          </div>
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
            placeholder="Search shop, username or phone..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs font-medium w-full sm:w-auto overflow-x-auto no-scrollbar">
          {['all', 'active', 'disabled', 'expired'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md capitalize transition-all ${
                statusFilter === st ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading tenant accounts...
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No Tenants Found</p>
            <p className="text-[11px]">No tenants match your search query or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                  <th className="p-3 pl-4">Business / Shop</th>
                  <th className="p-3">Owner Account</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Subscription Expiry</th>
                  <th className="p-3">WhatsApp Connection</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredShops.map((shop) => {
                  const isExpired = shop.subscription?.expiryDate && new Date(shop.subscription.expiryDate) < new Date();
                  const hasWaba = shop.whatsappAccounts && shop.whatsappAccounts.length > 0;
                  const isActive = shop.status === 'active';

                  return (
                    <tr key={shop.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-bold text-foreground">
                        {shop.shopName || 'Unnamed Shop'}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {shop.owner?.username || 'No Owner'}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {shop.phone || 'N/A'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {shop.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className={`h-3.5 w-3.5 ${isExpired ? 'text-rose-500' : 'text-muted-foreground'}`} />
                          <span className={isExpired ? 'font-bold text-rose-500' : 'text-foreground'}>
                            {shop.subscription?.expiryDate
                              ? new Date(shop.subscription.expiryDate).toLocaleDateString()
                              : 'No expiry'}
                          </span>
                          {isExpired && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              EXPIRED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {hasWaba ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Not Connected
                          </span>
                        )}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openCredsModal(shop)}
                            title="Set WhatsApp Credentials"
                            className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditClick(shop)}
                            title="Edit Tenant"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(shop)}
                            title={isActive ? 'Disable Tenant' : 'Enable Tenant'}
                            className={`p-1.5 rounded-md transition-colors ${
                              isActive
                                ? 'hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500'
                                : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500'
                            }`}
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedShop(shop); setIsDeleteModalOpen(true); }}
                            title="Delete Tenant"
                            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Tenant Modal ───────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Create New Tenant</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateShop} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Business / Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopFormData.shopName}
                  onChange={e => setShopFormData({ ...shopFormData, shopName: e.target.value })}
                  placeholder="e.g. Acme Superstore"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Owner Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={shopFormData.username}
                  onChange={e => setShopFormData({ ...shopFormData, username: e.target.value })}
                  placeholder="e.g. acme_admin"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Login Password</label>
                <input
                  type="password"
                  required
                  value={shopFormData.password}
                  onChange={e => setShopFormData({ ...shopFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={shopFormData.phone}
                  onChange={e => setShopFormData({ ...shopFormData, phone: e.target.value })}
                  placeholder="e.g. +919876543210"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Subscription Expiry Date</label>
                <input
                  type="date"
                  required
                  value={shopFormData.expiryDate}
                  onChange={e => setShopFormData({ ...shopFormData, expiryDate: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ─────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Edit Tenant: {editingShop?.shopName}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateShop} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Business Name</label>
                <input
                  type="text"
                  value={shopFormData.shopName}
                  onChange={e => setShopFormData({ ...shopFormData, shopName: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Username</label>
                <input
                  type="text"
                  value={shopFormData.username}
                  onChange={e => setShopFormData({ ...shopFormData, username: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={shopFormData.password}
                  onChange={e => setShopFormData({ ...shopFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Subscription Expiry Date</label>
                <input
                  type="date"
                  value={shopFormData.expiryDate}
                  onChange={e => setShopFormData({ ...shopFormData, expiryDate: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WhatsApp Credentials Modal ────────────────────────────────── */}
      {isCredsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">WhatsApp Cloud API Credentials</h2>
                <p className="text-[11px] text-muted-foreground">{selectedShop?.shopName}</p>
              </div>
              <button onClick={() => setIsCredsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCreds} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  type="text"
                  required
                  value={credsData.businessAccountId}
                  onChange={e => setCredsData({ ...credsData, businessAccountId: e.target.value })}
                  placeholder="e.g. 109283746519"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Phone Number ID</label>
                <input
                  type="text"
                  required
                  value={credsData.phoneNumberId}
                  onChange={e => setCredsData({ ...credsData, phoneNumberId: e.target.value })}
                  placeholder="e.g. 102938475612"
                  className="w-full rounded-lg border border-border px-3 py-2 bg-muted/20 text-foreground font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Permanent Meta Access Token</label>
                <textarea
                  rows={3}
                  required
                  value={credsData.accessToken}
                  onChange={e => setCredsData({ ...credsData, accessToken: e.target.value })}
                  placeholder="EAAG..."
                  className="w-full rounded-lg border border-border p-3 bg-muted/20 text-foreground font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCredsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs inline-flex items-center gap-1.5"
                >
                  {savingCreds && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteShop}
        title="Delete Tenant Account"
        description={`Are you sure you want to delete "${selectedShop?.shopName}"? This will permanently erase all messages, contacts, campaigns, flows, and account data.`}
        confirmText="Delete Permanently"
        variant="destructive"
      />

    </div>
  );
}
