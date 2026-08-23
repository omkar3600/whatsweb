const t = (s: string) => s;
export const displayName = 'Stats Section';
export const shortDescription = 'Feature statistics with large numbers';

export default function StatsSection() {
  const stats = [
    { value: t('10M+'), label: t('Messages Processed'), icon: '💬' },
    { value: t('100K+'), label: t('Contacts Managed'), icon: '👥' },
    { value: t('99.9%'), label: t('Platform Uptime'), icon: '⚡' },
    { value: t('24/7'), label: t('Automated Engagement'), icon: '🤖' },
  ];
  return (
    <section className="w-full bg-dark py-16 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl mb-2">{s.icon}</div>
            <div className="font-headings font-bold text-5xl text-primary mb-2">{s.value}</div>
            <div className="text-base text-dark-foreground font-body opacity-80">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
