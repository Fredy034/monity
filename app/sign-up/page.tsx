import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { CredentialsForm } from '@/components/auth/credentials-form';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function SignUpPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (session) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      eyebrow='Monity onboarding'
      title='Create your account and start tracking smarter'
      description='Set up your workspace to manage accounts, record transactions, and stay on top of your monthly budgets.'
    >
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold tracking-tight text-slate-950'>Create your account</h2>
        <p className='mt-2 text-sm leading-6 text-slate-600'>
          Start organizing your money in one place with clear categories and actionable spending insights.
        </p>
      </div>
      <CredentialsForm
        mode='sign-up'
        endpoint='/api/auth/register'
        submitLabel='Create account'
        footerHref='/sign-in'
        footerLabel='Already have an account?'
        showName
      />
    </AuthShell>
  );
}
