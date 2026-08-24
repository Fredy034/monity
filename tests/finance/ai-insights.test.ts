import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAiInsightPayload,
  containsProhibitedAiFields,
  parseAiInsightResponse,
} from '../../lib/finance/ai-insights.ts';
import * as aiInsights from '../../lib/finance/ai-insights.ts';

test('builds an anonymized allowlisted AI payload', () => {
  const source = {
    period: { year: 2026, month: 8 },
    currency: 'USD',
    totals: { income: 5000, expense: 3200, net: 1800 },
    categories: [
      { categoryId: 'private-category-id', categoryName: 'Sensitive custom name', spent: 900, previousMonth: 700, recentAverage: 650 },
    ],
    budgets: [{ categoryId: 'private-category-id', categoryName: 'Sensitive custom name', limit: 800, spent: 900, utilizationPercent: 112.5 }],
  };

  const payload = buildAiInsightPayload(source);
  const serialized = JSON.stringify(payload);

  assert.equal(serialized.includes('private-category-id'), false);
  assert.equal(serialized.includes('Sensitive custom name'), false);
  assert.equal(payload.categories[0].category, 'category-1');
  assert.equal(payload.budgets[0].category, 'category-1');
  assert.equal(containsProhibitedAiFields(payload), false);
});

test('detects prohibited identity, account, transaction, and session fields recursively', () => {
  for (const key of [
    'description',
    'transactionId',
    'accountId',
    'accountName',
    'userId',
    'email',
    'displayName',
    'avatarUrl',
    'accessToken',
    'refreshToken',
  ]) {
    assert.equal(containsProhibitedAiFields({ safe: { [key]: 'secret' } }), true, key);
  }
});

test('validates and bounds structured AI output', () => {
  const parsed = parseAiInsightResponse({
    summary: 'A'.repeat(700),
    observations: Array.from({ length: 5 }, (_, index) => ({
      title: `Observation ${index}`,
      explanation: 'E'.repeat(350),
      action: 'A'.repeat(350),
    })),
  });

  assert.equal(parsed.summary.length, 600);
  assert.equal(parsed.observations.length, 3);
  assert.equal(parsed.observations[0].explanation.length, 300);
  assert.equal(parsed.observations[0].action.length, 300);
});

test('rejects malformed AI output', () => {
  assert.throws(() => parseAiInsightResponse({ summary: '', observations: [] }), /valid summary/i);
});

test('denies AI analysis when the durable quota RPC rejects the request', async () => {
  const consumeAiInsightQuota = (aiInsights as Record<string, unknown>).consumeAiInsightQuota;
  assert.equal(typeof consumeAiInsightQuota, 'function');

  const calls: Array<{ functionName: string; params: Record<string, unknown> }> = [];
  const client = {
    database: {
      rpc: async (functionName: string, params: Record<string, unknown>) => {
        calls.push({ functionName, params });
        return {
          data: [{ allowed: false, remaining: 0, reset_at: '2026-08-24T02:00:00.000Z' }],
          error: null,
        };
      },
    },
  };

  const result = await (consumeAiInsightQuota as (client: unknown, userId: string) => Promise<unknown>)(client, 'user-1');

  assert.deepEqual(calls, [
    {
      functionName: 'consume_ai_insight_quota',
      params: { p_user_id: 'user-1' },
    },
  ]);
  assert.deepEqual(result, {
    allowed: false,
    remaining: 0,
    resetAt: '2026-08-24T02:00:00.000Z',
    error: null,
  });
});

test('preserves an allowed AI quota result for normal requests', async () => {
  const consumeAiInsightQuota = (aiInsights as Record<string, unknown>).consumeAiInsightQuota;
  assert.equal(typeof consumeAiInsightQuota, 'function');

  const client = {
    database: {
      rpc: async () => ({
        data: [{ allowed: true, remaining: 9, reset_at: '2026-08-24T02:00:00.000Z' }],
        error: null,
      }),
    },
  };

  const result = await (consumeAiInsightQuota as (client: unknown, userId: string) => Promise<unknown>)(client, 'user-1');
  assert.deepEqual(result, {
    allowed: true,
    remaining: 9,
    resetAt: '2026-08-24T02:00:00.000Z',
    error: null,
  });
});
