import { redirect } from 'next/navigation';

import { FinanceShell } from '@/components/finance/finance-shell';
import { TransactionsManager } from '@/components/finance/transactions-manager';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function TransactionsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (!session) {
    redirect('/sign-in?next=/transactions');
  }

  return (
    <FinanceShell
      title='Transactions'
      subtitle='Track incomes and expenses, connected to an account and category.'
      account={{ email: session.user.email, displayName: session.user.displayName }}
    >
      <TransactionsManager />
    </FinanceShell>
  );
}
