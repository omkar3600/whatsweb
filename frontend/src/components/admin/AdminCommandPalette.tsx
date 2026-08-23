"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, Users, ClipboardList, Shield, Activity, Settings,
  X, ArrowRight, RefreshCw, Zap
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminCommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const routes = [
    { title: 'Admin Dashboard', subtitle: 'Platform overview, system health & metrics', href: '/admin/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { title: 'Tenants & Users Management', subtitle: 'Manage shops, accounts, subscriptions & status', href: '/admin/shops', icon: Users, category: 'Navigation' },
    { title: 'Registration & Demo Requests', subtitle: 'Review and resolve lead signup requests', href: '/admin/requests', icon: ClipboardList, category: 'Navigation' },
    { title: 'Token & WABA Connection Health', subtitle: 'Monitor access tokens & connection statuses', href: '/admin/token-health', icon: Shield, category: 'Operations' },
    { title: 'Webhook & Audit Failures', subtitle: 'Inspect failed webhooks & dead letter queues', href: '/admin/webhook-logs', icon: Activity, category: 'Operations' },
    { title: 'Platform Settings & Config', subtitle: 'Meta API keys, verify tokens & environment vars', href: '/admin/settings', icon: Settings, category: 'System' },
  ];

  const filtered = routes.filter(
    r => r.title.toLowerCase().includes(query.toLowerCase()) || r.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 space-y-0">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search admin routes, settings, logs, or tenants..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No admin routes matching "<span className="font-semibold text-foreground">{query}</span>"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.href)}
                  className="flex items-center justify-between w-full p-3 rounded-lg text-left hover:bg-muted/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-2">
                        {item.title}
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                          {item.category}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        {/* Shortcut Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/30 text-[11px] text-muted-foreground font-mono">
          <span>Navigate with <kbd className="px-1 bg-card border border-border rounded">Esc</kbd> to exit</span>
          <span>WhatsHub OS 3.0</span>
        </div>
      </div>
    </div>
  );
}
