import type { FinancePeriod } from './period.ts';

type AiInsightAggregateSource = {
  period: FinancePeriod;
  currency: string;
  totals: { income: number; expense: number; net: number };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    spent: number;
    previousMonth: number;
    recentAverage: number;
  }>;
  budgets: Array<{
    categoryId: string;
    categoryName: string;
    limit: number;
    spent: number;
    utilizationPercent: number;
  }>;
};

export type AiInsightPayload = {
  period: { year: number; month: number };
  currency: string;
  totals: { income: number; expense: number; net: number };
  categories: Array<{
    category: string;
    spent: number;
    previousMonth: number;
    recentAverage: number;
  }>;
  budgets: Array<{
    category: string;
    limit: number;
    spent: number;
    utilizationPercent: number;
  }>;
};

export type AiInsightResult = {
  summary: string;
  observations: Array<{ title: string; explanation: string; action: string }>;
};

type AiQuotaClient = {
  database: {
    rpc: (
      functionName: string,
      params: { p_user_id: string },
    ) => PromiseLike<{
      data: Array<{ allowed: boolean; remaining: number; reset_at: string }> | null;
      error: { message: string } | null;
    }>;
  };
};

export async function consumeAiInsightQuota(client: AiQuotaClient, userId: string) {
  const { data, error } = await client.database.rpc('consume_ai_insight_quota', {
    p_user_id: userId,
  });

  if (error) {
    return { allowed: false, remaining: 0, resetAt: null, error: new Error(error.message) };
  }

  const quota = data?.[0];
  if (!quota || typeof quota.allowed !== 'boolean') {
    return { allowed: false, remaining: 0, resetAt: null, error: new Error('Invalid AI quota response.') };
  }

  return {
    allowed: quota.allowed,
    remaining: Number(quota.remaining),
    resetAt: quota.reset_at,
    error: null,
  };
}

const PROHIBITED_KEYS = new Set(
  [
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
  ].map((key) => key.toLowerCase()),
);

function money(value: number) {
  return Number(Number(value).toFixed(2));
}

export function buildAiInsightPayload(source: AiInsightAggregateSource): AiInsightPayload {
  const categoryAliases = new Map<string, string>();
  source.categories.forEach((category, index) => categoryAliases.set(category.categoryId, `category-${index + 1}`));
  for (const budget of source.budgets) {
    if (!categoryAliases.has(budget.categoryId)) {
      categoryAliases.set(budget.categoryId, `category-${categoryAliases.size + 1}`);
    }
  }

  return {
    period: { year: source.period.year, month: source.period.month },
    currency: source.currency.slice(0, 3).toUpperCase(),
    totals: {
      income: money(source.totals.income),
      expense: money(source.totals.expense),
      net: money(source.totals.net),
    },
    categories: source.categories.map((category) => ({
      category: categoryAliases.get(category.categoryId) ?? 'category',
      spent: money(category.spent),
      previousMonth: money(category.previousMonth),
      recentAverage: money(category.recentAverage),
    })),
    budgets: source.budgets.map((budget) => ({
      category: categoryAliases.get(budget.categoryId) ?? 'category',
      limit: money(budget.limit),
      spent: money(budget.spent),
      utilizationPercent: money(budget.utilizationPercent),
    })),
  };
}

export function containsProhibitedAiFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProhibitedAiFields);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, nested]) => PROHIBITED_KEYS.has(key.toLowerCase()) || containsProhibitedAiFields(nested),
  );
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function parseAiInsightResponse(value: unknown): AiInsightResult {
  if (!value || typeof value !== 'object') throw new Error('AI response must include a valid summary.');
  const candidate = value as { summary?: unknown; observations?: unknown };
  const summary = boundedText(candidate.summary, 600);
  if (!summary) throw new Error('AI response must include a valid summary.');
  const observations = Array.isArray(candidate.observations)
    ? candidate.observations
        .slice(0, 3)
        .map((item) => {
          const observation = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          return {
            title: boundedText(observation.title, 300),
            explanation: boundedText(observation.explanation, 300),
            action: boundedText(observation.action, 300),
          };
        })
        .filter((item) => item.title && item.explanation && item.action)
    : [];
  return { summary, observations };
}
