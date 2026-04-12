import { redirect } from 'next/navigation';

import { DashboardOverview } from '@/components/finance/dashboard-overview';
import { FinanceShell } from '@/components/finance/finance-shell';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/dashboard'))}`));
  }

  return (
    <FinanceShell
      title={`${t('dashboard.welcome')}${session.user.displayName ? `, ${session.user.displayName}` : ''}`}
      subtitle={t('dashboard.subtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <DashboardOverview />
    </FinanceShell>
  );
}
