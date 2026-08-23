"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList, Activity, Shield, Settings,
  LogOut, PanelLeftClose, PanelLeft, Menu, X, ShieldAlert, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/components/providers';

interface NavSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: any;
    badge?: string;
  }[];
}

export function AdminSidebar() {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('adminSidebarCollapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('adminSidebarCollapsed', String(newVal));
  };

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Tenants & Users', href: '/admin/shops', icon: Users },
        { name: 'Demo Requests', href: '/admin/requests', icon: ClipboardList },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Token & WABA Health', href: '/admin/token-health', icon: Shield },
        { name: 'Webhook & Audit Logs', href: '/admin/webhook-logs', icon: Activity },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80%] bg-sidebar border-r border-sidebar-border h-full z-50 p-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-sidebar-border">
              <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <img src="/whatshub-logo.png" alt="WhatsHub Logo" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                <div>
                  <span className="text-sm font-bold text-sidebar-foreground tracking-tight">WhatsHub Admin</span>
                  <span className="block text-[10px] text-sidebar-foreground/50">Control Center</span>
                </div>
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
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-sidebar-border space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.username?.substring(0, 1).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.username}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">Super Admin</p>
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

      {/* Desktop Admin Sidebar */}
      <aside className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border/80 transition-all duration-200 ease-in-out relative shrink-0 z-30 ${isCollapsed ? 'w-[68px]' : 'w-60'}`}>
        {/* Header */}
        <div className={`flex h-14 items-center justify-between border-b border-sidebar-border/70 px-4 ${isCollapsed ? 'justify-center px-0' : ''}`}>
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative p-0.5 rounded-xl bg-gradient-to-tr from-blue-500/30 to-indigo-400/10 border border-blue-500/20 shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <img src="/whatshub-logo.png" alt="WhatsHub Logo" className="h-7 w-7 rounded-lg object-cover" />
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-400 bg-clip-text text-transparent">
                  WhatsHub
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tracking-wider">ADMIN</span>
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

        {/* Nav Links */}
        <nav className="p-3 space-y-5 flex-1 overflow-y-auto no-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.name : ''}
                    className={`flex items-center rounded-lg transition-all duration-150 relative ${
                      isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
                    } ${
                      active
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-sidebar-foreground/60'}`} />
                    {!isCollapsed && (
                      <span className="text-[13px] truncate tracking-tight">{item.name}</span>
                    )}

                    {active && !isCollapsed && (
                      <div className="ml-auto h-3.5 w-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                    {active && isCollapsed && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer User Profile */}
        <div className="p-3 border-t border-sidebar-border/80 space-y-2">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.username?.substring(0, 1).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.username}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">Super Admin</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="Sign Out"
              className="flex w-full justify-center p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
