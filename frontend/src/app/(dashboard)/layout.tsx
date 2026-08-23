"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth, useTheme } from '@/components/providers';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
    LayoutDashboard, MessageSquare, Users, Megaphone, Zap, Settings, LogOut,
    Bot, BotMessageSquare, ShieldAlert, Share2, GitFork, Clock,
    Sun, Moon, Image as ImageIcon, Key, PanelLeftClose, PanelLeft, Menu, X,
    ChevronRight
} from 'lucide-react';
import { Loading, PageLoading } from '@/components/ui/loading';

interface NavSection {
    title: string;
    items: {
        name: string;
        href: string;
        icon: any;
        badge?: string;
    }[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { logout, user, loading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        if (!loading && user && user.role?.toLowerCase() === 'admin') {
            router.replace('/admin/shops');
        }
    }, [user, loading, router]);

    useEffect(() => {
        pathnameRef.current = pathname;
        setIsNavigating(false);
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        const storedSidebar = localStorage.getItem('sidebarCollapsed');
        if (storedSidebar === 'true') setIsCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        const newVal = !isCollapsed;
        setIsCollapsed(newVal);
        localStorage.setItem('sidebarCollapsed', String(newVal));
    };

    useEffect(() => {
        if (user?.shopId) {
            import('@/lib/api').then(({ api }) => {
                api.get('/whatsapp/profile').then((res) => {
                    if (res.data?.profile_picture_url) {
                        setProfilePicture(res.data.profile_picture_url);
                    }
                }).catch(console.error);
            });
        }

        try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    const req = Notification.requestPermission();
                    if (req && req.catch) req.catch(() => {});
                }
            }
        } catch (e) {
            console.warn('Notification permission request on load blocked by browser:', e);
        }
    }, [user?.shopId]);

    // Register Service Worker for Mobile Web Push Notifications (Android & iOS PWA)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then((reg) => {
                    console.log('[SW] WhatsHub Push Service Worker Registered:', reg.scope);
                }).catch((err) => {
                    console.warn('[SW] Registration failed:', err);
                });
            }
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        }
    }, []);

    useEffect(() => {
        if (!user?.shopId) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const socketToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const socket = io(socketUrl, { 
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
            auth: { token: socketToken },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            if (user?.shopId) socket.emit('joinRoom', user.shopId);
        });

        socket.on('newMessage', (msg) => {
            const isHidden = document.visibilityState === 'hidden';
            const isOnInbox = pathnameRef.current.startsWith('/inbox');
            
            let isGranted = false;
            try {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    isGranted = Notification.permission === 'granted';
                }
            } catch (e) {}

            if ((isHidden || !isOnInbox) && isGranted) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.play().catch(() => {});
                
                const notifTitle = `WhatsHub: ${msg.contact?.name || msg.contact?.phone || 'New Message'}`;
                const notifOptions = {
                    body: msg.content || 'Sent an attachment',
                    icon: '/whatshub-logo.png',
                    badge: '/whatshub-logo.png',
                    tag: 'new-message',
                    data: { url: '/inbox' }
                };

                try {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification(notifTitle, notifOptions);
                        }).catch(() => {
                            new Notification(notifTitle, notifOptions as NotificationOptions);
                        });
                    } else {
                        new Notification(notifTitle, notifOptions as NotificationOptions);
                    }
                } catch(e) {}
            }
        });

        return () => { socket.disconnect(); };
    }, [user?.shopId]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loading /></div>;

    const role = user?.role?.toLowerCase();
    if (!user || role !== 'user') {
        if (role === 'admin') {
            return <div className="flex h-screen items-center justify-center bg-background"><Loading /></div>;
        }
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-10 text-center font-sans">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Unauthorized Access</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">You don't have permission to access the dashboard.</p>
                <button onClick={logout} className="mt-8 rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background shadow-lg transition-all hover:opacity-90">
                    Back to Login
                </button>
            </div>
        );
    }

    const navSections: NavSection[] = [
        {
            title: 'MAIN',
            items: [
                { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
                { name: 'Inbox', href: '/inbox', icon: MessageSquare },
                { name: 'Contacts', href: '/contacts', icon: Users },
                { name: 'Broadcasts', href: '/campaigns', icon: Megaphone },
                { name: 'Media Assets', href: '/media', icon: ImageIcon },
            ]
        },
        {
            title: 'AUTOMATION',
            items: [
                { name: 'AI Agent & Config', href: '/ai-agent/config', icon: BotMessageSquare, badge: 'PRO' },
                { name: 'Follow-up Engine', href: '/ai-agent/follow-ups', icon: Clock },
                { name: 'Visual Workflows', href: '/workflows', icon: GitFork },
                { name: 'Templates', href: '/templates', icon: Zap },
                { name: 'Auto-Replies', href: '/automations', icon: Bot },
            ]
        },
        {
            title: 'SYSTEM',
            items: [
                { name: 'WhatsApp Setup', href: '/connect-whatsapp', icon: Share2 },
                { name: 'API Credentials', href: '/api-keys', icon: Key },
                { name: 'Settings', href: '/settings', icon: Settings },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row font-sans">
            {/* Mobile Top Header */}
            <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 md:hidden z-40 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-1.5 rounded-lg border border-border/80 text-foreground hover:bg-muted transition-colors"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <img src="/whatshub-logo.png" alt="WhatsHub" className="h-7 w-7 rounded-lg object-cover" />
                        <span className="text-sm font-semibold tracking-tight text-foreground">WhatsHub</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                    </button>
                </div>
            </header>

            {/* Mobile Drawer Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
                    <aside className="relative flex flex-col w-72 max-w-[80%] bg-sidebar border-r border-sidebar-border h-full z-50 p-4 animate-in slide-in-from-left duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-sidebar-border">
                            <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                                <img src="/whatshub-logo.png" alt="WhatsHub" className="h-7 w-7 rounded-lg object-cover" />
                                <span className="text-sm font-bold text-sidebar-foreground">WhatsHub</span>
                            </Link>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
                            {navSections.map((section, idx) => (
                                <div key={idx} className="space-y-1">
                                    <p className="px-3 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">{section.title}</p>
                                    {section.items.map((item) => {
                                        const active = pathname.startsWith(item.href);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                    active
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-sidebar-border space-y-2">
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
                                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        (user.username || '?').substring(0, 1).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.username}</p>
                                    <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.shop?.phone || 'No Phone'}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Desktop Modern Minimalist Sidebar */}
            <aside className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border/80 transition-all duration-200 ease-in-out relative shrink-0 z-30 ${isCollapsed ? 'w-[68px]' : 'w-60'}`}>
                {/* Sidebar Brand Header */}
                <div className={`flex h-14 items-center justify-between border-b border-sidebar-border/70 px-4 ${isCollapsed ? 'justify-center px-0' : ''}`}>
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="relative p-0.5 rounded-xl bg-gradient-to-tr from-emerald-500/30 to-emerald-400/10 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-105 shrink-0">
                            <img src="/whatshub-logo.png" alt="WhatsHub Logo" className="h-7 w-7 rounded-lg object-cover" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-green-500 dark:from-emerald-400 dark:via-teal-300 dark:to-green-400 bg-clip-text text-transparent">
                                    WhatsHub
                                </span>
                            </div>
                        )}
                    </Link>

                    {!isCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                            title="Collapse Sidebar"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Collapsed Expand Control Button */}
                {isCollapsed && (
                    <div className="flex justify-center py-2 border-b border-sidebar-border/50">
                        <button
                            onClick={toggleSidebar}
                            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                            title="Expand Sidebar"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Navigation Sections & Links */}
                <nav className="p-3 space-y-5 flex-1 overflow-y-auto no-scrollbar">
                    {navSections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {!isCollapsed && (
                                <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                                    {section.title}
                                </p>
                            )}

                            {section.items.map((item) => {
                                const active = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={true}
                                        onClick={() => { if (!active) setIsNavigating(true); }}
                                        title={isCollapsed ? item.name : ''}
                                        className={`flex items-center rounded-lg transition-all duration-150 relative ${
                                            isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
                                        } ${
                                            active
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-primary' : 'text-sidebar-foreground/60'}`} />
                                        {!isCollapsed && (
                                            <span className="text-[13px] truncate tracking-tight">{item.name}</span>
                                        )}

                                        {/* Active subtle indicator bar */}
                                        {active && !isCollapsed && (
                                            <div className="ml-auto h-3.5 w-1 bg-primary rounded-full" />
                                        )}
                                        {active && isCollapsed && (
                                            <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Bottom Footer Controls & User Card */}
                <div className="p-3 border-t border-sidebar-border/80 space-y-2">
                    {/* Theme Switcher Toggle */}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className={`flex w-full items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${
                            isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-1.5'
                        }`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4 shrink-0 text-amber-400" />
                        ) : (
                            <Moon className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
                        )}
                        {!isCollapsed && (
                            <span className="text-[12px] font-medium text-sidebar-foreground">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                        )}
                    </button>

                    {/* Compact Profile Box */}
                    <div className={`flex items-center rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 p-1.5 transition-colors ${
                        isCollapsed ? 'justify-center' : 'gap-2 px-2'
                    }`}>
                        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 font-bold text-primary text-xs overflow-hidden">
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                (user.username || '?').substring(0, 1).toUpperCase()
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.username}</p>
                                <p className="truncate text-[10px] text-sidebar-foreground/50">{user.shop?.phone || 'Connected'}</p>
                            </div>
                        )}
                    </div>

                    {/* Sign Out Button */}
                    <button
                        onClick={logout}
                        title="Sign Out"
                        className={`group flex w-full items-center rounded-lg text-sidebar-foreground/40 transition-colors hover:bg-rose-500/10 hover:text-rose-500 ${
                            isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-1.5'
                        }`}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="text-[12px] font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Viewport */}
            <main className="flex-1 overflow-auto bg-background relative scroll-smooth">
                {isNavigating && (
                    <div className="sticky top-0 left-0 right-0 z-50 h-0.5 bg-primary/20 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full" />
                    </div>
                )}
                <Suspense fallback={<PageLoading label="Opening workspace..." />}>
                    <MainContentWrapper pathname={pathname} isNavigating={isNavigating}>
                        {children}
                    </MainContentWrapper>
                </Suspense>
            </main>
            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
                {[
                    { name: 'Inbox', href: '/inbox', icon: MessageSquare },
                    { name: 'Contacts', href: '/contacts', icon: Users },
                    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
                    { name: 'Templates', href: '/templates', icon: Zap },
                ].map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            onClick={() => { if (!active) setIsNavigating(true); }}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                                active
                                    ? 'text-primary font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <div className={`p-1 rounded-md ${active ? 'bg-primary/10' : ''}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

function MainContentWrapper({ pathname, isNavigating, children }: { pathname: string; isNavigating: boolean; children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const isWorkflowsPage = pathname.startsWith('/workflows');
    const isInboxPage = pathname.startsWith('/inbox');

    if (isNavigating) {
        return (
            <div className="w-full h-full flex items-center justify-center py-12">
                <PageLoading label="Opening workspace..." />
            </div>
        );
    }

    return (
        <div className={`h-full ${isWorkflowsPage ? 'path-workflows' : ''}`}>
            <div className={`${(isInboxPage || isWorkflowsPage) ? 'w-full h-full pb-16 md:pb-0' : 'dashboard-container layout-padding pb-16 md:pb-0'}`}>
                {children}
            </div>
        </div>
    );
}
