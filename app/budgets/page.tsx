import { redirect } from 'next/navigation';

import { BudgetsManager } from '@/components/finance/budgets-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function BudgetsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/budgets'))}`));
  }

  return (
    <FinanceShell
      title={t('budgets.pageTitle')}
      subtitle={t('budgets.pageSubtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <BudgetsManager />
    </FinanceShell>
  );
}
