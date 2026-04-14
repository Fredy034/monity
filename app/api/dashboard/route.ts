import { NextResponse } from 'next/server';

import { applyRecurringForUser } from '@/lib/finance/recurring';
import { signedAmount, type TransactionType } from '@/lib/finance/validation';
import { jsonError } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

function monthStart(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month, 1));
}

function monthEnd(start: Date) {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const generation = await applyRecurringForUser(client, session.user.id);
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  const currentMonthStart = monthStart();
  const currentMonthEnd = monthEnd(currentMonthStart);

  const [accountsRes, categoriesRes, transactionsRes, recentRes, budgetsRes] = await Promise.all([
    client.database
      .from('accounts')
      .select('id, name, type, initial_balance, currency, is_active')
      .eq('user_id', session.user.id),
    client.database
      .from('categories')
      .select('id, name, type, color, icon, is_system')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true }),
    client.database
      .from('transactions')
      .select('id, account_id, category_id, type, amount, transaction_date')
      .eq('user_id', session.user.id),
    client.database
      .from('transactions')
      .select('id, account_id, category_id, type, amount, description, transaction_date, created_at')
      .eq('user_id', session.user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    client.database
      .from('budgets')
      .select('id, category_id, period_month, limit_amount')
      .eq('user_id', session.user.id)
      .eq('period_month', dateOnly(currentMonthStart)),
  ]);

  const firstError =
    accountsRes.error ?? categoriesRes.error ?? transactionsRes.error ?? recentRes.error ?? budgetsRes.error;

  if (firstError) {
    return jsonError(500, 'DASHBOARD_READ_FAILED', firstError.message);
  }

  const categories = categoriesRes.data ?? [];
  const txs = transactionsRes.data ?? [];
  const recentTransactions = (recentRes.data ?? []).map((item) => ({
    ...item,
    amount: Number(item.amount),
  }));

  const accountMovement = new Map<string, number>();
  const categorySpending = new Map<string, number>();
  let monthIncome = 0;
  let monthExpense = 0;

  for (const tx of txs) {
    const amount = Number(tx.amount);
    const signed = signedAmount(tx.type as TransactionType, amount);
    accountMovement.set(tx.account_id, (accountMovement.get(tx.account_id) ?? 0) + signed);

    const txDate = new Date(`${tx.transaction_date}T00:00:00.000Z`);
    if (txDate >= currentMonthStart && txDate <= currentMonthEnd) {
      if (tx.type === 'income') {
        monthIncome += amount;
      } else {
        monthExpense += amount;
      }

      if (tx.type === 'expense') {
        categorySpending.set(tx.category_id, (categorySpending.get(tx.category_id) ?? 0) + amount);
      }
    }
  }

  const accountBalances = (accountsRes.data ?? []).map((acc) => {
    const movement = accountMovement.get(acc.id) ?? 0;
    const currentBalance = Number(acc.initial_balance) + movement;

    return {
      ...acc,
      initial_balance: Number(acc.initial_balance),
      current_balance: Number(currentBalance.toFixed(2)),
    };
  });

  const totalBalance = accountBalances.reduce((sum, acc) => sum + acc.current_balance, 0);

  const spendingByCategory = Array.from(categorySpending.entries())
    .map(([categoryId, spent]) => {
      const category = categories.find((item) => item.id === categoryId);
      return {
        category_id: categoryId,
        category_name: category?.name ?? 'Uncategorized',
        color: category?.color ?? '#94A3B8',
        spent: Number(spent.toFixed(2)),
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const budgets = (budgetsRes.data ?? []).map((budget) => {
    const spent = categorySpending.get(budget.category_id) ?? 0;
    const category = categories.find((item) => item.id === budget.category_id);
    const limit = Number(budget.limit_amount);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      ...budget,
      category_name: category?.name ?? 'Unknown category',
      limit_amount: limit,
      spent: Number(spent.toFixed(2)),
      utilization_percent: Number(percent.toFixed(2)),
      is_exceeded: spent > limit,
    };
  });

  return withSessionCookies(
    NextResponse.json({
      data: {
        totals: {
          total_balance: Number(totalBalance.toFixed(2)),
          month_income: Number(monthIncome.toFixed(2)),
          month_expense: Number(monthExpense.toFixed(2)),
          month_net: Number((monthIncome - monthExpense).toFixed(2)),
        },
        accounts: accountBalances,
        recent_transactions: recentTransactions,
        spending_by_category: spendingByCategory,
        budgets,
      },
    }),
    session,
  );
}
