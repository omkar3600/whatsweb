"use client";

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import {
    Zap, Plus, ExternalLink, Trash2, RefreshCw, Type, Image as ImageIcon,
    MessageSquare, Phone, Globe, X, Smartphone, Library, LayoutGrid,
    Search, Filter, CheckCircle, AlertCircle, Clock, Copy, Eye, ArrowUpDown,
    FileText, Sparkles, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MediaGalleryModal from '@/components/MediaGalleryModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Button } from '@/components/ui/button';


// Render message body with highlighted variable tokens {{1}}, {{2}}
function HighlightedBody({ text }: { text: string }) {
    if (!text) return <span className="text-muted-foreground italic">No message body provided.</span>;

    const parts = text.split(/({{\d+}})/g);
    return (
        <span className="leading-relaxed whitespace-pre-wrap break-words">
            {parts.map((part, i) => {
                if (/^{{\d+}}$/.test(part)) {
                    return (
                        <span
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20 mx-0.5"
                        >
                            {part}
                        </span>
                    );
                }
                return part;
            })}
        </span>
    );
}

// Skeleton loading grid for template cards
function TemplateGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-5 w-20 bg-muted rounded-full" />
                    </div>
                    <div className="h-20 bg-muted/60 rounded-lg" />
                    <div className="flex justify-between items-center pt-2">
                        <div className="h-3 w-24 bg-muted/80 rounded" />
                        <div className="h-7 w-16 bg-muted rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TemplatesPage() {
    const { data: fetchedTemplates, mutate, isLoading } = useSWR<any>('/templates');
    const templates = Array.isArray(fetchedTemplates) ? fetchedTemplates : (Array.isArray(fetchedTemplates?.data) ? fetchedTemplates.data : []);
    const loading = isLoading && !fetchedTemplates;

    const { data: fetchedLibrary, isLoading: loadingLibrary } = useSWR<any[]>('/templates/library');
    const libraryTemplates = Array.isArray(fetchedLibrary) ? fetchedLibrary : [];

    const [activeTab, setActiveTab] = useState<'my-templates' | 'library'>('my-templates');
    const [libraryCategory, setLibraryCategory] = useState<'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('ALL');
    const [marketingSubCategory, setMarketingSubCategory] = useState<string>('ALL');
    const [syncing, setSyncing] = useState(false);

    // Search & Filter state for My Templates
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'name'>('newest');

    // Modal & Preview state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<any>(null);

    const [newTemplate, setNewTemplate] = useState({
        templateName: '',
        category: 'UTILITY',
        language: 'en_US',
        headerType: 'NONE' as 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT',
        headerText: '',
        bodyText: '',
        footerText: '',
        buttons: [] as any[],
        sampleValues: [] as string[],
        mediaUrl: '',
        mediaName: '',
    });

    const fetchTemplates = () => mutate();

    // Summary statistics
    const stats = useMemo(() => {
        const total = templates.length;
        const approved = templates.filter((t: any) => t.status === 'approved').length;
        const pending = templates.filter((t: any) => t.status === 'pending' || !t.status).length;
        const rejected = templates.filter((t: any) => t.status === 'rejected').length;
        return { total, approved, pending, rejected };
    }, [templates]);

    // Filter & Sort My Templates
    const filteredMyTemplates = useMemo(() => {
        return templates.filter((tpl: any) => {
            const matchesSearch = !search ||
                (tpl.templateName || '').toLowerCase().includes(search.toLowerCase()) ||
                (tpl.category || '').toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'pending' ? (tpl.status === 'pending' || !tpl.status) : tpl.status === statusFilter);

            const matchesCategory = categoryFilter === 'all' ||
                (tpl.category || '').toUpperCase() === categoryFilter.toUpperCase();

            return matchesSearch && matchesStatus && matchesCategory;
        }).sort((a: any, b: any) => {
            if (sortBy === 'name') return (a.templateName || '').localeCompare(b.templateName || '');
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }, [templates, search, statusFilter, categoryFilter, sortBy]);

    const addButton = () => {
        if (newTemplate.buttons.length >= 3) return;
        setNewTemplate({
            ...newTemplate,
            buttons: [...newTemplate.buttons, { type: 'QUICK_REPLY', text: '' }]
        });
    };

    const removeButton = (index: number) => {
        setNewTemplate({
            ...newTemplate,
            buttons: newTemplate.buttons.filter((_, i) => i !== index)
        });
    };

    const updateButton = (index: number, updates: any) => {
        const newButtons = [...newTemplate.buttons];
        newButtons[index] = { ...newButtons[index], ...updates };
        setNewTemplate({ ...newTemplate, buttons: newButtons });
    };

    const handleBodyTextChange = (text: string) => {
        const matches = text.match(/{{\d+}}/g) || [];
        const uniqueCount = new Set(matches).size;

        let newSamples = [...(newTemplate.sampleValues || [])];
        if (newSamples.length < uniqueCount) {
            newSamples = [...newSamples, ...Array(uniqueCount - newSamples.length).fill('')];
        } else if (newSamples.length > uniqueCount) {
            newSamples = newSamples.slice(0, uniqueCount);
        }

        setNewTemplate({ ...newTemplate, bodyText: text, sampleValues: newSamples });
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplate.templateName.trim()) {
            toast.error('Template name is required'); return;
        }
        if (!newTemplate.bodyText.trim()) {
            toast.error('Body text is required'); return;
        }
        if (newTemplate.headerType === 'TEXT' && !newTemplate.headerText.trim()) {
            toast.error('Header text is required when header type is TEXT'); return;
        }

        try {
            let headerHandle = null;
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(newTemplate.headerType)) {
                if (!newTemplate.mediaUrl) {
                    toast.error('Please select a sample file for the media header.'); return;
                }
                toast.loading('Processing media sample...', { id: 'upload' });
                try {
                    const res = await api.post('/templates/upload-media-url', { fileUrl: newTemplate.mediaUrl });
                    headerHandle = res.data.handle;
                    toast.success('Media processed', { id: 'upload' });
                } catch {
                    toast.error('Failed to process media sample.', { id: 'upload' }); return;
                }
            }

            const components: any[] = [];

            if (newTemplate.headerType !== 'NONE') {
                const headerObj: any = { type: 'HEADER', format: newTemplate.headerType };
                if (newTemplate.headerType === 'TEXT') {
                    headerObj.text = newTemplate.headerText;
                } else if (headerHandle) {
                    headerObj.example = { header_handle: [headerHandle] };
                }
                components.push(headerObj);
            }

            const bodyObj: any = { type: 'BODY', text: newTemplate.bodyText };
            if (newTemplate.sampleValues && newTemplate.sampleValues.length > 0) {
                if (newTemplate.sampleValues.some(v => !v.trim())) {
                    toast.error('Please provide sample values for all body variables.'); return;
                }
                bodyObj.example = { body_text: [newTemplate.sampleValues] };
            }
            components.push(bodyObj);

            if (newTemplate.footerText) {
                components.push({ type: 'FOOTER', text: newTemplate.footerText });
            }

            if (newTemplate.buttons.length > 0) {
                components.push({
                    type: 'BUTTONS',
                    buttons: newTemplate.buttons.map((btn: any) => {
                        const b: any = { type: btn.type, text: btn.text };
                        if (btn.type === 'URL') b.url = btn.url;
                        if (btn.type === 'PHONE_NUMBER') b.phone_number = btn.phone_number;
                        return b;
                    })
                });
            }

            const payload = {
                templateName: newTemplate.templateName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'),
                category: newTemplate.category,
                language: newTemplate.language,
                components
            };

            await api.post('/templates', payload);
            toast.success('Template submitted to Meta!');
            setIsModalOpen(false);
            setNewTemplate({
                templateName: '',
                category: 'UTILITY',
                language: 'en_US',
                headerType: 'NONE',
                headerText: '',
                bodyText: '',
                footerText: '',
                buttons: [],
                sampleValues: [],
                mediaUrl: '',
                mediaName: ''
            });
            fetchTemplates();
        } catch (err: any) {
            console.error(err);
            const metaMsg = err.response?.data?.message || err.response?.data?.error?.message;
            toast.error(metaMsg || 'Failed to create template');
        }
    };

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ open: false, title: '', description: '', action: () => {} });

    const deleteTemplate = (id: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Template',
            description: 'Warning: This will permanently delete the template from WhatsWeb and Meta. Any campaigns using this template will also be deleted.',
            action: async () => {
                try {
                    await api.delete(`/templates/${id}`);
                    toast.success('Template deleted');
                    fetchTemplates();
                } catch (err: any) {
                    console.error(err);
                    const msg = err.response?.data?.message || 'Failed to delete template';
                    toast.error(msg);
                } finally {
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/templates/sync');
            fetchTemplates();
            toast.success('Template statuses synced with Meta');
        } catch (err) {
            console.error(err);
            toast.error("Failed to sync templates with Meta");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">

            {/* ── Page Header ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Message Templates</h1>
                        <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {stats.total} total
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Manage, sync, and deploy Meta-approved WhatsApp template messages.</p>
                </div>

                {/* Primary Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        loading={syncing}
                        loadingText="Syncing..."
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs"
                        title="Sync latest approval statuses from Meta"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Sync Status</span>
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-all border-none"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Template</span>
                    </Button>
                </div>
            </div>

            {/* ── Executive Stat Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Total Templates</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{stats.total}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Zap className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Approved</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.approved}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Pending Review</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.pending}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Library Ready</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{libraryTemplates.length}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Library className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* ── Tabs Navigation ───────────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('my-templates')}
                    className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 px-1 ${
                        activeTab === 'my-templates'
                            ? 'border-primary text-foreground font-bold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>My Templates</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {templates.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('library')}
                    className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 px-1 ${
                        activeTab === 'library'
                            ? 'border-primary text-foreground font-bold'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Library className="h-3.5 w-3.5" />
                    <span>Template Library</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {libraryTemplates.length}
                    </span>
                </button>
            </div>

            {/* ── MY TEMPLATES TAB ──────────────────────────────────────────── */}
            {activeTab === 'my-templates' && (
                <div className="space-y-4">
                    {/* Search & Filter Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-card border border-border rounded-xl shadow-2xs">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search templates by name, body, or category..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-8 py-1.5 bg-muted/30 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Status Filter Dropdown */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">All Statuses</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending Review</option>
                                <option value="rejected">Rejected</option>
                            </select>

                            {/* Category Filter Dropdown */}
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="all">All Categories</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utility</option>
                                <option value="AUTHENTICATION">Authentication</option>
                            </select>

                            {/* Sort Dropdown */}
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="newest">Newest First</option>
                                <option value="name">Name A-Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Template Card Grid */}
                    {loading ? (
                        <TemplateGridSkeleton />
                    ) : filteredMyTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMyTemplates.map((tpl: any) => {
                                const bodyComp = tpl.components?.find((c: any) => c.type === 'BODY')?.text || tpl.bodyText || '';
                                const headerComp = tpl.components?.find((c: any) => c.type === 'HEADER');
                                const footerComp = tpl.components?.find((c: any) => c.type === 'FOOTER')?.text || tpl.footerText;
                                const buttons = tpl.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || tpl.buttons || [];

                                return (
                                    <div
                                        key={tpl.id}
                                        className="rounded-xl border border-border bg-card p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 group"
                                    >
                                        <div className="space-y-2.5">
                                            {/* Card Top Row: Name + Status Badge */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <h3 className="text-xs font-bold font-mono text-foreground truncate" title={tpl.templateName}>
                                                            {tpl.templateName}
                                                        </h3>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                                                        {tpl.category?.toLowerCase()} • <span className="uppercase">{tpl.language}</span>
                                                    </p>
                                                </div>

                                                {/* Status Pill Badge */}
                                                {tpl.status === 'approved' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                                        <CheckCircle className="h-3 w-3" /> Approved
                                                    </span>
                                                ) : tpl.status === 'rejected' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 shrink-0">
                                                        <AlertCircle className="h-3 w-3" /> Rejected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </span>
                                                )}
                                            </div>

                                            {/* Rendered Message Canvas Bubble */}
                                            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-2 text-xs text-foreground">
                                                {headerComp && (
                                                    <div className="font-semibold text-xs border-b border-border/40 pb-1 text-foreground">
                                                        {headerComp.text || `[Header: ${headerComp.format || 'Media'}]`}
                                                    </div>
                                                )}

                                                <div className="text-xs text-foreground leading-relaxed">
                                                    <HighlightedBody text={bodyComp} />
                                                </div>

                                                {footerComp && (
                                                    <p className="text-[10px] text-muted-foreground italic border-t border-border/40 pt-1">
                                                        {footerComp}
                                                    </p>
                                                )}

                                                {buttons.length > 0 && (
                                                    <div className="flex flex-col gap-1 border-t border-border/40 pt-2">
                                                        {buttons.map((btn: any, i: number) => (
                                                            <div key={i} className="text-[10px] text-center bg-background/80 rounded py-1 font-semibold border border-border text-foreground">
                                                                {btn.text || btn.title || btn}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Action Footer */}
                                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                                            <button
                                                onClick={() => setPreviewTemplate(tpl)}
                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>Preview</span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(tpl.templateName);
                                                        toast.success('Template name copied');
                                                    }}
                                                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-all border-none"
                                                    title="Copy template name"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => deleteTemplate(tpl.id)}
                                                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all border-none"
                                                    title="Delete Template"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-muted-foreground space-y-3 bg-card border border-border rounded-xl">
                            <Zap className="mx-auto h-10 w-10 opacity-30 text-foreground" />
                            <h3 className="text-xs font-semibold text-foreground">No templates found</h3>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                                    ? 'No templates match your search or filter parameters.'
                                    : 'Create and submit templates to Meta for approval before launching bulk campaigns.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── TEMPLATE LIBRARY TAB ────────────────────────────────────────── */}
            {activeTab === 'library' && (
                <div className="space-y-4">
                    {/* Category Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setLibraryCategory(cat as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                                    libraryCategory === cat
                                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {cat === 'ALL' ? 'All Templates' : cat}
                            </button>
                        ))}
                    </div>

                    {/* Subcategories if Marketing */}
                    {libraryCategory === 'MARKETING' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Subcategory:</span>
                            {['ALL', 'Stock Alerts', 'Festivals', 'Promotions', 'Retention', 'General'].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setMarketingSubCategory(sub)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 border ${
                                        marketingSubCategory === sub
                                            ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                            : 'bg-card border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Library Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingLibrary ? (
                            <TemplateGridSkeleton />
                        ) : (
                            libraryTemplates
                                .filter((tpl: any) => libraryCategory === 'ALL' ? true : tpl.category === libraryCategory)
                                .filter((tpl: any) => libraryCategory === 'MARKETING' && marketingSubCategory !== 'ALL' ? tpl.subCategory === marketingSubCategory : true)
                                .map((tpl: any) => (
                                    <div
                                        key={tpl.id}
                                        className="rounded-xl border border-border bg-card p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                    {tpl.industry}
                                                </span>
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                                    {tpl.category}
                                                </span>
                                            </div>

                                            <h3 className="text-xs font-bold text-foreground">{tpl.name}</h3>
                                            <p className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded inline-block">
                                                {tpl.templateName}
                                            </p>

                                            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground leading-relaxed line-clamp-4">
                                                {tpl.bodyText}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                                            <button
                                                onClick={() => setPreviewTemplate(tpl)}
                                                className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                title="Preview on Mobile"
                                            >
                                                <Smartphone className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const randomSuffix = Math.random().toString(36).substring(2, 6);
                                                    setNewTemplate({ ...tpl, templateName: `${tpl.templateName}_${randomSuffix}` });
                                                    setIsModalOpen(true);
                                                }}
                                                className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>Use Template</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Create Template Modal ─────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Create Message Template</h3>
                                <p className="text-xs text-muted-foreground">Configure WhatsApp components and submit to Meta for approval.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal Body: Form + Preview Grid */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Form Side */}
                            <form onSubmit={handleCreateTemplate} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                                {/* Basic Details */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Details</h4>
                                    <div>
                                        <label className="block font-medium text-foreground mb-1">Template Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. order_confirmation"
                                            className="w-full rounded-lg border border-border bg-background font-mono text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                            value={newTemplate.templateName}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, templateName: e.target.value })}
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">Lowercase, numbers, and underscores only.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-medium text-foreground mb-1">Category</label>
                                            <select
                                                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={newTemplate.category}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                                            >
                                                <option value="MARKETING">Marketing</option>
                                                <option value="UTILITY">Utility</option>
                                                <option value="AUTHENTICATION">Authentication</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block font-medium text-foreground mb-1">Language</label>
                                            <select
                                                className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={newTemplate.language}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                                            >
                                                <option value="en_US">English (US)</option>
                                                <option value="en_GB">English (UK)</option>
                                                <option value="es_ES">Spanish</option>
                                                <option value="hi_IN">Hindi</option>
                                                <option value="mr_IN">Marathi</option>
                                                <option value="fr_FR">French</option>
                                                <option value="de_DE">German</option>
                                                <option value="pt_BR">Portuguese</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Format */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <label className="block font-medium text-foreground">Header Format (Optional)</label>
                                    <div className="flex bg-muted/60 p-1 rounded-lg border border-border/40 gap-1">
                                        {['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNewTemplate({ ...newTemplate, headerType: type as any })}
                                                className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${
                                                    newTemplate.headerType === type
                                                        ? 'bg-background shadow-2xs text-foreground font-bold'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {type === 'NONE' ? 'Off' : type}
                                            </button>
                                        ))}
                                    </div>

                                    {newTemplate.headerType === 'TEXT' && (
                                        <input
                                            type="text"
                                            maxLength={60}
                                            placeholder="Header text..."
                                            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                            value={newTemplate.headerText}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
                                        />
                                    )}

                                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(newTemplate.headerType) && (
                                        <div
                                            onClick={() => setIsGalleryOpen(true)}
                                            className="p-3 border border-dashed border-border rounded-lg bg-muted/20 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                                        >
                                            <ImageIcon className="h-5 w-5 mx-auto text-primary opacity-60 mb-1" />
                                            <p className="text-xs font-semibold text-foreground">
                                                {newTemplate.mediaName ? newTemplate.mediaName : 'Select Media Sample from Gallery'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Meta requires a sample media file for approval.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Message Body */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <label className="block font-medium text-foreground">Message Body</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Hello {{1}}, your order #{{2}} has been confirmed..."
                                        className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                                        value={newTemplate.bodyText}
                                        onChange={(e) => handleBodyTextChange(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} for dynamic variables.</p>

                                    {/* Variable Samples */}
                                    {(newTemplate.sampleValues || []).length > 0 && (
                                        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                                            <p className="text-[11px] font-semibold text-foreground">Sample Values for Variables</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {newTemplate.sampleValues.map((val, idx) => (
                                                    <div key={idx}>
                                                        <label className="text-[10px] text-muted-foreground">{"{{"}{idx + 1}{"}}"} sample</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. John"
                                                            className="w-full mt-0.5 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                            value={val}
                                                            onChange={(e) => {
                                                                const newVals = [...newTemplate.sampleValues];
                                                                newVals[idx] = e.target.value;
                                                                setNewTemplate({ ...newTemplate, sampleValues: newVals });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="space-y-1 border-t border-border pt-4">
                                    <label className="block font-medium text-foreground">Footer (Optional)</label>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        placeholder="e.g. Reply STOP to unsubscribe"
                                        className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={newTemplate.footerText}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })}
                                    />
                                </div>

                                {/* Interactive Buttons */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block font-medium text-foreground">Buttons (Optional)</label>
                                        <button
                                            type="button"
                                            onClick={addButton}
                                            disabled={(newTemplate.buttons ?? []).length >= 3}
                                            className="text-[10px] font-semibold px-2 py-1 bg-muted hover:bg-muted/80 rounded border border-border disabled:opacity-40"
                                        >
                                            + Add Button
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {(newTemplate.buttons ?? []).map((btn: any, i: number) => (
                                            <div key={i} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2 relative">
                                                <button onClick={() => removeButton(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        className="rounded border border-border bg-background text-foreground px-2 py-1 text-xs focus:outline-none"
                                                        value={btn.type}
                                                        onChange={(e) => updateButton(i, { type: e.target.value })}
                                                    >
                                                        <option value="QUICK_REPLY">Quick Reply</option>
                                                        <option value="URL">Visit Website</option>
                                                        <option value="PHONE_NUMBER">Call Number</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Button Label"
                                                        className="rounded border border-border bg-background text-foreground px-2 py-1 text-xs focus:outline-none"
                                                        value={btn.text}
                                                        onChange={(e) => updateButton(i, { text: e.target.value })}
                                                    />
                                                </div>
                                                {btn.type === 'URL' && (
                                                    <input
                                                        type="text"
                                                        placeholder="https://example.com"
                                                        className="w-full rounded border border-border bg-background font-mono text-foreground px-2 py-1 text-xs focus:outline-none"
                                                        value={btn.url || ''}
                                                        onChange={(e) => updateButton(i, { url: e.target.value })}
                                                    />
                                                )}
                                                {btn.type === 'PHONE_NUMBER' && (
                                                    <input
                                                        type="text"
                                                        placeholder="+1234567890"
                                                        className="w-full rounded border border-border bg-background font-mono text-foreground px-2 py-1 text-xs focus:outline-none"
                                                        value={btn.phone_number || ''}
                                                        onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="submit"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            await handleCreateTemplate(e as any);
                                        }}
                                        loadingText="Submitting..."
                                        className="px-4 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs border-none cursor-pointer"
                                    >
                                        Submit to Meta
                                    </Button>
                                </div>
                            </form>

                            {/* Preview Side (Hidden on mobile) */}
                            <div className="hidden lg:flex w-80 bg-muted/20 p-6 border-l border-border flex-col items-center justify-start overflow-y-auto">
                                <span className="text-xs font-semibold text-muted-foreground mb-4">Live WhatsApp Preview</span>
                                <div className="w-full max-w-[260px] bg-card rounded-2xl p-3 border border-border shadow-md space-y-2 text-xs">
                                    {newTemplate.headerType !== 'NONE' && (
                                        <div className="font-semibold text-xs border-b border-border/40 pb-1 text-foreground">
                                            {newTemplate.headerText || `[Header: ${newTemplate.headerType}]`}
                                        </div>
                                    )}

                                    <div className="text-xs text-foreground leading-relaxed">
                                        <HighlightedBody text={newTemplate.bodyText || 'Your template body text preview...'} />
                                    </div>

                                    {newTemplate.footerText && (
                                        <p className="text-[10px] text-muted-foreground italic border-t border-border/40 pt-1">
                                            {newTemplate.footerText}
                                        </p>
                                    )}

                                    {newTemplate.buttons.length > 0 && (
                                        <div className="flex flex-col gap-1 border-t border-border/40 pt-2">
                                            {newTemplate.buttons.map((btn: any, i: number) => (
                                                <div key={i} className="text-[10px] text-center bg-muted/50 rounded py-1 font-semibold border border-border text-foreground">
                                                    {btn.text || 'Button label'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MediaGalleryModal
                open={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                selectLabel="Select Sample"
                showDelete={false}
                onSelect={(item) => {
                    setNewTemplate({ ...newTemplate, mediaUrl: item.fileUrl, mediaName: item.fileName || 'Selected Media' });
                    setIsGalleryOpen(false);
                }}
            />

            {/* Quick Mobile/Modal Preview */}
            {previewTemplate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-sm bg-card p-5 rounded-xl border border-border shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-xs font-semibold text-foreground">Template Preview</h3>
                            <button onClick={() => setPreviewTemplate(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2 text-xs">
                            <div className="font-semibold text-xs text-foreground">
                                {previewTemplate.templateName}
                            </div>

                            <div className="text-xs text-foreground leading-relaxed">
                                <HighlightedBody text={previewTemplate.bodyText || previewTemplate.components?.find((c: any) => c.type === 'BODY')?.text || ''} />
                            </div>

                            {previewTemplate.footerText && (
                                <p className="text-[10px] text-muted-foreground italic border-t border-border/40 pt-1">
                                    {previewTemplate.footerText}
                                </p>
                            )}
                        </div>
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
                variant="destructive"
                confirmText="Delete Template"
            />
        </div>
    );
}
