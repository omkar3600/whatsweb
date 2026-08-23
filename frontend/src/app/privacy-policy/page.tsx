"use client";

import React from "react";
import { Shield, Lock, Eye, Database, Globe, Mail, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  const lastUpdated = "March 28, 2026";

  const sections = [
    {
      title: "1. Information We Collect",
      icon: <Database className="w-5 h-5" />,
      content: "When you use WhatsHub, we collect information necessary to provide our WhatsApp automation services. This includes your shop name, contact information, and the phone numbers and names of the customers you interact with via WhatsApp."
    },
    {
      title: "2. How We Use Your Information",
      icon: <Eye className="w-5 h-5" />,
      content: "We use the collected data exclusively to facilitate automated messaging flows, maintain conversation history, and provide analytics for your WhatsApp campaigns. We do not sell your data to third parties."
    },
    {
      title: "3. WhatsApp & Meta Integration",
      icon: <Globe className="w-5 h-5" />,
      content: "Our service integrates with the WhatsApp Business API provided by Meta. All message content and recipient data are processed in accordance with Meta's Business Terms and Privacy Policies."
    },
    {
      title: "4. Data Security",
      icon: <Lock className="w-5 h-5" />,
      content: "We implement industry-standard security measures to protect your data. This includes encryption of sensitive credentials (like API tokens) and restricted access to database records."
    },
    {
      title: "5. Data Retention",
      icon: <Shield className="w-5 h-5" />,
      content: "We retain conversation data and flow sessions to provide a seamless experience. You can request the deletion of your shop data at any time through our support channels."
    },
    {
      title: "6. Contact Us",
      icon: <Mail className="w-5 h-5" />,
      content: "If you have any questions regarding this Privacy Policy or our data practices, please contact us at support@whatshub.com."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground tracking-tight antialiased">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold text-muted-foreground">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase opacity-60">Legal</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-24 bg-gradient-to-b from-secondary/50 to-background text-center px-6">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 border border-primary/20">
            Privacy Disclosure
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Your trust is our priority. This policy outlines how WhatsHub handles your data and ensures your communications remain secure.
          </p>
          <div className="mt-12 text-sm opacity-50 font-medium">
            Last updated: {lastUpdated}
          </div>
        </div>
      </header>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-6 pb-40">
        <div className="grid gap-8 md:grid-cols-2">
          {sections.map((section, idx) => (
            <div 
              key={idx} 
              className="p-10 rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                {section.icon}
              </div>
              <h2 className="text-xl font-bold mb-4">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base opacity-80">
                {section.content}
              </p>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 blur-3xl" />
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <footer className="mt-32 pt-12 border-t border-border text-center">
          <p className="text-muted-foreground text-sm opacity-60 font-medium">
            &copy; 2026 WhatsHub Platform. All Professional Standards Applied.
          </p>
        </footer>
      </main>
    </div>
  );
}
