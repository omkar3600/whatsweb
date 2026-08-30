"use client";

import { useAuth } from '@/components/providers';

const t = (s: string) => s;
export const displayName = 'NavBar';
export const shortDescription = 'Top navigation bar for WhatsWeb';

export default function NavBar() {
  const { user } = useAuth();
  const dashboardHref = user?.role?.toLowerCase() === 'admin' ? '/admin/shops' : '/dashboard';

  return (
    <nav className="w-full bg-background border-b border-border px-6 md:px-12 lg:px-16 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.9.525 3.677 1.438 5.196L2 22l4.937-1.417A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span className="font-headings font-bold text-xl text-foreground">WhatsWeb</span>
      </div>
      <div className="hidden lg:flex items-center gap-8">
        <a className="text-sm font-body text-muted-foreground">{t('')}</a>
        <a className="text-sm font-body text-muted-foreground">{t('')}</a>
        <a className="text-sm font-body text-muted-foreground">{t('')}</a>
        <a className="text-sm font-body text-muted-foreground">{t('')}</a>
        <a className="text-sm font-body text-muted-foreground">{t('')}</a>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <a href={dashboardHref} className="bg-primary inline-flex items-center justify-center text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-md font-body">
            {t('Go to Dashboard')}
          </a>
        ) : (
          <>
            <a href="/login" className="hidden sm:block text-sm font-body text-foreground font-medium">{t('Sign In')}</a>
            <a href="/demo" className="bg-primary inline-flex items-center justify-center text-primary-foreground text-sm font-medium px-3 py-2 md:px-5 md:py-2.5 rounded-md font-body">{t('Book Demo')}</a>
          </>
        )}
      </div>
    </nav>
  );
}
