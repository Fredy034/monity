import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  const { locale, t } = await getServerTranslator();
  if (session) {
    redirect(withLocale(locale, '/dashboard'));
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-8 text-slate-900 sm:px-8 sm:py-10 lg:px-12'>
      <div className='mx-auto mb-4 flex w-full max-w-6xl justify-end sm:mb-6'>
        <LanguageSwitcher className='rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-sm backdrop-blur' />
      </div>
      <div className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center sm:min-h-[calc(100vh-5rem)]'>
        <div className='grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16'>
          <section className='flex flex-col justify-center'>
            <Image
              src='/monity-logo_black.png'
              alt='Monity'
              width={240}
              height={34}
              priority
              className='mb-5 h-auto w-44 sm:w-52'
            />
            <p className='mb-4 inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm'>
              {t('home.badge')}
            </p>
            <h1 className='max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl'>
              {t('home.heading')}
            </h1>
            <p className='mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8'>
              {t('home.subheading')}
            </p>
            <div className='mt-8 flex flex-wrap gap-3 sm:mt-10'>
              <Link
                href={withLocale(locale, '/sign-up')}
                className='inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(5,150,105,0.35)] transition hover:bg-emerald-500'
              >
                {t('home.createAccount')}
              </Link>
              <Link
                href={withLocale(locale, '/sign-in')}
                className='inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
              >
                {t('home.signIn')}
              </Link>
            </div>
          </section>

          <section className='grid gap-4'>
            <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]'>
              <p className='text-sm uppercase tracking-[0.2em] text-slate-500'>{t('home.included')}</p>
              <div className='mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2'>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>{t('home.accountsTitle')}</p>
                  <p className='mt-1'>{t('home.accountsText')}</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>{t('home.transactionsTitle')}</p>
                  <p className='mt-1'>{t('home.transactionsText')}</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>{t('home.budgetsTitle')}</p>
                  <p className='mt-1'>{t('home.budgetsText')}</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>{t('home.insightsTitle')}</p>
                  <p className='mt-1'>{t('home.insightsText')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
