const t = (s: string) => s;
export const displayName = 'Use Cases Section';
export const shortDescription = 'Industry use cases grid';

import Icon from '../ui/Icon';

const useCases = [
  {
    icon: '🛍️',
    title: t('Retail Stores'),
    items: [t('Promotions & flash sales'), t('Order status updates'), t('Customer support')],
  },
  {
    icon: '🏥',
    title: t('Healthcare'),
    items: [t('Appointment reminders'), t('Post-visit follow-ups'), t('Health tips automation')],
  },
  {
    icon: '🎓',
    title: t('Education'),
    items: [t('Student communications'), t('Fee & deadline alerts'), t('Course notifications')],
  },
  {
    icon: '🏠',
    title: t('Real Estate'),
    items: [t('Lead nurturing flows'), t('Property updates'), t('Viewing reminders')],
  },
  {
    icon: '🍽️',
    title: t('Restaurants'),
    items: [t('Daily offers & menus'), t('Table reservations'), t('Order confirmations')],
  },
  {
    icon: '🛒',
    title: t('E-commerce'),
    items: [t('Abandoned cart recovery'), t('Order tracking'), t('Review requests')],
  },
];

export default function UseCasesSection() {
  return (
    <section className="w-full bg-surface py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="briefcase" size={12} />
            {t('Use Cases')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Built for Every Industry')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('WhatsHub adapts to your industry, enabling businesses of all kinds to communicate smarter on WhatsApp.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map((uc, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6">
              <div className="text-3xl mb-3">{uc.icon}</div>
              <h3 className="font-headings font-semibold text-lg text-foreground mb-3">{uc.title}</h3>
              <div className="flex flex-col gap-2">
                {uc.items.map((item, j) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                    <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon i="check" size={10} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
