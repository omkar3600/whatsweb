const t = (s: string) => s;
export const displayName = 'How It Works Section';
export const shortDescription = 'Step-by-step how it works timeline';

import Icon from '../ui/Icon';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: 'smartphone',
      title: t('Connect Your WhatsApp Business Account'),
      desc: t('Use our official Meta OAuth embedded signup to connect your WhatsApp Business number in minutes — no technical setup required.'),
    },
    {
      num: '02',
      icon: 'upload',
      title: t('Import Customers & Organize Contacts'),
      desc: t('Import from CSV or Excel, segment contacts with smart tags, and organize your entire customer database for targeting.'),
    },
    {
      num: '03',
      icon: 'git-branch',
      title: t('Build Campaigns & Automations'),
      desc: t('Design broadcast campaigns, build visual chatbot flows, and set up drip sequences without writing a single line of code.'),
    },
    {
      num: '04',
      icon: 'send',
      title: t('Engage Customers at Scale'),
      desc: t('Launch campaigns to thousands simultaneously, let AI chatbots handle FAQs, and route complex queries to the right agents.'),
    },
    {
      num: '05',
      icon: 'trending-up',
      title: t('Track Results & Grow Revenue'),
      desc: t('Monitor delivery, read rates, team performance, and revenue impact in real-time with our advanced analytics dashboard.'),
    },
  ];

  return (
    <section className="w-full bg-background py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="map" size={12} />
            {t('How It Works')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Up and Running in Minutes')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('Five simple steps from account setup to full-scale WhatsApp automation.')}
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-border" style={{left: '10%', right: '10%'}} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-4 border-4 border-background" style={{boxShadow: '0 0 0 2px var(--color-primary)'}}>
                  <Icon i={step.icon} size={22} />
                </div>
                <div className="text-xs font-bold text-muted-foreground font-body mb-2">{step.num}</div>
                <h3 className="font-headings font-semibold text-sm text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
