import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-10 text-slate-900 sm:px-8 lg:px-12'>
      <div className='mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center'>
        <div className='grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16'>
          <section className='flex flex-col justify-center'>
            <p className='mb-4 inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm'>
              Monity
            </p>
            <h1 className='max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl'>
              Take control of your money with clear accounts, transactions, and budgets.
            </h1>
            <p className='mt-6 max-w-xl text-lg leading-8 text-slate-600'>
              Monity helps you organize your accounts, track income and expenses, set monthly limits, and understand
              where your money goes in one focused dashboard.
            </p>
            <div className='mt-10 flex flex-wrap gap-3'>
              <Link
                href='/sign-up'
                className='inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(5,150,105,0.35)] transition hover:bg-emerald-500'
              >
                Create account
              </Link>
              <Link
                href='/sign-in'
                className='inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
              >
                Sign in
              </Link>
            </div>
          </section>

          <section className='grid gap-4'>
            <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]'>
              <p className='text-sm uppercase tracking-[0.2em] text-slate-500'>Included</p>
              <div className='mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2'>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>Accounts</p>
                  <p className='mt-1'>Manage bank, cash, and card balances in one place.</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>Transactions</p>
                  <p className='mt-1'>Track daily income and expenses with categories.</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>Budgets</p>
                  <p className='mt-1'>Set monthly limits and spot overspending early.</p>
                </div>
                <div className='rounded-2xl bg-slate-50 p-4'>
                  <p className='font-semibold text-slate-900'>Insights</p>
                  <p className='mt-1'>See balances, trends, and category spending instantly.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
