const t = (s: string) => s;
export const displayName = 'Security Section';
export const shortDescription = 'Enterprise security feature section';

import Icon from '../ui/Icon';

const secFeatures = [
  { icon: 'key', title: t('Secure Authentication'), desc: t('JWT-based auth with refresh tokens and session management') },
  { icon: 'lock', title: t('Encrypted Communication'), desc: t('TLS encryption for all data in transit and at rest') },
  { icon: 'layers', title: t('Data Isolation'), desc: t('Full tenant isolation ensures your data stays separate') },
  { icon: 'shield', title: t('Role-Based Access'), desc: t('Granular permissions for every team member and admin') },
  { icon: 'file-text', title: t('Audit Logging'), desc: t('Complete activity logs for compliance and monitoring') },
  { icon: 'server', title: t('Secure Infrastructure'), desc: t('Hosted on SOC 2 certified cloud infrastructure') },
];

export default function SecuritySection() {
  return (
    <section className="w-full bg-surface py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
              <Icon i="shield-check" size={12} />
              {t('Security')}
            </div>
            <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
              {t('Enterprise-Grade Security')}
            </h2>
            <p className="text-lg text-muted-foreground font-body leading-relaxed mb-8">
              {t('Your customer data is protected by industry-leading security practices. We take privacy and compliance seriously so you can focus on growing your business.')}
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-2 rounded-lg font-body">
                <Icon i="check-circle" size={13} />
                {t('GDPR Compliant')}
              </div>
              <div className="flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-2 rounded-lg font-body">
                <Icon i="check-circle" size={13} />
                {t('SOC 2 Certified')}
              </div>
              <div className="flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-2 rounded-lg font-body">
                <Icon i="check-circle" size={13} />
                {t('ISO 27001')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {secFeatures.map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-dark flex items-center justify-center text-primary mb-3">
                  <Icon i={f.icon} size={17} />
                </div>
                <h3 className="font-headings font-semibold text-sm text-foreground mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
