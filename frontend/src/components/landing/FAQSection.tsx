const t = (s: string) => s;
export const displayName = 'FAQ Section';
export const shortDescription = 'FAQ accordion-style section';

import Icon from '../ui/Icon';

const faqs = [
  {
    q: t('What is WhatsWeb?'),
    a: t('WhatsWeb is an enterprise-grade WhatsApp Business API CRM and Marketing Automation Platform. It lets you manage conversations, run campaigns, build chatbots, and automate customer communication — all from one platform.'),
  },
  {
    q: t('How does WhatsWeb connect with WhatsApp?'),
    a: t('WhatsWeb uses the official WhatsApp Cloud API with an embedded Meta OAuth signup flow. You can connect your WhatsApp Business number in minutes without any technical setup.'),
  },
  {
    q: t('Can I send bulk campaigns?'),
    a: t('Yes! WhatsWeb Broadcast Campaigns let you send personalized messages to thousands of contacts simultaneously, with scheduling, segmentation, delivery tracking, and read receipt analytics.'),
  },
  {
    q: t('Can multiple agents use one WhatsApp number?'),
    a: t('Absolutely. WhatsWeb Unified Team Inbox supports unlimited agents sharing a single WhatsApp Business number with conversation assignment, internal notes, and real-time collaboration.'),
  },
  {
    q: t('Does WhatsWeb support automation?'),
    a: t('Yes. WhatsWeb includes a Visual Flow Builder, Drip Campaign Automation, trigger-based sequences, and conditional logic for fully automated customer journeys.'),
  },
  {
    q: t('Can I build chatbots without coding?'),
    a: t('Yes. The no-code Visual Flow Builder lets you create AI-powered chatbot journeys using a drag-and-drop canvas. Add conditional branches, smart routing, and human handoff with ease.'),
  },
  {
    q: t('Is my customer data secure?'),
    a: t('WhatsWeb is GDPR compliant and uses enterprise-grade security including TLS encryption, role-based access, full data isolation, and comprehensive audit logging.'),
  },
  {
    q: t('How long does setup take?'),
    a: t('Most customers are up and running within 30 minutes. Our embedded WhatsApp signup, onboarding wizard, and customer support team ensure a smooth, fast activation.'),
  },
];

export default function FAQSection() {
  return (
    <section className="w-full bg-background py-16 lg:py-24 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-xl mb-5 font-body">
            <Icon i="help-circle" size={12} />
            {t('FAQ')}
          </div>
          <h2 className="font-headings font-bold text-4xl text-foreground mb-4" style={{letterSpacing: '-0.5px'}}>
            {t('Frequently Asked Questions')}
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            {t('Everything you need to know about WhatsWeb.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl p-6 bg-surface">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon i="chevron-right" size={12} />
                </div>
                <h3 className="font-headings font-semibold text-sm text-foreground">{faq.q}</h3>
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed pl-9">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
