"use client";

import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, Shield, Activity, Bell, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/providers';

interface AdminTopbarProps {
  onOpenCommandPalette: () => void;
}

export function AdminTopbar({ onOpenCommandPalette }: AdminTopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Format breadcrumb path
  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 md:px-6 z-20 shrink-0 select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-muted-foreground">Admin</span>
        {pathSegments.map((segment, idx) => {
          if (segment === 'admin') return null;
          const formatted = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return (
            <div key={idx} className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className={`font-semibold ${idx === pathSegments.length - 1 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                {formatted}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* System Health Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Platform Operational</span>
        </div>

        {/* Global Command Palette Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground text-xs transition-colors"
          title="Search Admin (Ctrl + K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline font-medium">Search or jump to...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-card px-1.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
