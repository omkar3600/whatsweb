const t = (s: string) => s;
export const displayName = 'Why Choose Section';
export const shortDescription = 'Why choose WhatsWeb feature cards';

import Icon from '../ui/Icon';

const reasons = [
  { icon: 'server', title: t('Enterprise Architecture'), desc: t('Built on a scalable, multi-tenant infrastructure that grows with your business.') },
  { icon: 'layout', title: t('Multi-Tenant Platform'), desc: t('Fully isolated environments for every workspace with enterprise-grade data separation.') },
  { icon: 'activity', title: t('Real-Time Infrastructure'), desc: t('Sub-second message delivery powered by Redis and WebSocket real-time technology.') },
  { icon: 'zap', title: t('Scalable Processing'), desc: t('Process millions of messages with queue-based architecture and auto-scaling.') },
  { icon: 'shield', title: t('Advanced Security'), desc: t('End-to-end encryption, audit logs, and role-based access control for every team.') },
  { icon: 'check-square', title: t('Reliable Tracking'), desc: t('Granular delivery, read, and failed message tracking for every campaign.') },
  { icon: 'message-circle', title: t('Official WhatsApp API'), desc: t('Fully certified WhatsApp Cloud API integration with Meta-approved onboarding.') },
  { icon: 'git-branch', title: t('Automation First'), desc: t('Every feature is designed around automation to eliminate manual repetitive tasks.') },
];

export default function WhyChooseSection() {
  return (
    <section className="w-full bg-background py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="star" size={12} />
            {t('Why WhatsWeb')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Enterprise-Grade From the Ground Up')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('Purpose-built for high-volume businesses that need reliability, security, and scale without compromise.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reasons.map((r, i) => (
            <div key={i} className="border border-border rounded-xl p-6 bg-card">
              <div className="w-10 h-10 rounded-lg bg-dark flex items-center justify-center text-primary mb-4">
                <Icon i={r.icon} size={20} />
              </div>
              <h3 className="font-headings font-semibold text-sm text-foreground mb-2">{r.title}</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
