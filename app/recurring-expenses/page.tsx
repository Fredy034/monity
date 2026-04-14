import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { FinanceShell } from '@/components/finance/finance-shell';
import { RecurringExpensesManager } from '@/components/finance/recurring-expenses-manager';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';

export default async function RecurringExpensesPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/recurring-expenses'))}`));
  }

  return (
    <FinanceShell
      title={t('recurring.pageTitle')}
      subtitle={t('recurring.pageSubtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <RecurringExpensesManager />
    </FinanceShell>
  );
}
