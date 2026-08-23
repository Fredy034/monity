import OpenAI from 'openai';
import { NextResponse } from 'next/server';

import { buildDashboardComparisons } from '@/lib/finance/dashboard-analytics';
import {
  buildAiInsightPayload,
  containsProhibitedAiFields,
  parseAiInsightResponse,
} from '@/lib/finance/ai-insights';
import { financePeriodDateRange, normalizeFinancePeriod, shiftFinancePeriod } from '@/lib/finance/period';
import { jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

type InsightRequest = { year?: unknown; month?: unknown; accountId?: unknown };

export async function POST(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  let body: InsightRequest;
  try {
    body = await readJsonBody<InsightRequest>(request);
  } catch {
    return jsonError(400, 'INVALID_INSIGHT_REQUEST', 'The analysis request is not valid.');
  }

  const fallback = { year: 0, month: 0 };
  const period = normalizeFinancePeriod({ year: Number(body.year), month: Number(body.month) }, fallback);
  if (period.year !== Number(body.year) || period.month !== Number(body.month)) {
    return jsonError(400, 'INVALID_INSIGHT_PERIOD', 'Select a valid month and year.');
  }
  const accountId = typeof body.accountId === 'string' && body.accountId ? body.accountId : null;
  if (body.accountId !== undefined && !accountId) {
    return jsonError(400, 'INVALID_ACCOUNT_SCOPE', 'The selected account is not valid.');
  }

  const { client, session } = auth.ctx;
  const currentRange = financePeriodDateRange(period);
  const comparisonRange = financePeriodDateRange(shiftFinancePeriod(period, -2));

  const [accountsRes, transactionsRes, budgetsRes] = await Promise.all([
    client.database.from('accounts').select('id, currency').eq('user_id', session.user.id),
    client.database
      .from('transactions')
      .select('account_id, category_id, type, amount, transaction_date')
      .eq('user_id', session.user.id)
      .gte('transaction_date', comparisonRange.fromDate)
      .lte('transaction_date', currentRange.toDate),
    client.database
      .from('budgets')
      .select('category_id, limit_amount')
      .eq('user_id', session.user.id)
      .eq('period_month', currentRange.fromDate),
  ]);
  const firstError = accountsRes.error ?? transactionsRes.error ?? budgetsRes.error;
  if (firstError) return jsonError(500, 'INSIGHT_AGGREGATION_FAILED', 'Could not prepare financial aggregates.');

  const accounts = accountsRes.data ?? [];
  if (accountId && !accounts.some((account) => account.id === accountId)) {
    return jsonError(400, 'INVALID_ACCOUNT_SCOPE', 'The selected account does not belong to you.');
  }

  const transactions = (transactionsRes.data ?? [])
    .filter((transaction) => !accountId || transaction.account_id === accountId)
    .map((transaction) => ({
      categoryId: transaction.category_id,
      amount: Number(transaction.amount),
      transactionDate: transaction.transaction_date,
      type: transaction.type as 'income' | 'expense',
    }));
  const currentTransactions = transactions.filter((transaction) =>
    transaction.transactionDate.startsWith(`${period.year}-${String(period.month).padStart(2, '0')}`),
  );
  const comparisons = buildDashboardComparisons({ period, transactions });
  const income = currentTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTransactions = currentTransactions.filter((transaction) => transaction.type === 'expense');
  const expense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const spendingByCategory = new Map<string, number>();
  for (const transaction of expenseTransactions) {
    spendingByCategory.set(transaction.categoryId, (spendingByCategory.get(transaction.categoryId) ?? 0) + transaction.amount);
  }
  const categories = Array.from(spendingByCategory.entries()).map(([categoryId, spent]) => ({
    categoryId,
    categoryName: '',
    spent,
    previousMonth: comparisons.categoryPreviousMonth[categoryId] ?? 0,
    recentAverage: comparisons.categoryRecentAverage[categoryId] ?? 0,
  }));
  const budgets = (budgetsRes.data ?? []).map((budget) => {
    const limit = Number(budget.limit_amount);
    const spent = spendingByCategory.get(budget.category_id) ?? 0;
    return {
      categoryId: budget.category_id,
      categoryName: '',
      limit,
      spent,
      utilizationPercent: limit > 0 ? (spent / limit) * 100 : 0,
    };
  });
  const payload = buildAiInsightPayload({
    period,
    currency: accountId
      ? (accounts.find((account) => account.id === accountId)?.currency ?? 'USD')
      : (accounts[0]?.currency ?? 'USD'),
    totals: { income, expense, net: income - expense },
    categories,
    budgets,
  });
  if (containsProhibitedAiFields(payload)) {
    return jsonError(500, 'INSIGHT_PRIVACY_GUARD_FAILED', 'Could not safely prepare the analysis.');
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return jsonError(503, 'AI_NOT_CONFIGURED', 'Deeper analysis is not configured yet.');

  try {
    const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_CHAT_MODEL ?? 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You provide concise educational personal-finance guidance from anonymous aggregates. Do not claim to be a professional adviser, invent facts, or request identity or transaction details. Return JSON with summary and up to three observations; each observation must contain title, explanation, and action.',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 700,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');
    const result = parseAiInsightResponse(JSON.parse(content));
    return withSessionCookies(NextResponse.json({ data: result }), session);
  } catch {
    return jsonError(502, 'AI_ANALYSIS_FAILED', 'The deeper analysis is temporarily unavailable.');
  }
}
