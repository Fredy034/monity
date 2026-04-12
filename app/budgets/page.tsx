import { redirect } from 'next/navigation';

import { BudgetsManager } from '@/components/finance/budgets-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function BudgetsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (!session) {
    redirect('/sign-in?next=/budgets');
  }

  return (
    <FinanceShell title='Budgets' subtitle='Set monthly category limits and monitor your spending discipline.'>
      <BudgetsManager />
    </FinanceShell>
  );
}
