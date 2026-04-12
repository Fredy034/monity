import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { FinanceShell } from '@/components/finance/finance-shell';
import { ProfileSettingsForm } from '@/components/finance/profile-settings-form';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';

export default async function ProfileSettingsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/settings/profile'))}`));
  }

  return (
    <FinanceShell
      title={t('profile.pageTitle')}
      subtitle={t('profile.pageSubtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <ProfileSettingsForm
        avatarUrl={session.user.profile?.avatar_url ?? null}
        initialDisplayName={session.user.displayName ?? ''}
        initialEmail={session.user.email}
      />
    </FinanceShell>
  );
}
