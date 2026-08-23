import { shiftFinancePeriod, type FinancePeriod } from './period.ts';

export type DashboardAnalyticsTransaction = {
  categoryId: string;
  amount: number;
  transactionDate: string;
  type: 'income' | 'expense';
};

export type DashboardAnalyticsCategory = {
  id: string;
  name: string;
  color: string | null;
};

export type CategoryTrendPoint = {
  months: Array<{ monthKey: string; year: number; month: number }>;
  series: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    total: number;
    values: number[];
  }>;
};

export type DashboardComparisons = {
  previousMonthIncome: number;
  previousMonthExpense: number;
  recentAverageExpense: number;
  categoryPreviousMonth: Record<string, number>;
  categoryRecentAverage: Record<string, number>;
};

function monthKey(period: FinancePeriod) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function transactionMonthKey(transactionDate: string) {
  return transactionDate.slice(0, 7);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function buildCategoryTrend({
  period,
  transactions,
  categories,
}: {
  period: FinancePeriod;
  transactions: DashboardAnalyticsTransaction[];
  categories: DashboardAnalyticsCategory[];
}): CategoryTrendPoint {
  const months = Array.from({ length: 6 }, (_, index) => {
    const value = shiftFinancePeriod(period, index - 5);
    return { monthKey: monthKey(value), year: value.year, month: value.month };
  });
  const monthIndexes = new Map(months.map((item, index) => [item.monthKey, index]));
  const valuesByCategory = new Map<string, number[]>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const index = monthIndexes.get(transactionMonthKey(transaction.transactionDate));
    if (index === undefined) continue;
    const values = valuesByCategory.get(transaction.categoryId) ?? Array.from({ length: 6 }, () => 0);
    values[index] += Number(transaction.amount);
    valuesByCategory.set(transaction.categoryId, values);
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const series = Array.from(valuesByCategory.entries())
    .map(([categoryId, rawValues]) => {
      const category = categoryById.get(categoryId);
      const values = rawValues.map(roundMoney);
      return {
        categoryId,
        categoryName: category?.name ?? 'Uncategorized',
        color: category?.color ?? '#94A3B8',
        total: roundMoney(values.reduce((sum, value) => sum + value, 0)),
        values,
      };
    })
    .sort((a, b) => b.total - a.total || a.categoryName.localeCompare(b.categoryName))
    .slice(0, 5);

  return { months, series };
}

export function buildDashboardComparisons({
  period,
  transactions,
}: {
  period: FinancePeriod;
  transactions: DashboardAnalyticsTransaction[];
}): DashboardComparisons {
  const previousMonth = monthKey(shiftFinancePeriod(period, -1));
  const recentMonths = [monthKey(shiftFinancePeriod(period, -2)), previousMonth];
  const recentMonthSet = new Set(recentMonths);
  const categoryPreviousMonth: Record<string, number> = {};
  const categoryRecentTotals: Record<string, number> = {};
  let previousMonthIncome = 0;
  let previousMonthExpense = 0;
  let recentExpenseTotal = 0;

  for (const transaction of transactions) {
    const key = transactionMonthKey(transaction.transactionDate);
    const amount = Number(transaction.amount);
    if (key === previousMonth) {
      if (transaction.type === 'income') previousMonthIncome += amount;
      if (transaction.type === 'expense') {
        previousMonthExpense += amount;
        categoryPreviousMonth[transaction.categoryId] = (categoryPreviousMonth[transaction.categoryId] ?? 0) + amount;
      }
    }
    if (transaction.type === 'expense' && recentMonthSet.has(key)) {
      recentExpenseTotal += amount;
      categoryRecentTotals[transaction.categoryId] = (categoryRecentTotals[transaction.categoryId] ?? 0) + amount;
    }
  }

  const categoryIds = new Set([
    ...transactions.filter((item) => item.type === 'expense').map((item) => item.categoryId),
    ...Object.keys(categoryPreviousMonth),
  ]);
  const categoryRecentAverage: Record<string, number> = {};
  for (const categoryId of categoryIds) {
    categoryPreviousMonth[categoryId] = roundMoney(categoryPreviousMonth[categoryId] ?? 0);
    categoryRecentAverage[categoryId] = roundMoney((categoryRecentTotals[categoryId] ?? 0) / recentMonths.length);
  }

  return {
    previousMonthIncome: roundMoney(previousMonthIncome),
    previousMonthExpense: roundMoney(previousMonthExpense),
    recentAverageExpense: roundMoney(recentExpenseTotal / recentMonths.length),
    categoryPreviousMonth,
    categoryRecentAverage,
  };
}
