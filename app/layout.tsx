import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ToastProvider } from '@/components/ui/toast-provider';
import { getRequestLocale } from '@/lib/i18n/server';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Monity',
  description: 'Secure personal finance tracking with InsForge and Next.js.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col bg-slate-50 text-slate-900'>
        <ToastProvider>
          <div className='pointer-events-none fixed right-4 top-4 z-60'>
            <LanguageSwitcher className='pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-sm backdrop-blur' />
          </div>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
