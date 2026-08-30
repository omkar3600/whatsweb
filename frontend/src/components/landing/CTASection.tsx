const t = (s: string) => s;
export const displayName = 'Final CTA Section';
export const shortDescription = 'Final call-to-action with gradient background';

import Icon from '../ui/Icon';

export default function CTASection() {
  return (
    <section className="w-full py-16 lg:py-24 px-6 md:px-12 lg:px-16 relative overflow-hidden bg-dark">
      <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(16, 185, 129,0.12) 0%, transparent 70%)'}} />
      <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-60" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 border border-primary border-opacity-40 text-primary text-xs font-medium px-4 py-1.5 rounded-xl mb-6 font-body">
          <Icon i="rocket" size={12} />
          {t('Get Started Today')}
        </div>
        <h2 className="font-headings font-bold text-5xl text-dark-foreground mb-6" style={{letterSpacing: '-1px'}}>
          {t('Ready to Scale Your Business')}
          <br />
          <span className="text-primary">{t('on WhatsApp?')}</span>
        </h2>
        <p className="text-lg font-body max-w-2xl mx-auto mb-10 leading-relaxed" style={{color: 'rgba(226,232,240,0.75)'}}>
          {t('Join businesses using WhatsWeb to automate conversations, increase engagement, and drive more sales — all through WhatsApp.')}
        </p>

        <div className="flex items-center justify-center gap-4 mb-12">
          <a href="/demo" className="bg-primary text-primary-foreground font-medium text-base px-10 py-4 rounded-lg font-body flex items-center gap-2"><Icon i="calendar" size={17} />{t('Book Demo')}</a>
          <a href="/login" className="font-medium text-base px-10 py-4 rounded-lg font-body flex items-center gap-2 border border-dark-foreground border-opacity-20" style={{color: 'rgba(226,232,240,0.7)'}}><Icon i="log-in" size={17} />{t('Login')}</a>
        </div>

        <div className="flex items-center justify-center gap-8">
          {[
            { icon: 'credit-card', text: t('No credit card required') },
            { icon: 'clock', text: t('Setup in 30 minutes') },
            { icon: 'shield-check', text: t('Enterprise-grade security') },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-body" style={{color: 'rgba(226,232,240,0.6)'}}>
              <Icon i={item.icon} size={14} />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
