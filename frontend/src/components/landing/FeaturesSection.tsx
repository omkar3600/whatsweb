const t = (s: string) => s;
export const displayName = 'Features Section';
export const shortDescription = 'Main features grid section';

import Icon from '../ui/Icon';

const features = [
  {
    icon: 'inbox',
    title: t('Unified Team Inbox'),
    desc: t('Manage all WhatsApp conversations from a shared inbox with multi-agent support, real-time messaging, and conversation assignment.'),
    tags: [t('Multi-agent'), t('Real-time'), t('Assignment')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'megaphone',
    title: t('WhatsApp Broadcast Campaigns'),
    desc: t('Send bulk campaigns to thousands of customers with campaign scheduling, audience targeting, delivery tracking, and read receipts.'),
    tags: [t('Scheduling'), t('Targeting'), t('Read Receipts')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'git-branch',
    title: t('Visual Flow Builder'),
    desc: t('Build powerful chatbot journeys without coding using drag and drop builder, conditional logic, smart routing, and interactive workflows.'),
    tags: [t('No-code'), t('Chatbots'), t('Logic')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'clock',
    title: t('Drip Campaign Automation'),
    desc: t('Automatically nurture leads with time delays, automated follow-ups, trigger-based sequences and re-engagement campaigns.'),
    tags: [t('Drip'), t('Triggers'), t('Nurturing')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'bot',
    title: t('AI Powered Chatbot'),
    desc: t('Respond instantly using AI-powered conversations with context awareness, lead qualification, FAQ automation, and human handoff.'),
    tags: [t('AI'), t('FAQ'), t('Handoff')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'database',
    title: t('Contact Management CRM'),
    desc: t('Manage all customer data with profiles, tags & labels, contact segmentation, import from CSV/Excel, and full customer history.'),
    tags: [t('CRM'), t('Segments'), t('Import')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'bar-chart-2',
    title: t('Real-Time Analytics'),
    desc: t('Track every interaction and campaign with delivery rates, open rates, team performance dashboards, and revenue insights.'),
    tags: [t('Delivery'), t('Open Rate'), t('Revenue')],
    color: 'bg-secondary text-secondary-foreground',
  },
  {
    icon: 'plug',
    title: t('WhatsApp Embedded Signup'),
    desc: t('Connect your WhatsApp Business account in minutes with official onboarding, Meta OAuth, no technical setup, and instant activation.'),
    tags: [t('Meta'), t('OAuth'), t('1-Click')],
    color: 'bg-secondary text-secondary-foreground',
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full bg-surface py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="layers" size={12} />
            {t('Powerful Features')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Everything You Need to Scale on WhatsApp')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('From automation to analytics, WhatsHub gives your team superpowers to handle thousands of conversations with ease.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <Icon i={f.icon} size={20} />
              </div>
              <div>
                <h3 className="font-headings font-semibold text-base text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {f.tags.map((tag, j) => (
                  <span key={j} className="text-xs font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-body">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
