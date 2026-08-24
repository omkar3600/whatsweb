"use client";

import { useEffect, useState, useRef, useCallback, Suspense, useMemo } from 'react';
import { useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    Search, Send, Check, CheckCheck, MessageSquare, ArrowLeft,
    Zap, Paperclip, Sparkles, ChevronDown, Trash2, X,
    MoreHorizontal, FileText, Download, Clock, ListFilter, Timer, TimerOff,
    Bot, Image, Video, Music, FileArchive, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import MediaGalleryModal from '@/components/MediaGalleryModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ConversationSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';


// ────────────────────────────────────────────────────────────────────────────
// Global Cache for Instant Tab Switching
// ────────────────────────────────────────────────────────────────────────────
const globalCache = {
    conversations: [] as any[],
    messages: {} as Record<string, any[]>,
    templates: [] as any[]
};

// Helper to extract text from template payload
function getTemplateText(m: any): string {
    if (m.templateData?.components) {
        const body = m.templateData.components.find((c: any) => c.type === 'BODY');
        return body?.text || m.content || '[ Template ]';
    }
    try {
        const parsed = JSON.parse(m.content);
        if (parsed?.body?.text) return parsed.body.text;
    } catch { }
    return m.content || '[ Template ]';
}

// Render message media & formatted body
function MessageContent({ m, isOut }: { m: any; isOut?: boolean }) {
    if (m.type === 'image' || m.type === 'sticker') return (
        <div className="space-y-1.5">
            {m.mediaUrl ? (
                <div className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-square rounded-xl overflow-hidden bg-black/5 border border-border/40 shadow-2xs">
                    <img
                        src={m.mediaUrl}
                        alt="Media content"
                        className="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(m.mediaUrl, '_blank')}
                    />
                </div>
            ) : (
                <div className="flex items-center gap-2 text-xs opacity-70 py-1">
                    <Image className="h-4 w-4 shrink-0" />
                    <span>Photo</span>
                </div>
            )}
            {m.content && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>}
        </div>
    );

    if (m.type === 'video') return (
        <div className="space-y-1.5">
            {m.mediaUrl ? (
                <div className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-video rounded-xl overflow-hidden bg-black/10 border border-border/40 shadow-2xs">
                    <video src={m.mediaUrl} controls className="absolute inset-0 w-full h-full object-cover" />
                </div>
            ) : (
                <div className="flex items-center gap-2 text-xs opacity-70 py-1">
                    <Video className="h-4 w-4 shrink-0" />
                    <span>Video</span>
                </div>
            )}
            {m.content && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>}
        </div>
    );

    if (m.type === 'audio') return (
        <div className="min-w-[220px] py-1">
            {m.mediaUrl ? (
                <audio src={m.mediaUrl} controls className="w-full h-9 rounded-lg" />
            ) : (
                <div className="flex items-center gap-2 text-xs opacity-70">
                    <Music className="h-4 w-4 shrink-0" />
                    <span>Voice Message</span>
                </div>
            )}
        </div>
    );

    if (m.type === 'document') return (
        <div className={`flex items-center gap-3 p-2 rounded-xl border max-w-[280px] ${
            isOut ? 'bg-emerald-800/10 dark:bg-white/10 border-emerald-800/15 dark:border-white/20' : 'bg-background/50 border-border/50'
        }`}>
            <div className={`p-2 rounded-lg shrink-0 ${
                isOut ? 'bg-emerald-600/20 dark:bg-emerald-500/20 text-emerald-800 dark:text-[#34D399]' : 'bg-primary/10 text-primary'
            }`}>
                <FileArchive className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isOut ? 'text-[#062e1e] dark:text-[#F0FDF4]' : 'text-foreground'}`}>
                    {m.content || 'Document'}
                </p>
                {m.mediaUrl && (
                    <a
                        href={m.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[11px] font-medium hover:underline flex items-center gap-1 mt-0.5 ${
                            isOut ? 'text-emerald-700 dark:text-[#34D399]' : 'text-primary'
                        }`}
                    >
                        <Download className="h-3 w-3" /> Download
                    </a>
                )}
            </div>
        </div>
    );

    if (m.type === 'template') {
        const td = m.templateData || {};
        const comps: any[] = td.components || [];
        const header = comps.find((c: any) => c.type === 'HEADER');
        const bodyComp = comps.find((c: any) => c.type === 'BODY');
        const footer = comps.find((c: any) => c.type === 'FOOTER');
        const buttons = comps.find((c: any) => c.type === 'BUTTONS')?.buttons || [];
        const bodyText = m.content || bodyComp?.text || '[ Template Message ]';

        return (
            <div className="min-w-[220px] space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        isOut ? 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-[#34D399] border-emerald-600/20 dark:border-emerald-500/30' : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                        <FileText className="h-3 w-3" /> {td.templateName || 'Template'}
                    </span>
                    {td.campaignName && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                            isOut ? 'bg-emerald-900/10 dark:bg-white/10 text-emerald-800 dark:text-[#A4D4C5] border-emerald-900/15 dark:border-white/20' : 'bg-muted text-muted-foreground border-border'
                        }`}>
                            📣 {td.campaignName}
                        </span>
                    )}
                </div>

                {header?.format === 'IMAGE' && m.mediaUrl && (
                    <div className="relative w-full max-w-[240px] aspect-square rounded-xl overflow-hidden bg-black/5 border border-border/40">
                        <img src={m.mediaUrl} alt="Template header" className="absolute inset-0 w-full h-full object-cover cursor-pointer" onClick={() => window.open(m.mediaUrl, '_blank')} />
                    </div>
                )}
                {header?.format === 'VIDEO' && m.mediaUrl && (
                    <div className="relative w-full max-w-[240px] aspect-video rounded-xl overflow-hidden bg-black/10 border border-border/40">
                        <video src={m.mediaUrl} controls className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                )}
                {header?.format === 'TEXT' && header.text && (
                    <p className={`text-xs font-bold ${isOut ? 'text-[#062e1e] dark:text-[#F0FDF4]' : 'text-foreground'}`}>{header.text}</p>
                )}

                <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{bodyText}</p>

                {footer?.text && (
                    <p className={`text-[11px] italic pt-1 ${isOut ? 'text-emerald-800/80 dark:text-[#A4D4C5]' : 'text-muted-foreground'}`}>{footer.text}</p>
                )}

                {buttons.length > 0 && (
                    <div className={`flex flex-col gap-1.5 border-t pt-2 mt-2 ${isOut ? 'border-emerald-900/15 dark:border-white/15' : 'border-border/50'}`}>
                        {buttons.map((btn: any, i: number) => (
                            <div key={i} className={`text-xs text-center rounded-lg py-1.5 px-3 font-semibold border transition-colors ${
                                isOut ? 'bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-[#062e1e] dark:text-[#F0FDF4] border-emerald-900/15 dark:border-white/20' : 'bg-background/80 hover:bg-background text-foreground border-border/60'
                            }`}>
                                {btn.text || btn.title || btn}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (m.type === 'interactive') {
        const cfg = m.config || (typeof m.content === 'string' ? (() => { try { return JSON.parse(m.content); } catch { return {}; } })() : m.content) || {};
        const bodyText = cfg.text || cfg.body?.text || m.content || '';
        const buttons = cfg.action?.buttons || [];
        return (
            <div className="space-y-2">
                {bodyText && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{bodyText}</p>}
                {buttons.length > 0 && (
                    <div className={`flex flex-col gap-1.5 border-t pt-2 ${isOut ? 'border-emerald-900/15 dark:border-white/15' : 'border-border/50'}`}>
                        {buttons.map((b: any, i: number) => (
                            <div key={i} className={`text-xs text-center rounded-lg py-1.5 px-3 font-semibold border ${
                                isOut ? 'bg-white/60 dark:bg-white/10 text-[#062e1e] dark:text-[#F0FDF4] border-emerald-900/15 dark:border-white/20' : 'bg-background/80 text-foreground border-border/60'
                            }`}>
                                {b.reply?.title || b.title || b}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>;
}

// Context Menu for message deletion
function ContextMenu({ x, y, onDelete, onClose }: { x: number; y: number; onDelete: () => void; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border py-1 min-w-[160px] text-xs animate-in fade-in duration-100"
            style={{ top: y, left: x }}
        >
            <button
                onClick={() => { onDelete(); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-destructive hover:bg-destructive/10 transition-colors font-medium"
            >
                <Trash2 className="h-3.5 w-3.5" /> Delete Message
            </button>
        </div>
    );
}



// ────────────────────────────────────────────────────────────────────────────
// Main Inbox Component
// ────────────────────────────────────────────────────────────────────────────
function InboxContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const convoIdParam = searchParams.get('convoId');

    const [conversations, setConversations] = useState<any[]>(globalCache.conversations);
    const [loadingConversations, setLoadingConversations] = useState(conversations.length === 0);
    const [conversationsPage, setConversationsPage] = useState<number>(1);
    const [hasMoreConversations, setHasMoreConversations] = useState<boolean>(false);
    const [totalConversationsCount, setTotalConversationsCount] = useState<number>(0);
    const [loadingMoreConversations, setLoadingMoreConversations] = useState<boolean>(false);
    const [activeConvo, setActiveConvo] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [inputMsg, setInputMsg] = useState('');
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [templates, setTemplates] = useState<any[]>(globalCache.templates);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [aiPaused, setAiPaused] = useState(false);
    const [togglingAi, setTogglingAi] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string } | null>(null);
    const [showChatOptions, setShowChatOptions] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(340);
    const [isResizing, setIsResizing] = useState(false);
    const [search, setSearch] = useState('');
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [windowFilter, setWindowFilter] = useState<'all' | 'active' | 'inactive' | 'unread'>('all');

    // Auto-select conversation if query param 'search' or 'phone' is present
    useEffect(() => {
        const query = searchParams.get('search') || searchParams.get('phone');
        if (query) {
            setSearch(query);
        }
    }, [searchParams]);

    // Backend Search Trigger with 300ms Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchConversations(true, 1, search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const query = searchParams.get('search') || searchParams.get('phone');
        if (query && conversations.length > 0) {
            const matched = conversations.find(c =>
                c.contact?.phone?.includes(query) ||
                c.contact?.name?.toLowerCase().includes(query.toLowerCase())
            );
            if (matched) {
                setActiveConvo(matched);
                setShowMobileChat(true);
            }
        }
    }, [conversations, searchParams]);

    // Confirm Modal state for actions
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
        variant?: 'destructive' | 'warning' | 'primary';
        confirmText?: string;
    }>({ open: false, title: '', description: '', action: () => {} });

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeConvoRef = useRef(activeConvo);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const userHasScrolled = useRef(false);
    const isInitialLoad = useRef(true);

    useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

    // Smart auto-scroll
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        setShowScrollButton(false);
    }, []);

    useEffect(() => {
        globalCache.conversations = conversations;
    }, [conversations]);

    useEffect(() => {
        if (activeConvo) {
            globalCache.messages[activeConvo.id] = messages;
        }
    }, [messages, activeConvo?.id]);

    useEffect(() => {
        if (activeConvo) {
            userHasScrolled.current = false;
            isInitialLoad.current = true;
            if (globalCache.messages[activeConvo.id]) {
                setMessages(globalCache.messages[activeConvo.id]);
            } else {
                setMessages([]);
            }
            fetchMessages(activeConvo.id);
            setAiPaused(activeConvo.aiPaused ?? false);
            api.put(`/conversations/${activeConvo.id}/read`).catch(() => {});
        }
    }, [activeConvo?.id]);

    useEffect(() => {
        if (globalCache.templates.length === 0) {
            fetchTemplates();
        }
    }, []);

    useEffect(() => {
        if (messages.length === 0) return;
        if (isInitialLoad.current) {
            setTimeout(() => scrollToBottom('auto'), 60);
            isInitialLoad.current = false;
            return;
        }
        if (!userHasScrolled.current) scrollToBottom('smooth');
    }, [messages, scrollToBottom]);

    const handleScroll = useCallback(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollButton(distFromBottom > 60);
        userHasScrolled.current = distFromBottom > 60;
    }, []);

    // Socket.io Real-time connection
    useEffect(() => {
        fetchConversations();
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        const socketToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        socketRef.current = io(socketUrl, {
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
            auth: { token: socketToken },
        });

        if (user?.shopId) socketRef.current.emit('joinRoom', user.shopId);

        socketRef.current.on('connect', () => {
            if (user?.shopId) socketRef.current?.emit('joinRoom', user.shopId);
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && activeConvoRef.current) {
                api.put(`/conversations/${activeConvoRef.current.id}/read`).catch(console.error);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        socketRef.current.on('newMessage', (msg) => {
            if (activeConvoRef.current && msg.conversationId === activeConvoRef.current.id) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;

                    if (msg.direction === 'outbound') {
                        const tempIdx = prev.findIndex(m =>
                            m.direction === 'outbound' &&
                            (m.id.startsWith('temp-') || m.id === msg.id)
                        );
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = { ...updated[tempIdx], ...msg };
                            globalCache.messages[msg.conversationId] = updated;
                            return updated;
                        }
                    }

                    if (msg.direction === 'inbound' && document.visibilityState === 'visible') {
                        api.put(`/conversations/${msg.conversationId}/read`).catch(console.error);
                    }
                    const next = [...prev, msg];
                    globalCache.messages[msg.conversationId] = next;
                    return next;
                });
            } else {
                if (globalCache.messages[msg.conversationId]) {
                    if (!globalCache.messages[msg.conversationId].some(m => m.id === msg.id)) {
                        globalCache.messages[msg.conversationId].push(msg);
                    }
                } else {
                    globalCache.messages[msg.conversationId] = [msg];
                }
            }

            setConversations(prev => {
                const updated = prev.map(c => {
                    if (c.id === msg.conversationId) {
                        const isActive = activeConvoRef.current?.id === msg.conversationId;
                        return {
                            ...c,
                            lastMessageAt: msg.timestamp || new Date().toISOString(),
                            ...(msg.direction === 'inbound' ? { lastContactMessageAt: msg.timestamp || new Date().toISOString() } : {}),
                            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
                        };
                    }
                    return c;
                });
                return [...updated].sort((a, b) =>
                    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
                );
            });
        });

        socketRef.current.on('read', ({ conversationId }) => {
            setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
        });

        socketRef.current.on('messageStatusUpdate', ({ conversationId, messageId, status }) => {
            if (activeConvoRef.current && activeConvoRef.current.id === conversationId) {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
            }
            if (globalCache.messages[conversationId]) {
                globalCache.messages[conversationId] = globalCache.messages[conversationId].map(m => m.id === messageId ? { ...m, status } : m);
            }
        });

        return () => {
            socketRef.current?.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user]);

    // Resizable sidebar logic
    const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsResizing(true);
    };

    useEffect(() => {
        const move = (e: MouseEvent | TouchEvent) => {
            if (!isResizing || !containerRef.current) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const w = clientX - containerRef.current.getBoundingClientRect().left;
            if (w >= 280 && w <= 520) setSidebarWidth(w);
        };
        const up = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
            window.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('touchend', up);
        }
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
    }, [isResizing]);

    // API Calls
    const fetchConversations = async (reset: boolean = true, targetPage: number = 1, searchQuery: string = search) => {
        if (reset) {
            setLoadingConversations(conversations.length === 0);
        } else {
            setLoadingMoreConversations(true);
        }
        try {
            const params: any = { page: targetPage, limit: 100 };
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            const res = await api.get('/conversations', { params });
            const items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            const hasMore = Array.isArray(res.data) ? false : (res.data?.hasMore ?? false);
            const total = Array.isArray(res.data) ? items.length : (res.data?.total ?? items.length);

            if (reset) {
                setConversations(items);
            } else {
                setConversations(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newItems = items.filter((c: any) => !existingIds.has(c.id));
                    return [...prev, ...newItems];
                });
            }

            setConversationsPage(targetPage);
            setHasMoreConversations(hasMore);
            setTotalConversationsCount(total);

            if (!activeConvoRef.current && convoIdParam) {
                const t = items.find((c: any) => c.id === convoIdParam);
                if (t) { setActiveConvo(t); setShowMobileChat(true); }
            }
        } catch (e) {
            console.error('Failed to fetch conversations', e);
        } finally {
            setLoadingConversations(false);
            setLoadingMoreConversations(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMoreConversations && hasMoreConversations) {
            fetchConversations(false, conversationsPage + 1, search);
        }
    };

    const fetchMessages = async (id: string) => {
        setLoadingMessages(true);
        try {
            const res = await api.get(`/messages/conversation/${id}`);
            setMessages(res.data);
            globalCache.messages[id] = res.data;
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/templates');
            const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            setTemplates(list);
            globalCache.templates = list;
        } catch (e) { console.error(e); }
    };

    const handleSendTemplate = async (template: any) => {
        setShowTemplatePicker(false);
        if (!activeConvo) return;
        try {
            await api.post(`/messages/conversation/${activeConvo.id}`, { type: 'template', content: template.templateName });
            fetchMessages(activeConvo.id);
            toast.success('Template sent');
        } catch (e) {
            console.error(e);
            toast.error('Failed to send template');
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim() || !activeConvo) return;
        const content = inputMsg;
        setInputMsg('');
        const tempId = `temp-${Date.now()}`;
        const tempMsg = { id: tempId, direction: 'outbound', type: 'text', content, status: 'pending', timestamp: new Date().toISOString() };
        setMessages(prev => {
            const next = [...prev, tempMsg];
            globalCache.messages[activeConvo.id] = next;
            return next;
        });
        userHasScrolled.current = false;
        try {
            const res = await api.post(`/messages/conversation/${activeConvo.id}`, { type: 'text', content });
            setMessages(prev => {
                const realIdExists = prev.some(m => m.id === res.data.id);
                let next;
                if (realIdExists) {
                    next = prev.filter(m => m.id !== tempId);
                } else {
                    next = prev.map(m => m.id === tempId ? { ...res.data, ...m, id: res.data.id } : m);
                }
                globalCache.messages[activeConvo.id] = next;
                return next;
            });
            fetchConversations();
        } catch (e: any) {
            setMessages(prev => {
                const next = prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m);
                globalCache.messages[activeConvo.id] = next;
                return next;
            });
            const reason = e?.response?.data?.reason || e?.response?.data?.message || e?.message || 'Failed to send message';
            toast.error(`Message send failed: ${reason}`);
        }
    };

    const handleToggleAi = async () => {
        if (!activeConvo) return;
        setTogglingAi(true);
        try {
            const newPaused = !aiPaused;
            await api.patch(`/chatbot/conversations/${activeConvo.id}/pause`, { paused: newPaused });
            setAiPaused(newPaused);
            toast.success(newPaused ? 'AI Assistant paused' : 'AI Assistant activated');
        } catch {
            toast.error('Failed to update AI state');
        } finally { setTogglingAi(false); }
    };

    const handleDeleteMessage = async (msgId: string) => {
        try {
            await api.delete(`/messages/${msgId}`);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            toast.success('Message deleted');
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete message');
        }
    };

    const handleClearChat = () => {
        if (!activeConvo) return;
        setShowChatOptions(false);
        setConfirmState({
            open: true,
            title: 'Clear Chat Messages',
            description: 'Are you sure you want to clear all message history for this conversation?',
            variant: 'destructive',
            confirmText: 'Clear Chat',
            action: async () => {
                try {
                    await api.delete(`/messages/conversation/${activeConvo.id}/all`);
                    setMessages([]);
                    toast.success('Chat cleared');
                } catch (e) {
                    console.error(e);
                    toast.error('Failed to clear chat');
                } finally {
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleDeleteConversation = () => {
        if (!activeConvo) return;
        setShowChatOptions(false);
        setConfirmState({
            open: true,
            title: 'Delete Conversation',
            description: 'Are you sure you want to permanently delete this conversation and all associated records?',
            variant: 'destructive',
            confirmText: 'Delete Conversation',
            action: async () => {
                try {
                    await api.delete(`/conversations/${activeConvo.id}`);
                    setActiveConvo(null);
                    setMessages([]);
                    setShowMobileChat(false);
                    router.push('/inbox', { scroll: false });
                    fetchConversations();
                    toast.success('Conversation deleted');
                } catch (e) {
                    console.error(e);
                    toast.error('Failed to delete conversation');
                } finally {
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const isWindowActive = (convo: any) => {
        if (!convo || !convo.lastContactMessageAt) return false;
        try {
            let dateStr = convo.lastContactMessageAt;
            if (typeof dateStr === 'string' && !dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T');
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            return (new Date().getTime() - d.getTime()) < 24 * 60 * 60 * 1000;
        } catch {
            return false;
        }
    };

    const unreadCountTotal = useMemo(() => {
        return conversations.filter(c => (c.unreadCount && c.unreadCount > 0) || c.hasUnread).length;
    }, [conversations]);

    const filteredConversations = useMemo(() => {
        const rawSearch = search.trim().toLowerCase();
        const searchDigits = search.replace(/\D/g, '');

        return conversations.filter(c => {
            if (rawSearch) {
                const name = (c.contact?.name || '').toLowerCase();
                const phone = (c.contact?.phone || '').toLowerCase();
                const phoneDigits = (c.contact?.phone || '').replace(/\D/g, '');

                const nameMatches = name.includes(rawSearch);
                const phoneMatches = phone.includes(rawSearch);
                const digitsMatches = searchDigits.length > 0 && phoneDigits.includes(searchDigits);

                if (!nameMatches && !phoneMatches && !digitsMatches) return false;
            }

            if (windowFilter === 'active') return isWindowActive(c);
            if (windowFilter === 'inactive') return !isWindowActive(c);
            if (windowFilter === 'unread') return (c.unreadCount && c.unreadCount > 0) || c.hasUnread;
            return true;
        });
    }, [conversations, search, windowFilter]);

    const filteredMessages = useMemo(() => {
        return messages.filter(m => {
            if (!messageSearchQuery) return true;
            const text = m.content || '';
            return text.toLowerCase().includes(messageSearchQuery.toLowerCase());
        });
    }, [messages, messageSearchQuery]);

    return (
        <div ref={containerRef} className="flex h-full w-full overflow-hidden bg-background font-sans select-none">

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onDelete={() => handleDeleteMessage(contextMenu.msgId)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* ── Center-Left: Conversation List Sidebar ────────────────────── */}
            <div
                style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : '100%' }}
                className={`flex-shrink-0 md:flex flex-col ${showMobileChat ? 'hidden' : 'flex'} bg-card border-r border-border`}
            >
                {/* Conversations Header */}
                <div className="p-4 shrink-0 space-y-3.5 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold tracking-tight text-foreground">Conversations</h2>
                            {(totalConversationsCount > 0 || conversations.length > 0) && (
                                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                    {totalConversationsCount || conversations.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Window Status Segmented Filters */}
                    <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/40 gap-1 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setWindowFilter('all')}
                            className={`flex-1 min-w-[50px] flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                windowFilter === 'all'
                                    ? 'bg-background shadow-2xs text-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ListFilter className="h-3.5 w-3.5" /> All
                        </button>
                        <button
                            type="button"
                            onClick={() => setWindowFilter('unread')}
                            className={`flex-1 min-w-[65px] flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                windowFilter === 'unread'
                                    ? 'bg-background shadow-2xs text-primary font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <MessageSquare className="h-3.5 w-3.5" /> Unread {unreadCountTotal > 0 && `(${unreadCountTotal})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWindowFilter('active')}
                            className={`flex-1 min-w-[65px] flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                windowFilter === 'active'
                                    ? 'bg-background shadow-2xs text-emerald-600 dark:text-emerald-400 font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Timer className="h-3.5 w-3.5" /> Active 24h
                        </button>
                        <button
                            type="button"
                            onClick={() => setWindowFilter('inactive')}
                            className={`flex-1 min-w-[60px] flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                windowFilter === 'inactive'
                                    ? 'bg-background shadow-2xs text-amber-600 dark:text-amber-400 font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <TimerOff className="h-3.5 w-3.5" /> Expired
                        </button>
                    </div>

                    {/* Compact Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or number..."
                            className="w-full bg-muted/40 text-foreground text-xs rounded-lg pl-8 pr-8 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conversation List Rows */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list">
                    {loadingConversations ? (
                        <ConversationSkeleton />
                    ) : filteredConversations.length > 0 ? (
                        <>
                            {filteredConversations.map(c => {
                                const isSelected = activeConvo?.id === c.id;
                                const windowActive = isWindowActive(c);
                                const name = c.contact?.name || c.contact?.phone || 'Unknown Contact';
                                const initials = name.substring(0, 2).toUpperCase();

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setActiveConvo(c);
                                            setShowMobileChat(true);
                                            router.push(`/inbox?convoId=${c.id}`, { scroll: false });
                                        }}
                                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                                            isSelected
                                                ? 'bg-muted border-border/80 shadow-2xs'
                                                : 'border-transparent hover:bg-muted/40'
                                        }`}
                                        role="listitem"
                                    >
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted/80 text-foreground border border-border/60'
                                            }`}>
                                                {initials}
                                            </div>
                                            {/* Active 24h Window Badge Dot */}
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                                                windowActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                            }`} title={windowActive ? '24h Window Active' : '24h Window Expired'} />
                                        </div>

                                        {/* Info Column */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                                                    {name}
                                                </h3>
                                                <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-1">
                                                    {c.lastMessageAt ? format(new Date(c.lastMessageAt), 'HH:mm') : ''}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {c.contact?.phone}
                                                </p>
                                                {c.unreadCount > 0 && (
                                                    <span className="shrink-0 ml-2 flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                                                        {c.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {hasMoreConversations && (
                                <div className="pt-3 pb-4 text-center px-2">
                                    <Button
                                        type="button"
                                        onClick={handleLoadMore}
                                        loading={loadingMoreConversations}
                                        loadingText="Loading 100 More..."
                                        className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs border-none"
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" /> Load More (100 More)
                                    </Button>
                                    <span className="text-[10px] font-mono text-muted-foreground mt-1.5 block">
                                        Showing {conversations.length} of {totalConversationsCount} conversations
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                            <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                            <p>No conversations found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resizer Handle */}
            <div
                onMouseDown={startResizing}
                onTouchStart={startResizing}
                className={`hidden md:flex w-1 cursor-col-resize hover:bg-primary/40 z-30 items-center justify-center transition-colors ${
                    isResizing ? 'bg-primary' : 'bg-border/60'
                }`}
            />

            {/* ── Main Chat Workspace ────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col relative overflow-hidden bg-background ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                {activeConvo ? (
                    <div className="flex flex-col h-full">

                        {/* ── Chat Header ───────────────────────────────────────── */}
                        <div className="flex-shrink-0 h-16 px-5 flex items-center justify-between bg-card border-b border-border shadow-2xs z-20">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => { setShowMobileChat(false); setActiveConvo(null); router.push('/inbox', { scroll: false }); }}
                                    className="p-1.5 hover:bg-muted rounded-lg md:hidden text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>

                                {/* Contact Avatar */}
                                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                    {(activeConvo.contact?.name || activeConvo.contact?.phone || 'WH').substring(0, 2).toUpperCase()}
                                </div>

                                {/* Contact Details */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold text-foreground truncate">
                                            {activeConvo.contact?.name || activeConvo.contact?.phone}
                                        </h2>
                                        {isWindowActive(activeConvo) ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                                <Timer className="h-2.5 w-2.5" /> 24h Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                                <TimerOff className="h-2.5 w-2.5" /> 24h Expired
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{activeConvo.contact?.phone}</p>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-2">
                                {/* AI Toggle Button */}
                                <Button
                                    type="button"
                                    onClick={handleToggleAi}
                                    loading={togglingAi}
                                    loadingText={aiPaused ? "Activating..." : "Pausing..."}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer border-none ${
                                        aiPaused
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>{aiPaused ? 'AI Paused' : 'AI Active'}</span>
                                </Button>

                                {/* Inline Message Search Toggle */}
                                <button
                                    onClick={() => setShowSearchInput(!showSearchInput)}
                                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                    title="Search Messages"
                                >
                                    <Search className="h-4 w-4" />
                                </button>

                                {/* More Options Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowChatOptions(!showChatOptions)}
                                        className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>

                                    {showChatOptions && (
                                        <div className="absolute right-0 top-11 w-48 bg-card rounded-xl shadow-xl border border-border z-50 py-1 text-xs animate-in fade-in duration-100">
                                            <button
                                                onClick={() => { setShowSearchInput(!showSearchInput); setShowChatOptions(false); }}
                                                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-foreground hover:bg-muted transition-colors md:hidden"
                                            >
                                                <Search className="h-3.5 w-3.5 text-muted-foreground" /> Search Messages
                                            </button>
                                            <button
                                                onClick={handleClearChat}
                                                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-foreground hover:bg-muted transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" /> Clear Chat
                                            </button>
                                            <button
                                                onClick={handleDeleteConversation}
                                                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                                            >
                                                <X className="h-3.5 w-3.5" /> Delete Conversation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inline Chat Search Field */}
                        {showSearchInput && (
                            <div className="flex-shrink-0 px-5 py-2 bg-muted/30 border-b border-border animate-in slide-in-from-top-1 duration-150">
                                <div className="relative max-w-md mx-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={messageSearchQuery}
                                        onChange={e => setMessageSearchQuery(e.target.value)}
                                        placeholder="Search messages in this conversation..."
                                        className="w-full bg-background text-foreground border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    {messageSearchQuery && (
                                        <button
                                            onClick={() => { setShowSearchInput(false); setMessageSearchQuery(''); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Messages Canvas ───────────────────────────────────── */}
                        <div
                            ref={chatContainerRef}
                            onScroll={handleScroll}
                            onClick={() => { setShowChatOptions(false); setContextMenu(null); setShowTemplatePicker(false); setShowGallery(false); }}
                            className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-3 relative bg-muted/10"
                        >
                            {loadingMessages ? (
                                <div className="space-y-4 max-w-lg mx-auto py-8">
                                    <div className="h-10 w-2/3 bg-muted rounded-2xl animate-pulse" />
                                    <div className="h-14 w-3/4 ml-auto bg-primary/20 rounded-2xl animate-pulse" />
                                    <div className="h-10 w-1/2 bg-muted rounded-2xl animate-pulse" />
                                </div>
                            ) : filteredMessages.map((m, i) => {
                                const isOut = m.direction === 'outbound';
                                const prevMsg = i > 0 ? messages[i - 1] : null;
                                const isFirstInGroup = !prevMsg || prevMsg.direction !== m.direction;

                                return (
                                    <div
                                        key={m.id || i}
                                        className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-1'}`}
                                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msgId: m.id }); }}
                                    >
                                        <div
                                            className={`relative max-w-[85%] md:max-w-[65%] min-w-0 px-4 py-2.5 rounded-2xl shadow-2xs text-xs leading-relaxed ${
                                                isOut
                                                    ? 'bg-[#dcf8c6]/80 dark:bg-[#002217]/85 text-[#062e1e] dark:text-[#F0FDF4] rounded-tr-xs border border-emerald-400/30 dark:border-emerald-500/20 backdrop-blur-xs shadow-xs'
                                                    : 'bg-card border border-border text-foreground rounded-tl-xs'
                                            } ${m.status === 'failed' ? 'opacity-70 border-destructive' : ''}`}
                                        >
                                            <MessageContent m={m} isOut={isOut} />

                                            {/* Timestamp + Read Receipts */}
                                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                                isOut ? 'text-[#3e6051] dark:text-[#a4d4c5]' : 'text-muted-foreground'
                                            }`}>
                                                {m.status === 'failed' && <span className="text-destructive mr-1 font-bold">Failed</span>}
                                                {m.timestamp && <span className="font-mono">{format(new Date(m.timestamp), 'HH:mm')}</span>}
                                                {isOut && (
                                                    m.status === 'read' ? <CheckCheck className="h-3.5 w-3.5 text-[#0284c7] dark:text-[#38bdf8]" /> :
                                                    m.status === 'delivered' ? <CheckCheck className="h-3.5 w-3.5 text-[#3e6051] dark:text-[#a4d4c5] opacity-90" /> :
                                                    m.status === 'sent' ? <Check className="h-3.5 w-3.5 text-[#3e6051] dark:text-[#a4d4c5] opacity-90" /> :
                                                    m.status === 'pending' ? <Clock className="h-3 w-3 text-[#3e6051] dark:text-[#a4d4c5] opacity-60" /> : null
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>

                        {/* Floating Scroll-to-Bottom Button */}
                        {showScrollButton && (
                            <button
                                onClick={() => { userHasScrolled.current = false; scrollToBottom('smooth'); }}
                                className="absolute bottom-20 right-6 h-9 w-9 bg-card rounded-full shadow-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-40"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        )}

                        {/* ── Message Composer ─────────────────────────────────── */}
                        <div className="flex-shrink-0 bg-card border-t border-border p-3.5 relative z-10 space-y-2">
                            
                            {/* 24-Hour Window Expired Notice */}
                            {!isWindowActive(activeConvo) && (
                                <div className="flex items-center justify-between px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                                    <div className="flex items-center gap-2">
                                        <TimerOff className="h-4 w-4 shrink-0 text-amber-500" />
                                        <span>24h Window Expired — Only Meta templates can be sent.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplatePicker(true)}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shrink-0"
                                    >
                                        Send Template
                                    </button>
                                </div>
                            )}

                            {/* Main Composer Control Bar */}
                            <div className="flex items-end gap-2">
                                {/* Template Picker Button */}
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                                        title="Quick Templates"
                                        className={`p-2.5 rounded-xl border transition-all ${
                                            showTemplatePicker
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border'
                                        }`}
                                    >
                                        <Zap className="h-4 w-4" />
                                    </button>

                                    {showTemplatePicker && (
                                        <div className="absolute bottom-14 left-0 w-80 bg-card rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                                            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                                                <h4 className="text-xs font-semibold text-foreground">Select Template</h4>
                                                <button onClick={() => setShowTemplatePicker(false)} className="text-muted-foreground hover:text-foreground">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto p-1 space-y-1">
                                                {templates.map(t => {
                                                    const body = t.components?.find((c: any) => c.type === 'BODY')?.text || '';
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => handleSendTemplate(t)}
                                                            className="w-full text-left p-2.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                                                        >
                                                            <p className="text-xs font-semibold text-foreground">{t.templateName}</p>
                                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{body}</p>
                                                        </button>
                                                    );
                                                })}
                                                {templates.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-muted-foreground">No approved templates</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Text Area Input */}
                                <div className="flex-1 bg-muted/30 border border-border rounded-xl flex items-end px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                                    <form onSubmit={handleSend} id="chat-form" className="flex-1 flex items-center h-full">
                                        <textarea
                                            value={inputMsg}
                                            onChange={e => setInputMsg(e.target.value)}
                                            onInput={(e: any) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend(e);
                                                    (e.target as any).style.height = 'auto';
                                                }
                                            }}
                                            placeholder={isWindowActive(activeConvo) ? "Type a message..." : "24h window closed. Use a template."}
                                            disabled={!isWindowActive(activeConvo)}
                                            rows={1}
                                            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-xs focus:outline-none border-none focus:ring-0 disabled:opacity-50 resize-none max-h-32 overflow-y-auto leading-relaxed py-1"
                                        />
                                    </form>

                                    {/* Media Gallery Picker Button */}
                                    <button
                                        type="button"
                                        onClick={() => { setShowGallery(true); setShowTemplatePicker(false); }}
                                        title="Attach Media"
                                        className={`p-1.5 transition-colors shrink-0 ${
                                            showGallery ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </button>

                                    <MediaGalleryModal
                                        open={showGallery}
                                        onClose={() => setShowGallery(false)}
                                        onSelect={async (item) => {
                                            if (!activeConvo) return;
                                            const ft = item.fileType || '';
                                            const type = ft.startsWith('image/') ? 'image' : ft.startsWith('video/') ? 'video' : ft.startsWith('audio/') ? 'audio' : 'document';
                                            try {
                                                await api.post(`/messages/conversation/${activeConvo.id}`, {
                                                    type,
                                                    content: item.fileName || 'Media',
                                                    mediaUrl: item.fileUrl,
                                                });
                                                fetchMessages(activeConvo.id);
                                                setShowGallery(false);
                                                toast.success('Media sent');
                                            } catch {
                                                toast.error('Failed to send media');
                                            }
                                        }}
                                        selectLabel="Send"
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    type="submit"
                                    form="chat-form"
                                    disabled={!inputMsg.trim() || !isWindowActive(activeConvo)}
                                    className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-2xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Empty Workspace State ──────────────────────────────── */
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-3">
                        <div className="h-16 w-16 bg-muted/60 rounded-full flex items-center justify-center border border-border">
                            <MessageSquare className="h-7 w-7 opacity-40 text-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">No conversation selected</h3>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                            Select a contact from the sidebar to view chat history and dispatch customer support messages.
                        </p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
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

function VirtualConversationList({ conversations, activeConvo, handleSelectConvo, formatTime }: any) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: conversations.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 5,
    });

    return (
        <div ref={parentRef} className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const convo = conversations[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <button
                                onClick={() => handleSelectConvo(convo)}
                                className={`w-full h-full flex items-start gap-3 p-3.5 text-left transition-colors border-b border-border/50 hover:bg-muted/40 ${
                                    activeConvo?.id === convo.id ? 'bg-primary/5 hover:bg-primary/5 relative' : ''
                                }`}
                            >
                                {activeConvo?.id === convo.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                                
                                <div className="relative shrink-0">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary shadow-inner border border-primary/10">
                                        {convo.contact?.name?.charAt(0)?.toUpperCase() || convo.contact?.phone?.charAt(0) || '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={`text-[13px] truncate pr-2 ${
                                            activeConvo?.id === convo.id ? 'font-bold text-primary' : (convo.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground/90')
                                        }`}>
                                            {convo.contact?.name || convo.contact?.phone || 'Unknown'}
                                        </h3>
                                        <span className={`text-[10px] shrink-0 font-medium ${
                                            convo.unreadCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                                        }`}>
                                            {formatTime(convo.lastMessageAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-xs truncate ${
                                            convo.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                                        }`}>
                                            {convo.contact?.phone}
                                        </p>
                                        {convo.unreadCount > 0 && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                                                {convo.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function InboxPage() {
    return (
        <Suspense fallback={
            <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mb-3" />
                <p className="text-xs">Loading Inbox...</p>
            </div>
        }>
            <InboxContent />
        </Suspense>
    );
}
