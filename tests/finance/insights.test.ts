import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDeterministicInsights, type InsightCopy } from '../../lib/finance/insights.ts';

const copy: InsightCopy = {
  budgetExceeded: (category, amount) => ({ title: `${category} exceeded`, description: `Over by ${amount}` }),
  budgetNearLimit: (category, percent) => ({ title: `${category} near limit`, description: `${percent}% used` }),
  negativeNet: (amount) => ({ title: 'Negative net', description: `Net ${amount}` }),
  savingsRate: (percent) => ({ title: 'Savings rate', description: `${percent}% saved` }),
  categoryIncrease: (category, percent) => ({ title: `${category} increased`, description: `${percent}% above average` }),
  healthyBudgets: () => ({ title: 'Budgets healthy', description: 'All tracked budgets are on course' }),
};

test('prioritizes exceeded budgets and negative net and limits the result to three', () => {
  const result = buildDeterministicInsights(
    {
      totals: { income: 100, expense: 160, net: -60 },
      budgets: [
        { categoryId: 'food', categoryName: 'Food', limit: 100, spent: 130, utilizationPercent: 130 },
        { categoryId: 'travel', categoryName: 'Travel', limit: 100, spent: 90, utilizationPercent: 90 },
      ],
      categories: [{ categoryId: 'food', categoryName: 'Food', spent: 130 }],
      categoryRecentAverage: { food: 80 },
    },
    copy,
  );

  assert.equal(result.length, 3);
  assert.equal(result[0].id, 'budget-exceeded-food');
  assert.equal(result[1].id, 'negative-net');
  assert.equal(result[2].id, 'budget-near-travel');
});

test('does not create percentage comparisons when the baseline is zero', () => {
  const result = buildDeterministicInsights(
    {
      totals: { income: 0, expense: 120, net: -120 },
      budgets: [],
      categories: [{ categoryId: 'food', categoryName: 'Food', spent: 120 }],
      categoryRecentAverage: { food: 0 },
    },
    copy,
  );

  assert.equal(result.some((insight) => insight.id === 'category-increase-food'), false);
  assert.equal(result.some((insight) => insight.id === 'savings-rate'), false);
});

test('recognizes a useful savings rate and healthy budgets', () => {
  const result = buildDeterministicInsights(
    {
      totals: { income: 1000, expense: 700, net: 300 },
      budgets: [{ categoryId: 'food', categoryName: 'Food', limit: 500, spent: 200, utilizationPercent: 40 }],
      categories: [{ categoryId: 'food', categoryName: 'Food', spent: 200 }],
      categoryRecentAverage: { food: 190 },
    },
    copy,
  );

  assert.equal(result.some((insight) => insight.id === 'savings-rate'), true);
  assert.equal(result.some((insight) => insight.id === 'healthy-budgets'), true);
});
