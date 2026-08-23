"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { BotMessageSquare, Settings, Clock, Sparkles } from "lucide-react";

const tabs = [
  { name: "AI Agent & Business Profile", href: "/ai-agent/config", icon: Settings },
  { name: "Follow-up Engine", href: "/ai-agent/follow-ups", icon: Clock },
];

export default function AiAgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: config } = useSWR("/chatbot/config");
  const isAgentActive = config?.isActive;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans select-none">
      
      {/* ── Luxury Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/20 shrink-0">
            <BotMessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">WhatsApp AI Engine</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" /> WHATSHUB PRO
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              One-time business info setup, Chatbot behavior system instructions, custom action triggers, and follow-up sequences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-2xs">
            <span className={`h-2.5 w-2.5 rounded-full ${isAgentActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"}`} />
            {isAgentActive ? "AI Live Responding" : "AI Standby"}
          </div>
        </div>
      </div>

      {/* ── Luxury Navigation Tabs ────────────────────────────────── */}
      <nav className="flex overflow-x-auto border-b border-border/80 no-scrollbar gap-2 pb-0.5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (pathname === "/ai-agent" && tab.href === "/ai-agent/config");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
