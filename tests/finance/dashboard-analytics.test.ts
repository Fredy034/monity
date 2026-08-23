import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCategoryTrend, buildDashboardComparisons } from '../../lib/finance/dashboard-analytics.ts';

const categories = [
  { id: 'food', name: 'Food', color: '#06b6d4' },
  { id: 'housing', name: 'Housing', color: '#f59e0b' },
];

test('builds a zero-filled six-month category trend across a year boundary', () => {
  const result = buildCategoryTrend({
    period: { year: 2026, month: 2 },
    transactions: [
      { categoryId: 'food', amount: 80, transactionDate: '2025-11-03', type: 'expense' },
      { categoryId: 'food', amount: 100, transactionDate: '2026-02-02', type: 'expense' },
      { categoryId: 'food', amount: 500, transactionDate: '2026-02-07', type: 'income' },
    ],
    categories,
  });

  assert.deepEqual(
    result.months.map((item) => item.monthKey),
    ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'],
  );
  assert.deepEqual(result.series[0].values, [0, 0, 80, 0, 0, 100]);
  assert.equal(result.series[0].total, 180);
});

test('ranks categories by expense total and caps the trend at five series', () => {
  const rankedCategories = Array.from({ length: 6 }, (_, index) => ({
    id: `category-${index}`,
    name: `Category ${index}`,
    color: '#94a3b8',
  }));
  const transactions = rankedCategories.map((category, index) => ({
    categoryId: category.id,
    amount: index + 1,
    transactionDate: '2026-08-01',
    type: 'expense' as const,
  }));

  const result = buildCategoryTrend({ period: { year: 2026, month: 8 }, transactions, categories: rankedCategories });

  assert.equal(result.series.length, 5);
  assert.deepEqual(result.series.map((series) => series.total), [6, 5, 4, 3, 2]);
});

test('calculates previous-month and recent-average comparisons without dividing by zero', () => {
  const result = buildDashboardComparisons({
    period: { year: 2026, month: 3 },
    transactions: [
      { categoryId: 'food', amount: 90, transactionDate: '2026-01-04', type: 'expense' },
      { categoryId: 'food', amount: 120, transactionDate: '2026-03-04', type: 'expense' },
      { categoryId: 'income', amount: 400, transactionDate: '2026-03-01', type: 'income' },
    ],
  });

  assert.equal(result.previousMonthExpense, 0);
  assert.equal(result.previousMonthIncome, 0);
  assert.equal(result.recentAverageExpense, 45);
  assert.equal(result.categoryPreviousMonth.food, 0);
  assert.equal(result.categoryRecentAverage.food, 45);
});
