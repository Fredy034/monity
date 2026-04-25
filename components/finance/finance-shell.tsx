'use client';

import { useI18n } from '@/lib/i18n/client';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { SidebarAccountSection } from '@/components/finance/sidebar-account-section';
import { financeUi } from '@/components/finance/ui';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeToggle } from '@/components/i18n/theme-toggle';

type FinanceShellAccount = {
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

const links = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/accounts', key: 'nav.accounts' },
  { href: '/transactions', key: 'nav.transactions' },
  { href: '/recurring-expenses', key: 'nav.recurring' },
  { href: '/categories', key: 'nav.categories' },
  { href: '/budgets', key: 'nav.budgets' },
] as const;

export function FinanceShell({
  title,
  subtitle,
  actions,
  children,
  account,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  account?: FinanceShellAccount;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t, withLocale } = useI18n();

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <main className={financeUi.shellBackground}>
      <div className='mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
        <aside className={`${financeUi.panel} hidden h-fit flex-col lg:sticky lg:top-6 lg:flex`}>
          <div className='p-1'>
            <Image
              src='/monity-logo_black.png'
              alt={t('common.appName')}
              width={180}
              height={24}
              priority
              className='h-auto w-36'
            />
          </div>
          <nav className='mt-2 mb-4 flex flex-col gap-1'>
            {links.map((item) => (
              <Link
                key={item.href}
                href={withLocale(item.href)}
                onClick={closeSidebar}
                className='rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <SidebarAccountSection
            email={account?.email}
            displayName={account?.displayName}
            avatarUrl={account?.avatarUrl}
          />
        </aside>

        <section className={`${financeUi.panel} min-w-0`}>
          <header className='mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl'>
                {title}
              </h1>
              {subtitle ? <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>{subtitle}</p> : null}
            </div>
            <div className='flex w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end'>
              <LanguageSwitcher className='dark:text-slate-300 px-2 py-1' />
              <ThemeToggle />
              <button
                type='button'
                className='ml-2 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden'
                onClick={() => setIsSidebarOpen(true)}
                aria-label={t('nav.openNavigation')}
              >
                {t('common.menu')}
              </button>
              {actions ? <div>{actions}</div> : null}
            </div>
          </header>

          {children}
        </section>
      </div>

      {isSidebarOpen ? (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <button
            type='button'
            className='absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]'
            onClick={closeSidebar}
            aria-label={t('nav.closeNavigation')}
          />

          <aside className='absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)]'>
            <div className='mb-2 flex items-center justify-between'>
              <Image
                src='/monity-logo_black.png'
                alt={t('common.appName')}
                width={156}
                height={42}
                priority
                className='h-auto w-32'
              />
              <button
                type='button'
                className='inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 px-2.5 text-sm text-slate-600'
                onClick={closeSidebar}
              >
                {t('common.close')}
              </button>
            </div>

            <nav className='mt-1 mb-4 flex flex-col gap-1'>
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={withLocale(item.href)}
                  onClick={closeSidebar}
                  className='rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            <SidebarAccountSection
              email={account?.email}
              displayName={account?.displayName}
              avatarUrl={account?.avatarUrl}
            />
          </aside>
        </div>
      ) : null}
    </main>
  );
}
