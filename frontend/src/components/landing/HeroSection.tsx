"use client";

import { useAuth } from '@/components/providers';
import Image from '../ui/Image';
import Icon from '../ui/Icon';

const t = (s: string) => s;
export const displayName = 'Hero Section';
export const shortDescription = 'Hero section with headline and dashboard mockup';

export default function HeroSection() {
  const { user } = useAuth();
  const dashboardHref = user?.role?.toLowerCase() === 'admin' ? '/admin/shops' : '/dashboard';

  const badges = [
    { icon: 'shield-check', label: t('Official WhatsApp Cloud API') },
    { icon: 'lock', label: t('Enterprise Security') },
    { icon: 'activity', label: t('99.9% Uptime') },
    { icon: 'file-check', label: t('GDPR Compliant') },
  ];

  return (
    <section className="w-full bg-background pt-20 pb-0 px-6 md:px-12 lg:px-16 relative overflow-hidden">
      {/* subtle gradient bg */}
      <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16, 185, 129,0.10) 0%, transparent 70%)'}} />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex flex-wrap justify-center items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-6 font-body">
          <Icon i="zap" size={12} />
          {t('WhatsApp Business API Platform')}
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6" style={{letterSpacing: '-1px'}}>
          {t('Turn WhatsApp Into Your')}
          <br/>
          <span className="text-primary">{t('Most Powerful Sales &')}</span>
          <br/>
          {t('Support Channel')}
        </h1>

        <p className="text-lg text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed mb-10">
          {t('Connect your WhatsApp Business Account, automate conversations, engage customers at scale, run marketing campaigns, and manage your entire customer communication from one powerful platform.')}
        </p>

        <div className="flex items-center justify-center gap-4 mb-10">
          {user ? (
            <a href={dashboardHref} className="bg-primary text-primary-foreground font-medium text-base px-8 py-3.5 rounded-lg font-body flex items-center gap-2">
              <Icon i="layout" size={16} />
              {t('Go to Dashboard')}
            </a>
          ) : (
            <>
              <a href="/demo" className="bg-primary text-primary-foreground font-medium text-base px-8 py-3.5 rounded-lg font-body flex items-center gap-2">
                <Icon i="calendar" size={16} />
                {t('Book Demo')}
              </a>
              <a href="/login" className="text-foreground font-medium text-base px-8 py-3.5 rounded-lg font-body flex items-center gap-2 border border-border bg-background">
                <Icon i="log-in" size={16} />
                {t('Login')}
              </a>
            </>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mb-12 flex-wrap">
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <Icon i={b.icon} size={14} />
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard mockup */}
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="rounded-xl border border-border bg-card overflow-hidden" style={{boxShadow: '0 30px 80px rgba(0,0,0,0.10)'}}>
          {/* Window chrome */}
          <div className="bg-surface border-b border-border px-3 md:px-5 py-2 md:py-3 flex items-center gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-muted" />
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-muted" />
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-muted" />
            <div className="flex-1 mx-2 md:mx-4 bg-input rounded text-[10px] md:text-xs text-muted-foreground px-2 md:px-3 py-1 text-center truncate">app.whatsweb.io/dashboard</div>
          </div>
          {/* Dashboard interior */}
          <div className="flex flex-col md:flex-row" style={{minHeight: '480px'}}>
            {/* Sidebar */}
            <div className="hidden md:block w-56 bg-dark border-r border-border flex-shrink-0 py-4">
              <div className="px-4 mb-6 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.9.525 3.677 1.438 5.196L2 22l4.937-1.417A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <span className="text-dark-foreground text-sm font-bold font-headings">WhatsWeb</span>
              </div>
              {[
                {icon: 'message-square', label: 'Inbox', active: true},
                {icon: 'megaphone', label: 'Campaigns', active: false},
                {icon: 'git-branch', label: 'Flows', active: false},
                {icon: 'users', label: 'Contacts', active: false},
                {icon: 'bar-chart-2', label: 'Analytics', active: false},
                {icon: 'settings', label: 'Settings', active: false},
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md mb-0.5 ${item.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  <Icon i={item.icon} size={15} />
                  <span className="text-xs font-medium font-body">{item.label}</span>
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 bg-surface p-3 md:p-5 overflow-hidden">
              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5">
                {[
                  {label: 'Messages Today', value: '2,847', trend: '+12%', color: 'text-primary'},
                  {label: 'Active Campaigns', value: '14', trend: '+3', color: 'text-accent'},
                  {label: 'Open Rate', value: '94.2%', trend: '+2.1%', color: 'text-primary'},
                  {label: 'New Contacts', value: '389', trend: '+28%', color: 'text-accent'},
                ].map((s, i) => (
                  <div key={i} className="bg-card rounded-lg p-3 border border-border">
                    <div className="text-[10px] md:text-xs text-muted-foreground font-body mb-1 truncate">{s.label}</div>
                    <div className={`text-base md:text-xl font-bold font-headings ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] md:text-xs text-primary font-body mt-0.5">{s.trend}</div>
                  </div>
                ))}
              </div>
              {/* Inbox + chart */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Inbox list */}
                <div className="w-full lg:w-72 bg-card rounded-lg border border-border overflow-hidden flex-shrink-0">
                  <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold font-body text-foreground">{t('Live Inbox')}</span>
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs">7</div>
                  </div>
                  {[
                    {name: 'Sarah Johnson', msg: 'I need help with my order #4521', time: '2m', unread: true},
                    {name: 'Mike Chen', msg: 'When will my package arrive?', time: '5m', unread: true},
                    {name: 'Priya Sharma', msg: 'Thanks for the quick response!', time: '12m', unread: false},
                    {name: 'James Wilson', msg: 'Can I reschedule my appointment?', time: '28m', unread: false},
                  ].map((c, i) => (
                    <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-border ${i === 0 ? 'bg-secondary' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{c.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold font-body text-foreground truncate">{c.name}</span>
                          <span className="text-[10px] md:text-xs text-muted-foreground font-body">{c.time}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground font-body truncate">{c.msg}</div>
                      </div>
                      {c.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                  ))}
                </div>
                {/* Campaign analytics mini */}
                <div className="flex-1 bg-card rounded-lg border border-border p-3 overflow-hidden">
                  <div className="text-xs font-semibold font-body text-foreground mb-3">{t('Campaign Performance')}</div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-3">
                    {[
                      {label: 'Sent', val: '48,291', color: 'bg-primary'},
                      {label: 'Delivered', val: '47,102', color: 'bg-accent'},
                      {label: 'Read', val: '41,383', color: 'bg-secondary-foreground'},
                    ].map((m, i) => (
                      <div key={i} className="flex-1 min-w-[30%] sm:min-w-0 bg-surface rounded-md p-2 border border-border">
                        <div className={`w-2 h-2 rounded-full ${m.color} mb-1`} />
                        <div className="text-xs sm:text-sm font-bold font-headings text-foreground truncate">{m.val}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-body truncate">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Bar chart */}
                  <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
                    {[65, 80, 55, 90, 72, 88, 95, 78, 85, 92, 70, 87].map((h, i) => (
                      <div key={i} className="flex-1 flex items-end h-full">
                        <div className="w-full rounded-sm" style={{height: `${h}%`, background: i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? 'var(--color-accent)' : 'var(--color-secondary)', opacity: 0.8}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
