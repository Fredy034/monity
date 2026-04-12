import { redirect } from 'next/navigation';

import { AccountsManager } from '@/components/finance/accounts-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function AccountsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/accounts'))}`));
  }

  return (
    <FinanceShell
      title={t('accounts.pageTitle')}
      subtitle={t('accounts.pageSubtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <AccountsManager />
    </FinanceShell>
  );
}
