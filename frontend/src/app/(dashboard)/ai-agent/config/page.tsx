"use client";

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import {
  Building2, Zap, Power, PowerOff, Save, Loader2, Plus, Trash2,
  Sparkles, Send, User, Bot, RefreshCw, Key, Shield, Clock, MapPin,
  Phone, Globe, Package, CreditCard, CheckCircle2, MessageSquare,
  ToggleLeft, ToggleRight, Sparkle, Command, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';


interface CustomAction {
  id: string;
  name: string;
  trigger: string;
  response: string;
  enabled: boolean;
}

export default function LuxuryBusinessConfigPage() {
  const { data: configData, mutate: mutateConfig } = useSWR('/chatbot/config');

  const [activeTab, setActiveTab] = useState<'profile' | 'actions' | 'test' | 'settings'>('profile');
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Detailed One-Time Business Info Form Fields
  const [bizName, setBizName] = useState('');
  const [bizTagline, setBizTagline] = useState('');
  const [bizCategory, setBizCategory] = useState('Retail & Services');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizHours, setBizHours] = useState('');
  const [bizProducts, setBizProducts] = useState('');
  const [bizPricing, setBizPricing] = useState('');
  const [bizPayments, setBizPayments] = useState('');
  const [bizReturnPolicy, setBizReturnPolicy] = useState('');
  const [bizDelivery, setBizDelivery] = useState('');
  const [bizWarranty, setBizWarranty] = useState('');

  // Chatbot Behaviour & System Instructions (One Main Prompt)
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an intelligent WhatsApp AI Assistant for our business. Answer customer queries politely, accurately, and concisely based strictly on our business profile, custom actions, and knowledge resources.'
  );

  // Custom Actions List
  const [customActions, setCustomActions] = useState<CustomAction[]>([
    {
      id: 'act_1',
      name: 'Send Payment Link',
      trigger: 'Customer asks to buy, pay, or request payment link',
      response: 'Send payment instructions: "You can pay securely via our payment gateway. Please reply with payment screenshot to confirm your order!"',
      enabled: true
    },
    {
      id: 'act_2',
      name: 'Request Human Handoff',
      trigger: 'Customer asks to speak to human manager or staff',
      response: 'Reply: "I have notified our store manager. Someone from our human support team will call or message you shortly!"',
      enabled: true
    }
  ]);

  // New Custom Action Form
  const [actName, setActName] = useState('');
  const [actTrigger, setActTrigger] = useState('');
  const [actResponse, setActResponse] = useState('');

  // Test Simulator state
  const [testMessages, setTestMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (configData) {
      setIsActive(configData.isActive ?? false);
      setApiKey(configData.apiKey ?? '');
      if (configData.systemPrompt) {
        setSystemPrompt(configData.systemPrompt);
      }

      if (configData.allowedTools && Array.isArray(configData.allowedTools.customActions)) {
        setCustomActions(configData.allowedTools.customActions);
      }

      if (configData.businessInfo) {
        parseBusinessInfoText(configData.businessInfo);
      }
    }
  }, [configData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages]);

  const parseBusinessInfoText = (text: string) => {
    const getField = (label: string) => {
      const match = text.match(new RegExp(`• ${label}: (.*)`, 'i'));
      return match ? match[1].trim() : '';
    };

    setBizName(getField('Business Name') || '');
    setBizTagline(getField('Tagline') || '');
    setBizCategory(getField('Category') || 'Retail & Services');
    setBizPhone(getField('Phone') || '');
    setBizEmail(getField('Email') || '');
    setBizWebsite(getField('Website') || '');
    setBizAddress(getField('Address') || '');
    setBizHours(getField('Working Hours') || '');
    setBizProducts(getField('Products & Services') || '');
    setBizPricing(getField('Price Range / Catalog') || '');
    setBizPayments(getField('Payment Methods') || '');
    setBizReturnPolicy(getField('Return & Refund Policy') || '');
    setBizDelivery(getField('Delivery & Shipping') || '');
    setBizWarranty(getField('Warranty Terms') || '');
  };

  const generateCompiledBusinessInfo = (): string => {
    const lines: string[] = [];
    if (bizName) lines.push(`• Business Name: ${bizName}`);
    if (bizTagline) lines.push(`• Tagline: ${bizTagline}`);
    if (bizCategory) lines.push(`• Category: ${bizCategory}`);
    if (bizPhone) lines.push(`• Phone: ${bizPhone}`);
    if (bizEmail) lines.push(`• Email: ${bizEmail}`);
    if (bizWebsite) lines.push(`• Website: ${bizWebsite}`);
    if (bizAddress) lines.push(`• Address: ${bizAddress}`);
    if (bizHours) lines.push(`• Working Hours: ${bizHours}`);
    if (bizProducts) lines.push(`• Products & Services: ${bizProducts}`);
    if (bizPricing) lines.push(`• Price Range / Catalog: ${bizPricing}`);
    if (bizPayments) lines.push(`• Payment Methods: ${bizPayments}`);
    if (bizReturnPolicy) lines.push(`• Return & Refund Policy: ${bizReturnPolicy}`);
    if (bizDelivery) lines.push(`• Delivery & Shipping: ${bizDelivery}`);
    if (bizWarranty) lines.push(`• Warranty Terms: ${bizWarranty}`);
    return lines.join('\n');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const compiledInfo = generateCompiledBusinessInfo();
      await api.put('/chatbot/config', {
        isActive,
        apiKey: apiKey.trim(),
        systemPrompt: systemPrompt.trim(),
        businessInfo: compiledInfo,
        allowedTools: { customActions },
      });
      toast.success('Business Profile & Behaviour saved successfully!');
      mutateConfig();
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const newState = !isActive;
      await api.put('/chatbot/config', { isActive: newState });
      setIsActive(newState);
      toast.success(newState ? 'AI Agent Activated' : 'AI Agent Standby');
      mutateConfig();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const handleAddCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim() || !actTrigger.trim() || !actResponse.trim()) {
      toast.error('Please fill in all custom action fields');
      return;
    }

    const newAct: CustomAction = {
      id: `act_${Date.now()}`,
      name: actName.trim(),
      trigger: actTrigger.trim(),
      response: actResponse.trim(),
      enabled: true,
    };

    setCustomActions(prev => [...prev, newAct]);
    setActName('');
    setActTrigger('');
    setActResponse('');
    toast.success(`Action "${newAct.name}" added! Click Save to apply.`);
  };

  const toggleActionEnabled = (id: string) => {
    setCustomActions(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAction = (id: string) => {
    setCustomActions(prev => prev.filter(a => a.id !== id));
    toast.success('Action deleted');
  };

  const handleTestSend = async () => {
    if (!testInput.trim()) return;
    const msg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: msg }]);
    setTestLoading(true);

    try {
      const res = await api.post('/chatbot/test', { message: msg });
      if (res.data?.success) {
        setTestMessages(prev => [...prev, { role: 'ai', content: res.data.reply }]);
      } else {
        setTestMessages(prev => [...prev, {
          role: 'ai',
          content: `⚠️ ${res.data?.message || 'Check your Groq API Key in Settings.'}`
        }]);
      }
    } catch {
      setTestMessages(prev => [...prev, { role: 'ai', content: '⚠️ Request failed. Please check your Groq API Key.' }]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans select-none pb-12">

      {/* ── Luxury Header Banner ────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300 ${
            isActive ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 shadow-emerald-500/20 ring-4 ring-emerald-500/10' : 'bg-muted text-muted-foreground border border-border'
          }`}>
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">AI Business Profile & Engine</h1>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE & ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-muted px-3 py-0.5 rounded-full border border-border">
                  STANDBY MODE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure your business knowledge profile, main chatbot behavior prompt, and custom automated action rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleToggleActive}
            loading={toggling}
            loadingText={isActive ? 'Pausing...' : 'Activating...'}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all duration-200 border-none cursor-pointer ${
              isActive
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/10'
            }`}
          >
            <Power className="h-4 w-4" />
            <span>{isActive ? 'Pause AI Agent' : 'Activate AI Agent'}</span>
          </Button>

          <Button
            onClick={handleSaveAll}
            loading={saving}
            loadingText="Saving..."
            successText="Saved Profile!"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold shadow-sm transition-all duration-200 border-none cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Profile & Rules</span>
          </Button>
        </div>
      </div>

      {/* ── Luxury Segment Controller (Tabs) ───────────────────────────── */}
      <div className="p-1.5 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-md inline-flex flex-wrap gap-1 w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-background text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Business Info Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'actions'
              ? 'bg-background text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>Custom Actions ({customActions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'test'
              ? 'bg-background text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Live Playground</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'settings'
              ? 'bg-background text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>API Key Settings</span>
        </button>
      </div>

      {/* ── Tab 1: Detailed One-Time Business Info Form ─────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section A: Business Identity & Contact */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-md border border-primary/20">PART A</span>
              <h2 className="text-xs font-bold text-foreground">Business Identity & Contact Profile</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Tech Supplies"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Tagline / Slogan</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Premium Retailer"
                  value={bizTagline}
                  onChange={e => setBizTagline(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Industry / Category</label>
                <select
                  value={bizCategory}
                  onChange={e => setBizCategory(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all"
                >
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Services & Repairs">Services & Repairs</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="Hospitality & Dining">Hospitality & Dining</option>
                  <option value="Education & Coaching">Education & Coaching</option>
                  <option value="Real Estate & Rentals">Real Estate & Rentals</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={bizPhone}
                  onChange={e => setBizPhone(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Support Email</label>
                <input
                  type="email"
                  placeholder="support@example.com"
                  value={bizEmail}
                  onChange={e => setBizEmail(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Website URL</label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={bizWebsite}
                  onChange={e => setBizWebsite(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Physical Store Address</label>
                <input
                  type="text"
                  placeholder="e.g. 101 Tech Park, Ring Road, Mumbai"
                  value={bizAddress}
                  onChange={e => setBizAddress(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Operating Hours</label>
                <input
                  type="text"
                  placeholder="e.g. Mon - Sat 9:00 AM - 8:30 PM, Sunday: Closed"
                  value={bizHours}
                  onChange={e => setBizHours(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>

          {/* Section B: Products, Catalog & Pricing */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2.5 py-0.5 rounded-md border border-teal-500/20">PART B</span>
              <h2 className="text-xs font-bold text-foreground">Products, Offerings & Pricing Catalog</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Products & Services Offered</label>
                <textarea
                  rows={3}
                  placeholder="List items or services you offer (e.g. Wireless Headphones, Laptops, Mobile Repairs, Annual Maintenance)"
                  value={bizProducts}
                  onChange={e => setBizProducts(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Accepted Payment Methods</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Credit/Debit Cards, UPI (GPay/PhonePe), Cash on Delivery, Net Banking"
                  value={bizPayments}
                  onChange={e => setBizPayments(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1.5">Price Range / Catalog Summary</label>
              <input
                type="text"
                placeholder="e.g. Repairs start at $20. Headphones from $49 to $199. Laptops starting $499."
                value={bizPricing}
                onChange={e => setBizPricing(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Section C: Policies & Terms */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-md border border-purple-500/20">PART C</span>
              <h2 className="text-xs font-bold text-foreground">Customer Policies & Terms</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Return & Refund Policy</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 7-day easy replacement with original invoice"
                  value={bizReturnPolicy}
                  onChange={e => setBizReturnPolicy(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Delivery & Shipping Terms</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Free local delivery over $50 within 24-48 hours"
                  value={bizDelivery}
                  onChange={e => setBizDelivery(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Warranty Terms</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 1-year brand warranty included on all new items"
                  value={bizWarranty}
                  onChange={e => setBizWarranty(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Section D: Chatbot Behaviour & System Instructions */}
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-card shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-md border border-amber-500/20">PART D</span>
              <div>
                <h2 className="text-xs font-bold text-foreground">Chatbot Behaviour & System Instructions (Main Prompt)</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Define the core prompt instructions governing how your AI chatbot behaves, greets customers, structures answers, and communicates.
                </p>
              </div>
            </div>

            <div>
              <textarea
                rows={6}
                placeholder="e.g. You are an intelligent, polite, and helpful WhatsApp Assistant for Apex Tech Supplies. Always greet customers warmly, provide direct answers to product inquiries using our catalog, and suggest relevant accessories..."
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-4 py-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y font-mono shadow-inner"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                This main prompt directly governs tone, guidelines, response constraints, and reply formatting across all WhatsApp messages.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveAll}
              loading={saving}
              loadingText="Saving..."
              successText="Saved Info!"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold shadow-md transition-all duration-200 border-none cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Business Info & Behaviour Prompt</span>
            </Button>
          </div>

        </div>
      )}

      {/* ── Tab 2: Custom Actions & Intent Rules ────────────────────────── */}
      {activeTab === 'actions' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* Add New Custom Action Form */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2 className="text-xs font-bold text-foreground">Create Custom Action / Trigger Rule</h2>
              </div>
            </div>

            <form onSubmit={handleAddCustomAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1.5">Action Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Send Payment Gateway Link"
                    value={actName}
                    onChange={e => setActName(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1.5">When Customer Intent Matches (Trigger)</label>
                  <input
                    type="text"
                    placeholder="e.g. Customer asks how to buy, pay, or request payment link"
                    value={actTrigger}
                    onChange={e => setActTrigger(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1.5">Action Response / Instruction to Execute</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Reply: 'You can complete your payment via: https://pay.example.com. Reply with screenshot after payment!'"
                  value={actResponse}
                  onChange={e => setActResponse(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!actName.trim() || !actTrigger.trim() || !actResponse.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all duration-200 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Custom Action</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Configured Custom Actions */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <h2 className="text-xs font-bold text-foreground">Configured Custom Actions ({customActions.length})</h2>
              <span className="text-[11px] text-muted-foreground">Automatically executed on matching intent</span>
            </div>

            <div className="space-y-3">
              {customActions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-border rounded-2xl p-6">
                  No custom actions configured yet. Add your first action rule above!
                </div>
              ) : (
                customActions.map((act) => (
                  <div key={act.id} className="p-4.5 rounded-2xl border border-border/80 bg-background space-y-2.5 hover:border-border transition-all duration-200 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-foreground">{act.name}</span>
                        {act.enabled ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            DISABLED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActionEnabled(act.id)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                        >
                          {act.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                        </button>

                        <button
                          onClick={() => deleteAction(act.id)}
                          className="p-1 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete action"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">WHEN INTENT:</span> {act.trigger}
                      </p>
                      <p className="text-muted-foreground font-mono bg-muted/30 p-2.5 rounded-xl border border-border/80 text-[11px] leading-relaxed">
                        <span className="font-semibold text-foreground font-sans">EXECUTE:</span> {act.response}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Tab 3: Live Simulator Playground ──────────────────────────── */}
      {activeTab === 'test' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-[600px] backdrop-blur-sm">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold text-foreground">Live AI Chatbot Playground</h2>
              </div>

              {testMessages.length > 0 && (
                <button
                  onClick={() => setTestMessages([])}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-muted/10">
              {testMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-3 p-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Bot className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">Test AI Responses Live</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Send customer messages to verify how AI responds using your saved profile and custom action rules.
                  </p>
                </div>
              ) : (
                testMessages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-card border border-border text-foreground'
                    }`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                    </div>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-2xs'
                        : 'bg-card border border-border/80 text-foreground rounded-tl-xs shadow-2xs'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {testLoading && (
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border/80 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3.5 border-t border-border bg-card shrink-0">
              <div className="flex items-center gap-2 bg-muted/20 border border-border/80 rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60 transition-all">
                <input
                  type="text"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !testLoading && handleTestSend()}
                  placeholder="Type a test customer message..."
                  disabled={testLoading}
                  className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
                />
                <Button
                  onClick={handleTestSend}
                  loading={testLoading}
                  loadingText=""
                  disabled={!testInput.trim()}
                  className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-all shrink-0 border-none cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: API Key Settings ────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3.5">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold text-foreground">Groq LLM API Key Settings</h2>
          </div>

          <div className="space-y-4 text-xs max-w-lg">
            <div>
              <label className="block font-semibold text-foreground mb-1.5">Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 focus:bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Obtain your free API key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">console.groq.com</a>.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveAll}
                loading={saving}
                loadingText="Saving..."
                successText="API Key Saved!"
                className="px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold shadow-xs transition-all duration-200 border-none cursor-pointer"
              >
                Save API Key
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
