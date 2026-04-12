import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { CredentialsForm } from '@/components/auth/credentials-form';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function SignInPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (session) {
    redirect(withLocale(locale, '/dashboard'));
  }

  return (
    <AuthShell
      eyebrow={t('auth.signIn.eyebrow')}
      title={t('auth.signIn.title')}
      description={t('auth.signIn.description')}
    >
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold tracking-tight text-slate-950'>{t('auth.signIn.cardTitle')}</h2>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{t('auth.signIn.cardText')}</p>
      </div>
      <CredentialsForm
        mode='sign-in'
        endpoint='/api/auth/login'
        submitLabel={t('auth.signIn.submit')}
        footerHref={withLocale(locale, '/sign-up')}
        footerLabel={t('auth.signIn.footer')}
      />
    </AuthShell>
  );
}
