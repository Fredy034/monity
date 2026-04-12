import { redirect } from 'next/navigation';

import { DashboardOverview } from '@/components/finance/dashboard-overview';
import { FinanceShell } from '@/components/finance/finance-shell';
import { getResolvedSessionFromCookies } from '@/lib/insforge/session';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const session = await getResolvedSessionFromCookies(await cookies());

  if (!session) {
    redirect('/sign-in?next=/dashboard');
  }

  return (
    <FinanceShell
      title={`Welcome${session.user.displayName ? `, ${session.user.displayName}` : ''}`}
      subtitle='Track balances, spending patterns, and budget consumption in one place.'
      account={{ email: session.user.email, displayName: session.user.displayName }}
    >
      <DashboardOverview />
    </FinanceShell>
  );
}
