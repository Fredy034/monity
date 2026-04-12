import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { VerificationForm } from '@/components/auth/verification-form';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function VerifyEmailPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (session) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      eyebrow='Verify access'
      title='Confirm your email address'
      description='Verify your account to unlock your dashboard and start tracking accounts, transactions, and budgets.'
    >
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold tracking-tight text-slate-950'>Verify your inbox</h2>
        <p className='mt-2 text-sm leading-6 text-slate-600'>
          Enter your 6-digit code to finish setup and continue to your finance dashboard.
        </p>
      </div>
      <VerificationForm endpoint='/api/auth/verify-email' />
    </AuthShell>
  );
}
