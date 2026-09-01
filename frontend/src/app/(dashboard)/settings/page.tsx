"use client";

import { useEffect, useState } from 'react';
import { api, API_BASE_URL } from '@/lib/api';
import {
    Settings, Shield, MessageSquare, Save, ExternalLink, Smartphone, Info,
    User as UserIcon, Lock, Loader2, Camera, Edit3, Image as ImageIcon,
    KeyRound, Copy, Check, Building2, UserRound, Globe, Mail, ChevronRight, X
} from 'lucide-react';
import { PageLoading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


const profileSchema = z.object({
    username: z.string().min(1, "Username is required"),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required")
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
});

const credsSchema = z.object({
    webhookVerifyToken: z.string().optional()
});

type SettingsCategory = 'whatsapp' | 'webhooks' | 'account' | 'security';

export default function RetailerSettingsPage() {
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>('whatsapp');
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // WhatsApp Profile State
    const [waProfile, setWaProfile] = useState<any>(null);
    const [isUploadingPp, setIsUploadingPp] = useState(false);
    const [isWaProfileLoading, setIsWaProfileLoading] = useState(false);

    // Editing Modals State
    const [editMode, setEditMode] = useState<'none' | 'about' | 'name'>('none');
    const [editAbout, setEditAbout] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editWebsite, setEditWebsite] = useState('');
    const [editName, setEditName] = useState('');

    // Forms
    const profileForm = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { username: '' } });
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
    const credsForm = useForm<z.infer<typeof credsSchema>>({ resolver: zodResolver(credsSchema), defaultValues: { webhookVerifyToken: '' } });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [shopRes, credsRes, profileRes, waProfileRes] = await Promise.all([
                api.get('/shops/me').catch(() => ({ data: { shop: null } })),
                api.get('/shops/credentials').catch(() => ({ data: null })),
                api.get('/users/me').catch(() => ({ data: null })),
                api.get('/whatsapp/profile').catch(() => ({ data: null }))
            ]);

            if (shopRes.data?.shop) setShop(shopRes.data.shop);
            if (credsRes.data) credsForm.reset(credsRes.data);
            if (profileRes.data) profileForm.reset({ username: profileRes.data.username });
            if (waProfileRes.data) setWaProfile(waProfileRes.data);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load settings data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (values: z.infer<typeof profileSchema>) => {
        try {
            await api.put('/users/me', values);
            toast.success('Profile updated successfully!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleChangePassword = async (values: z.infer<typeof passwordSchema>) => {
        try {
            await api.put('/users/me/password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            toast.success('Password changed successfully!');
            passwordForm.reset();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        }
    };

    const handleSaveCreds = async (values: z.infer<typeof credsSchema>) => {
        try {
            await api.put('/shops/credentials', values);
            toast.success('WhatsApp credentials saved successfully!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save credentials');
        }
    };

    // WhatsApp Profile Handlers
    const handlePpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploadingPp(true);
        try {
            await api.post('/whatsapp/profile/picture', formData);
            toast.success('Profile picture updated!');
            const waProfileRes = await api.get('/whatsapp/profile').catch(() => ({ data: null }));
            if (waProfileRes.data) setWaProfile(waProfileRes.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload profile picture');
        } finally {
            setIsUploadingPp(false);
        }
    };

    const handleSaveWaProfile = async () => {
        setIsWaProfileLoading(true);
        try {
            await api.put('/whatsapp/profile', {
                about: editAbout,
                description: editAbout,
                email: editEmail,
                websites: editWebsite ? [editWebsite] : []
            });
            toast.success('Business profile updated!');
            setEditMode('none');
            const waProfileRes = await api.get('/whatsapp/profile').catch(() => ({ data: null }));
            if (waProfileRes.data) setWaProfile(waProfileRes.data);
        } catch (err: any) {
            const data = err.response?.data;
            const rawMsg = (typeof data?.message === 'string' ? data.message : null)
                || (typeof data?.error?.message === 'string' ? data.error.message : null)
                || (typeof err.message === 'string' ? err.message : null)
                || 'Failed to update profile';
            toast.error(rawMsg);
        } finally {
            setIsWaProfileLoading(false);
        }
    };

    const handleRequestNameChange = async () => {
        setIsWaProfileLoading(true);
        try {
            await api.post('/whatsapp/profile/name', { name: editName });
            toast.success('Display name change requested! Please wait for Meta review.');
            setEditMode('none');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to request name change');
        } finally {
            setIsWaProfileLoading(false);
        }
    };

    if (loading) return <PageLoading label="Loading settings" />;

    const navItems = [
        { id: 'whatsapp', label: 'WhatsApp Profile', icon: Smartphone, desc: 'Display name & business profile' },
        { id: 'webhooks', label: 'API & Webhooks', icon: KeyRound, desc: 'Connection & verify tokens' },
        { id: 'account', label: 'Account Profile', icon: UserRound, desc: 'User profile details' },
        { id: 'security', label: 'Security', icon: Shield, desc: 'Password & authentication' },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">

            {/* ── Page Header ───────────────────────────────────────────────── */}
            <div className="border-b border-border pb-5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-xs text-muted-foreground mt-1">Manage your business profile, WhatsApp connection, account security, and webhooks.</p>
            </div>

            {/* ── Workspace Container: Sidebar Nav + Settings Content ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── Settings Sidebar Navigation (Desktop) ────────────────────── */}
                <div className="lg:col-span-3 space-y-1">
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeCategory === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveCategory(item.id as SettingsCategory)}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 lg:w-full text-left ${
                                        isActive
                                            ? 'bg-muted text-foreground font-bold border border-border shadow-2xs'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <div className="hidden lg:block min-w-0">
                                        <p className="truncate">{item.label}</p>
                                        <p className="text-[10px] font-normal text-muted-foreground truncate">{item.desc}</p>
                                    </div>
                                    <span className="lg:hidden">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Settings Active Content Workspace ───────────────────────── */}
                <div className="lg:col-span-9 space-y-6">

                    {/* 1. WHATSAPP BUSINESS PROFILE */}
                    {activeCategory === 'whatsapp' && (
                        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2.5">
                                    <Smartphone className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">WhatsApp Business Profile</h2>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    Meta Verified
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                {/* Profile Picture Avatar */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="relative group">
                                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border shadow-2xs bg-muted flex items-center justify-center">
                                            {isUploadingPp ? (
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            ) : waProfile?.profile_picture_url ? (
                                                <img src={waProfile.profile_picture_url} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xs cursor-pointer hover:bg-primary/90 transition-transform active:scale-95">
                                            <Camera className="h-3.5 w-3.5" />
                                            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePpUpload} disabled={isUploadingPp} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-mono">256x256 JPG/PNG</p>
                                </div>

                                {/* Business Profile Info */}
                                <div className="flex-1 space-y-4 w-full">
                                    {/* Display Name Card */}
                                    <div className="p-4 rounded-lg border border-border bg-muted/20 relative group space-y-1">
                                        {!waProfile?.phoneDetails || waProfile.phoneDetails.nameStatus !== 'PENDING' ? (
                                            <button
                                                onClick={() => {
                                                    setEditMode('name');
                                                    setEditName(waProfile?.phoneDetails?.verifiedName || shop?.shopName || '');
                                                }}
                                                className="absolute top-3 right-3 p-1.5 bg-background border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                                                title="Request Name Change"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </button>
                                        ) : null}

                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display Name</span>
                                            {waProfile?.phoneDetails?.nameStatus === 'PENDING' && (
                                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-semibold">
                                                    Pending Meta Review
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm font-bold text-foreground">
                                            {waProfile?.phoneDetails?.verifiedName || shop?.shopName || 'Unknown Business'}
                                        </p>

                                        {waProfile?.phoneDetails?.nameStatus === 'PENDING' && (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                                Meta is currently reviewing request to change name to "{waProfile.phoneDetails.pendingName}".
                                            </p>
                                        )}
                                    </div>

                                    {/* Business Details Card */}
                                    <div className="p-4 rounded-lg border border-border bg-muted/20 relative group space-y-3">
                                        <button
                                            onClick={() => {
                                                setEditMode('about');
                                                setEditAbout(waProfile?.description || waProfile?.about || '');
                                                setEditEmail(waProfile?.email || '');
                                                setEditWebsite(waProfile?.websites?.[0] || '');
                                            }}
                                            className="absolute top-3 right-3 p-1.5 bg-background border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
                                            title="Edit Profile Information"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </button>

                                        <div>
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">About / Description</span>
                                            <p className="text-xs text-foreground leading-relaxed">
                                                {waProfile?.description || waProfile?.about || <span className="text-muted-foreground italic">Not configured</span>}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs">
                                            <div>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Customer Support Email</span>
                                                <p className="text-foreground">{waProfile?.email || <span className="text-muted-foreground italic">Not set</span>}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Official Website</span>
                                                <p className="text-foreground font-mono truncate">
                                                    {waProfile?.websites?.[0] ? (
                                                        <a href={waProfile.websites[0]} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                            {waProfile.websites[0]}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Not set</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. API & WEBHOOKS */}
                    {activeCategory === 'webhooks' && (
                        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2.5">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">API & Webhook Configuration</h2>
                                </div>
                                <a
                                    href="https://developers.facebook.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                >
                                    <span>Meta Developer Portal</span>
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            {/* WhatsApp Automation Setup Link Banner */}
                            <div className="p-4 rounded-lg border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xs font-semibold text-foreground">WhatsApp Business API Connection</h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Automated Meta Embedded Signup and Phone Number ID management.</p>
                                </div>
                                <Link
                                    href="/connect-whatsapp"
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-colors shrink-0"
                                >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>Manage WhatsApp API</span>
                                </Link>
                            </div>

                            {/* Webhook Fields */}
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Callback Webhook URL (Copy to Meta App)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground"
                                            value={`${API_BASE_URL}/webhooks/whatsapp?shopId=${shop?.id || ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${API_BASE_URL}/webhooks/whatsapp?shopId=${shop?.id}`);
                                                toast.success('Callback URL copied to clipboard');
                                            }}
                                            className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-lg text-xs font-medium text-foreground transition-colors shrink-0"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Verify Token (Match in Meta App)</label>
                                    <div className="flex gap-2">
                                        <input
                                            {...credsForm.register("webhookVerifyToken")}
                                            placeholder="Enter verify token string..."
                                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <Button
                                            type="button"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                await credsForm.handleSubmit(handleSaveCreds)(e as any);
                                            }}
                                            loadingText="Saving..."
                                            className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-2xs transition-all shrink-0 border-none cursor-pointer"
                                        >
                                            Save Token
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. ACCOUNT PROFILE */}
                    {activeCategory === 'account' && (
                        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2.5">
                                    <UserRound className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Account Profile</h2>
                                </div>
                            </div>

                            <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Username</label>
                                    <input
                                        {...profileForm.register("username")}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {profileForm.formState.errors.username && (
                                        <p className="text-[11px] text-destructive mt-1">{profileForm.formState.errors.username.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    loading={profileForm.formState.isSubmitting}
                                    loadingText="Updating..."
                                    successText="Saved!"
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-all border-none cursor-pointer"
                                >
                                    <Save className="h-3.5 w-3.5" /> Update Profile
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* 4. SECURITY SETTINGS */}
                    {activeCategory === 'security' && (
                        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div className="flex items-center gap-2.5">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Security & Password</h2>
                                </div>
                            </div>

                            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        {...passwordForm.register("currentPassword")}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {passwordForm.formState.errors.currentPassword && (
                                        <p className="text-[11px] text-destructive mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">New Password</label>
                                    <input
                                        type="password"
                                        {...passwordForm.register("newPassword")}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {passwordForm.formState.errors.newPassword && (
                                        <p className="text-[11px] text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        {...passwordForm.register("confirmPassword")}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {passwordForm.formState.errors.confirmPassword && (
                                        <p className="text-[11px] text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    loading={passwordForm.formState.isSubmitting}
                                    loadingText="Changing..."
                                    successText="Password Changed!"
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-2xs transition-all border-none cursor-pointer"
                                >
                                    <Lock className="h-3.5 w-3.5" /> Change Password
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals for WhatsApp Profile Updates ──────────────────────── */}
            {editMode !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-md bg-card rounded-xl border border-border p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-semibold text-foreground">
                                {editMode === 'name' ? 'Request Display Name Change' : 'Edit Business Information'}
                            </h3>
                            <button onClick={() => setEditMode('none')} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            {editMode === 'name' && (
                                <>
                                    <p className="text-[11px] text-muted-foreground">
                                        Meta requires display names to accurately represent your registered business brand.
                                    </p>
                                    <div>
                                        <label className="block font-medium text-foreground mb-1">New Display Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="e.g. Salescope Coffee"
                                        />
                                    </div>
                                </>
                            )}

                            {editMode === 'about' && (
                                <>
                                    <div>
                                        <label className="block font-medium text-foreground mb-1">About / Description</label>
                                        <textarea
                                            value={editAbout}
                                            onChange={e => setEditAbout(e.target.value)}
                                            rows={3}
                                            className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                                            placeholder="Describe your business..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-medium text-foreground mb-1">Support Email</label>
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={e => setEditEmail(e.target.value)}
                                            className="w-full border border-border bg-background rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="support@company.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-medium text-foreground mb-1">Website URL</label>
                                        <input
                                            type="url"
                                            value={editWebsite}
                                            onChange={e => setEditWebsite(e.target.value)}
                                            className="w-full border border-border bg-background font-mono text-foreground rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="https://company.com"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setEditMode('none')}
                                    className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button
                                    onClick={editMode === 'name' ? handleRequestNameChange : handleSaveWaProfile}
                                    loading={isWaProfileLoading}
                                    loadingText={editMode === 'name' ? 'Submitting...' : 'Saving Changes...'}
                                    className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-2xs border-none cursor-pointer"
                                >
                                    <span>{editMode === 'name' ? 'Submit Request' : 'Save Changes'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
