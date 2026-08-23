const t = (s: string) => s;
export const displayName = 'Problem Solution Section';
export const shortDescription = 'Problem vs Solution section';

import Icon from '../ui/Icon';

export default function ProblemSolutionSection() {
  const problems = [
    { icon: 'inbox', text: t('Customer messages get lost in chaos') },
    { icon: 'users-x', text: t('No team collaboration on conversations') },
    { icon: 'clock', text: t('Manual, time-consuming follow-ups') },
    { icon: 'megaphone', text: t('Difficult bulk campaign management') },
    { icon: 'filter-x', text: t('No customer segmentation capabilities') },
    { icon: 'bot', text: t('Zero automation, fully manual work') },
  ];
  const solutions = [
    { icon: 'inbox', text: t('Unified inbox for every conversation') },
    { icon: 'users', text: t('Real-time multi-agent collaboration') },
    { icon: 'zap', text: t('Automated drip & follow-up sequences') },
    { icon: 'megaphone', text: t('One-click broadcast campaigns') },
    { icon: 'sliders', text: t('Smart contact segmentation & tags') },
    { icon: 'git-branch', text: t('Visual flow builder with chatbots') },
  ];

  return (
    <section className="w-full bg-background py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="alert-circle" size={12} />
            {t('The Problem')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Managing WhatsApp at Scale is Hard')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('WhatsHub centralizes support, sales, marketing, and automation into one unified platform.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problems */}
          <div className="bg-surface border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Icon i="x-circle" size={16} />
              </div>
              <h3 className="font-headings font-bold text-xl text-foreground">{t('Without WhatsHub')}</h3>
            </div>
            <div className="flex flex-col gap-3">
              {problems.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Icon i="x" size={11} />
                  </div>
                  <span className="text-sm text-muted-foreground font-body">{p.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="bg-dark border border-border rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', transform: 'translate(30%, -30%)'}} />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Icon i="check-circle" size={16} />
              </div>
              <h3 className="font-headings font-bold text-xl text-dark-foreground">{t('With WhatsHub')}</h3>
            </div>
            <div className="flex flex-col gap-3 relative z-10">
              {solutions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border border-opacity-20 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Icon i="check" size={11} />
                  </div>
                  <span className="text-sm text-dark-foreground font-body opacity-90">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
