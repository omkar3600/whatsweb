"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
    Share2, CheckCircle2, XCircle, AlertTriangle, Loader2,
    Phone, Shield, Wifi, WifiOff, RefreshCw, Unplug,
    ExternalLink, Zap, ArrowRight, Clock, Signal, Info,
    Check, Sparkles, Smartphone, QrCode, Lock
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';


declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

interface PhoneNumber {
    id: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating: string;
    messagingLimit: string;
    status: string;
    isDefault: boolean;
}

interface WabaAccount {
    id: string;
    wabaId: string;
    businessName: string;
    status: string;
    tokenHealth: string;
    tokenExpiry: string | null;
    onboardingSource: string;
    createdAt: string;
    phoneNumbers: PhoneNumber[];
}

interface ConnectionStatus {
    shopId: string;
    isConnected: boolean;
    accounts: WabaAccount[];
}

export default function ConnectWhatsAppPage() {
    const [config, setConfig] = useState<{ appId: string; configId: string; scopes: string } | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [fbReady, setFbReady] = useState(false);
    const [connectStep, setConnectStep] = useState('');
    const [error, setError] = useState('');
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    const handleSyncWebhooks = async (accountDbId: string) => {
        setSyncingId(accountDbId);
        try {
            await api.post(`/embedded-signup/sync-webhooks/${accountDbId}`);
            toast.success('Webhooks successfully synced & registered with Meta!');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to sync webhooks with Meta');
        } finally {
            setSyncingId(null);
        }
    };

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ open: false, title: '', description: '', action: () => {} });

    // Load Facebook SDK
    useEffect(() => {
        if (window.FB) {
            setFbReady(true);
            return;
        }

        window.fbAsyncInit = function () {
            if (config?.appId) {
                window.FB.init({
                    appId: config.appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0',
                });
                setFbReady(true);
            }
        };

        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, [config]);

    // Re-init FB when config loads
    useEffect(() => {
        if (config?.appId && window.FB) {
            window.FB.init({
                appId: config.appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0',
            });
            setFbReady(true);
        }
    }, [config]);

    // Fetch config and connection status
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [configRes, statusRes] = await Promise.all([
                api.get('/embedded-signup/config').catch(() => null),
                api.get('/embedded-signup/status').catch(() => null),
            ]);
            if (configRes?.data) setConfig(configRes.data);
            if (statusRes?.data) setConnectionStatus(statusRes.data);
        } catch (err: any) {
            console.error('Failed to fetch connection data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Capture OAuth code from URL on redirect return
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorMsg = urlParams.get('error_message');
        
        if (errorMsg) {
            setError(decodeURIComponent(errorMsg));
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (code) {
            setConnecting(true);
            setConnectStep('Exchanging authorization token with Meta Cloud API...');
            
            window.history.replaceState({}, document.title, window.location.pathname);

            api.post('/embedded-signup/callback', {
                code: code,
                redirectUri: window.location.origin + '/connect-whatsapp',
            }).then(() => {
                setConnectStep('');
                setConnecting(false);
                toast.success('WhatsApp Business Account connected successfully!');
                fetchData();
            }).catch((err: any) => {
                const msg = err.response?.data?.message || 'Failed to connect WhatsApp account';
                setError(msg);
                toast.error(msg);
                setConnecting(false);
                setConnectStep('');
            });
        }
    }, [fetchData]);

    // Launch Embedded Signup (Manual Flow)
    const launchEmbeddedSignup = useCallback(() => {
        if (!config) {
            setError('Embedded signup configuration is missing. Please refresh or contact admin.');
            return;
        }

        setConnecting(true);
        setError('');
        setConnectStep('Redirecting to official Meta Facebook setup dialog...');

        const redirectUri = window.location.origin + '/connect-whatsapp';
        const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&config_id=${config.configId}`;
        
        window.location.href = oauthUrl;
    }, [config]);

    // Disconnect WABA
    const handleDisconnect = (wabaAccountId: string) => {
        setConfirmState({
            open: true,
            title: 'Disconnect WhatsApp Business Account',
            description: 'Are you sure you want to disconnect this WABA account? Your automated workflows and broadcast campaigns linked to this number will be paused.',
            action: async () => {
                setDisconnectingId(wabaAccountId);
                try {
                    await api.post(`/embedded-signup/disconnect/${wabaAccountId}`);
                    toast.success('WhatsApp Business Account disconnected');
                    await fetchData();
                } catch (err: any) {
                    const msg = err.response?.data?.message || 'Failed to disconnect account';
                    setError(msg);
                    toast.error(msg);
                } finally {
                    setDisconnectingId(null);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground font-medium">Checking WhatsApp Cloud API status...</p>
                </div>
            </div>
        );
    }

    const activeAccounts = connectionStatus?.accounts?.filter(a => a.status === 'active') || [];
    const inactiveAccounts = connectionStatus?.accounts?.filter(a => a.status !== 'active') || [];
    const isConnected = activeAccounts.length > 0;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-5xl mx-auto">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">WhatsApp Connection Center</h1>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            isConnected
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            {isConnected ? `${activeAccounts.length} Connected` : 'Not Connected'}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Link your official WhatsApp Business Account (WABA) using Meta Cloud API.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInstructions(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors border border-border/60"
                    >
                        <Info className="h-3.5 w-3.5" />
                        <span>Setup Guide</span>
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Refresh connection status"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <p className="flex-1 font-medium">{error}</p>
                    <button onClick={() => setError('')} className="font-semibold underline hover:opacity-80">Dismiss</button>
                </div>
            )}

            {/* Connecting State Bar */}
            {connecting && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <p className="font-semibold">{connectStep || 'Connecting account...'}</p>
                </div>
            )}

            {/* Primary Connection Launcher Panel */}
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-foreground">
                            {isConnected ? 'Add Additional Business Account' : 'Connect Official WhatsApp WABA'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {isConnected
                                ? 'Authorize another Meta WhatsApp Business Account for multi-channel messaging.'
                                : 'Connect your phone number via Meta Facebook Embedded Signup.'}
                        </p>
                    </div>

                    {!config ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border border-amber-500/20">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Meta OAuth Client is missing app configuration.</span>
                        </div>
                    ) : (
                        <Button
                            onClick={launchEmbeddedSignup}
                            loading={connecting}
                            loadingText="Connecting..."
                            disabled={!config}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all shrink-0 border-none cursor-pointer"
                        >
                            <Share2 className="h-4 w-4" />
                            <span>Connect with Facebook</span>
                            {!connecting && <ArrowRight className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                </div>

                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center gap-6 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-500" /> Official Meta Cloud API</span>
                    <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-500" /> End-to-End Encryption</span>
                    <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-500" /> Automated Webhooks</span>
                </div>
            </div>

            {/* Active Connected Accounts Section */}
            {activeAccounts.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-emerald-500" />
                            Active Connected Accounts ({activeAccounts.length})
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {activeAccounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onDisconnect={handleDisconnect}
                                disconnecting={disconnectingId === account.id}
                                onSyncWebhooks={handleSyncWebhooks}
                                syncing={syncingId === account.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Disconnected Accounts Section */}
            {inactiveAccounts.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                        Disconnected Accounts ({inactiveAccounts.length})
                    </h3>
                    <div className="space-y-3">
                        {inactiveAccounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onDisconnect={handleDisconnect}
                                disconnecting={disconnectingId === account.id}
                                onSyncWebhooks={handleSyncWebhooks}
                                syncing={syncingId === account.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!connectionStatus?.accounts?.length && !connecting && (
                <div className="bg-card border border-dashed border-border/80 rounded-xl p-12 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <Share2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">No WhatsApp Accounts Connected</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Click &quot;Connect with Facebook&quot; to authenticate your WhatsApp Business Account and unlock bulk broadcasting, chatbot triggers, and live inbox support.
                    </p>
                </div>
            )}

            {/* Instructions Modal Drawer */}
            {showInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/30">
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                Meta Embedded Signup Connection Guide
                            </h2>
                            <button onClick={() => setShowInstructions(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-5 text-xs text-foreground/90">
                            {/* Step 1 */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center">1</span>
                                    <h3 className="font-semibold text-xs text-foreground">Prepare Phone Number</h3>
                                </div>
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-[11px] space-y-1">
                                    <p className="font-semibold flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Important Requirement
                                    </p>
                                    <p>A phone number can only be connected to ONE WhatsApp service at a time. Delete the consumer Messenger / Business app account before registering on Cloud API.</p>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px]">
                                    <li>In phone app: <strong>Settings &gt; Account &gt; Delete Account</strong>.</li>
                                    <li>Wait 3-5 minutes for Meta servers to register deletion.</li>
                                </ul>
                            </div>

                            {/* Step 2 */}
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center">2</span>
                                    <h3 className="font-semibold text-xs text-foreground">Authenticate via Facebook OAuth</h3>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px]">
                                    <li>Click <strong>Connect with Facebook</strong> button.</li>
                                    <li>Log into Meta Facebook account with Page Admin permissions.</li>
                                    <li>Select or create your WhatsApp Business Account (WABA).</li>
                                    <li>Verify phone number via OTP SMS or Voice Call.</li>
                                </ul>
                            </div>

                            {/* Step 3 */}
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center">3</span>
                                    <h3 className="font-semibold text-xs text-foreground">Automatic Webhook Sync</h3>
                                </div>
                                <p className="text-muted-foreground text-[11px]">
                                    Upon completing Facebook verification, Meta will automatically issue access tokens and configure webhook subscriptions for real-time messaging.
                                </p>
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-border/80 bg-muted/30 flex justify-end">
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disconnect Confirmation Modal */}
            <ConfirmModal
                open={confirmState.open}
                onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                description={confirmState.description}
                variant="destructive"
                confirmText="Disconnect Account"
            />
        </div>
    );
}

// ─── Account Card Component ────────────────────────────────────────────

function AccountCard({
    account,
    onDisconnect,
    disconnecting,
    onSyncWebhooks,
    syncing,
}: {
    account: WabaAccount;
    onDisconnect: (id: string) => void;
    disconnecting: boolean;
    onSyncWebhooks: (id: string) => void;
    syncing: boolean;
}) {
    const isActive = account.status === 'active';
    const tokenHealthColor = {
        valid: 'text-emerald-600 dark:text-emerald-400',
        expiring_soon: 'text-amber-600 dark:text-amber-400',
        expired: 'text-rose-500',
    }[account.tokenHealth] || 'text-muted-foreground';

    const tokenHealthLabel = {
        valid: 'Healthy',
        expiring_soon: 'Expiring Soon',
        expired: 'Expired Token',
    }[account.tokenHealth] || 'Unknown';

    const qualityColors: Record<string, string> = {
        GREEN: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        YELLOW: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        RED: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    };

    return (
        <div className={`rounded-xl border p-5 transition-all bg-card shadow-sm ${isActive ? 'border-border/80' : 'border-border/40 opacity-70 bg-muted/20'}`}>
            {/* Account Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {isActive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    </div>
                    <div>
                        <h4 className="font-semibold text-xs text-foreground">{account.businessName || 'WhatsApp Business Account'}</h4>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">WABA ID: {account.wabaId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                        isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border/50'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                        {account.status}
                    </span>
                </div>
            </div>

            {/* Account Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Token Health
                    </p>
                    <p className={`text-xs font-semibold ${tokenHealthColor}`}>{tokenHealthLabel}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Linked Numbers
                    </p>
                    <p className="text-xs font-semibold text-foreground">{account.phoneNumbers.length}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Integration
                    </p>
                    <p className="text-xs font-semibold text-foreground capitalize">{account.onboardingSource?.replace('_', ' ') || 'Embedded'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Registered
                    </p>
                    <p className="text-xs font-semibold text-foreground">{new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
            </div>

            {/* Phone Numbers List */}
            {account.phoneNumbers.length > 0 && (
                <div className="space-y-2 mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone Number Credentials</p>
                    {account.phoneNumbers.map((phone) => (
                        <div key={phone.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/50 text-xs">
                            <div className="flex items-center gap-2.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold font-mono text-foreground">{phone.displayPhoneNumber || phone.phoneNumberId}</span>
                                        {phone.isDefault && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Default</span>
                                        )}
                                    </div>
                                    {phone.verifiedName && (
                                        <p className="text-[10px] text-muted-foreground">{phone.verifiedName}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {phone.qualityRating && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${qualityColors[phone.qualityRating] || 'bg-muted text-muted-foreground border-border/50'}`}>
                                        <Signal className="h-3 w-3" />
                                        {phone.qualityRating}
                                    </span>
                                )}
                                {phone.messagingLimit && (
                                    <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 bg-muted rounded border border-border/50">{phone.messagingLimit}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                {isActive ? (
                    <div className="flex items-center justify-between w-full">
                        <Button
                            onClick={() => onSyncWebhooks(account.id)}
                            loading={syncing}
                            loadingText="Syncing..."
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                            title="Force Meta to subscribe and register webhooks for this WABA"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Sync & Repair Webhooks</span>
                        </Button>

                        <Button
                            onClick={() => onDisconnect(account.id)}
                            loading={disconnecting}
                            loadingText="Disconnecting..."
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all border-none cursor-pointer"
                        >
                            <Unplug className="h-3.5 w-3.5" />
                            <span>Disconnect Account</span>
                        </Button>
                    </div>
                ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                        Account disconnected. Click &quot;Connect with Facebook&quot; to re-authorize.
                    </span>
                )}
            </div>
        </div>
    );
}
