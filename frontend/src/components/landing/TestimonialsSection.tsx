const t = (s: string) => s;
export const displayName = 'Testimonials Section';
export const shortDescription = '3-card testimonial section';

import UserAvatar from '../ui/UserAvatar';
import Icon from '../ui/Icon';

const testimonials = [
  {
    name: t('Sarah Mitchell'),
    company: t('RetailMax Group'),
    role: t('Head of Customer Success'),
    review: t("WhatsWeb transformed how we communicate with 80,000+ customers. Our campaign open rates jumped to 94% and support tickets dropped by 40%. The automation alone saved us 200+ hours per month."),
    rating: 5,
    gender: 'female',
    heritage: 'North American',
    age: '25-35',
    idx: 2,
  },
  {
    name: t('Arjun Patel'),
    company: t('MedCare Solutions'),
    role: t('Operations Director'),
    review: t("We automated appointment reminders and reduced no-shows by 60%. WhatsWeb's reliability and WhatsApp integration is unlike anything else we've tried. Absolutely enterprise-grade."),
    rating: 5,
    gender: 'male',
    heritage: 'South Asian',
    age: '35-50',
    idx: 5,
  },
  {
    name: t('Fatima Al-Hassan'),
    company: t('EduConnect Academy'),
    role: t('Marketing Manager'),
    review: t("Managing communication for 15,000 students was a nightmare. WhatsWeb made it effortless. The broadcast campaigns and flow builder are incredibly powerful. Setup took under 30 minutes."),
    rating: 5,
    gender: 'female',
    heritage: 'Middle Eastern',
    age: '25-35',
    idx: 3,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="w-full bg-surface py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="heart" size={12} />
            {t('Customer Stories')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Trusted by Growing Teams Worldwide')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('Thousands of businesses use WhatsWeb to transform their customer communication on WhatsApp.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-7 flex flex-col gap-5">
              <div className="flex gap-1">
                {Array.from({length: t_.rating}).map((_, j) => (
                  <Icon key={j} i="star" size={14} />
                ))}
              </div>
              <p className="text-sm text-foreground font-body leading-relaxed flex-1" style={{fontStyle: 'italic'}}>"{t_.review}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <UserAvatar gender={t_.gender} heritage={t_.heritage} ageGroup={t_.age} index={t_.idx} className="w-10 h-10" />
                <div>
                  <div className="font-headings font-semibold text-sm text-foreground">{t_.name}</div>
                  <div className="text-xs text-muted-foreground font-body">{t_.role} · {t_.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
