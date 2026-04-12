import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { CredentialsForm } from '@/components/auth/credentials-form';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function SignInPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (session) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      eyebrow='Monity access'
      title='Sign in and continue managing your money'
      description='Get back to your balances, transactions, budgets, and monthly insights in seconds.'
    >
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold tracking-tight text-slate-950'>Welcome back</h2>
        <p className='mt-2 text-sm leading-6 text-slate-600'>Pick up right where you left off in your dashboard.</p>
      </div>
      <CredentialsForm
        mode='sign-in'
        endpoint='/api/auth/login'
        submitLabel='Sign in'
        footerHref='/sign-up'
        footerLabel='Create an account'
      />
    </AuthShell>
  );
}
