export type DeterministicInsight = {
  id: string;
  severity: 'positive' | 'info' | 'warning';
  title: string;
  description: string;
  action?: string;
};

type InsightText = { title: string; description: string; action?: string };

export type InsightCopy = {
  budgetExceeded: (category: string, amount: number) => InsightText;
  budgetNearLimit: (category: string, percent: number) => InsightText;
  negativeNet: (amount: number) => InsightText;
  savingsRate: (percent: number) => InsightText;
  categoryIncrease: (category: string, percent: number) => InsightText;
  healthyBudgets: () => InsightText;
};

export type DeterministicInsightInput = {
  totals: { income: number; expense: number; net: number };
  budgets: Array<{
    categoryId: string;
    categoryName: string;
    limit: number;
    spent: number;
    utilizationPercent: number;
  }>;
  categories: Array<{ categoryId: string; categoryName: string; spent: number }>;
  categoryRecentAverage: Record<string, number>;
};

type RankedInsight = DeterministicInsight & { priority: number };

function ranked(id: string, severity: DeterministicInsight['severity'], priority: number, text: InsightText): RankedInsight {
  return { id, severity, priority, ...text };
}

export function buildDeterministicInsights(
  input: DeterministicInsightInput,
  copy: InsightCopy,
): DeterministicInsight[] {
  const insights: RankedInsight[] = [];

  for (const budget of input.budgets) {
    if (budget.spent > budget.limit) {
      insights.push(
        ranked(
          `budget-exceeded-${budget.categoryId}`,
          'warning',
          100,
          copy.budgetExceeded(budget.categoryName, Number((budget.spent - budget.limit).toFixed(2))),
        ),
      );
    } else if (budget.utilizationPercent >= 80) {
      insights.push(
        ranked(
          `budget-near-${budget.categoryId}`,
          'warning',
          80,
          copy.budgetNearLimit(budget.categoryName, Math.round(budget.utilizationPercent)),
        ),
      );
    }
  }

  if (input.totals.net < 0) {
    insights.push(ranked('negative-net', 'warning', 90, copy.negativeNet(Number(Math.abs(input.totals.net).toFixed(2)))));
  }

  for (const category of input.categories) {
    const baseline = input.categoryRecentAverage[category.categoryId] ?? 0;
    if (baseline <= 0 || category.spent <= baseline * 1.15) continue;
    const percent = Math.round(((category.spent - baseline) / baseline) * 100);
    insights.push(
      ranked(
        `category-increase-${category.categoryId}`,
        'info',
        70,
        copy.categoryIncrease(category.categoryName, percent),
      ),
    );
  }

  if (input.totals.income > 0 && input.totals.net > 0) {
    const percent = Math.round((input.totals.net / input.totals.income) * 100);
    insights.push(ranked('savings-rate', 'positive', 50, copy.savingsRate(percent)));
  }

  if (input.budgets.length > 0 && input.budgets.every((budget) => budget.utilizationPercent < 80)) {
    insights.push(ranked('healthy-budgets', 'positive', 40, copy.healthyBudgets()));
  }

  return insights
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((insight) => ({
      id: insight.id,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      action: insight.action,
    }));
}
