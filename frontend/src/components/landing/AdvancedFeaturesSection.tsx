const t = (s: string) => s;
export const displayName = 'Advanced Features Grid';
export const shortDescription = 'Full feature checklist grid';

import Icon from '../ui/Icon';

export default function AdvancedFeaturesSection() {
  const features = [
    t('Shared Team Inbox'), t('Contact Tags'), t('Smart Segments'), t('Campaign Scheduler'),
    t('Broadcast Messaging'), t('AI Chatbot'), t('Flow Builder'), t('Drip Campaigns'),
    t('Delivery Tracking'), t('Read Receipts'), t('Role Management'), t('Webhook Processing'),
    t('Real-Time Notifications'), t('Secure Authentication'), t('Customer Analytics'), t('Multi-Agent Collaboration'),
  ];

  return (
    <section className="w-full bg-dark py-16 lg:py-24 px-6 md:px-12 lg:px-16 relative overflow-hidden">
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(16, 185, 129,0.08) 0%, transparent 70%)'}} />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary bg-opacity-20 text-primary text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="cpu" size={12} />
            {t('Advanced Capabilities')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-dark-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Built For High Growth Businesses')}
          </h2>
          <p className="text-lg font-body max-w-2xl mx-auto" style={{color: 'rgba(226,232,240,0.7)'}}>
            {t('Every feature designed to help you communicate at scale, automate intelligently, and grow revenue on WhatsApp.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-card bg-opacity-5 border border-border rounded-lg px-4 py-3" style={{background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)'}}>
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Icon i="check" size={11} />
              </div>
              <span className="text-sm font-body text-dark-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
