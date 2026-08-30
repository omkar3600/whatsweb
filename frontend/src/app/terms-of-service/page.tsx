"use client";

import React from "react";
import { Scale, CheckCircle, AlertCircle, RefreshCw, XCircle, Mail, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TermsOfService() {
  const lastUpdated = "March 28, 2026";

  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: <CheckCircle className="w-5 h-5" />,
      content: "By accessing or using WhatsWeb, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you do not have permission to access the service."
    },
    {
      title: "2. Description of Service",
      icon: <RefreshCw className="w-5 h-5" />,
      content: "WhatsWeb provides automated communication tools for WhatsApp Business. This includes flow builders, campaign management, and chatbot integration. We provide these services through the WhatsApp Business API."
    },
    {
      title: "3. User Responsibilities",
      icon: <Scale className="w-5 h-5" />,
      content: "You are responsible for ensuring your messages comply with WhatsApp's Commerce Policy and Business Policy. Spamming, harassment, or sending illegal content is strictly prohibited and will result in immediate termination."
    },
    {
      title: "4. Account Security",
      icon: <ShieldCheck className="w-5 h-5" />,
      content: "You must maintain the security of your account and API credentials. Any unauthorized use of your account should be reported to us immediately."
    },
    {
      title: "5. Limitation of Liability",
      icon: <AlertCircle className="w-5 h-5" />,
      content: "WhatsWeb shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the service, including message delivery failures caused by WhatsApp/Meta."
    },
    {
      title: "6. Changes to Terms",
      icon: <XCircle className="w-5 h-5" />,
      content: "We reserve the right to modify these terms at any time. Significant changes will be communicated via the platform. Continued use of the service constitutes acceptance of the new terms."
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
              <Scale className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase opacity-60">Legal</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-24 bg-gradient-to-b from-secondary/50 to-background text-center px-6">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 border border-primary/20">
            Platform Agreement
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
            Terms of Service
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Please read these terms carefully before using the WhatsWeb platform. They govern your relationship with our service.
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

        {/* Support Section */}
        <section className="mt-20 p-10 rounded-3xl bg-primary/5 border border-primary/10 text-center">
          <Mail className="w-10 h-10 text-primary mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-4">Questions about these Terms?</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Our legal and support teams are here to help you understand your rights and responsibilities.
          </p>
          <a href="mailto:support@whatsweb.com" className="inline-flex items-center gap-2 font-bold text-primary hover:underline">
            Contact Support Team <ChevronLeft className="w-4 h-4 rotate-180" />
          </a>
        </section>

        {/* Footer Note */}
        <footer className="mt-32 pt-12 border-t border-border text-center">
          <p className="text-muted-foreground text-sm opacity-60 font-medium">
            &copy; 2026 WhatsWeb Platform. Operating under Meta Business Agreement.
          </p>
        </footer>
      </main>
    </div>
  );
}
