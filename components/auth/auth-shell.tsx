'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { useI18n } from '@/lib/i18n/client';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className='relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.14),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-slate-900 sm:px-8 sm:py-10 lg:px-12'>
      <div className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center sm:min-h-[calc(100vh-5rem)]'>
        <div className='grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16'>
          <section className='flex flex-col justify-center'>
            <Image
              src='/monity-logo_black.png'
              alt='Monity'
              width={232}
              height={32}
              priority
              className='mb-5 h-auto w-44 sm:w-52'
            />
            <p className='mb-4 inline-flex w-fit rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm backdrop-blur'>
              {eyebrow}
            </p>
            <h1 className='max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl'>
              {title}
            </h1>
            <p className='mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8'>
              {description}
            </p>
            <div className='mt-8 grid max-w-xl gap-4 text-sm text-slate-600 sm:mt-10 sm:grid-cols-3'>
              <div className='rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur'>
                <p className='font-semibold text-slate-900'>{t('auth.shell.trackTitle')}</p>
                <p className='mt-1'>{t('auth.shell.trackText')}</p>
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur'>
                <p className='font-semibold text-slate-900'>{t('auth.shell.budgetTitle')}</p>
                <p className='mt-1'>{t('auth.shell.budgetText')}</p>
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur'>
                <p className='font-semibold text-slate-900'>{t('auth.shell.trendsTitle')}</p>
                <p className='mt-1'>{t('auth.shell.trendsText')}</p>
              </div>
            </div>
          </section>

          <section className='flex items-center justify-center'>
            <div className='w-full max-w-md rounded-4xl border border-white/70 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6'>
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
