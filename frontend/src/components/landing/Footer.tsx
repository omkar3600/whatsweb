const t = (s: string) => s;
export const displayName = 'Footer';
export const shortDescription = 'Site footer with links and logo';

import Icon from '../ui/Icon';

export default function Footer() {
  const linkGroups = [
    {
      title: t('Product'),
      items: [
        { label: t('Inbox'), href: '/inbox' },
        { label: t('Campaigns'), href: '/campaigns' },
        { label: t('Automation'), href: '/automations' },
        { label: t('Analytics'), href: '/dashboard' }
      ]
    },
    {
      title: t('Legal'),
      items: [
        { label: t('Privacy Policy'), href: '/privacy-policy' },
        { label: t('Terms of Service'), href: '/terms-of-service' }
      ]
    }
  ];

  return (
    <footer className="w-full bg-dark border-t border-border py-16 px-6 md:px-12 lg:px-16" style={{borderColor: 'rgba(255,255,255,0.08)'}}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.9.525 3.677 1.438 5.196L2 22l4.937-1.417A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <span className="font-headings font-bold text-lg text-dark-foreground">WhatsWeb</span>
            </div>
            <p className="text-sm font-body leading-relaxed mb-5" style={{color: 'rgba(226,232,240,0.55)'}}>
              {t('Enterprise WhatsApp CRM & Marketing Automation Platform.')}
            </p>
          </div>

          {/* Link columns */}
          {linkGroups.map((group, i) => (
            <div key={i}>
              <div className="text-xs font-semibold font-body mb-4 uppercase tracking-wider" style={{color: 'rgba(226,232,240,0.4)'}}>{group.title}</div>
              <div className="flex flex-col gap-3">
                {group.items.map((item, j) => (
                  <a key={j} href={item.href} className="text-sm font-body hover:text-white transition-colors" style={{color: 'rgba(226,232,240,0.65)'}}>{item.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-8 border-t" style={{borderColor: 'rgba(255,255,255,0.08)'}}>
          <span className="text-xs font-body" style={{color: 'rgba(226,232,240,0.4)'}}>{t('© 2024 WhatsWeb. All rights reserved.')}</span>
          <div className="flex items-center gap-2 text-xs font-body" style={{color: 'rgba(226,232,240,0.4)'}}>
            <Icon i="shield-check" size={12} />
            {t('Official WhatsApp Cloud API Partner')}
          </div>
        </div>
      </div>
    </footer>
  );
}
