"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Settings, Shield, MessageSquare, Save, ExternalLink, Smartphone, Info, Loader2 } from 'lucide-react';
import { PageLoading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const credsSchema = z.object({
    businessAccountId: z.string().min(1, "Business Account ID is required"),
    phoneNumberId: z.string().min(1, "Phone Number ID is required"),
    accessToken: z.string().min(1, "Access Token is required"),
    webhookVerifyToken: z.string().optional()
});

export default function ManualConnectionPage() {
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const credsForm = useForm<z.infer<typeof credsSchema>>({ 
        resolver: zodResolver(credsSchema), 
        defaultValues: { businessAccountId: '', phoneNumberId: '', accessToken: '', webhookVerifyToken: '' } 
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const [shopRes, credsRes] = await Promise.all([
                api.get('/shops/me').catch(() => ({ data: { shop: null } })),
                api.get('/shops/credentials').catch(() => ({ data: null }))
            ]);

            if (shopRes.data?.shop) setShop(shopRes.data.shop);
            if (credsRes.data) credsForm.reset(credsRes.data);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load settings data");
        } finally {
            setLoading(false);
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

    const testConnection = async () => {
        setTestStatus('loading');
        try {
            await api.get('/shops/me');
            setTestStatus('success');
            setTimeout(() => setTestStatus('idle'), 3000);
            toast.success('Connection test successful');
        } catch (err: any) {
            setTestStatus('error');
            setTimeout(() => setTestStatus('idle'), 3000);
            toast.error('Connection test failed');
        }
    };

    if (loading) return <PageLoading label="Loading manual connection" />;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-400 p-4 sm:p-0">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Settings className="h-6 w-6 text-emerald-500" />
                        Manual API Connection (Dev)
                    </h1>
                    <p className="text-sm text-muted-foreground">Manually configure WhatsApp API keys (for development only).</p>
                </div>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Manual Credentials</h2>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-6 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="text-sm text-blue-500 leading-relaxed">
                        To integrate manually, you need a Meta Developer account.
                        <a href="https://developers.facebook.com" target="_blank" className="font-bold underline ml-1 inline-flex items-center gap-1">
                            Open Dashboard <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="mt-1">Navigate to WhatsApp &gt; Configuration to get your Business Account ID and Phone Number ID.</p>
                    </div>
                </div>

                <form onSubmit={credsForm.handleSubmit(handleSaveCreds)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Business Account ID</label>
                            <input
                                {...credsForm.register("businessAccountId")}
                                className={`w-full rounded-lg border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 ${credsForm.formState.errors.businessAccountId ? 'border-rose-500 focus:ring-rose-500' : 'border-border focus:ring-emerald-500'}`}
                            />
                            {credsForm.formState.errors.businessAccountId && <p className="text-xs text-rose-500 mt-1">{credsForm.formState.errors.businessAccountId.message}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone Number ID</label>
                            <input
                                {...credsForm.register("phoneNumberId")}
                                placeholder="15-digit Meta ID e.g. 109876543210987 (NOT your phone number)"
                                className={`w-full rounded-lg border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 ${credsForm.formState.errors.phoneNumberId ? 'border-rose-500 focus:ring-rose-500' : 'border-border focus:ring-emerald-500'}`}
                            />
                            {credsForm.formState.errors.phoneNumberId && <p className="text-xs text-rose-500 mt-1">{credsForm.formState.errors.phoneNumberId.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Permanent Access Token</label>
                        <input
                            type="password"
                            {...credsForm.register("accessToken")}
                            placeholder="EAAG..."
                            className={`w-full rounded-lg border bg-background px-4 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 ${credsForm.formState.errors.accessToken ? 'border-rose-500 focus:ring-rose-500' : 'border-border focus:ring-emerald-500'}`}
                        />
                        {credsForm.formState.errors.accessToken && <p className="text-xs text-rose-500 mt-1">{credsForm.formState.errors.accessToken.message}</p>}
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={testConnection}
                            disabled={testStatus === 'loading'}
                            className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${testStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                testStatus === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                    'text-blue-500 hover:bg-blue-500/10'
                                }`}
                        >
                            {testStatus === 'loading' ? 'Testing...' :
                                testStatus === 'success' ? 'Connection OK' :
                                    'Test Connection'}
                        </button>
                        <button
                            type="submit"
                            disabled={credsForm.formState.isSubmitting}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                            {credsForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {credsForm.formState.isSubmitting ? 'Saving...' : 'Save Credentials'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
