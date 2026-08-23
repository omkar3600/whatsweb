"use client";

import React from 'react';

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: string;
  icon: any;
  accentBg?: string;
  accentColor?: string;
}

export function AdminMetricCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  accentBg = 'bg-blue-500/10',
  accentColor = 'text-blue-600 dark:text-blue-400',
}: AdminMetricCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {(description || trend) && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
            {trend && <span className="font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>}
            {description && <span>{description}</span>}
          </div>
        )}
      </div>
      <div className={`h-9 w-9 rounded-lg ${accentBg} ${accentColor} flex items-center justify-center shrink-0`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
    </div>
  );
}
