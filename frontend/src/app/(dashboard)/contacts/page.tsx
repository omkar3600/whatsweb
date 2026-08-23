"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import {
    Plus, Search, Edit2, Trash2, Upload, Users, MessageSquare,
    Download, Loader2, FileSpreadsheet, X, CheckCircle, AlertCircle,
    Filter, Tag, MapPin, CheckSquare, Sparkles, ChevronRight,
    ShieldCheck, ShieldOff, ShieldAlert, Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TableSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';


const CONSENT_STATUSES = ['OPTED_IN', 'OPTED_OUT', 'PENDING', 'UNKNOWN'];

const ConsentBadge = ({ status }: { status: string }) => {
    const s = status || 'UNKNOWN';
    const styles: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
        OPTED_IN: { label: 'Opted In', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: <ShieldCheck className="h-3 w-3" /> },
        OPTED_OUT: { label: 'Opted Out', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', icon: <ShieldOff className="h-3 w-3" /> },
        PENDING: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', icon: <ShieldAlert className="h-3 w-3" /> },
        UNKNOWN: { label: 'Unknown', cls: 'bg-muted text-muted-foreground border-border', icon: <Shield className="h-3 w-3" /> },
    };
    const cfg = styles[s] || styles.UNKNOWN;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

export default function ContactsPage() {
    const [consentFilter, setConsentFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('whatshub_contacts_limit');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if ([50, 100, 1000, 50000, 100000].includes(parsed)) return parsed;
            }
        }
        return 100;
    });
    const router = useRouter();

    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
        setSelectAllMatching(false);
        setSelectedContacts([]);
    }, [debouncedSearch, selectedTags, selectedCities, consentFilter, sortBy, sortOrder, pageSize]);

    const qs = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() });
    if (consentFilter !== 'all') qs.append('consent', consentFilter);
    if (selectedTags.length > 0) qs.append('tags', selectedTags.join(','));
    if (selectedCities.length > 0) qs.append('cities', selectedCities.join(','));
    if (sortBy !== 'createdAt') qs.append('sortBy', sortBy);
    if (sortOrder !== 'desc') qs.append('sortOrder', sortOrder);
    if (debouncedSearch) qs.append('search', debouncedSearch);

    const { data: fetchedData, mutate, isLoading } = useSWR(`/contacts?${qs.toString()}`);
    const contacts = Array.isArray(fetchedData?.data) ? fetchedData.data : [];
    const hasMore = fetchedData?.page < fetchedData?.totalPages;
    
    const { data: statsData } = useSWR('/contacts/stats');
    const stats = statsData || { total: 0, taggedCount: 0, citiesCount: 0, optedIn: 0, optedOut: 0, consentUnknown: 0 };
    
    const { data: tagsData } = useSWR('/contacts/tags');
    const availableTags = (tagsData || []).map((t: any) => t.tag);

    const { data: citiesData } = useSWR('/contacts/cities');
    const availableCities = Array.isArray(citiesData) ? citiesData : [];

    const handleSelectAllMatching = async () => {
        try {
            const res = await api.get(`/contacts/all-ids?${qs.toString()}`);
            if (res.data?.ids) {
                setSelectedContacts(res.data.ids);
                setSelectAllMatching(true);
                toast.success(`Selected all ${res.data.ids.length} contacts matching filters`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to select all contacts');
        }
    };

    const toggleFilter = (setFn: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        setFn(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        city: '',
        tags: '',
    });

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const fetchContacts = () => mutate();

    // Bulk Tag Management
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [tagModalMode, setTagModalMode] = useState<'add' | 'remove'>('add');
    const [tagInput, setTagInput] = useState('');
    const [selectedTagsToRemove, setSelectedTagsToRemove] = useState<string[]>([]);
    const [removeAllTagsOption, setRemoveAllTagsOption] = useState(false);
    const [isTagging, setIsTagging] = useState(false);

    const selectedContactsObjects = useMemo(() => {
        if (selectedContacts.length === 0 || !Array.isArray(contacts)) return [];
        const idSet = new Set(selectedContacts);
        return contacts.filter((c: any) => idSet.has(c.id));
    }, [contacts, selectedContacts]);

    const commonTagsOnSelectedContacts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const c of selectedContactsObjects) {
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
    }, [selectedContactsObjects]);

    const handleBulkAddTags = async () => {
        if (selectedContacts.length === 0 || !tagInput.trim()) return;
        const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        if (tags.length === 0) return;

        setIsTagging(true);
        try {
            await api.post('/contacts/tags/add', {
                contactIds: selectedContacts,
                tags,
            });
            toast.success(`Tags added to ${selectedContacts.length} contacts`);
            setTagModalOpen(false);
            setTagInput('');
            setSelectedContacts([]);
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add tags');
        } finally {
            setIsTagging(false);
        }
    };

    const handleBulkRemoveTags = async () => {
        if (selectedContacts.length === 0) return;
        const manualTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        const tagsToRemove = Array.from(new Set([...selectedTagsToRemove, ...manualTags]));

        if (!removeAllTagsOption && tagsToRemove.length === 0) {
            toast.error('Please select or type at least one tag to remove');
            return;
        }

        setIsTagging(true);
        try {
            await api.post('/contacts/tags/remove', {
                contactIds: selectedContacts,
                tags: tagsToRemove,
                removeAll: removeAllTagsOption,
            });
            toast.success(removeAllTagsOption ? `All tags removed from ${selectedContacts.length} contacts` : `Tags removed from ${selectedContacts.length} contacts`);
            setTagModalOpen(false);
            setTagInput('');
            setSelectedTagsToRemove([]);
            setRemoveAllTagsOption(false);
            setSelectedContacts([]);
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove tags');
        } finally {
            setIsTagging(false);
        }
    };



    const handleCreateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newContact,
                tags: newContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
            };
            if (editingContactId) {
                await api.put(`/contacts/${editingContactId}`, payload);
                toast.success('Contact updated');
            } else {
                await api.post('/contacts', payload);
                toast.success('Contact added');
            }
            setIsModalOpen(false);
            setEditingContactId(null);
            setNewContact({ name: '', phone: '', city: '', tags: '' });
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error(editingContactId ? 'Failed to update contact' : 'Failed to add contact');
        }
    };

    const handleExportFile = () => {
        if (!contacts || contacts.length === 0) {
            toast.error("No contacts to export");
            return;
        }

        const exportList = selectedContacts.length > 0
            ? contacts.filter((c: any) => selectedContacts.includes(c.id))
            : contacts;
        const data = exportList.map((c: any) => ({
            Phone: c.phone || '',
            Name: c.name || '',
            Tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
            City: c.city || '',
            Notes: c.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
        XLSX.writeFile(wb, "contacts_export.xlsx");
        toast.success(`Exported ${exportList.length} contacts`);
    };

    const handleDownloadSample = () => {
        const sampleData = [{
            Phone: '919876543210',
            Name: 'John Doe',
            Tags: 'VIP, New',
            City: 'New York',
            Notes: 'Follow up soon'
        }];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sample");
        XLSX.writeFile(wb, "contacts_import_sample.xlsx");
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
            toast.error('Only .xlsx, .xls, or .csv files are supported');
            return;
        }

        setIsImporting(true);
        setImportResult(null);
        setImportProgress(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

            if (!rows.length) {
                toast.error('The file is empty or has no data rows.');
                setIsImporting(false);
                return;
            }

            const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const headerMap: Record<string, string> = {};
            const rawHeaders = Object.keys(rows[0]);
            for (const h of rawHeaders) {
                const norm = normalizeKey(h);
                if (['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber', 'number', 'contact'].includes(norm)) {
                    headerMap[h] = 'phone';
                } else if (['name', 'fullname', 'contactname', 'customername'].includes(norm)) {
                    headerMap[h] = 'name';
                } else if (['tags', 'tag', 'label', 'labels', 'group', 'groups'].includes(norm)) {
                    headerMap[h] = 'tags';
                } else if (['city', 'location', 'area'].includes(norm)) {
                    headerMap[h] = 'city';
                } else if (['notes', 'note', 'comment', 'comments', 'description'].includes(norm)) {
                    headerMap[h] = 'notes';
                }
            }

            if (!Object.values(headerMap).includes('phone')) {
                toast.error('Could not find a "Phone" column.');
                setIsImporting(false);
                return;
            }

            const mappedRows = rows.map(row => {
                const mapped: any = {};
                for (const [rawKey, mappedKey] of Object.entries(headerMap)) {
                    mapped[mappedKey] = row[rawKey];
                }
                return mapped;
            });

            const CHUNK_SIZE = 50;
            const total = mappedRows.length;
            let totalImported = 0;
            let totalSkipped = 0;
            let allErrors: string[] = [];

            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = mappedRows.slice(i, i + CHUNK_SIZE);
                setImportProgress({ current: Math.min(i + CHUNK_SIZE, total), total });

                try {
                    const res = await api.post('/contacts/bulk', { rows: chunk });
                    totalImported += res.data.imported;
                    totalSkipped += res.data.skipped;
                    allErrors = [...allErrors, ...res.data.errors];
                } catch (e) {
                    console.error("Chunk failed", e);
                    totalSkipped += chunk.length;
                    allErrors.push(`Batch ${i / CHUNK_SIZE + 1} failed completely.`);
                }
            }

            setImportResult({ imported: totalImported, skipped: totalSkipped, errors: allErrors.slice(0, 50) });
            toast.success(`Imported ${totalImported} contacts`);
            fetchContacts();
        } catch (err: any) {
            toast.error('Failed to parse or import Excel file.');
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    };



    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'destructive' | 'warning' | 'primary';
        confirmText?: string;
        reason?: boolean;
    }>({ open: false, title: '', description: '', action: () => {} });
    // consentReason is backed by a ref so the ConfirmModal action closures always
    // read the latest typed value (a plain state capture would see the empty value).
    const [consentReason, setConsentReasonState] = useState('');
    const consentReasonRef = useRef('');
    const setConsentReason = (r: string) => {
        consentReasonRef.current = r;
        setConsentReasonState(r);
    };
    const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

    const deleteContact = (id: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Contact',
            description: 'Are you sure you want to delete this contact? This action cannot be undone.',
            variant: 'destructive',
            confirmText: 'Delete Contact',
            action: async () => {
                try {
                    await api.delete(`/contacts/${id}`);
                    toast.success('Contact deleted');
                    fetchContacts();
                } catch (err) { console.error(err); toast.error("An unexpected error occurred"); }
                finally { setConfirmState(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedContacts.length === 0) return;
        setConfirmState({
            open: true,
            title: 'Delete Selected Contacts',
            description: `Are you sure you want to delete ${selectedContacts.length} selected contacts? This action cannot be undone.`,
            variant: 'destructive',
            confirmText: `Delete ${selectedContacts.length} Contacts`,
            action: async () => {
                try {
                    await api.delete('/contacts/bulk', { data: { ids: selectedContacts } });
                    toast.success('Selected contacts deleted');
                    setSelectedContacts([]);
                    fetchContacts();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to delete contacts');
                } finally { setConfirmState(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleNormalize = () => {
        setConfirmState({
            open: true,
            title: 'Normalize Contacts',
            description: 'Are you sure you want to normalize contact phone numbers? This will standardize country codes and tag invalid numbers.',
            variant: 'warning',
            confirmText: 'Normalize Contacts',
            action: async () => {
                try {
                    const res = await api.post('/contacts/normalize');
                    toast.success(`Normalized: ${res.data.updated} updated, ${res.data.invalid} invalid marked`);
                    fetchContacts();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to normalize contacts');
                } finally { setConfirmState(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleStartChat = async (contactId: string) => {
        try {
            const { data } = await api.post(`/conversations/contact/${contactId}`);
            router.push(`/inbox?convoId=${data.id}`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to start conversation');
        }
    };

    // ── Consent actions ────────────────────────────────────────────
    const handleOptIn = async (contactId: string) => {
        try {
            await api.patch(`/contacts/${contactId}/consent`, { status: 'OPTED_IN', source: 'ADMIN', reason: consentReasonRef.current });
            toast.success('Contact opted in');
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to opt in contact');
        }
    };

    const handleOptOut = async (contactId: string) => {
        try {
            await api.patch(`/contacts/${contactId}/consent`, { status: 'OPTED_OUT', source: 'ADMIN', reason: consentReasonRef.current });
            toast.success('Contact opted out');
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to opt out contact');
        }
    };

    const openOptInConfirm = (contactId: string) => {
        setConsentReason('');
        setConfirmState({
            open: true,
            title: 'Opt In Contact',
            description: `Mark this contact as opted-in for marketing messages?`,
            variant: 'primary',
            confirmText: 'Opt In',
            reason: true,
            action: async () => { await handleOptIn(contactId); setConfirmState(prev => ({ ...prev, open: false })); }
        });
    };

    const openOptOutConfirm = (contactId: string) => {
        setConsentReason('');
        setConfirmState({
            open: true,
            title: 'Opt Out Contact',
            description: `Mark this contact as opted-out? They will stop receiving marketing messages.`,
            variant: 'destructive',
            confirmText: 'Opt Out',
            reason: true,
            action: async () => { await handleOptOut(contactId); setConfirmState(prev => ({ ...prev, open: false })); }
        });
    };

    const handleBulkOptIn = async () => {
        if (selectedContacts.length === 0) return;
        setIsUpdatingConsent(true);
        try {
            await api.post('/contacts/bulk-consent-update', { contactIds: selectedContacts, status: 'OPTED_IN', source: 'ADMIN', reason: consentReasonRef.current || 'Bulk opt in' });
            toast.success(`${selectedContacts.length} contacts opted in`);
            setSelectedContacts([]);
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to opt in selected contacts');
        } finally {
            setIsUpdatingConsent(false);
            setConfirmState(prev => ({ ...prev, open: false }));
        }
    };

    const handleBulkOptOut = async () => {
        if (selectedContacts.length === 0) return;
        setIsUpdatingConsent(true);
        try {
            await api.post('/contacts/bulk-consent-update', { contactIds: selectedContacts, status: 'OPTED_OUT', source: 'ADMIN', reason: consentReasonRef.current || 'Bulk opt out' });
            toast.success(`${selectedContacts.length} contacts opted out`);
            setSelectedContacts([]);
            fetchContacts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to opt out selected contacts');
        } finally {
            setIsUpdatingConsent(false);
            setConfirmState(prev => ({ ...prev, open: false }));
        }
    };

    const openBulkOptInConfirm = () => {
        setConsentReason('');
        setConfirmState({
            open: true,
            title: 'Bulk Opt In',
            description: `Opt in ${selectedContacts.length} selected contacts for marketing messages?`,
            variant: 'primary',
            confirmText: `Opt In ${selectedContacts.length} Contacts`,
            reason: true,
            action: handleBulkOptIn
        });
    };

    const openBulkOptOutConfirm = () => {
        setConsentReason('');
        setConfirmState({
            open: true,
            title: 'Bulk Opt Out',
            description: `Opt out ${selectedContacts.length} selected contacts? They will stop receiving marketing messages.`,
            variant: 'destructive',
            confirmText: `Opt Out ${selectedContacts.length} Contacts`,
            reason: true,
            action: handleBulkOptOut
        });
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
            <input type="file" ref={importFileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />

            {/* ── Page Header ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
                        <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            {stats.total} total
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Manage audience profiles, tags, and bulk operations.</p>
                </div>

                {/* Primary Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNormalize}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs"
                        title="Normalize contacts phone numbers"
                    >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="hidden sm:inline">Normalize</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSample}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs"
                        title="Download sample Excel format"
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Sample</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportFile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => importFileRef.current?.click()}
                        loading={isImporting}
                        loadingText={importProgress ? `Importing ${importProgress.current}/${importProgress.total}` : 'Importing...'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs"
                    >
                        <Upload className="h-3.5 w-3.5" /> <span>Import</span>
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                            setEditingContactId(null);
                            setNewContact({ name: '', phone: '', city: '', tags: '' });
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-all border-none"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Contact</span>
                    </Button>
                </div>
            </div>

            {/* ── Executive Stat Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Total Audience</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{stats.total}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Tagged Contacts</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{stats.taggedCount}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Tag className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Cities Represented</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{stats.citiesCount}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <MapPin className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Opted In</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.optedIn}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Opted Out</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">{stats.optedOut}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                        <ShieldOff className="h-4 w-4" />
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground">Unknown</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.consentUnknown}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Shield className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* ── Import Complete Result Banner ───────────────────────────────── */}
            {importResult && (
                <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-foreground">Import Processing Completed</h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Successfully imported <strong>{importResult.imported}</strong> contacts ({importResult.skipped} skipped).
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {importResult.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg max-h-24 overflow-y-auto text-[11px] text-destructive space-y-0.5 font-mono">
                            {importResult.errors.map((err, i) => (
                                <p key={i}>• {err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Search, Tag Filter & Bulk Actions Bar ──────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-card border border-border rounded-xl shadow-2xs">
                
                {/* Search & Tag Filter Inputs */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or city..."
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

                    {/* Consent Filter Dropdown */}
                    <select
                        value={consentFilter}
                        onChange={e => setConsentFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                        title="Filter by marketing consent status"
                    >
                        <option value="all">All Consent</option>
                        <option value="OPTED_IN">🟢 Opted In</option>
                        <option value="OPTED_OUT">🔴 Opted Out</option>
                        <option value="UNKNOWN">🟡 Unknown</option>
                    </select>

                    {/* Advanced Filters Toggle */}
                    <Button
                        variant={showAdvancedFilters ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="px-2.5 py-1.5 h-auto text-xs"
                    >
                        <Filter className="h-3.5 w-3.5 mr-1" />
                        Filters {(selectedTags.length > 0 || selectedCities.length > 0 || sortBy !== 'createdAt') ? (
                            <span className="ml-1 flex h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                    </Button>
                </div>

                {/* Bulk Actions Context Toolbar */}

                {selectedContacts.length > 0 ? (
                    <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150 bg-muted/60 p-1 rounded-lg border border-border flex-wrap">
                        <span className="text-xs font-semibold px-2 text-foreground">
                            {selectedContacts.length} selected
                        </span>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={handleExportFile}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-background border border-border text-foreground hover:bg-muted transition-all"
                        >
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                                setTagModalMode('add');
                                setTagInput('');
                                setSelectedTagsToRemove([]);
                                setRemoveAllTagsOption(false);
                                setTagModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                            <Tag className="h-3 w-3 mr-1" />
                            Add Tags
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                                setTagModalMode('remove');
                                setTagInput('');
                                setSelectedTagsToRemove([]);
                                setRemoveAllTagsOption(false);
                                setTagModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                            <Tag className="h-3 w-3 mr-1" />
                            Remove Tags
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={openBulkOptInConfirm}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Opt In
                        </Button>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={openBulkOptOutConfirm}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                        >
                            <ShieldOff className="h-3 w-3 mr-1" />
                            Opt Out
                        </Button>
                        <Button
                            variant="destructive"
                            size="xs"
                            onClick={handleBulkDelete}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all border-none"
                        >
                            Delete
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelectedContacts([])}
                            className="p-1 text-muted-foreground hover:text-foreground border-none"
                            title="Deselect All"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <select
                            value={pageSize}
                            onChange={e => {
                                const newLimit = Number(e.target.value);
                                setPageSize(newLimit);
                                setPage(1);
                                try { localStorage.setItem('whatshub_contacts_limit', newLimit.toString()); } catch {}
                            }}
                            className="bg-muted/30 border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hidden sm:inline-block"
                            title="Contacts per page"
                        >
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                            <option value={1000}>1,000 per page</option>
                            <option value={50000}>50,000 per page</option>
                            <option value={100000}>100,000 per page</option>
                        </select>
                        <span className="text-xs text-muted-foreground px-2 hidden sm:inline">
                            Showing {(fetchedData?.total || 0)} of {stats.total}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Advanced Filters Panel ─────────────────────────────────────── */}
            {showAdvancedFilters && (
                <div className="p-4 bg-card border border-border rounded-xl shadow-2xs animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Tags Filter */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5" /> Tags
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                {availableTags.length === 0 && <span className="text-xs text-muted-foreground">No tags available</span>}
                                {availableTags.map((tag: string) => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleFilter(setSelectedTags, tag)}
                                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                                            selectedTags.includes(tag) 
                                            ? 'bg-primary/10 text-primary border-primary/30' 
                                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cities Filter */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> Cities
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                {availableCities.length === 0 && <span className="text-xs text-muted-foreground">No cities available</span>}
                                {availableCities.map((city: string) => (
                                    <button
                                        key={city}
                                        onClick={() => toggleFilter(setSelectedCities, city)}
                                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                                            selectedCities.includes(city) 
                                            ? 'bg-primary/10 text-primary border-primary/30' 
                                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Filter className="h-3.5 w-3.5" /> Sort By
                            </label>
                            <div className="flex flex-col gap-2">
                                <select 
                                    value={sortBy} 
                                    onChange={e => setSortBy(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="createdAt">Date Added</option>
                                    <option value="name">Name</option>
                                    <option value="city">City</option>
                                </select>
                                <select 
                                    value={sortOrder} 
                                    onChange={e => setSortOrder(e.target.value as 'asc'|'desc')}
                                    className="w-full px-2.5 py-1.5 bg-muted/30 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="desc">Descending (Z-A / Newest)</option>
                                    <option value="asc">Ascending (A-Z / Oldest)</option>
                                </select>
                            </div>
                            
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTags([]);
                                        setSelectedCities([]);
                                        setSortBy('createdAt');
                                        setSortOrder('desc');
                                    }}
                                    className="text-[11px] h-7 text-muted-foreground"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                        
                    </div>
                </div>
            )}

            {/* ── Select All Matching Banner ────────────────────────────────── */}
            {selectedContacts.length === contacts.length && contacts.length > 0 && fetchedData?.total > contacts.length && !selectAllMatching && (
                <div className="bg-primary/10 border border-primary/20 py-2.5 px-4 text-center rounded-xl flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                    <span className="text-xs text-foreground">
                        All <strong>{contacts.length}</strong> contacts on this page are selected.
                    </span>
                    <button 
                        onClick={handleSelectAllMatching}
                        className="text-xs text-primary font-semibold hover:underline"
                    >
                        Select all {fetchedData?.total} contacts matching filters
                    </button>
                </div>
            )}
            
            {selectAllMatching && selectedContacts.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 py-2.5 px-4 text-center rounded-xl animate-in fade-in">
                    <span className="text-xs font-semibold text-primary">
                        All {selectedContacts.length} contacts matching current filters are selected.
                    </span>
                    <button 
                        onClick={() => {
                            setSelectedContacts([]);
                            setSelectAllMatching(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground ml-3 underline"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* ── Desktop Data Table & Mobile Cards ──────────────────────────── */}

            <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                {isLoading ? (
                    <TableSkeleton />
                ) : contacts.length > 0 ? (
                    <>
                        {/* Desktop View Table (hidden on mobile) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-border">
                                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3.5 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-border text-primary focus:ring-primary"
                                                    checked={contacts.length > 0 && contacts.every((c: any) => selectedContacts.includes(c.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const newIds = [...selectedContacts];
                                                            contacts.forEach((c: any) => {
                                                                if (!newIds.includes(c.id)) newIds.push(c.id);
                                                            });
                                                            setSelectedContacts(newIds);
                                                        } else {
                                                            const visibleIds = contacts.map((c: any) => c.id);
                                                            setSelectedContacts(selectedContacts.filter(id => !visibleIds.includes(id)));
                                                            setSelectAllMatching(false);
                                                        }
                                                    }}
                                                />
                                        </th>
                                        <th className="p-3.5 font-medium">Contact</th>
                                        <th className="p-3.5 font-medium">Phone Number</th>
                                        <th className="p-3.5 font-medium">City</th>
                                        <th className="p-3.5 font-medium">Tags</th>
                                        <th className="p-3.5 font-medium">Consent</th>
                                        <th className="p-3.5 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {contacts.map((contact: any) => {
                                        const isSelected = selectedContacts.includes(contact.id);
                                        const name = contact.name || 'Unknown';
                                        const initials = name.substring(0, 2).toUpperCase();

                                        return (
                                            <tr
                                                key={contact.id}
                                                className={`transition-colors ${
                                                    isSelected ? 'bg-muted/70' : 'hover:bg-muted/30'
                                                }`}
                                            >
                                                <td className="p-3.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-border text-primary focus:ring-primary"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedContacts([...selectedContacts, contact.id]);
                                                            } else {
                                                                setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                                                setSelectAllMatching(false);
                                                            }
                                                        }}
                                                    />
                                                </td>


                                                {/* Contact Identity */}
                                                <td className="p-3.5 font-medium text-foreground">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                                            {initials}
                                                        </div>
                                                        <span className="font-semibold text-xs text-foreground">{name}</span>
                                                    </div>
                                                </td>

                                                {/* Phone Number */}
                                                <td className="p-3.5 font-mono text-xs text-muted-foreground">
                                                    {contact.phone}
                                                </td>

                                                {/* City */}
                                                <td className="p-3.5 text-muted-foreground">
                                                    {contact.city || '-'}
                                                </td>

                                                {/* Tags */}
                                                <td className="p-3.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {contact.tags?.map((tag: string, i: number) => (
                                                            <span
                                                                key={i}
                                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                                                            >
                                                                {tag}
                                                            </span>
                                                        )) || <span className="text-muted-foreground text-[11px] italic">No tags</span>}
                                                    </div>
                                                </td>

                                                {/* Consent Status */}
                                                <td className="p-3.5">
                                                    <ConsentBadge status={contact.consentStatus} />
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="p-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => handleStartChat(contact.id)}
                                                            className="p-1.5 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md transition-all border-none"
                                                            title="Message in Inbox"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => openOptInConfirm(contact.id)}
                                                            className="p-1.5 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md transition-all border-none"
                                                            title="Opt In"
                                                        >
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => openOptOutConfirm(contact.id)}
                                                            className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 rounded-md transition-all border-none"
                                                            title="Opt Out"
                                                        >
                                                            <ShieldOff className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => {
                                                                setEditingContactId(contact.id);
                                                                setNewContact({
                                                                    name: contact.name || '',
                                                                    phone: contact.phone || '',
                                                                    city: contact.city || '',
                                                                    tags: contact.tags ? contact.tags.join(', ') : '',
                                                                });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-all border-none"
                                                            title="Edit Contact"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => deleteContact(contact.id)}
                                                            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all border-none"
                                                            title="Delete Contact"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Responsive Cards (visible only on mobile) */}
                        <div className="md:hidden divide-y divide-border">
                            {contacts.map((contact: any) => {
                                const isSelected = selectedContacts.includes(contact.id);
                                const name = contact.name || 'Unknown';
                                const initials = name.substring(0, 2).toUpperCase();

                                return (
                                    <div key={contact.id} className="p-4 space-y-2 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedContacts([...selectedContacts, contact.id]);
                                                        } else {
                                                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                                        }
                                                    }}
                                                />
                                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-semibold text-foreground">{name}</h4>
                                                    <p className="text-[11px] font-mono text-muted-foreground">{contact.phone}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => handleStartChat(contact.id)}
                                                    className="p-2 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border-none"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => openOptInConfirm(contact.id)}
                                                    className="p-2 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border-none"
                                                    title="Opt In"
                                                >
                                                    <ShieldCheck className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => openOptOutConfirm(contact.id)}
                                                    className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 rounded-lg border-none"
                                                    title="Opt Out"
                                                >
                                                    <ShieldOff className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => {
                                                        setEditingContactId(contact.id);
                                                        setNewContact({
                                                            name: contact.name || '',
                                                            phone: contact.phone || '',
                                                            city: contact.city || '',
                                                            tags: contact.tags ? contact.tags.join(', ') : '',
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-muted text-muted-foreground rounded-lg border-none"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => deleteContact(contact.id)}
                                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg border-none"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Tags + City */}
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                            <span>City: {contact.city || '-'}</span>
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                <ConsentBadge status={contact.consentStatus} />
                                                {contact.tags?.map((tag: string, i: number) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Controls & Rows Per Page */}
                        <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-card/30">
                            {/* Rows per page selector and range count */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <span>Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={e => {
                                            const newLimit = Number(e.target.value);
                                            setPageSize(newLimit);
                                            setPage(1);
                                            try { localStorage.setItem('whatshub_contacts_limit', newLimit.toString()); } catch {}
                                        }}
                                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                    >
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={1000}>1,000</option>
                                        <option value={50000}>50,000</option>
                                        <option value={100000}>100,000</option>
                                    </select>
                                </div>
                                <span className="hidden sm:inline">•</span>
                                <span>
                                    Showing {fetchedData?.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, fetchedData?.total || 0)} of {fetchedData?.total || 0}
                                </span>
                            </div>

                            {/* Page navigation buttons */}
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-2.5 h-8 text-xs font-medium"
                                    title="First Page"
                                >
                                    First
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                    disabled={page === 1}
                                    className="px-3 h-8 text-xs font-semibold"
                                >
                                    Previous
                                </Button>
                                <span className="text-xs text-muted-foreground font-medium px-2">
                                    Page {page} of {Math.max(1, fetchedData?.totalPages || 1)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(prev => prev + 1)}
                                    disabled={!hasMore}
                                    className="px-3 h-8 text-xs font-semibold"
                                >
                                    Next
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(fetchedData?.totalPages || 1)}
                                    disabled={page >= (fetchedData?.totalPages || 1)}
                                    className="px-2.5 h-8 text-xs font-medium"
                                    title="Last Page"
                                >
                                    Last
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="p-12 text-center text-muted-foreground space-y-3">
                        <Users className="mx-auto h-10 w-10 opacity-30 text-foreground" />
                        <h3 className="text-xs font-semibold text-foreground">No contacts found</h3>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            {search || selectedTags.length > 0 || selectedCities.length > 0 || consentFilter !== 'all'
                                ? 'No contacts match your current search parameters or filter criteria.'
                                : 'Get started by creating a new contact or importing from Excel.'}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Add / Edit Contact Modal ────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-semibold text-foreground">
                                {editingContactId ? 'Edit Contact Profile' : 'Add New Contact'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingContactId(null);
                                    setNewContact({ name: '', phone: '', city: '', tags: '' });
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateContact} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-medium text-foreground mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Omkar Wakhare"
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-foreground mb-1">Phone Number (with country code)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 919876543210"
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-foreground mb-1">City / Location (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mumbai"
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                    value={newContact.city}
                                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-foreground mb-1">Tags (Comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. VIP, Wholesale, Lead"
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                    value={newContact.tags}
                                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                                />
                            </div>

                            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingContactId(null);
                                        setNewContact({ name: '', phone: '', city: '', tags: '' });
                                    }}
                                    className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button
                                    type="submit"
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        await handleCreateContact(e as any);
                                    }}
                                    loadingText={editingContactId ? 'Updating...' : 'Saving...'}
                                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs border-none"
                                >
                                    {editingContactId ? 'Update Contact' : 'Save Contact'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Bulk Tag Management Modal (Add / Remove) ──────────────────────── */}
            {tagModalOpen && (
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
                            <button onClick={() => setTagModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {tagModalMode === 'add' ? 'Applying' : 'Removing'} tags on{' '}
                            <strong>{selectedContacts.length}</strong> selected contact{selectedContacts.length === 1 ? '' : 's'}.
                        </p>

                        {tagModalMode === 'add' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Tags to Add (Comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. VIP, Wholesale, Lead"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setTagModalOpen(false)}
                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={handleBulkAddTags}
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
                                {commonTagsOnSelectedContacts.length > 0 && !removeAllTagsOption && (
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1.5">
                                            Select existing tags to remove:
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-muted/30 rounded-lg border border-border">
                                            {commonTagsOnSelectedContacts.map(({ tag, count }) => {
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
                                        onClick={() => setTagModalOpen(false)}
                                        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={handleBulkRemoveTags}
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

            {/* ── Global Confirmation Modal ────────────────────────────────────── */}
            <ConfirmModal
                open={confirmState.open}
                onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                description={confirmState.description}
                variant={confirmState.variant}
                confirmText={confirmState.confirmText}
                reason={confirmState.reason ? consentReason : undefined}
                onReasonChange={confirmState.reason ? setConsentReason : undefined}
                reasonPlaceholder="Optional reason..."
                isLoading={isUpdatingConsent}
            />
        </div>
    );
}
