import Link from 'next/link';
import type { ReactNode } from 'react';

import { SidebarAccountSection } from '@/components/finance/sidebar-account-section';
import { financeUi } from '@/components/finance/ui';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/categories', label: 'Categories' },
  { href: '/budgets', label: 'Budgets' },
];

export function FinanceShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={financeUi.shellBackground}>
      <div className='mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_1fr]'>
        <aside className={`${financeUi.panel} flex flex-col`}>
          <p className='px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Monity</p>
          <nav className='mt-2 mb-4 flex flex-col gap-1'>
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className='rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <SidebarAccountSection />
        </aside>

        <section className={financeUi.panel}>
          <header className='mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl'>{title}</h1>
              {subtitle ? <p className='mt-2 text-sm text-slate-600'>{subtitle}</p> : null}
            </div>
            {actions ? <div>{actions}</div> : null}
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
