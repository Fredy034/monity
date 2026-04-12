import { redirect } from 'next/navigation';

import { CategoriesManager } from '@/components/finance/categories-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { withLocale } from '@/lib/i18n';
import { getServerTranslator } from '@/lib/i18n/server';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function CategoriesPage() {
  const session = await getResolvedSessionFromCookies(await cookies());
  const { locale, t } = await getServerTranslator();

  if (!session) {
    redirect(withLocale(locale, `/sign-in?next=${encodeURIComponent(withLocale(locale, '/categories'))}`));
  }

  return (
    <FinanceShell
      title={t('categories.pageTitle')}
      subtitle={t('categories.pageSubtitle')}
      account={{
        email: session.user.email,
        displayName: session.user.displayName,
        avatarUrl: session.user.profile?.avatar_url ?? null,
      }}
    >
      <CategoriesManager />
    </FinanceShell>
  );
}
