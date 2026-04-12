import { redirect } from 'next/navigation';

import { CategoriesManager } from '@/components/finance/categories-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function CategoriesPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (!session) {
    redirect('/sign-in?next=/categories');
  }

  return (
    <FinanceShell
      title='Categories'
      subtitle='Use system categories and create custom ones to classify income and expenses.'
      account={{ email: session.user.email, displayName: session.user.displayName }}
    >
      <CategoriesManager />
    </FinanceShell>
  );
}
