import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { CredentialsForm } from '@/components/auth/credentials-form';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function SignUpPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (session) {
    redirect(withLocale(locale, '/dashboard'));
  }

  return (
    <AuthShell
      eyebrow={t('auth.signUp.eyebrow')}
      title={t('auth.signUp.title')}
      description={t('auth.signUp.description')}
    >
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold tracking-tight text-slate-950'>{t('auth.signUp.cardTitle')}</h2>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{t('auth.signUp.cardText')}</p>
      </div>
      <CredentialsForm
        mode='sign-up'
        endpoint='/api/auth/register'
        submitLabel={t('auth.signUp.submit')}
        footerHref={withLocale(locale, '/sign-in')}
        footerLabel={t('auth.signUp.footer')}
        showName
      />
    </AuthShell>
  );
}
