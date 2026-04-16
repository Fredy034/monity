import { NextResponse } from 'next/server';

import { applyRecurringForUser } from '@/lib/finance/recurring';
import { signedAmount, type TransactionType } from '@/lib/finance/validation';
import { jsonError } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

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

function yearStart(year: number) {
  return new Date(Date.UTC(year, 0, 1));
}

function yearEnd(year: number) {
  return new Date(Date.UTC(year, 11, 31));
}

function parseYear(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_YEAR || parsed > MAX_YEAR) return fallback;
  return parsed;
}

function monthLabel(monthIndex: number) {
  return String(monthIndex).padStart(2, '0');
}

export async function GET(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const generation = await applyRecurringForUser(client, session.user.id);
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  const url = new URL(request.url);
  const now = new Date();
  const selectedYear = parseYear(url.searchParams.get('year'), now.getUTCFullYear());
  const selectedAccountId = url.searchParams.get('accountId');

  const currentMonthStart = monthStart();
  const currentMonthEnd = monthEnd(currentMonthStart);
  const selectedYearStart = yearStart(selectedYear);
  const selectedYearEnd = yearEnd(selectedYear);

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
  const filteredTransactions = selectedAccountId ? txs.filter((item) => item.account_id === selectedAccountId) : txs;
  const recentTransactions = (recentRes.data ?? []).map((item) => ({
    ...item,
    amount: Number(item.amount),
  }));

  const accountMovement = new Map<string, number>();
  const categorySpendingCurrentMonth = new Map<string, number>();
  const categorySpendingYear = new Map<string, number>();
  const expenseByAccount = new Map<string, number>();
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => ({
    month_index: index + 1,
    month_key: monthLabel(index + 1),
    income: 0,
    expense: 0,
    net: 0,
    cumulative_balance: 0,
  }));

  const availableYears = new Set<number>([now.getUTCFullYear()]);

  for (const tx of txs) {
    const txDate = new Date(`${tx.transaction_date}T00:00:00.000Z`);
    if (!Number.isNaN(txDate.getTime())) {
      availableYears.add(txDate.getUTCFullYear());
    }
  }

  let monthIncome = 0;
  let monthExpense = 0;
  let openingMovementBeforeSelectedYear = 0;

  for (const tx of txs) {
    const amount = Number(tx.amount);
    const signed = signedAmount(tx.type as TransactionType, amount);
    accountMovement.set(tx.account_id, (accountMovement.get(tx.account_id) ?? 0) + signed);
  }

  for (const tx of filteredTransactions) {
    const amount = Number(tx.amount);
    const signed = signedAmount(tx.type as TransactionType, amount);

    const txDate = new Date(`${tx.transaction_date}T00:00:00.000Z`);
    if (Number.isNaN(txDate.getTime())) continue;

    if (txDate < selectedYearStart) {
      openingMovementBeforeSelectedYear += signed;
    }

    if (txDate >= currentMonthStart && txDate <= currentMonthEnd) {
      if (tx.type === 'income') {
        monthIncome += amount;
      } else {
        monthExpense += amount;
      }

      if (tx.type === 'expense') {
        categorySpendingCurrentMonth.set(
          tx.category_id,
          (categorySpendingCurrentMonth.get(tx.category_id) ?? 0) + amount,
        );
      }
    }

    if (txDate < selectedYearStart || txDate > selectedYearEnd) {
      continue;
    }

    const monthIndex = txDate.getUTCMonth();
    if (tx.type === 'income') {
      monthlyFlow[monthIndex].income += amount;
    } else {
      monthlyFlow[monthIndex].expense += amount;
      categorySpendingYear.set(tx.category_id, (categorySpendingYear.get(tx.category_id) ?? 0) + amount);
      expenseByAccount.set(tx.account_id, (expenseByAccount.get(tx.account_id) ?? 0) + amount);
    }

    monthlyFlow[monthIndex].net += signed;
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

  const selectedAccounts = selectedAccountId
    ? accountBalances.filter((item) => item.id === selectedAccountId)
    : accountBalances;

  const selectedAccountsOpeningBalance = selectedAccounts.reduce((sum, item) => sum + item.initial_balance, 0);
  let runningBalance = selectedAccountsOpeningBalance + openingMovementBeforeSelectedYear;

  for (const month of monthlyFlow) {
    runningBalance += month.net;
    month.income = Number(month.income.toFixed(2));
    month.expense = Number(month.expense.toFixed(2));
    month.net = Number(month.net.toFixed(2));
    month.cumulative_balance = Number(runningBalance.toFixed(2));
  }

  const spendingByCategory = Array.from(categorySpendingCurrentMonth.entries())
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
    const spent = categorySpendingCurrentMonth.get(budget.category_id) ?? 0;
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

  const totalYearExpense = Array.from(categorySpendingYear.values()).reduce((sum, value) => sum + value, 0);

  const chartSpendingByCategory = Array.from(categorySpendingYear.entries())
    .map(([categoryId, spent]) => {
      const category = categories.find((item) => item.id === categoryId);
      const percent = totalYearExpense > 0 ? (spent / totalYearExpense) * 100 : 0;

      return {
        category_id: categoryId,
        category_name: category?.name ?? 'Uncategorized',
        color: category?.color ?? '#94A3B8',
        spent: Number(spent.toFixed(2)),
        percent: Number(percent.toFixed(2)),
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const chartExpensesByAccount = Array.from(expenseByAccount.entries())
    .map(([accountId, spent]) => {
      const account = accountBalances.find((item) => item.id === accountId);
      return {
        account_id: accountId,
        account_name: account?.name ?? 'Unknown account',
        spent: Number(spent.toFixed(2)),
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const sortedYears = Array.from(availableYears).sort((a, b) => b - a);

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
        charts: {
          selected_year: selectedYear,
          selected_account_id: selectedAccountId,
          available_years: sortedYears,
          monthly_cash_flow: monthlyFlow,
          spending_by_category: chartSpendingByCategory,
          expenses_by_account: chartExpensesByAccount,
        },
      },
    }),
    session,
  );
}
