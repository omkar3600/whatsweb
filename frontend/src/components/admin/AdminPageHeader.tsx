"use client";

import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: any;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, badge, icon: Icon, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
