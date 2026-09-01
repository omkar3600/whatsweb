import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers';
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';
import { OfflineDetector } from '@/components/OfflineDetector';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhatsWeb — WhatsApp Business Platform',
  description: 'Manage your WhatsApp Business communications, campaigns, and automations effortlessly.',
  icons: {
    icon: [
      { url: '/whatsweb-logo.png?v=2', type: 'image/png' },
      { url: '/favicon.png?v=2', type: 'image/png' },
    ],
    apple: '/whatsweb-logo.png?v=2',
    shortcut: '/whatsweb-logo.png?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="icon" href="/whatsweb-logo.png?v=2" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/whatsweb-logo.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/whatsweb-logo.png?v=2" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WhatsWeb" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
          {children}
          <OfflineDetector />
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
