"use client";

import { useState, useMemo, useEffect } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Plus, Search, Megaphone, Clock, CheckCircle2,
    Eye, XCircle, Send, Users, Tag, ChevronRight, Loader2,
    Grid3X3, MessageCircleReply, Trash2, ShieldAlert, RotateCw,
    BarChart3, CalendarClock, MoreHorizontal, X, Info, SlidersHorizontal,
    ListFilter, Zap, ShieldCheck, Rocket, LayoutGrid, LayoutList,
    ArrowRight, Check, Sparkles, Filter, AlertTriangle, Layers, Radio, Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MediaGalleryModal from '@/components/MediaGalleryModal';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';


const campaignSchema = z.object({
    name: z.string().min(1, 'Broadcast name is required'),
    templateId: z.string().min(1, 'Template selection is required'),
});

// ─── Status Badges ─────────────────────────────────────────────────────────────
function CampaignStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; class: string; dot: string }> = {
        completed:  { label: 'Completed',  class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
        processing: { label: 'Processing', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500 animate-pulse' },
        scheduled:  { label: 'Scheduled',  class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
        aborted:    { label: 'Aborted',    class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
        failed:     { label: 'Failed',     class: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
    };
    const item = map[status] || map.scheduled;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${item.class}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
            {item.label}
        </span>
    );
}

function extractCampaignMessageConfig(campaign: any, templates: any[]) {
    const templateId = campaign.templateId || '';
    const template = (templates && templates.find((t: any) => t.id === templateId)) || campaign.template || null;

    let headerMediaUrl = campaign.headerMediaUrl || '';
    const templateParams: Record<string, string> = {};
    const buttonParams: Record<string, string> = {};

    const rawComponents = Array.isArray(campaign.templateParams)
        ? campaign.templateParams
        : (campaign.templateParams && typeof campaign.templateParams === 'object' ? [campaign.templateParams] : []);

    for (const comp of rawComponents) {
        if (!comp || typeof comp !== 'object') continue;
        const type = (comp.type || '').toLowerCase();

        if (type === 'header') {
            if (Array.isArray(comp.parameters)) {
                comp.parameters.forEach((p: any, idx: number) => {
                    if (p?.type === 'text' && p.text !== undefined) {
                        templateParams[`header_${idx + 1}`] = p.text;
                    } else if (p?.type === 'image' && p.image?.link) {
                        headerMediaUrl = p.image.link;
                    } else if (p?.type === 'video' && p.video?.link) {
                        headerMediaUrl = p.video.link;
                    } else if (p?.type === 'document' && p.document?.link) {
                        headerMediaUrl = p.document.link;
                    }
                });
            }
        } else if (type === 'body') {
            if (Array.isArray(comp.parameters)) {
                comp.parameters.forEach((p: any, idx: number) => {
                    if (p?.type === 'text' && p.text !== undefined) {
                        templateParams[`body_${idx + 1}`] = p.text;
                    }
                });
            }
        } else if (type === 'footer') {
            if (Array.isArray(comp.parameters)) {
                comp.parameters.forEach((p: any, idx: number) => {
                    if (p?.type === 'text' && p.text !== undefined) {
                        templateParams[`footer_${idx + 1}`] = p.text;
                    }
                });
            }
        } else if (type === 'button') {
            const idx = comp.index !== undefined ? String(comp.index) : '0';
            if (Array.isArray(comp.parameters) && comp.parameters[0]) {
                const param = comp.parameters[0];
                buttonParams[idx] = param.text || param.payload || '';
            }
        }
    }

    // Also copy flat object keys if templateParams was stored directly as a key-value record
    if (campaign.templateParams && typeof campaign.templateParams === 'object' && !Array.isArray(campaign.templateParams)) {
        Object.entries(campaign.templateParams).forEach(([k, v]) => {
            if (typeof v === 'string') {
                templateParams[k] = v;
            }
        });
    }

    const suggestedName = campaign.name ? `${campaign.name} (Copy)` : 'Broadcast Campaign';

    return {
        templateId,
        template,
        headerMediaUrl,
        templateParams,
        buttonParams,
        suggestedName,
    };
}

export default function CampaignsPage() {
    const searchParams = useSearchParams();
    const { data: fetchedCampaigns, mutate: mutateCampaigns, isLoading: isCampaignsLoading } = useSWR('/campaigns');
    const campaigns = Array.isArray(fetchedCampaigns) ? fetchedCampaigns : (Array.isArray(fetchedCampaigns?.data) ? fetchedCampaigns.data : []);

    const { data: fetchedTemplates } = useSWR('/templates');
    const templates = (Array.isArray(fetchedTemplates) ? fetchedTemplates : (Array.isArray(fetchedTemplates?.data) ? fetchedTemplates.data : [])).filter((t: any) => t.status === 'approved' || true);


    // We still fetch all contacts here for the audience builder. For a full fix, this needs server-side integration.
    const { data: fetchedAllContacts } = useSWR('/contacts');
    const allContacts = Array.isArray(fetchedAllContacts) ? fetchedAllContacts : (Array.isArray(fetchedAllContacts?.data) ? fetchedAllContacts.data : []);


    const { data: fetchedContactTags } = useSWR('/contacts/tags');

    // Filter, search & view states (CARDS AS DEFAULT)
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'scheduled' | 'aborted' | 'archived'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Create Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
    const [step2Tab, setStep2Tab] = useState<'core' | 'advanced'>('core');
    const [isSaving, setIsSaving] = useState(false);
    const [sendNow, setSendNow] = useState(true);
    const [newCampaign, setNewCampaign] = useState({ scheduledAt: format(new Date(Date.now() + 5 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") });

    const createForm = useForm<z.infer<typeof campaignSchema>>({
        resolver: zodResolver(campaignSchema),
        defaultValues: { name: '', templateId: '' }
    });

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [templateParams, setTemplateParams] = useState<{ [key: string]: string }>({});
    const [buttonParams, setButtonParams] = useState<{ [key: string]: string }>({});
    const [headerMediaUrl, setHeaderMediaUrl] = useState('');
    const [showMediaGallery, setShowMediaGallery] = useState(false);

    // Target audience selection
    const [targetType, setTargetType] = useState<'all' | 'tags' | 'contacts' | 'segment' | 'failed'>('all');
    const [creationTags, setCreationTags] = useState('');
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [creationSelectedPhones, setCreationSelectedPhones] = useState<string[]>([]);
    const [selectedFailedCampaignIds, setSelectedFailedCampaignIds] = useState<string[]>(['all']);
    const [failedContactsList, setFailedContactsList] = useState<{ phone: string; name: string; campaignId: string; campaignName: string; failReason?: string }[]>([]);
    const [failedContactSearch, setFailedContactSearch] = useState('');
    const [segmentFilters, setSegmentFilters] = useState({ city: '', hasTags: '', noMessagesInDays: '' });
    const [contactSearch, setContactSearch] = useState('');

    const availableTags = useMemo<{ tag: string; count: number }[]>(() => {
        if (Array.isArray(fetchedContactTags) && fetchedContactTags.length > 0) {
            return fetchedContactTags;
        }
        const tagMap: Record<string, number> = {};
        const list = Array.isArray(allContacts) ? allContacts : (Array.isArray(allContacts?.data) ? allContacts.data : []);
        list.forEach((c: any) => {
            if (Array.isArray(c.tags)) {
                c.tags.forEach((t: any) => {
                    if (typeof t === 'string' && t.trim()) {
                        const tagStr = t.trim();
                        tagMap[tagStr] = (tagMap[tagStr] || 0) + 1;
                    }
                });
            }
        });
        return Object.entries(tagMap)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }, [fetchedContactTags, allContacts]);

    const selectedTagList = useMemo(() => {
        return creationTags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    }, [creationTags]);

    const toggleCreationTag = (tagToToggle: string) => {
        const exists = selectedTagList.includes(tagToToggle);
        let updated: string[];
        if (exists) {
            updated = selectedTagList.filter(t => t !== tagToToggle);
        } else {
            updated = [...selectedTagList, tagToToggle];
        }
        setCreationTags(updated.join(', '));
    };

    const addCustomTag = (customTag: string) => {
        const trimmed = customTag.trim();
        if (trimmed && !selectedTagList.includes(trimmed)) {
            setCreationTags([...selectedTagList, trimmed].join(', '));
        }
    };

    const estimatedAudienceCount = useMemo(() => {
        if (selectedTagList.length === 0) return 0;
        const list = Array.isArray(allContacts) ? allContacts : (Array.isArray(allContacts?.data) ? allContacts.data : []);
        if (list.length === 0) {
            return availableTags
                .filter(t => selectedTagList.includes(t.tag))
                .reduce((sum, t) => sum + t.count, 0);
        }
        const setOfSelected = new Set(selectedTagList.map(t => t.toLowerCase()));
        return list.filter((c: any) => {
            if (Array.isArray(c.tags)) {
                return c.tags.some((t: any) => typeof t === 'string' && setOfSelected.has(t.trim().toLowerCase()));
            }
            return false;
        }).length;
    }, [selectedTagList, allContacts, availableTags]);

    const [sendRate, setSendRate] = useState<'instant' | 'standard' | 'turbo'>('standard');
    const [excludeUnsubscribed, setExcludeUnsubscribed] = useState(true);
    // Marketing consent mode: OPTED_IN_ONLY, EXCLUDE_OPTED_OUT (default), ALL
    const [marketingConsentMode, setMarketingConsentMode] = useState<string>('EXCLUDE_OPTED_OUT');
    const [isLoadingFailedContacts, setIsLoadingFailedContacts] = useState(false);
    // Exclude tags state
    const [excludeTags, setExcludeTags] = useState<string[]>([]);
    const [excludeTagSearchQuery, setExcludeTagSearchQuery] = useState('');
    const [targetCity, setTargetCity] = useState('');
    // Require tags (AND filter — contacts must also have ALL of these)
    const [requireTags, setRequireTags] = useState<string[]>([]);
    const [requireTagSearch, setRequireTagSearch] = useState('');
    // No messages in N days filter
    const [noMessagesInDays, setNoMessagesInDays] = useState('');

    const toggleExcludeTag = (tag: string) => {
        setExcludeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };
    const toggleRequireTag = (tag: string) => {
        setRequireTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    // Detailed audience metrics to show exact counts for each filtering stage.
    const audienceMetrics = useMemo(() => {
        const list = Array.isArray(allContacts) ? allContacts : (Array.isArray(allContacts?.data) ? allContacts.data : []);
        
        // 1. Base Audience
        let base;
        if (targetType === 'tags' && selectedTagList.length > 0) {
            const setOfSelected = new Set(selectedTagList.map(t => t.toLowerCase()));
            base = list.filter((c: any) => Array.isArray(c.tags) && c.tags.some((t: any) => typeof t === 'string' && setOfSelected.has(t.trim().toLowerCase())));
        } else if (targetType === 'contacts' || targetType === 'failed') {
            base = list.filter((c: any) => creationSelectedPhones.includes(c.phone));
        } else {
            base = list;
        }
        const baseCount = base.length;

        // 2. Exclusions (Exclude Tags)
        let afterExclusions = base;
        if (excludeTags.length > 0) {
            const excl = new Set(excludeTags.map(t => t.toLowerCase()));
            afterExclusions = afterExclusions.filter((c: any) => !Array.isArray(c.tags) || !c.tags.some((t: any) => typeof t === 'string' && excl.has(t.toLowerCase())));
        }
        const exclusionsCount = baseCount - afterExclusions.length;

        // 3. Consent & Compliance
        let validAfterConsent = 0;
        let optedOutCount = 0;
        let notOptedInCount = 0;
        let invalidCount = 0;
        let unsubscribedCount = 0;

        for (const c of afterExclusions) {
            const status = c.consentStatus || 'UNKNOWN';
            const tags = Array.isArray(c.tags) ? c.tags : [];
            if (tags.includes('Invalid Number')) { invalidCount++; continue; }
            if (excludeUnsubscribed && tags.includes('unsubscribed')) { unsubscribedCount++; continue; }
            if (status === 'OPTED_OUT') { optedOutCount++; continue; }
            if (marketingConsentMode === 'OPTED_IN_ONLY' && status !== 'OPTED_IN') { notOptedInCount++; continue; }
            validAfterConsent++;
        }
        const consentExcludedCount = optedOutCount + notOptedInCount + invalidCount + unsubscribedCount;

        // 4. Advanced Location & Segment
        let finalArray = afterExclusions.filter((c: any) => {
            const status = c.consentStatus || 'UNKNOWN';
            const tags = Array.isArray(c.tags) ? c.tags : [];
            if (tags.includes('Invalid Number') || (excludeUnsubscribed && tags.includes('unsubscribed')) || status === 'OPTED_OUT' || (marketingConsentMode === 'OPTED_IN_ONLY' && status !== 'OPTED_IN')) return false;
            return true;
        });

        if (targetCity.trim()) {
            finalArray = finalArray.filter((c: any) => c.city && c.city.toLowerCase().trim() === targetCity.toLowerCase().trim());
        }
        if (requireTags.length > 0) {
            finalArray = finalArray.filter((c: any) => Array.isArray(c.tags) && requireTags.every(rt => c.tags.some((t: any) => typeof t === 'string' && t.toLowerCase() === rt.toLowerCase())));
        }
        
        const finalEligibleCount = finalArray.length;
        const locationSegmentExcludedCount = validAfterConsent - finalEligibleCount;

        return { baseCount, exclusionsCount, optedOutCount, notOptedInCount, invalidCount, unsubscribedCount, consentExcludedCount, validAfterConsent, locationSegmentExcludedCount, finalEligibleCount };
    }, [allContacts, targetType, selectedTagList, creationSelectedPhones, targetCity, requireTags, excludeTags, marketingConsentMode, excludeUnsubscribed]);

    const loadFailedContactsForCategories = async (categoryIds: string[]) => {
        if (!categoryIds || categoryIds.length === 0) {
            setFailedContactsList([]);
            setCreationSelectedPhones([]);
            return;
        }
        setIsLoadingFailedContacts(true);
        try {
            const allFailedCamps = campaigns.filter((c: any) => (c.stats?.failed || 0) > 0);
            let targetCamps: any[] = [];

            if (categoryIds.includes('all')) {
                targetCamps = allFailedCamps;
            } else {
                targetCamps = campaigns.filter((c: any) => categoryIds.includes(c.id));
            }

            const aggregated: { phone: string; name: string; campaignId: string; campaignName: string; failReason?: string }[] = [];
            const phoneMap = new Map<string, any>();

            for (const camp of targetCamps) {
                try {
                    const res = await api.get(`/campaigns/${camp.id}/analytics`);
                    const fcList = res.data?.contacts?.failed || [];
                    if (Array.isArray(fcList) && fcList.length > 0) {
                        for (const fc of fcList) {
                            if (fc.phone && !phoneMap.has(fc.phone)) {
                                const item = {
                                    phone: fc.phone,
                                    name: fc.name || fc.phone,
                                    campaignId: camp.id,
                                    campaignName: camp.name,
                                    failReason: fc.failReason || 'Failed to deliver',
                                };
                                phoneMap.set(fc.phone, item);
                                aggregated.push(item);
                            }
                        }
                    } else if (camp.targetPhones && Array.isArray(camp.targetPhones)) {
                        for (const phone of camp.targetPhones) {
                            if (!phoneMap.has(phone)) {
                                const item = {
                                    phone,
                                    name: phone,
                                    campaignId: camp.id,
                                    campaignName: camp.name,
                                    failReason: 'Broadcast Failure',
                                };
                                phoneMap.set(phone, item);
                                aggregated.push(item);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error loading analytics for campaign ${camp.id}`, e);
                }
            }

            setFailedContactsList(aggregated);
            setCreationSelectedPhones(aggregated.map(a => a.phone));
        } catch (err) {
            console.error('Failed to load category failed contacts', err);
        } finally {
            setIsLoadingFailedContacts(false);
        }
    };

    const addFailedCategory = (catId: string) => {
        if (catId === 'all') {
            setSelectedFailedCampaignIds(['all']);
            return;
        }
        let updated = selectedFailedCampaignIds.filter(id => id !== 'all');
        if (!updated.includes(catId)) {
            updated.push(catId);
        }
        if (updated.length === 0) updated = ['all'];
        setSelectedFailedCampaignIds(updated);
    };

    const removeFailedCategory = (catId: string) => {
        const updated = selectedFailedCampaignIds.filter(id => id !== catId);
        if (updated.length === 0) {
            setSelectedFailedCampaignIds(['all']);
        } else {
            setSelectedFailedCampaignIds(updated);
        }
    };

    useEffect(() => {
        if (targetType === 'failed' && campaigns.length > 0) {
            loadFailedContactsForCategories(selectedFailedCampaignIds);
        }
    }, [targetType, selectedFailedCampaignIds, campaigns]);

    const handleReuseCampaign = async (camp: any) => {
        try {
            let sourceCamp = camp;
            // Fetch fresh analytics/campaign details if templateParams or template are missing
            if (!sourceCamp.templateParams || !sourceCamp.template) {
                try {
                    const res = await api.get(`/campaigns/${camp.id}/analytics`);
                    if (res.data?.campaign) {
                        sourceCamp = res.data.campaign;
                    }
                } catch (e) {
                    console.error('Failed to fetch full campaign analytics for reuse:', e);
                }
            }

            const {
                templateId,
                template,
                headerMediaUrl: extractedMediaUrl,
                templateParams: extractedParams,
                buttonParams: extractedButtonParams,
                suggestedName,
            } = extractCampaignMessageConfig(sourceCamp, templates);

            createForm.setValue('name', suggestedName);
            createForm.setValue('templateId', templateId);
            setSelectedTemplate(template);
            setTemplateParams(extractedParams);
            setButtonParams(extractedButtonParams);
            setHeaderMediaUrl(extractedMediaUrl);

            // Default audience to clean audience selection
            setTargetType('all');
            setCreationTags('');
            setCreationSelectedPhones([]);
            setSendRate('standard');
            setExcludeUnsubscribed(true);
            setMarketingConsentMode('EXCLUDE_OPTED_OUT');
            setExcludeTags([]);
            setExcludeTagSearchQuery('');
            setTargetCity('');
            setRequireTags([]);
            setRequireTagSearch('');
            setNoMessagesInDays('');

            setActiveMenuId(null);
            setWizardStep(2); // Jump directly to Audience selection since message is pre-filled!
            setIsModalOpen(true);
            toast.info('Message loaded! Select your target audience to launch.');
        } catch (err) {
            console.error('Failed to reuse campaign message:', err);
            toast.error('Failed to load campaign message');
        }
    };

    // Auto-open create modal when navigated with reuse or retarget params
    useEffect(() => {
        const reuseId = searchParams.get('reuseCampaignId') || searchParams.get('retargetCampaignId');
        const selectedPhonesParam = searchParams.get('selectedPhones');
        const useSessionPhones = searchParams.get('useSessionPhones');

        if (reuseId) {
            const loadAndPreFill = async () => {
                try {
                    let sourceCamp = campaigns.find((c: any) => c.id === reuseId);
                    if (!sourceCamp || !sourceCamp.templateParams) {
                        try {
                            const res = await api.get(`/campaigns/${reuseId}/analytics`);
                            if (res.data?.campaign) {
                                sourceCamp = res.data.campaign;
                            }
                        } catch (e) {
                            console.error('Failed to fetch campaign details for reuse:', e);
                        }
                    }

                    if (sourceCamp) {
                        const {
                            templateId,
                            template,
                            headerMediaUrl: extractedMediaUrl,
                            templateParams: extractedParams,
                            buttonParams: extractedButtonParams,
                            suggestedName,
                        } = extractCampaignMessageConfig(sourceCamp, templates);

                        createForm.setValue('name', suggestedName);
                        createForm.setValue('templateId', templateId);
                        setSelectedTemplate(template);
                        setTemplateParams(extractedParams);
                        setButtonParams(extractedButtonParams);
                        setHeaderMediaUrl(extractedMediaUrl);

                        if (useSessionPhones === 'true') {
                            try {
                                const stored = sessionStorage.getItem('retarget_phones');
                                if (stored) {
                                    const phones = JSON.parse(stored);
                                    setCreationSelectedPhones(phones);
                                    setTargetType('contacts');
                                    sessionStorage.removeItem('retarget_phones');
                                }
                            } catch (e) {
                                console.error('Failed to parse session phones:', e);
                            }
                        } else if (selectedPhonesParam) {
                            const phones = decodeURIComponent(selectedPhonesParam).split(',').filter(Boolean);
                            setCreationSelectedPhones(phones);
                            setTargetType('contacts');
                        } else {
                            // Fresh audience selection
                            setTargetType('all');
                            setCreationSelectedPhones([]);
                        }

                        setWizardStep(2); // Jump directly to Target Audience
                        setIsModalOpen(true);
                        toast.info('Message content loaded! Select your target audience.');
                    }
                } catch (err) {
                    console.error('Error pre-filling reused campaign:', err);
                } finally {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('reuseCampaignId');
                    url.searchParams.delete('retargetCampaignId');
                    url.searchParams.delete('selectedPhones');
                    url.searchParams.delete('useSessionPhones');
                    window.history.replaceState({}, '', url.pathname);
                }
            };

            loadAndPreFill();
        }
    }, [searchParams, campaigns, templates]);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'destructive' | 'warning' | 'primary';
        confirmText?: string;
    }>({ open: false, title: '', description: '', action: () => {} });

    // Action loaders
    const [isResending, setIsResending] = useState<string | null>(null);

    const handleResendFailed = (campId: string) => {
        setConfirmState({
            open: true,
            title: 'Resend Failed Messages',
            description: 'Are you sure you want to resend messages to all failed contacts?',
            variant: 'primary',
            confirmText: 'Resend Failed',
            action: async () => {
                setIsResending(campId);
                setActiveMenuId(null);
                try {
                    await api.post(`/campaigns/${campId}/resend-failed`);
                    toast.success('Retry broadcast launched!');
                    mutateCampaigns();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to resend broadcast');
                } finally {
                    setIsResending(null);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleAbortCampaign = (campId: string) => {
        setConfirmState({
            open: true,
            title: 'Abort Broadcast',
            description: 'Are you sure you want to abort this broadcast? This will halt remaining pending messages.',
            variant: 'warning',
            confirmText: 'Abort Broadcast',
            action: async () => {
                setActiveMenuId(null);
                try {
                    await api.post(`/campaigns/${campId}/abort`);
                    toast.success('Broadcast aborted');
                    mutateCampaigns();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to abort broadcast');
                } finally {
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleDeleteCampaign = (campId: string) => {
        setConfirmState({
            open: true,
            title: 'Archive Broadcast',
            description: 'Are you sure you want to archive this broadcast? You can restore it later from the Archived tab.',
            variant: 'destructive',
            confirmText: 'Archive Broadcast',
            action: async () => {
                setActiveMenuId(null);
                try {
                    await api.delete(`/campaigns/${campId}`);
                    toast.success('Broadcast archived');
                    mutateCampaigns();
                } catch (err) {
                    console.error(err);
                    toast.error('Failed to archive broadcast');
                } finally {
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleRestoreCampaign = async (campId: string) => {
        setActiveMenuId(null);
        try {
            await api.post(`/campaigns/${campId}/restore`);
            toast.success('Broadcast restored successfully');
            mutateCampaigns();
        } catch (err) {
            console.error(err);
            toast.error('Failed to restore broadcast');
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        createForm.setValue('templateId', val);
        const t = templates.find((t: any) => t.id === val);
        setSelectedTemplate(t || null);
        setTemplateParams({});
        setButtonParams({});
        setHeaderMediaUrl('');
    };

    const handleCreateCampaign = async (values: z.infer<typeof campaignSchema>) => {
        setIsSaving(true);
        try {
            const components: any[] = [];
            if (selectedTemplate) {
                const header = selectedTemplate.components?.find((c: any) => c.type === 'HEADER');
                if (header) {
                    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format)) {
                        if (!headerMediaUrl) {
                            toast.error('This template requires a header media upload.');
                            setIsSaving(false);
                            return;
                        }
                        components.push({
                            type: 'header',
                            parameters: [{ type: header.format.toLowerCase(), [header.format.toLowerCase()]: { link: headerMediaUrl } }]
                        });
                    } else if (header.format === 'TEXT' || (!header.format && header.text)) {
                        const headerMatches = (header.text || '').match(/\{\{(\d+)\}\}/g) || [];
                        const uniqueHeaderVars = Array.from(new Set(headerMatches)).sort((a, b) => {
                            const numA = parseInt((a as string).replace(/\D/g, ''), 10);
                            const numB = parseInt((b as string).replace(/\D/g, ''), 10);
                            return numA - numB;
                        }) as string[];
                        if (uniqueHeaderVars.length > 0) {
                            const emptyVars = uniqueHeaderVars.filter(v => {
                                const num = v.replace(/\D/g, '');
                                return !templateParams[`header_${num}`]?.trim();
                            });
                            if (emptyVars.length > 0) {
                                toast.error(`Please fill header variable ${emptyVars.join(', ')}`);
                                setIsSaving(false);
                                return;
                            }
                            components.push({
                                type: 'header',
                                parameters: uniqueHeaderVars.map(v => {
                                    const num = v.replace(/\D/g, '');
                                    return { type: 'text', text: templateParams[`header_${num}`] };
                                })
                            });
                        }
                    }
                }

                const body = selectedTemplate.components?.find((c: any) => c.type === 'BODY');
                if (body && body.text) {
                    const bodyMatches = body.text.match(/\{\{(\d+)\}\}/g) || [];
                    const uniqueBodyVars = Array.from(new Set(bodyMatches)).sort((a, b) => {
                        const numA = parseInt((a as string).replace(/\D/g, ''), 10);
                        const numB = parseInt((b as string).replace(/\D/g, ''), 10);
                        return numA - numB;
                    }) as string[];
                    if (uniqueBodyVars.length > 0) {
                        const emptyVars = uniqueBodyVars.filter(v => {
                            const num = v.replace(/\D/g, '');
                            return !templateParams[`body_${num}`]?.trim();
                        });
                        if (emptyVars.length > 0) {
                            toast.error(`Please fill body variable ${emptyVars.join(', ')}`);
                            setIsSaving(false);
                            return;
                        }
                        components.push({
                            type: 'body',
                            parameters: uniqueBodyVars.map(v => {
                                const num = v.replace(/\D/g, '');
                                return { type: 'text', text: templateParams[`body_${num}`] };
                            })
                        });
                    }
                }

                const footer = selectedTemplate.components?.find((c: any) => c.type === 'FOOTER');
                if (footer && footer.text) {
                    const footerMatches = footer.text.match(/\{\{(\d+)\}\}/g) || [];
                    const uniqueFooterVars = Array.from(new Set(footerMatches)).sort((a, b) => {
                        const numA = parseInt((a as string).replace(/\D/g, ''), 10);
                        const numB = parseInt((b as string).replace(/\D/g, ''), 10);
                        return numA - numB;
                    }) as string[];
                    if (uniqueFooterVars.length > 0) {
                        const emptyVars = uniqueFooterVars.filter(v => {
                            const num = v.replace(/\D/g, '');
                            return !templateParams[`footer_${num}`]?.trim();
                        });
                        if (emptyVars.length > 0) {
                            toast.error(`Please fill footer variable ${emptyVars.join(', ')}`);
                            setIsSaving(false);
                            return;
                        }
                        components.push({
                            type: 'footer',
                            parameters: uniqueFooterVars.map(v => {
                                const num = v.replace(/\D/g, '');
                                return { type: 'text', text: templateParams[`footer_${num}`] };
                            })
                        });
                    } else if (templateParams['footer_1']?.trim()) {
                        components.push({
                            type: 'footer',
                            parameters: [{ type: 'text', text: templateParams['footer_1'].trim() }]
                        });
                    }
                }

                const buttonsComp = selectedTemplate.components?.find((c: any) => c.type === 'BUTTONS');
                if (buttonsComp?.buttons && Array.isArray(buttonsComp.buttons)) {
                    for (let idx = 0; idx < buttonsComp.buttons.length; idx++) {
                        const btn = buttonsComp.buttons[idx];
                        const paramVal = buttonParams[idx] || buttonParams[String(idx)];
                        const hasUrlVar = btn.type === 'URL' && btn.url?.includes('{{1}}');

                        if (hasUrlVar && !paramVal?.trim()) {
                            toast.error(`Please fill variable parameter for button "${btn.text}"`);
                            setIsSaving(false);
                            return;
                        }

                        if (paramVal && paramVal.trim()) {
                            if (btn.type === 'URL') {
                                components.push({
                                    type: 'button',
                                    sub_type: 'url',
                                    index: String(idx),
                                    parameters: [{ type: 'text', text: paramVal.trim() }]
                                });
                            } else if (btn.type === 'QUICK_REPLY') {
                                components.push({
                                    type: 'button',
                                    sub_type: 'quick_reply',
                                    index: String(idx),
                                    parameters: [{ type: 'payload', payload: paramVal.trim() }]
                                });
                            }
                        }
                    }
                }
            }

            const delayMap = { instant: 0, standard: 300, turbo: 100 };
            await api.post('/campaigns', {
                name: values.name,
                templateId: values.templateId,
                ...(sendNow ? {} : { scheduledAt: new Date(newCampaign.scheduledAt).toISOString() }),
                sendNow,
                templateParams: components.length > 0 ? components : undefined,
                targetTags: targetType === 'tags' ? creationTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
                targetPhones: (targetType === 'contacts' || targetType === 'failed')
                    ? (excludeTags.length > 0
                        ? creationSelectedPhones.filter(phone => {
                            const c = allContacts.find((ac: any) => ac.phone === phone);
                            if (!c || !Array.isArray(c.tags)) return true;
                            const excl = new Set(excludeTags.map(t => t.toLowerCase().trim()));
                            return !c.tags.some((t: any) => typeof t === 'string' && excl.has(t.toLowerCase().trim()));
                        })
                        : creationSelectedPhones)
                    : undefined,
                targetFilters: (targetCity.trim() || requireTags.length > 0 || noMessagesInDays.trim() || excludeTags.length > 0) ? {
                    city: targetCity.trim() || undefined,
                    hasTags: requireTags.length > 0 ? requireTags : undefined,
                    noMessagesInDays: noMessagesInDays.trim() ? parseInt(noMessagesInDays) : undefined,
                    excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
                } : undefined,
                sendDelay: delayMap[sendRate],
                excludeUnsubscribed,
                excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
                audienceFilters: {
                    marketingConsent: marketingConsentMode,
                    excludeOptedOut: marketingConsentMode === 'EXCLUDE_OPTED_OUT',
                    excludeInvalid: true,
                    excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
                },
            });

            toast.success('Broadcast created successfully');
            setIsModalOpen(false);
            setWizardStep(1);
            mutateCampaigns();
            createForm.reset();
            setNewCampaign({ scheduledAt: format(new Date(Date.now() + 5 * 60 * 1000), "yyyy-MM-dd'T'HH:mm") });
            setSendNow(true);
            setSelectedTemplate(null);
            setTemplateParams({});
            setButtonParams({});
            setHeaderMediaUrl('');
            setTargetType('all');
            setCreationTags('');
            setCreationSelectedPhones([]);
            setSendRate('standard');
            setExcludeUnsubscribed(true);
            setMarketingConsentMode('EXCLUDE_OPTED_OUT');
            setExcludeTags([]);
            setExcludeTagSearchQuery('');
            setTargetCity('');
            setRequireTags([]);
            setRequireTagSearch('');
            setNoMessagesInDays('');
        } catch (err) {
            console.error(err);
            toast.error('Failed to create broadcast');
        } finally {
            setIsSaving(false);
        }
    };

    // Aggregate summary metrics
    const globalStats = useMemo(() => {
        return campaigns.reduce((acc: any, c: any) => {
            if (c.deletedAt) {
                acc.archived++;
                return acc;
            }
            acc.total++;
            if (c.status === 'processing') acc.active++;
            if (c.status === 'scheduled') acc.scheduled++;
            if (c.status === 'completed') acc.completed++;
            if (c.status === 'aborted' || c.status === 'failed') acc.failed++;
            if (c.stats) {
                acc.sent += c.stats.sent || 0;
                acc.delivered += c.stats.delivered || 0;
                acc.read += c.stats.read || 0;
            }
            return acc;
        }, { total: 0, active: 0, scheduled: 0, completed: 0, failed: 0, archived: 0, sent: 0, delivered: 0, read: 0 });
    }, [campaigns]);

    const deliveryRate = globalStats.sent > 0 ? Math.round((globalStats.delivered / globalStats.sent) * 100) : 0;

    // Filter campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter((c: any) => {
            const matchesSearch = !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.template?.templateName || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const isArchived = !!c.deletedAt;
            if (statusFilter === 'archived') {
                return matchesSearch && isArchived;
            }
            
            if (isArchived) return false;
            
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [campaigns, searchQuery, statusFilter]);

    // Active spotlight campaigns
    const processingCampaigns = useMemo(() => {
        return campaigns.filter((c: any) => c.status === 'processing' && !c.deletedAt);
    }, [campaigns]);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16 px-4 sm:px-6">
            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Broadcast Campaigns</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Create and manage targeted WhatsApp broadcasts.</p>
                </div>

                <button
                    onClick={() => {
                        setWizardStep(1);
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-semibold transition-all shadow-sm shrink-0 h-10 sm:h-9 cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    New Broadcast
                </button>
            </div>

            {/* ── Premium Slim Stats Strip ────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                    { id: 'all', label: 'All Broadcasts', count: globalStats.total, icon: Radio },
                    { id: 'processing', label: 'Running', count: globalStats.active, icon: Rocket, activeCls: 'text-amber-500' },
                    { id: 'scheduled', label: 'Scheduled', count: globalStats.scheduled, icon: CalendarClock, activeCls: 'text-blue-500' },
                    { id: 'completed', label: 'Completed', count: globalStats.completed, icon: CheckCircle2, activeCls: 'text-emerald-500' },
                    { id: 'aborted', label: 'Aborted / Failed', count: globalStats.failed, icon: AlertTriangle, activeCls: 'text-rose-500' },
                    { id: 'archived', label: 'Archived', count: globalStats.archived, icon: Archive, activeCls: 'text-zinc-500' },
                ].map((st) => (
                    <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            statusFilter === st.id
                                ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                    >
                        <st.icon className={`h-3.5 w-3.5 ${st.activeCls || ''}`} />
                        <span>{st.label}</span>
                        <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-muted/80 text-[10px] font-mono font-semibold">
                            {st.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Spotlight Banner for Live Processing Campaigns ───────────────── */}
            {processingCampaigns.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Live Broadcasts ({processingCampaigns.length})
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processingCampaigns.map((camp: any) => {
                            const cSent = camp.stats?.sent || 0;
                            const cDel = camp.stats?.delivered || 0;
                            const cFailed = camp.stats?.failed || 0;
                            const targetTotal = camp.targetPhones?.length || cSent || 1;
                            const pct = Math.min(100, Math.round((cSent / targetTotal) * 100));

                            return (
                                <div key={camp.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs flex flex-col justify-between space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Radio className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                <Link href={`/campaigns/${camp.id}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block">
                                                    {camp.name}
                                                </Link>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground block truncate">
                                                Template: {camp.template?.templateName || 'Standard'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleAbortCampaign(camp.id)}
                                            className="text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 px-2 py-0.5 rounded transition-colors"
                                        >
                                            Abort
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-muted-foreground">
                                            <span>Progress ({cSent} sent)</span>
                                            <span className="font-bold text-foreground">{pct}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-amber-500/20">
                                        <span>Delivered: <strong className="text-foreground">{cDel}</strong></span>
                                        {cFailed > 0 && <span className="text-rose-500 font-bold">Failed: {cFailed}</span>}
                                        <Link href={`/campaigns/${camp.id}`} className="text-primary font-sans font-semibold hover:underline">
                                            View →
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Toolbar: Search & View Mode Switcher ────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-xl border border-border bg-card">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search broadcasts by name or template..."
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

                {/* Layout View Switcher */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline">View:</span>
                    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === 'grid' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Cards View (Default)"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === 'table' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="List Table View"
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                            <span>List</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Campaign Card Grid / Table Display ────────────────────────── */}
            {isCampaignsLoading ? (
                viewMode === 'grid' ? <CardSkeleton count={6} /> : <TableSkeleton rows={6} />
            ) : filteredCampaigns.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border rounded-xl bg-card/50 p-8 space-y-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <Megaphone className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">No broadcasts found</h3>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or status filter.' : 'Create your first WhatsApp broadcast campaign.'}
                        </p>
                    </div>
                    {(!searchQuery && statusFilter === 'all') && (
                        <button
                            onClick={() => {
                                setWizardStep(1);
                                setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 rounded-lg shadow-2xs transition-colors mt-2 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            New Broadcast
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* ── PRIMARY RESPONSIVE CARDS GRID ───────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                    {filteredCampaigns.map((camp: any) => {
                        const stats = camp.stats || {};
                        const dispatched = stats.dispatched || 0;
                        const sent = stats.sent || 0;
                        const delivered = stats.delivered || 0;
                        const read = stats.read || 0;
                        const failed = stats.failed || 0;
                        const recipientCount = camp.targetPhones?.length || stats.total || dispatched || 0;
                        const deliveryPct = dispatched > 0 ? Math.round((delivered / dispatched) * 100) : 0;
                        const isMenuOpen = activeMenuId === camp.id;

                        return (
                            <div
                                key={camp.id}
                                className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3.5">
                                    {/* Card Top Strip: Icon, Name, Date & Status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Megaphone className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <Link
                                                    href={`/campaigns/${camp.id}`}
                                                    className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate block"
                                                    title={camp.name}
                                                >
                                                    {camp.name}
                                                </Link>
                                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    {format(new Date(camp.scheduledAt), 'MMM d, yyyy • HH:mm')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <CampaignStatusBadge status={camp.status} />

                                            {/* Action Menu Button */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenuId(isMenuOpen ? null : camp.id)}
                                                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                    title="Actions"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>

                                                {isMenuOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-20" onClick={() => setActiveMenuId(null)} />
                                                        <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg space-y-0.5 text-xs text-popover-foreground animate-in fade-in zoom-in-95 duration-100">
                                                            <Link
                                                                href={`/campaigns/${camp.id}`}
                                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors font-medium text-foreground"
                                                            >
                                                                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /> View Analytics
                                                            </Link>
                                                            {!camp.deletedAt && (
                                                                <button
                                                                    onClick={() => handleReuseCampaign(camp)}
                                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors font-medium text-foreground cursor-pointer"
                                                                >
                                                                    <RotateCw className="h-3.5 w-3.5 text-primary" /> Send Same Message
                                                                </button>
                                                            )}
                                                            {!camp.deletedAt && camp.status === 'completed' && failed > 0 && (
                                                                <button
                                                                    onClick={() => handleResendFailed(camp.id)}
                                                                    disabled={isResending === camp.id}
                                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted text-left transition-colors font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                                                >
                                                                    <RotateCw className="h-3.5 w-3.5" /> Resend Failed ({failed})
                                                                </button>
                                                            )}
                                                            {!camp.deletedAt && camp.status === 'processing' && (
                                                                <button
                                                                    onClick={() => handleAbortCampaign(camp.id)}
                                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-left transition-colors font-medium text-destructive cursor-pointer"
                                                                >
                                                                    <ShieldAlert className="h-3.5 w-3.5" /> Abort Broadcast
                                                                </button>
                                                            )}
                                                            {!camp.deletedAt && camp.status !== 'processing' && (
                                                                <button
                                                                    onClick={() => handleDeleteCampaign(camp.id)}
                                                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-left transition-colors font-medium text-destructive cursor-pointer"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" /> Archive Broadcast
                                                                </button>
                                                            )}
                                                            {camp.deletedAt && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRestoreCampaign(camp.id)}
                                                                    loadingText="Restoring..."
                                                                    className="w-full flex items-center justify-start gap-2 px-2.5 py-1.5 rounded-md hover:bg-emerald-500/10 text-left transition-colors font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer border-none"
                                                                >
                                                                    <RotateCw className="h-3.5 w-3.5" /> Restore Broadcast
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Audience & Template Strip */}
                                    <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs flex justify-between items-center text-muted-foreground">
                                        <span className="truncate max-w-[150px]">
                                            Template: <strong className="text-foreground font-medium">{camp.template?.templateName || 'Standard'}</strong>
                                        </span>
                                        <span className="font-semibold text-foreground shrink-0">
                                            {recipientCount.toLocaleString()} recipients
                                        </span>
                                    </div>

                                    {/* Compact Metrics Row */}
                                    <div className="grid grid-cols-4 gap-1 py-1 text-center border-y border-border/50">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Dispatched</span>
                                            <span className="text-sm font-bold text-foreground">{dispatched.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Delivered</span>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{delivered.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Read</span>
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{read.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Delivery</span>
                                            <span className={`text-sm font-bold ${deliveryPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : deliveryPct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {dispatched > 0 ? `${deliveryPct}%` : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delivery Progress Bar */}
                                    {dispatched > 0 && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                                <div title={`Read: ${read}`} className="bg-emerald-500" style={{ width: `${(read / dispatched) * 100}%` }} />
                                                <div title={`Delivered: ${delivered - read}`} className="bg-sky-500" style={{ width: `${(Math.max(0, delivered - read) / dispatched) * 100}%` }} />
                                                <div title={`Failed: ${failed}`} className="bg-rose-500" style={{ width: `${(failed / dispatched) * 100}%` }} />
                                            </div>
                                            {failed > 0 && (
                                                <p className="text-[10px] font-semibold text-rose-500 flex items-center justify-end gap-1 pt-0.5">
                                                    <AlertTriangle className="h-3 w-3" /> {failed} Failed Message{failed > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer Link */}
                                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                                    <Link
                                        href={`/campaigns/${camp.id}`}
                                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                                    >
                                        <span>View Broadcast</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                        ID: {camp.id.substring(0, 6)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── OPTIONAL SECONDARY TABLE VIEW ───────────────────────────── */
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-5 py-3">Broadcast Name</th>
                                    <th className="px-5 py-3">Template</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Dispatch Date</th>
                                    <th className="px-5 py-3 text-right">Dispatched</th>
                                    <th className="px-5 py-3 text-right">Delivered</th>
                                    <th className="px-5 py-3 text-right">Delivery %</th>
                                    <th className="px-5 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredCampaigns.map((camp: any) => {
                                    const stats = camp.stats || {};
                                    const dispatched = stats.dispatched || 0;
                                    const sent = stats.sent || 0;
                                    const delivered = stats.delivered || 0;
                                    const failed = stats.failed || 0;
                                    const rate = dispatched > 0 ? Math.round((delivered / dispatched) * 100) : 0;

                                    return (
                                        <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3.5 font-semibold text-foreground">
                                                <Link href={`/campaigns/${camp.id}`} className="hover:text-primary transition-colors">
                                                    {camp.name}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground">
                                                {camp.template?.templateName || 'Standard'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <CampaignStatusBadge status={camp.status} />
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {format(new Date(camp.scheduledAt), 'MMM d, yyyy • HH:mm')}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-medium text-foreground">
                                                {dispatched.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                                {delivered.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-foreground">
                                                {dispatched > 0 ? `${rate}%` : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-center flex items-center justify-center gap-2.5">
                                                <Link
                                                    href={`/campaigns/${camp.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                                >
                                                    View →
                                                </Link>
                                                {!camp.deletedAt && (
                                                    <button
                                                        onClick={() => handleReuseCampaign(camp)}
                                                        className="text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                                                        title="Send same message to new audience"
                                                    >
                                                        Send Same
                                                    </button>
                                                )}
                                                {camp.deletedAt && (
                                                    <button
                                                        onClick={() => handleRestoreCampaign(camp.id)}
                                                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                                    >
                                                        Restore
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Guided 4-Step Broadcast Creator Modal ───────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Modal Header & Wizard Stepper */}
                        <div className="px-6 py-4 border-b border-border bg-card space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <Megaphone className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground">New Broadcast Builder</h2>
                                        <p className="text-xs text-muted-foreground">Configure message broadcast parameters.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Stepper Navigation */}
                            <div className="grid grid-cols-4 gap-2 border-t border-border/50 pt-3">
                                {[
                                    { step: 1, label: '1. Basics' },
                                    { step: 2, label: '2. Target Audience' },
                                    { step: 3, label: '3. Message & Media' },
                                    { step: 4, label: '4. Review & Launch' },
                                ].map((s) => (
                                    <button
                                        key={s.step}
                                        type="button"
                                        onClick={() => setWizardStep(s.step as any)}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                            wizardStep === s.step
                                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                                : wizardStep > s.step
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span>{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Content Area */}
                        <div className="flex flex-1 overflow-hidden min-h-0">
                            <form onSubmit={createForm.handleSubmit(handleCreateCampaign)} className="p-6 space-y-5 flex-1 overflow-y-auto border-r border-border">
                                {/* STEP 1: BASICS & SPEED */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-semibold text-foreground">Broadcast Identity &amp; Speed</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-foreground mb-1">Broadcast Name</label>
                                            <input
                                                {...createForm.register('name')}
                                                placeholder="e.g. Festive Discount Flash Broadcast"
                                                className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                            {createForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{createForm.formState.errors.name.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-foreground mb-1">Approved Template</label>
                                            <select
                                                {...createForm.register('templateId')}
                                                onChange={(e) => {
                                                    createForm.register('templateId').onChange(e);
                                                    handleTemplateChange(e);
                                                }}
                                                className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="">Select a template...</option>
                                                {templates.map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.templateName}</option>
                                                ))}
                                            </select>
                                            {createForm.formState.errors.templateId && <p className="text-xs text-destructive mt-1">{createForm.formState.errors.templateId.message}</p>}
                                        </div>



                                        <div className="pt-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!createForm.getValues('name') || !createForm.getValues('templateId')) {
                                                        toast.error('Please enter a broadcast name and select a template.');
                                                        return;
                                                    }
                                                    setWizardStep(2);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                Next: Target Audience <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: TARGET AUDIENCE */}
                                {wizardStep === 2 && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                                            <Users className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-semibold text-foreground">Select Target Recipients</span>
                                            <span className="ml-auto text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                ~{audienceMetrics.finalEligibleCount} eligible
                                            </span>
                                        </div>

                                        {/* Step 2 Internal Tabs */}
                                        <div className="flex border-b border-border mb-4 pt-2">
                                            <button type="button" onClick={() => setStep2Tab('core')} className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${step2Tab === 'core' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Core Selection</button>
                                            <button type="button" onClick={() => setStep2Tab('advanced')} className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${step2Tab === 'advanced' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Advanced Segments</button>
                                        </div>

                                        {step2Tab === 'core' && (
                                            <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">


                                        {/* ─── SECTION 1: BASE AUDIENCE ─────────────────────── */}
                                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                                                <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">1</div>
                                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Base Audience</span>
                                                <span className="text-[10px] text-muted-foreground ml-1">— Who are you sending to?</span>
                                            </div>
                                            <div className="p-3.5 space-y-3">
                                                {/* Audience Type Selector */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {[
                                                        { id: 'all', label: 'All Contacts', desc: 'Everyone', icon: Users, color: 'text-primary' },
                                                        { id: 'tags', label: 'By Tags', desc: 'Tag-based', icon: Tag, color: 'text-violet-500' },
                                                        { id: 'contacts', label: 'Specific List', desc: 'Hand-pick', icon: ListFilter, color: 'text-amber-500' },
                                                        { id: 'failed', label: 'Retry Failed', desc: 'Prev. failures', icon: RotateCw, color: 'text-rose-500' },
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => setTargetType(type.id as any)}
                                                            className={`flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                                                targetType === type.id
                                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                                                    : 'border-border bg-background hover:bg-muted/50'
                                                            }`}
                                                        >
                                                            <div className={`flex items-center gap-1.5 font-semibold text-xs ${targetType === type.id ? 'text-primary' : 'text-foreground'}`}>
                                                                <type.icon className={`h-3.5 w-3.5 ${targetType === type.id ? 'text-primary' : type.color}`} />
                                                                {type.label}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">{type.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* By Tags sub-UI */}
                                                {targetType === 'tags' && (
                                                    <div className="border border-violet-500/20 rounded-lg p-3 bg-violet-500/5 space-y-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                                                                <Tag className="h-3 w-3" /> Send to contacts with ANY of these tags
                                                            </span>
                                                            {selectedTagList.length > 0 && (
                                                                <button type="button" onClick={() => setCreationTags('')} className="text-[10px] text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">
                                                                    Clear all ({selectedTagList.length})
                                                                </button>
                                                            )}
                                                        </div>
                                                        {/* Selected tag badges */}
                                                        <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-md border border-violet-300/40 bg-background/80 items-center">
                                                            {selectedTagList.length === 0 ? (
                                                                <span className="text-xs text-muted-foreground italic">Select tags below...</span>
                                                            ) : selectedTagList.map(tag => (
                                                                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                                                                    {tag}
                                                                    <button type="button" onClick={() => toggleCreationTag(tag)} className="hover:bg-violet-500/20 rounded-full p-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {/* Tag search + list */}
                                                        <div className="relative">
                                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search or type custom tag, press Enter to add..."
                                                                value={tagSearchQuery}
                                                                onChange={e => setTagSearchQuery(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagSearchQuery.trim()) { addCustomTag(tagSearchQuery); setTagSearchQuery(''); } } }}
                                                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                            />
                                                        </div>
                                                        <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/60">
                                                            {availableTags.filter(t => t.tag.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tObj => {
                                                                const isSel = selectedTagList.includes(tObj.tag);
                                                                return (
                                                                    <button key={tObj.tag} type="button" onClick={() => toggleCreationTag(tObj.tag)}
                                                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left hover:bg-muted/50 ${isSel ? 'bg-violet-500/5 text-violet-700 dark:text-violet-400 font-medium' : 'text-foreground'}`}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSel ? 'bg-violet-500 border-violet-500 text-white' : 'border-input bg-background'}`}>
                                                                                {isSel && <Check className="h-3 w-3" />}
                                                                            </div>
                                                                            <span>{tObj.tag}</span>
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isSel ? 'bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30' : 'bg-muted text-muted-foreground border-border'}`}>{tObj.count}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Specific Contacts sub-UI */}
                                                {targetType === 'contacts' && (
                                                    <div className="border border-amber-500/20 rounded-lg p-3 bg-amber-500/5 space-y-2">
                                                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                            <ListFilter className="h-3 w-3" /> Hand-pick individual contacts
                                                        </span>
                                                        <div className="relative">
                                                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                            <input type="text" placeholder="Search contacts by name or phone..." value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                                                        </div>
                                                        <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/60">
                                                            {allContacts.filter((c: any) => c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone?.includes(contactSearch)).map((c: any) => (
                                                                <label key={c.id} className={`flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 text-xs cursor-pointer ${creationSelectedPhones.includes(c.phone) ? 'bg-amber-500/5' : ''}`}>
                                                                    <input type="checkbox" checked={creationSelectedPhones.includes(c.phone)}
                                                                        onChange={e => { if (e.target.checked) setCreationSelectedPhones([...creationSelectedPhones, c.phone]); else setCreationSelectedPhones(creationSelectedPhones.filter(p => p !== c.phone)); }}
                                                                        className="rounded border-input text-primary" />
                                                                    <span className="font-medium text-foreground truncate">{c.name}</span>
                                                                    <span className="text-muted-foreground font-mono text-[10px] ml-auto">{c.phone}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{creationSelectedPhones.length} contacts selected</p>
                                                    </div>
                                                )}

                                                {/* Retry Failed sub-UI */}
                                                {targetType === 'failed' && (
                                                    <div className="border border-rose-500/20 rounded-lg p-3 bg-rose-500/5 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                                <RotateCw className="h-3 w-3" /> Re-send to contacts who failed in a previous broadcast
                                                            </span>
                                                            {!selectedFailedCampaignIds.includes('all') && (
                                                                <button type="button" onClick={() => setSelectedFailedCampaignIds(['all'])} className="text-[10px] text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">Reset to All</button>
                                                            )}
                                                        </div>
                                                        <select value="" onChange={e => { if (e.target.value) addFailedCategory(e.target.value); }}
                                                            className="w-full rounded bg-background border border-input px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring">
                                                            <option value="" disabled>+ Add broadcast source...</option>
                                                            <option value="all">All Failed Contacts ({campaigns.reduce((acc: number, c: any) => acc + (c.stats?.failed || 0), 0)})</option>
                                                            {campaigns.filter((c: any) => (c.stats?.failed || 0) > 0).map((c: any) => (
                                                                <option key={c.id} value={c.id} disabled={selectedFailedCampaignIds.includes(c.id)}>{c.name} ({c.stats?.failed || 0} failed)</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedFailedCampaignIds.includes('all') ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                    All Sources ({campaigns.reduce((acc: number, c: any) => acc + (c.stats?.failed || 0), 0)} failed)
                                                                </span>
                                                            ) : selectedFailedCampaignIds.map(cId => {
                                                                const camp = campaigns.find((c: any) => c.id === cId);
                                                                if (!camp) return null;
                                                                return (
                                                                    <span key={cId} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                        {camp.name} ({camp.stats?.failed || 0})
                                                                        <button type="button" onClick={() => removeFailedCategory(cId)} className="hover:bg-rose-500/20 rounded-full p-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Failed contacts list */}
                                                        {isLoadingFailedContacts ? (
                                                            <div className="p-3 text-center text-xs text-primary flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                                                        ) : failedContactsList.length > 0 && (
                                                            <div className="space-y-1.5 pt-2 border-t border-rose-500/20">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[11px] font-semibold text-foreground">{creationSelectedPhones.length} / {failedContactsList.length} Selected</span>
                                                                    <button type="button" onClick={() => { if (creationSelectedPhones.length === failedContactsList.length) setCreationSelectedPhones([]); else setCreationSelectedPhones(failedContactsList.map(c => c.phone)); }}
                                                                        className="text-[10px] font-medium text-primary hover:underline cursor-pointer">
                                                                        {creationSelectedPhones.length === failedContactsList.length ? 'Deselect All' : 'Select All'}
                                                                    </button>
                                                                </div>
                                                                <div className="relative">
                                                                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                                                    <input type="text" placeholder="Search failed contacts..." value={failedContactSearch} onChange={e => setFailedContactSearch(e.target.value)}
                                                                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                                                                </div>
                                                                <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/60">
                                                                    {failedContactsList.filter(fc => fc.name.toLowerCase().includes(failedContactSearch.toLowerCase()) || fc.phone.includes(failedContactSearch) || fc.campaignName.toLowerCase().includes(failedContactSearch.toLowerCase())).map(fc => {
                                                                        const isChecked = creationSelectedPhones.includes(fc.phone);
                                                                        return (
                                                                            <label key={fc.phone} className={`flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs cursor-pointer ${isChecked ? 'bg-rose-500/5' : ''}`}>
                                                                                <div className="flex items-center gap-2 truncate">
                                                                                    <input type="checkbox" checked={isChecked}
                                                                                        onChange={e => { if (e.target.checked) setCreationSelectedPhones([...creationSelectedPhones, fc.phone]); else setCreationSelectedPhones(creationSelectedPhones.filter(p => p !== fc.phone)); }}
                                                                                        className="rounded border-input text-rose-500" />
                                                                                    <span className="font-medium text-foreground truncate">{fc.name}</span>
                                                                                    <span className="font-mono text-muted-foreground text-[10px]">{fc.phone}</span>
                                                                                </div>
                                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">{fc.failReason}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* All Contacts summary */}
                                                {targetType === 'all' && (
                                                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs">
                                                        <Users className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="text-foreground">Sending to <strong>all {audienceMetrics.baseCount.toLocaleString()} contacts</strong> — apply filters below to narrow down.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ─── SECTION 2: EXCLUSIONS ────────────────────────── */}
                                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                                                <div className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center text-[10px] font-bold">2</div>
                                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Exclusions</span>
                                                <span className="text-[10px] text-muted-foreground ml-1">— Who to skip</span>
                                                {excludeTags.length > 0 && (
                                                    <span className="ml-auto text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                        {excludeTags.length} tag{excludeTags.length !== 1 ? 's' : ''} excluded
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3.5 space-y-3">
                                                {/* Exclude by Tags */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <X className="h-3.5 w-3.5 text-rose-500" />
                                                        Exclude by Tags
                                                        <span className="text-[10px] font-normal text-muted-foreground">(contacts with ANY of these tags are skipped)</span>
                                                    </label>
                                                    <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-md border border-input bg-background/80 items-center">
                                                        {excludeTags.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground italic">No exclusion tags. Optional.</span>
                                                        ) : excludeTags.map(tag => (
                                                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                                {tag}
                                                                <button type="button" onClick={() => toggleExcludeTag(tag)} className="hover:bg-rose-500/20 rounded-full p-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search tags to exclude..."
                                                            value={excludeTagSearchQuery}
                                                            onChange={e => setExcludeTagSearchQuery(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </div>
                                                    {excludeTagSearchQuery.trim() && (
                                                        <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/60">
                                                            {availableTags.filter(t => t.tag.toLowerCase().includes(excludeTagSearchQuery.toLowerCase())).slice(0, 8).map(tObj => (
                                                                <button key={tObj.tag} type="button"
                                                                    onClick={() => { toggleExcludeTag(tObj.tag); setExcludeTagSearchQuery(''); }}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer text-left ${excludeTags.includes(tObj.tag) ? 'bg-rose-500/5 text-rose-600 font-medium' : 'text-foreground'}`}>
                                                                    <span>{tObj.tag}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{tObj.count} contacts</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ─── SECTION 3: CONSENT & COMPLIANCE ─────────────── */}
                                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-[10px] font-bold">3</div>
                                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Consent &amp; Compliance</span>
                                                <span className="text-[10px] text-muted-foreground ml-1">— Filtering rules</span>
                                            </div>
                                            <div className="p-3.5 space-y-3">
                                                {/* Consent Mode */}
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    {[
                                                        { id: 'EXCLUDE_OPTED_OUT', label: 'Exclude Opted-Out', desc: 'Skip opted-out contacts; send to opted-in + unknown (Recommended)', active: 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20' },
                                                        { id: 'OPTED_IN_ONLY', label: 'Opted-In Only', desc: 'Strictest — only contacts who explicitly opted in', active: 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20' },
                                                        { id: 'ALL', label: 'Include All', desc: 'No consent filtering — use with caution (non-compliant)', active: 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20' },
                                                    ].map(mode => (
                                                        <button key={mode.id} type="button" onClick={() => setMarketingConsentMode(mode.id)}
                                                            className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${marketingConsentMode === mode.id ? mode.active : 'border-border bg-background text-muted-foreground hover:bg-muted/50'}`}>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${marketingConsentMode === mode.id ? 'border-current' : 'border-muted-foreground/40'}`}>
                                                                {marketingConsentMode === mode.id && <div className="w-2 h-2 rounded-full bg-current" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-foreground">{mode.label}</div>
                                                                <div className="text-[10px] text-muted-foreground">{mode.desc}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Unsubscribed toggle */}
                                                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                                    <input type="checkbox" checked={excludeUnsubscribed} onChange={e => setExcludeUnsubscribed(e.target.checked)} className="rounded border-input text-primary" />
                                                    <div>
                                                        <div className="text-xs font-semibold text-foreground">Exclude Unsubscribed Contacts</div>
                                                        <div className="text-[10px] text-muted-foreground">Skip contacts tagged with "unsubscribed"</div>
                                                    </div>
                                                </label>

                                            </div>
                                        </div>
                                        </div>
                                        )}
                                        
                                        {step2Tab === 'advanced' && (
                                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
                                                    <Info className="h-5 w-5 text-primary shrink-0" />
                                                    <div className="text-xs text-foreground/80 space-y-1">
                                                        <p className="font-semibold text-foreground">Advanced Segments</p>
                                                        <p>Filter your core audience down further by city, specific tags, or inactivity periods.</p>
                                                    </div>
                                                </div>
                                                
                                        {/* ─── SECTION 1: LOCATION & SEGMENT ───────────────── */}
                                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</div>
                                                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Location &amp; Segment Filters</span>
                                                <span className="text-[10px] text-muted-foreground ml-1">— Optional refinements</span>
                                                {(targetCity.trim() || requireTags.length > 0 || noMessagesInDays.trim()) && (
                                                    <span className="ml-auto text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                        {[targetCity.trim() && '📍 City', requireTags.length > 0 && `🏷 ${requireTags.length} tag(s)`, noMessagesInDays.trim() && '🕒 Inactive'].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3.5 space-y-4">
                                                {/* City Filter */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <Filter className="h-3.5 w-3.5 text-blue-500" />
                                                        Filter by City
                                                        <span className="text-[10px] font-normal text-muted-foreground">(only contacts where city matches)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Mumbai, Pune, Delhi... (leave empty for all)"
                                                        value={targetCity}
                                                        onChange={e => setTargetCity(e.target.value)}
                                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                    />
                                                </div>

                                                {/* Must-Have Tags (AND filter) */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <Tag className="h-3.5 w-3.5 text-blue-500" />
                                                        Must Also Have Tags
                                                        <span className="text-[10px] font-normal text-muted-foreground">(contacts must have ALL of these — AND logic)</span>
                                                    </label>
                                                    {/* Required tags badges */}
                                                    <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-md border border-input bg-background/80 items-center">
                                                        {requireTags.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground italic">No required tags. Optional.</span>
                                                        ) : requireTags.map(tag => (
                                                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                                                {tag}
                                                                <button type="button" onClick={() => toggleRequireTag(tag)} className="hover:bg-blue-500/20 rounded-full p-0.5 cursor-pointer"><X className="h-3 w-3" /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search tags to require..."
                                                            value={requireTagSearch}
                                                            onChange={e => setRequireTagSearch(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                    </div>
                                                    {requireTagSearch.trim() && (
                                                        <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-background divide-y divide-border/60">
                                                            {availableTags.filter(t => t.tag.toLowerCase().includes(requireTagSearch.toLowerCase())).slice(0, 8).map(tObj => (
                                                                <button key={tObj.tag} type="button"
                                                                    onClick={() => { toggleRequireTag(tObj.tag); setRequireTagSearch(''); }}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer text-left ${requireTags.includes(tObj.tag) ? 'bg-blue-500/5 text-blue-700 dark:text-blue-400 font-medium' : 'text-foreground'}`}>
                                                                    <span>{tObj.tag}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{tObj.count} contacts</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* No Messages In N Days */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                                        Inactive Contacts Only
                                                        <span className="text-[10px] font-normal text-muted-foreground">(no messages exchanged in N days)</span>
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="365"
                                                            placeholder="e.g. 30"
                                                            value={noMessagesInDays}
                                                            onChange={e => setNoMessagesInDays(e.target.value)}
                                                            className="w-28 rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                        <span className="text-xs text-muted-foreground">days of inactivity <span className="italic">(leave empty to include all)</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                            </div>
                                        )}

                                        {/* Shared Eligibility Summary */}
                                        <div className="p-4 rounded-xl bg-muted/30 border border-border mt-6 mb-4">
                                            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estimated Audience Breakdown</div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Base Audience Count</span>
                                                    <span className="font-mono">{audienceMetrics.baseCount.toLocaleString()}</span>
                                                </div>
                                                {audienceMetrics.exclusionsCount > 0 && (
                                                    <div className="flex justify-between text-rose-500">
                                                        <span>✗ Excluded (Tags)</span>
                                                        <span className="font-mono">-{audienceMetrics.exclusionsCount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {audienceMetrics.consentExcludedCount > 0 && (
                                                    <div className="flex justify-between text-rose-500">
                                                        <span>✗ Excluded (Consent/Invalid)</span>
                                                        <span className="font-mono">-{audienceMetrics.consentExcludedCount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {audienceMetrics.locationSegmentExcludedCount > 0 && (
                                                    <div className="flex justify-between text-rose-500">
                                                        <span>✗ Excluded (Location/Segment)</span>
                                                        <span className="font-mono">-{audienceMetrics.locationSegmentExcludedCount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 border-t border-border/60 pt-2 mt-2 font-bold text-sm">
                                                    <span>Final Eligible Audience</span>
                                                    <span>{audienceMetrics.finalEligibleCount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Nav buttons */}
                                        <div className="pt-2 flex justify-between">
                                            <button type="button" onClick={() => setWizardStep(1)} className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer">Back</button>
                                            <button type="button" onClick={() => setWizardStep(3)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer">
                                                Next: Message &amp; Media <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: MESSAGE & MEDIA */}
                                {wizardStep === 3 && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                                            <Zap className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-semibold text-foreground">Message Variables &amp; Media</span>
                                        </div>

                                        {selectedTemplate ? (
                                            <div className="space-y-3">
                                                {/* Template Media Header Picker */}
                                                {(() => {
                                                    const headerComp = selectedTemplate.components?.find((c: any) => c.type === 'HEADER');
                                                    if (!headerComp || !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) return null;
                                                    return (
                                                        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-primary uppercase flex items-center gap-1.5">
                                                                    {headerComp.format} Header Media Required
                                                                </span>
                                                                {headerMediaUrl && (
                                                                    <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" /> Ready
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Paste ${headerComp.format.toLowerCase()} URL or pick from gallery`}
                                                                    value={headerMediaUrl}
                                                                    onChange={e => setHeaderMediaUrl(e.target.value)}
                                                                    className="flex-1 rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowMediaGallery(true)}
                                                                    className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border transition-colors cursor-pointer"
                                                                >
                                                                    Media Gallery
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Header parameters */}
                                                {(() => {
                                                    const headerComp = selectedTemplate.components?.find((c: any) => c.type === 'HEADER');
                                                    if (headerComp?.format === 'TEXT' && headerComp.text?.includes('{{1}}')) {
                                                        return (
                                                            <div>
                                                                <label className="block text-xs font-medium text-foreground mb-1">Header Parameter {'{{1}}'}</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Header text variable"
                                                                    value={templateParams['header_1'] || ''}
                                                                    onChange={e => setTemplateParams({ ...templateParams, header_1: e.target.value })}
                                                                    className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                {/* Body parameters */}
                                                {(() => {
                                                    const bodyComp = selectedTemplate.components?.find((c: any) => c.type === 'BODY');
                                                    if (!bodyComp) return null;
                                                    const matches = bodyComp.text?.match(/\{\{\d+\}\}/g) || [];
                                                    const uniqueParams = Array.from(new Set(matches));
                                                    if (uniqueParams.length === 0) return null;
                                                    return (
                                                        <div className="space-y-2">
                                                            {uniqueParams.map((p: any) => {
                                                                const num = p.replace(/[\{\}]/g, '');
                                                                return (
                                                                    <div key={num}>
                                                                        <label className="block text-xs font-medium text-foreground mb-1">Body Parameter {p}</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder={`Variable ${p} (e.g. Customer Name)`}
                                                                            value={templateParams[`body_${num}`] || ''}
                                                                            onChange={e => setTemplateParams({ ...templateParams, [`body_${num}`]: e.target.value })}
                                                                            className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Footer parameters */}
                                                {(() => {
                                                    const footerComp = selectedTemplate.components?.find((c: any) => c.type === 'FOOTER');
                                                    if (!footerComp) return null;
                                                    const matches = footerComp.text?.match(/\{\{\d+\}\}/g) || [];
                                                    const uniqueParams = Array.from(new Set(matches));
                                                    if (uniqueParams.length > 0) {
                                                        return (
                                                            <div className="space-y-2 pt-3 border-t border-border/50">
                                                                <span className="text-xs font-semibold text-foreground block">Footer Parameters</span>
                                                                {uniqueParams.map((p: any) => {
                                                                    const num = p.replace(/[\{\}]/g, '');
                                                                    return (
                                                                        <div key={num}>
                                                                            <label className="block text-xs font-medium text-foreground mb-1">Footer Parameter {p}</label>
                                                                            <input
                                                                                type="text"
                                                                                placeholder={`Footer variable ${p}`}
                                                                                value={templateParams[`footer_${num}`] || ''}
                                                                                onChange={e => setTemplateParams({ ...templateParams, [`footer_${num}`]: e.target.value })}
                                                                                className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="space-y-1.5 pt-3 border-t border-border/50">
                                                            <label className="block text-xs font-semibold text-foreground">Footer Text / Parameter</label>
                                                            <input
                                                                type="text"
                                                                placeholder={footerComp.text || "Footer parameter text"}
                                                                value={templateParams['footer_1'] !== undefined ? templateParams['footer_1'] : (footerComp.text || '')}
                                                                onChange={e => setTemplateParams({ ...templateParams, footer_1: e.target.value })}
                                                                className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                            />
                                                            <p className="text-[10px] text-muted-foreground">Edit template footer text or variable parameter.</p>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Button parameters */}
                                                {(() => {
                                                    const buttonsComp = selectedTemplate.components?.find((c: any) => c.type === 'BUTTONS');
                                                    const buttonsList = buttonsComp?.buttons || [];
                                                    if (!Array.isArray(buttonsList) || buttonsList.length === 0) return null;

                                                    return (
                                                        <div className="space-y-2.5 pt-3 border-t border-border/50">
                                                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Button Parameters &amp; Settings
                                                            </span>
                                                            <div className="space-y-2">
                                                                {buttonsList.map((btn: any, idx: number) => {
                                                                    const isUrl = btn.type === 'URL';
                                                                    const hasUrlVar = isUrl && btn.url?.includes('{{1}}');
                                                                    const isQuickReply = btn.type === 'QUICK_REPLY';

                                                                    return (
                                                                        <div key={idx} className="p-2.5 rounded-md border border-border/70 bg-muted/20 space-y-1.5">
                                                                            <div className="flex items-center justify-between text-xs font-medium text-foreground">
                                                                                <span className="flex items-center gap-1.5 truncate">
                                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                                                                                        {btn.type || 'Button'}
                                                                                    </span>
                                                                                    {btn.text || `Button ${idx + 1}`}
                                                                                </span>
                                                                                {isUrl && btn.url && (
                                                                                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                                                                                        {btn.url}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {(isUrl || isQuickReply) && (
                                                                                <div>
                                                                                    <label className="block text-[11px] text-muted-foreground mb-1">
                                                                                        {hasUrlVar
                                                                                            ? `Dynamic URL Variable {{1}} for "${btn.text}"`
                                                                                            : isUrl
                                                                                            ? `URL Extension / Parameter for "${btn.text}"`
                                                                                            : `Quick Reply Payload for "${btn.text}"`}
                                                                                    </label>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder={
                                                                                            hasUrlVar
                                                                                                ? "e.g. promo2026 or customer_id"
                                                                                                : isUrl
                                                                                                ? "Parameter text"
                                                                                                : "Payload string"
                                                                                        }
                                                                                        value={buttonParams[idx] || buttonParams[String(idx)] || ''}
                                                                                        onChange={e => setButtonParams({ ...buttonParams, [idx]: e.target.value, [String(idx)]: e.target.value })}
                                                                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">No template selected. Please select a template in Step 1.</p>
                                        )}

                                        <div className="pt-4 flex justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(2)}
                                                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(4)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                Next: Review &amp; Launch <ArrowRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: REVIEW & LAUNCH */}
                                {wizardStep === 4 && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm font-semibold text-foreground">Review &amp; Schedule Launch</span>
                                        </div>

                                        {/* Summary Box */}
                                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs">
                                            <div className="flex justify-between border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Broadcast Name:</span>
                                                <span className="font-bold text-foreground">{createForm.getValues('name') || 'Unnamed'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Template:</span>
                                                <span className="font-semibold text-foreground">{selectedTemplate?.templateName || 'None'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Target Audience:</span>
                                                <span className="font-semibold text-foreground capitalize">
                                                    {targetType === 'contacts' || targetType === 'failed'
                                                        ? `${creationSelectedPhones.length} Contacts`
                                                        : targetType}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">Consent Filter:</span>
                                                <span className="font-semibold text-foreground">
                                                    {marketingConsentMode === 'OPTED_IN_ONLY' ? 'Opted-In Only' : marketingConsentMode === 'EXCLUDE_OPTED_OUT' ? 'Exclude Opted-Out' : 'All'}
                                                </span>
                                            </div>
                                            {excludeTags.length > 0 && (
                                                <div className="flex justify-between border-b border-border/50 pb-2">
                                                    <span className="text-muted-foreground">Excluded Tags:</span>
                                                    <span className="font-semibold text-rose-500">{excludeTags.join(', ')}</span>
                                                </div>
                                            )}
                                            {targetCity.trim() && (
                                                <div className="flex justify-between border-b border-border/50 pb-2">
                                                    <span className="text-muted-foreground">City Filter:</span>
                                                    <span className="font-semibold text-foreground">{targetCity.trim()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Sending Rate:</span>
                                                <span className="font-semibold text-foreground uppercase">{sendRate}</span>
                                            </div>
                                        </div>

                                        {/* Message Sending Rate */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                <Zap className="h-3.5 w-3.5 text-primary" />
                                                Message Sending Rate
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'instant', label: 'Instant Rate', desc: '0s delay (Max Speed)', icon: Zap },
                                                    { id: 'standard', label: 'Good Rate', desc: '300ms delay (Optimal)', icon: ShieldCheck },
                                                    { id: 'turbo', label: 'Fastest Rate', desc: '100ms delay (Turbo Speed)', icon: Rocket },
                                                ].map((rate) => (
                                                    <button
                                                        key={rate.id}
                                                        type="button"
                                                        onClick={() => setSendRate(rate.id as any)}
                                                        className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                                            sendRate === rate.id
                                                                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold'
                                                                : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                                            <rate.icon className="h-3.5 w-3.5" />
                                                            <span>{rate.label}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground mt-0.5">{rate.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Schedule Toggle */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex rounded-md bg-muted p-0.5 border border-border text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setSendNow(true)}
                                                    className={`flex-1 py-1.5 rounded-sm font-medium transition-colors cursor-pointer ${
                                                        sendNow ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    Send Immediately
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendNow(false)}
                                                    className={`flex-1 py-1.5 rounded-sm font-medium transition-colors cursor-pointer ${
                                                        !sendNow ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    Schedule Broadcast
                                                </button>
                                            </div>

                                            {!sendNow && (
                                                <div>
                                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule Date &amp; Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        min={format(new Date(Date.now() + 60_000), "yyyy-MM-dd'T'HH:mm")}
                                                        value={newCampaign.scheduledAt}
                                                        onChange={e => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                                                        className="w-full rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="pt-4 flex justify-between items-center">
                                            <button
                                                type="button"
                                                onClick={() => setWizardStep(3)}
                                                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer"
                                            >
                                                Back
                                            </button>

                                            <Button
                                                type="submit"
                                                loading={isSaving}
                                                loadingText="Dispatching..."
                                                longLoadingText="Processing your campaign..."
                                                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-md transition-all cursor-pointer"
                                            >
                                                <Megaphone className="h-4 w-4" />
                                                {sendNow ? 'Dispatch Broadcast Now' : 'Schedule Broadcast'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            {/* WhatsApp Live Preview Side-Panel */}
                            <div className="hidden lg:block w-80 p-5 bg-muted/20 overflow-y-auto flex-col items-center justify-center border-l border-border">
                                <div className="sticky top-0 space-y-3">
                                    <span className="text-xs font-semibold text-muted-foreground block text-center uppercase tracking-wider">
                                        WhatsApp Live Preview
                                    </span>
                                    {selectedTemplate ? (
                                        <WhatsAppPreview
                                            template={selectedTemplate}
                                            templateParams={templateParams}
                                            buttonParams={buttonParams}
                                            headerMediaUrl={headerMediaUrl}
                                        />
                                    ) : (
                                        <div className="p-6 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                                            <Megaphone className="h-6 w-6 mx-auto opacity-40 mb-1" />
                                            <p className="text-xs">Select a template in Step 1 to preview your broadcast message</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Gallery Picker Modal */}
            <MediaGalleryModal
                open={showMediaGallery}
                onClose={() => setShowMediaGallery(false)}
                onSelect={(item) => {
                    setHeaderMediaUrl(item.fileUrl);
                    setShowMediaGallery(false);
                }}
            />

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
