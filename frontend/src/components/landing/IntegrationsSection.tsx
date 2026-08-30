const t = (s: string) => s;
export const displayName = 'Integrations Section';
export const shortDescription = 'Integration logos/grid section';

import Icon from '../ui/Icon';

const integrations = [
  { name: 'WhatsApp', icon: 'message-circle', color: 'bg-green-50 text-green-600', desc: t('Official API') },
  { name: 'Meta', icon: 'layers', color: 'bg-blue-50 text-blue-600', desc: t('OAuth') },
  { name: 'OpenAI', icon: 'bot', color: 'bg-purple-50 text-purple-600', desc: t('AI Engine') },
  { name: 'PostgreSQL', icon: 'database', color: 'bg-indigo-50 text-indigo-600', desc: t('Database') },
  { name: 'Redis', icon: 'zap', color: 'bg-red-50 text-red-600', desc: t('Real-Time') },
  { name: 'Webhooks', icon: 'webhook', color: 'bg-orange-50 text-orange-600', desc: t('Events') },
  { name: 'REST APIs', icon: 'code', color: 'bg-gray-50 text-gray-600', desc: t('Custom') },
];

export default function IntegrationsSection() {
  return (
    <section className="w-full bg-background py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="plug" size={12} />
            {t('Integrations')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Works With Your Existing Stack')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('Connect WhatsWeb with the tools and infrastructure your team already uses.')}
          </p>
        </div>

        <div className="flex items-center justify-center gap-5 flex-wrap">
          {integrations.map((intg, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 bg-card border border-border rounded-xl px-8 py-5 min-w-28">
              <div className={`w-12 h-12 rounded-xl ${intg.color} flex items-center justify-center`}>
                <Icon i={intg.icon} size={22} />
              </div>
              <div className="font-headings font-semibold text-sm text-foreground">{intg.name}</div>
              <div className="text-xs text-muted-foreground font-body">{intg.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
