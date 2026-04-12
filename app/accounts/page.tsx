import { redirect } from 'next/navigation';

import { AccountsManager } from '@/components/finance/accounts-manager';
import { FinanceShell } from '@/components/finance/finance-shell';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function AccountsPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (!session) {
    redirect('/sign-in?next=/accounts');
  }

  return (
    <FinanceShell
      title='Accounts'
      subtitle='Create and manage bank, cash, debit, and credit accounts with opening balances.'
    >
      <AccountsManager />
    </FinanceShell>
  );
}
