"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import {
    ArrowLeft, Megaphone, Clock, AlertCircle, RotateCw,
    BarChart3, CheckCircle2, Eye, MousePointerClick, XCircle,
    Send, Users, Tag, ChevronRight, Loader2, CheckSquare, Square,
    Download, RefreshCw, ShieldAlert, Search, MessageCircleReply,
    ChartNoAxesCombined, X, Sparkles, Filter, Rocket, Info,
    AlertTriangle, CornerDownRight, Check,
    ShieldOff, SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TableSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';


// ─── Types ────────────────────────────────────────────────────────────────────
type LimitOption = '50' | '200' | '500' | '1000' | '10k' | 'all';

interface CampaignContact {
    id: string;
    phone: string;
    name: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'clicked' | 'failed' | 'aborted';
    failReason?: string;
    sentAt: string;
    tags?: string[];
}

interface Analytics {
    campaign: {
        id: string;
        name: string;
        status: string;
        scheduledAt: string;
        createdAt: string;
        template?: {
            templateName: string;
        };
        targetTags?: string[];
        targetPhones?: string[];
    };
    stats: {
        total: number;
        pending?: number;
        dispatched?: number;
        sent: number;
        delivered: number;
        read: number;
        replied: number;
        clicked: number;
        failed: number;
        unread: number;
        skipped: number;
    };
    contacts: {
        all: CampaignContact[];
        pending: CampaignContact[];
        dispatched: CampaignContact[];
        sent: CampaignContact[];
        delivered: CampaignContact[];
        read: CampaignContact[];
        replied: CampaignContact[];
        clicked: CampaignContact[];
        failed: CampaignContact[];
        unread: CampaignContact[];
        skipped: CampaignContact[];
    };
    limit?: string | number;
}

type Tab = 'all' | 'pending' | 'dispatched' | 'sent' | 'delivered' | 'read' | 'replied' | 'unread' | 'clicked' | 'failed';

// ─── Status Badges ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const s = (status || 'pending').toLowerCase();
    const map: Record<string, { label: string; class: string; dot: string }> = {
        pending:   { label: 'Pending',   class: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
        scheduled: { label: 'Scheduled', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
        queued:    { label: 'Queued',    class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse' },
        sent:      { label: 'Sent',      class: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', dot: 'bg-sky-500' },
        delivered: { label: 'Delivered', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
        read:      { label: 'Read',      class: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
        replied:   { label: 'Replied',   class: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
        unread:    { label: 'Unread',    class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
        clicked:   { label: 'Clicked',   class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
        aborted:   { label: 'Aborted',   class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
        failed:    { label: 'Failed',    class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
    };
    const item = map[s] || map.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${item.class}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
            {item.label}
        </span>
    );
}

function CampaignStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; class: string; dot: string }> = {
        completed:  { label: 'Completed',  class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
        processing: { label: 'Processing', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse' },
        scheduled:  { label: 'Scheduled',  class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
        aborted:    { label: 'Aborted',    class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
    };
    const item = map[status] || map.scheduled;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${item.class}`}>
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
        </span>
    );
}

export default function CampaignAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [limit, setLimit] = useState<LimitOption>('50');

    const { data: analytics, mutate, isLoading, isValidating, error } = useSWR<Analytics>(
        id ? `/campaigns/${id}/analytics?limit=${limit}` : null,
        {
            // Only poll while campaign is actively processing — stop polling once done
            refreshInterval: (data) => data?.campaign?.status === 'processing' ? 10000 : 0,
        }
    );
    const { data: fetchedTemplates } = useSWR('/templates');
    const templates = fetchedTemplates || [];

    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());

    // Tagging modal state
    const [tagsModalOpen, setTagsModalOpen] = useState(false);
    const [tagModalMode, setTagModalMode] = useState<'add' | 'remove'>('add');
    const [tagInput, setTagInput] = useState('');
    const [isTagging, setIsTagging] = useState(false);
    const [selectedTagsToRemove, setSelectedTagsToRemove] = useState<string[]>([]);
    const [removeAllTagsOption, setRemoveAllTagsOption] = useState(false);

    // Action loading states
    const [isResending, setIsResending] = useState(false);
    const [isAborting, setIsAborting] = useState(false);

    // Filter contacts based on tab & search query
    const tabContacts = useMemo((): CampaignContact[] => {
        if (!analytics?.contacts) return [];
        let list: CampaignContact[] = [];
        if (activeTab === 'all') {
            list = (analytics.contacts as any).all || [];
        } else if (activeTab === 'unread') {
            list = analytics.contacts.unread || [];
        } else if (activeTab === 'pending') {
            if (analytics.contacts.pending && analytics.contacts.pending.length > 0) {
                list = analytics.contacts.pending;
            } else {
                const allList: CampaignContact[] = (analytics.contacts as any).all || [];
                list = allList.filter(c => {
                    const s = (c.status || '').toLowerCase();
                    return s === 'pending' || s === 'scheduled' || s === 'queued' || (!['sent', 'delivered', 'read', 'replied', 'clicked', 'failed'].includes(s));
                });
            }
        } else {
            list = analytics.contacts[activeTab] || [];
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return list.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
        }
        return list;
    }, [analytics, activeTab, searchQuery]);

    const totalInTab = useMemo(() => {
        if (!analytics?.stats) return tabContacts.length;
        if (activeTab === 'all') return analytics.stats.total ?? ((analytics.contacts as any)?.all?.length || 0);
        if (activeTab === 'pending') return analytics.stats.pending ?? (analytics.contacts.pending?.length || 0);
        if (activeTab === 'dispatched') return analytics.stats.dispatched ?? (analytics.contacts.dispatched?.length || 0);
        if (activeTab === 'sent') return analytics.stats.sent ?? (analytics.contacts.sent?.length || 0);
        if (activeTab === 'delivered') return analytics.stats.delivered ?? (analytics.contacts.delivered?.length || 0);
        if (activeTab === 'read') return analytics.stats.read ?? (analytics.contacts.read?.length || 0);
        if (activeTab === 'replied') return analytics.stats.replied ?? (analytics.contacts.replied?.length || 0);
        if (activeTab === 'unread') return analytics.stats.unread ?? (analytics.contacts.unread?.length || 0);
        if (activeTab === 'failed') return analytics.stats.failed ?? (analytics.contacts.failed?.length || 0);
        return (analytics.stats as any)[activeTab] ?? tabContacts.length;
    }, [analytics, activeTab, tabContacts.length]);

    const selectedContactsList = useMemo(() => {
        if (!analytics || selectedPhones.size === 0) return [];
        const all = (analytics.contacts.all || []) as CampaignContact[];
        return all.filter(c => selectedPhones.has(c.phone));
    }, [analytics, selectedPhones]);

    const commonTagsOnSelected = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const c of selectedContactsList) {
            const tags = (c.tags as string[]) || [];
            if (Array.isArray(tags)) {
                for (const t of tags) {
                    if (typeof t === 'string' && t.trim()) {
                        const trimmed = t.trim();
                        counts[trimmed] = (counts[trimmed] || 0) + 1;
                    }
                }
            }
        }
        return Object.entries(counts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }, [selectedContactsList]);

    const togglePhone = (phone: string) => {
        setSelectedPhones(prev => {
            const next = new Set(prev);
            if (next.has(phone)) next.delete(phone);
            else next.add(phone);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedPhones.size === tabContacts.length) {
            setSelectedPhones(new Set());
        } else {
            setSelectedPhones(new Set(tabContacts.map(c => c.phone)));
        }
    };

    const handleAddTags = async () => {
        if (!analytics || !tagInput.trim() || selectedPhones.size === 0) return;
        const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        if (tags.length === 0) return;

        setIsTagging(true);
        try {
            await api.post(`/campaigns/${analytics.campaign.id}/contacts/add-tags`, {
                phones: Array.from(selectedPhones),
                tags,
            });
            toast.success(`Tags added to ${selectedPhones.size} contacts`);
            setTagsModalOpen(false);
            setTagInput('');
            setSelectedPhones(new Set());
            mutate();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add tags');
        } finally {
            setIsTagging(false);
        }
    };

    const handleRemoveTags = async () => {
        if (!analytics || selectedPhones.size === 0) return;

        const manualTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        const tagsToRemove = Array.from(new Set([...selectedTagsToRemove, ...manualTags]));

        if (!removeAllTagsOption && tagsToRemove.length === 0) {
            toast.error('Please select or type at least one tag to remove');
            return;
        }

        setIsTagging(true);
        try {
            await api.post(`/campaigns/${analytics.campaign.id}/contacts/remove-tags`, {
                phones: Array.from(selectedPhones),
                tags: tagsToRemove,
                removeAll: removeAllTagsOption,
            });
            toast.success(removeAllTagsOption ? `All tags removed from ${selectedPhones.size} contacts` : `Tags removed from ${selectedPhones.size} contacts`);
            setTagsModalOpen(false);
            setTagInput('');
            setSelectedTagsToRemove([]);
            setRemoveAllTagsOption(false);
            setSelectedPhones(new Set());
            mutate();
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove tags');
        } finally {
            setIsTagging(false);
        }
    };

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'destructive' | 'warning' | 'primary';
        confirmText?: string;
    }>({ open: false, title: '', description: '', action: () => {} });

    const handleResendFailed = () => {
        if (!analytics) return;
        const hasSelected = selectedPhones.size > 0;
        const targetPhones = hasSelected ? Array.from(selectedPhones) : undefined;
        const count = hasSelected ? selectedPhones.size : (analytics.stats.failed || 0);

        setConfirmState({
            open: true,
            title: hasSelected ? 'Resend Campaign to Selected Contacts' : 'Resend Failed Messages',
            description: hasSelected
                ? `Are you sure you want to resend this campaign message to the ${count} selected contact${count === 1 ? '' : 's'}?`
                : `Are you sure you want to resend messages to all ${count} failed contact${count === 1 ? '' : 's'}?`,
            variant: 'primary',
            confirmText: 'Resend Message',
            action: async () => {
                setIsResending(true);
                try {
                    await api.post(`/campaigns/${analytics.campaign.id}/resend-failed`, {
                        phones: targetPhones
                    });
                    toast.success(`Resend campaign launched for ${count} contact${count === 1 ? '' : 's'}!`);
                    setSelectedPhones(new Set());
                    mutate();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to resend campaign');
                } finally {
                    setIsResending(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleSendSameMessage = () => {
        if (!analytics) return;
        if (selectedPhones.size > 0) {
            const phones = Array.from(selectedPhones);
            try {
                sessionStorage.setItem('retarget_phones', JSON.stringify(phones));
            } catch (e) {
                console.error('Failed to save retarget phones in session storage:', e);
            }
            router.push(`/campaigns?reuseCampaignId=${analytics.campaign.id}&useSessionPhones=true`);
        } else {
            router.push(`/campaigns?reuseCampaignId=${analytics.campaign.id}`);
        }
    };

    const handleLaunchNewCampaign = handleSendSameMessage;

    const handleAbortCampaign = () => {
        if (!analytics) return;
        setConfirmState({
            open: true,
            title: 'Abort Campaign',
            description: 'Are you sure you want to abort this campaign? This will halt remaining pending messages.',
            variant: 'warning',
            confirmText: 'Abort Campaign',
            action: async () => {
                setIsAborting(true);
                try {
                    await api.post(`/campaigns/${analytics.campaign.id}/abort`);
                    toast.success('Campaign aborted');
                    mutate();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to abort campaign');
                } finally {
                    setIsAborting(false);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleExportCSV = () => {
        if (!analytics || tabContacts.length === 0) {
            toast.error('No contacts to export');
            return;
        }

        const headers = ['Name', 'Phone', 'Status', 'Sent At', 'Failure Reason'];
        const rows = tabContacts.map(c => [
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${c.phone || ''}"`,
            `"${c.status || ''}"`,
            `"${c.sentAt ? format(new Date(c.sentAt), 'yyyy-MM-dd HH:mm:ss') : ''}"`,
            `"${(c.failReason || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${analytics.campaign.name || 'campaign'}_${activeTab}_contacts.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (limit !== 'all' && totalInTab > tabContacts.length) {
            toast.info(`Exported ${tabContacts.length} loaded contacts. (Select 'All' in the limit selector to export all ${totalInTab.toLocaleString()})`);
        } else {
            toast.success(`Exported ${tabContacts.length} contacts to CSV`);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
                <TableSkeleton rows={8} />
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="max-w-7xl mx-auto py-16 px-4 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                <h2 className="text-lg font-semibold text-foreground">Failed to load campaign analytics</h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    The requested campaign might have been deleted or is temporarily unreachable.
                </p>
                <Link href="/campaigns" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                    <ArrowLeft className="h-4 w-4" /> Back to Campaigns
                </Link>
            </div>
        );
    }

    const { campaign, stats } = analytics;
    const dispatched = stats.dispatched || 0;
    const sent = stats.sent || 0;
    const delivered = stats.delivered || 0;
    const read = stats.read || 0;
    const replied = stats.replied || 0;
    const clicked = stats.clicked || 0;
    const failed = stats.failed || 0;
    const total = stats.total || dispatched || 1;

    const deliveryRate = dispatched > 0 ? Math.round((delivered / dispatched) * 100) : 0;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
    const responseRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16 px-4 sm:px-6">
            {/* ── Breadcrumbs & Campaign Header Bar ─────────────────────────────── */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href="/campaigns" className="hover:text-foreground transition-colors flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
                    </Link>
                    <span>/</span>
                    <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-md">{campaign.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
                            <CampaignStatusBadge status={campaign.status} />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Template: <strong className="text-foreground">{campaign.template?.templateName || 'Standard'}</strong></span>
                            <span>•</span>
                            <span>Created: {format(new Date(campaign.createdAt), 'MMM d, yyyy • HH:mm')}</span>
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSendSameMessage}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer border-none"
                            title="Open New Broadcast modal with this message to choose a new audience"
                        >
                            <RotateCw className="h-3.5 w-3.5" />
                            {selectedPhones.size > 0 ? `Send Same Message (${selectedPhones.size})` : 'Send Same Message'}
                        </Button>

                        {(failed > 0 || selectedPhones.size > 0) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResendFailed}
                                disabled={isResending}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                title="Retry sending directly to failed or selected contacts"
                            >
                                <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                                {selectedPhones.size > 0 ? `Retry Selected (${selectedPhones.size})` : `Retry Failed (${failed})`}
                            </Button>
                        )}

                        {selectedPhones.size > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setTagModalMode('add');
                                        setTagInput('');
                                        setSelectedTagsToRemove([]);
                                        setRemoveAllTagsOption(false);
                                        setTagsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
                                >
                                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                                    Add Tags ({selectedPhones.size})
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setTagModalMode('remove');
                                        setTagInput('');
                                        setSelectedTagsToRemove([]);
                                        setRemoveAllTagsOption(false);
                                        setTagsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
                                >
                                    <Tag className="h-3.5 w-3.5 text-rose-500" />
                                    Remove Tags ({selectedPhones.size})
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all cursor-pointer"
                            title="Export Contacts CSV"
                        >
                            <Download className="h-3.5 w-3.5" /> Export CSV
                        </Button>

                        {campaign.status === 'processing' && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleAbortCampaign}
                                disabled={isAborting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer"
                            >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Abort
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Executive Performance Funnel & Analytics ──────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Recipients Target</span>
                    <div className="text-2xl font-bold text-foreground">{total.toLocaleString()}</div>
                    <p className="text-[11px] text-muted-foreground">Total campaign audience</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Dispatched</span>
                    <div className="text-2xl font-bold text-foreground">{dispatched.toLocaleString()}</div>
                    <p className="text-[11px] text-muted-foreground">Sent out to WhatsApp</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Delivered</span>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{delivered.toLocaleString()}</div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{deliveryRate}% delivery rate</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Read / Opened</span>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{read.toLocaleString()}</div>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">{readRate}% read rate</p>
                </div>

                <div className="col-span-2 lg:col-span-1 rounded-xl border border-border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Failed / Bounced</span>
                    <div className={`text-2xl font-bold ${failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>{failed.toLocaleString()}</div>
                    <p className={`text-[11px] font-semibold ${failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                        {failed > 0 ? `${Math.round((failed / dispatched) * 100 || 0)}% failure rate` : 'Zero errors'}
                    </p>
                </div>
            </div>

            {/* ── Skipped Contacts (Opted-Out) ──────────────────────────────────── */}
            {analytics.contacts.skipped && analytics.contacts.skipped.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <ShieldOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                Skipped Contacts
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                    {analytics.contacts.skipped.length}
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">These contacts were excluded at send time because they opted out of marketing messages.</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-amber-500/20 overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-amber-500/10 text-amber-700 dark:text-amber-400 uppercase text-[10px] font-semibold tracking-wider">
                                <tr>
                                    <th className="px-4 py-2.5">Contact Name</th>
                                    <th className="px-4 py-2.5">Phone Number</th>
                                    <th className="px-4 py-2.5">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-500/10">
                                {analytics.contacts.skipped.map(c => (
                                    <tr key={c.id || c.phone} className="hover:bg-amber-500/5 transition-colors">
                                        <td className="px-4 py-2.5 font-semibold text-foreground">{c.name || 'Unnamed Contact'}</td>
                                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{c.phone}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                <ShieldOff className="h-3 w-3 shrink-0" />
                                                Opted Out
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Visual Delivery Funnel Strip */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">Delivery Performance Funnel</h2>
                        <p className="text-xs text-muted-foreground">Message lifecycle transmission breakdown</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        {deliveryRate}% Overall Success
                    </span>
                </div>

                {/* Funnel Progress Bars */}
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">Dispatched (Outbound)</span>
                            <span className="font-bold text-foreground">{dispatched.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">Delivered to Device</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{delivered.toLocaleString()} ({deliveryRate}%)</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${deliveryRate}%` }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">Read by Contact</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{read.toLocaleString()} ({readRate}%)</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${readRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* Diagnostics alert if failures exist */}
                {failed > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-medium">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{failed} contact{failed > 1 ? 's' : ''} failed delivery. Click below to inspect specific fail reasons or retarget.</span>
                        </div>
                        <button
                            onClick={handleResendFailed}
                            className="px-3 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                        >
                            Retry Failed ({failed})
                        </button>
                    </div>
                )}
            </div>

            {/* ── Recipient Workspace & Filters ───────────────────────────────── */}
            <div className="space-y-4">
                {/* Search & Status Filter Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-xl border border-border bg-card">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search recipient name or phone number..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-t sm:border-t-0 border-border pt-2 sm:pt-0">
                        {(['all', 'pending', 'dispatched', 'sent', 'delivered', 'read', 'replied', 'unread', 'failed'] as const).map(tab => {
                            let count = 0;
                            if (tab === 'all') {
                                count = analytics.stats.total ?? ((analytics.contacts as any)?.all?.length || 0);
                            } else if (tab === 'pending') {
                                count = analytics.stats.pending ?? (analytics.contacts.pending?.length || 0);
                            } else {
                                count = (analytics.stats as any)[tab] ?? (analytics.contacts[tab as keyof typeof analytics.contacts]?.length || 0);
                            }

                            return (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setSelectedPhones(new Set());
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-secondary text-secondary-foreground shadow-2xs font-semibold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({count.toLocaleString()})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Audience Limit & Count Summary Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-muted-foreground">
                            Showing <strong className="text-foreground font-semibold">{tabContacts.length.toLocaleString()}</strong> of <strong className="text-foreground font-semibold">{totalInTab.toLocaleString()}</strong> recipients
                        </span>
                        {limit !== 'all' && totalInTab > tabContacts.length && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Showing {limit === '10k' ? '10,000' : limit}
                            </span>
                        )}
                        {isValidating && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" /> Loading...
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Show limit:
                        </span>
                        <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-2xs">
                            {(['50', '200', '500', '1000', '10k', 'all'] as const).map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                        setLimit(opt);
                                        setSelectedPhones(new Set());
                                    }}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                        limit === opt
                                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`}
                                >
                                    {opt === 'all' ? 'All' : opt === '10k' ? '10k' : opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recipient Contacts Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    {tabContacts.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                            <Users className="h-8 w-8 mx-auto opacity-40" />
                            <p className="font-semibold text-foreground">No contacts found in "{activeTab}" view</p>
                            {searchQuery && <p>Try clearing your search terms.</p>}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPhones.size > 0 && selectedPhones.size === tabContacts.length}
                                                    onChange={toggleAll}
                                                    className="rounded border-input text-primary cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-4 py-3">Contact Name</th>
                                            <th className="px-4 py-3">Phone Number</th>
                                            <th className="px-4 py-3">Transmission Status</th>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3 text-right">Action / Diagnostic</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {tabContacts.map(c => {
                                            const isChecked = selectedPhones.has(c.phone);

                                            return (
                                                <tr key={c.id || c.phone} className={`hover:bg-muted/30 transition-colors ${isChecked ? 'bg-primary/5' : ''}`}>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => togglePhone(c.phone)}
                                                            className="rounded border-input text-primary cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-foreground">
                                                        {c.name || 'Unnamed Contact'}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-muted-foreground">
                                                        {c.phone}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={c.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                        {c.sentAt ? format(new Date(c.sentAt), 'MMM d, yyyy • HH:mm') : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {c.status === 'failed' ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                                <AlertCircle className="h-3 w-3 shrink-0" />
                                                                {c.failReason || 'Delivery Failed'}
                                                            </span>
                                                        ) : c.status === 'replied' ? (
                                                            <Link
                                                                href={`/inbox?phone=${c.phone}`}
                                                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                                            >
                                                                <MessageCircleReply className="h-3.5 w-3.5" /> Open Chat
                                                            </Link>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {limit !== 'all' && totalInTab > tabContacts.length && (
                                <div className="px-4 py-3 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span>
                                        Displaying first <strong className="text-foreground font-semibold">{tabContacts.length.toLocaleString()}</strong> of <strong className="text-foreground font-semibold">{totalInTab.toLocaleString()}</strong> {activeTab} recipients.
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-medium">Load more:</span>
                                        {(['200', '500', '1000', '10k', 'all'] as const).map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => {
                                                    setLimit(opt);
                                                    setSelectedPhones(new Set());
                                                }}
                                                className={`px-2.5 py-1 text-xs rounded-md border transition-all cursor-pointer ${
                                                    limit === opt
                                                        ? 'bg-primary text-primary-foreground font-semibold border-primary shadow-xs'
                                                        : 'bg-background hover:bg-muted text-foreground border-border'
                                                }`}
                                            >
                                                {opt === 'all' ? 'All' : opt === '10k' ? '10k' : opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tag Management Modal (Add / Remove) */}
            {tagsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTagModalMode('add')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        tagModalMode === 'add'
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    Add Tags
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTagModalMode('remove')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        tagModalMode === 'remove'
                                            ? 'bg-destructive text-destructive-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    Remove Tags
                                </button>
                            </div>
                            <button onClick={() => setTagsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {tagModalMode === 'add' ? 'Applying' : 'Removing'} tags on{' '}
                            <strong>{selectedPhones.size}</strong> selected contact{selectedPhones.size === 1 ? '' : 's'}.
                        </p>

                        {tagModalMode === 'add' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Tags to Add (Comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Retargeted, High Intent, Offer Sent"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setTagsModalOpen(false)}
                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={handleAddTags}
                                        loading={isTagging}
                                        loadingText="Saving..."
                                        disabled={!tagInput.trim()}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold cursor-pointer border-none"
                                    >
                                        Save Tags
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {commonTagsOnSelected.length > 0 && !removeAllTagsOption && (
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1.5">
                                            Select existing tags to remove:
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-muted/30 rounded-lg border border-border">
                                            {commonTagsOnSelected.map(({ tag, count }) => {
                                                const isSelected = selectedTagsToRemove.includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTagsToRemove(prev =>
                                                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                                            );
                                                        }}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold'
                                                                : 'bg-background border-border text-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        <span>{tag}</span>
                                                        <span className="text-[10px] opacity-60">({count})</span>
                                                        {isSelected && <X className="h-3 w-3 text-rose-500 ml-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Or type tags to remove (comma-separated):
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Inactive, Lost Lead"
                                        value={tagInput}
                                        disabled={removeAllTagsOption}
                                        onChange={e => setTagInput(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    />
                                </div>

                                <div className="pt-1">
                                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
                                        <input
                                            type="checkbox"
                                            checked={removeAllTagsOption}
                                            onChange={e => setRemoveAllTagsOption(e.target.checked)}
                                            className="rounded border-input text-rose-600 focus:ring-rose-500"
                                        />
                                        <span className="font-medium text-rose-600 dark:text-rose-400">
                                            Remove ALL tags from selected contacts
                                        </span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setTagsModalOpen(false)}
                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={handleRemoveTags}
                                        loading={isTagging}
                                        loadingText="Removing..."
                                        disabled={!removeAllTagsOption && selectedTagsToRemove.length === 0 && !tagInput.trim()}
                                        variant="destructive"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold cursor-pointer border-none"
                                    >
                                        Remove Tags
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Global Confirmation Modal */}
            <ConfirmModal
                open={confirmState.open}
                onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                description={confirmState.description}
                variant={confirmState.variant}
                confirmText={confirmState.confirmText}
            />
        </div>
    );
}
