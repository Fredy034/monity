'use client';

import { cloneElement, type ReactElement, useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { financeUi } from '@/components/finance/ui';
import type { CategoryTrendPoint } from '@/lib/finance/dashboard-analytics';
import { formatMonthLabel } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/finance/formatting';

export type DashboardMonthlyFlowPoint = {
  month_index: number;
  month_key: string;
  income: number;
  expense: number;
  net: number;
  cumulative_balance: number;
};

export type DashboardCategorySpendPoint = {
  category_id: string;
  category_name: string;
  color: string;
  spent: number;
  percent: number;
};

export type DashboardAccountExpensePoint = {
  account_id: string;
  account_name: string;
  spent: number;
};

export type DashboardChartsPayload = {
  selected_year: number;
  selected_month: number;
  selected_account_id: string | null;
  available_years: number[];
  monthly_cash_flow: DashboardMonthlyFlowPoint[];
  spending_by_category: DashboardCategorySpendPoint[];
  expenses_by_account: DashboardAccountExpensePoint[];
  category_spending_trend: CategoryTrendPoint;
};

type DashboardChartCopy = {
  income: string;
  expenses: string;
  cumulative: string;
  incomeVsExpensesTitle: string;
  incomeVsExpensesSubtitle: string;
  cumulativeBalanceTitle: string;
  cumulativeBalanceSubtitle: string;
  spendingDistributionTitle: string;
  spendingDistributionSubtitle: string;
  expensesByAccountTitle: string;
  expensesByAccountSubtitle: string;
  noFlowData: string;
  noCategoryData: string;
  noAccountExpenseData: string;
};

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border-light)',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
    color: 'var(--color-text-primary)',
  },
  labelStyle: { color: 'var(--color-text-primary)', fontWeight: 600 },
  itemStyle: { color: 'var(--color-text-secondary)' },
};

type ChartDimension = { width: number; height: number };

function ChartSlot({
  className,
  children,
}: {
  className: string;
  children: ReactElement<{ initialDimension?: ChartDimension }>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [initialDimension, setInitialDimension] = useState<ChartDimension | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setInitialDimension((current) => current ?? { width, height });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {initialDimension ? cloneElement(children, { initialDimension }) : null}
    </div>
  );
}

export function CategorySpendingTrendChart({
  trend,
  locale,
  currency,
  title,
  subtitle,
  emptyText,
}: {
  trend: CategoryTrendPoint;
  locale: string;
  currency: string;
  title: string;
  subtitle: string;
  emptyText: string;
}) {
  const rows = trend.months.map((month, index) => {
    const row: Record<string, string | number> = {
      month: `${formatMonthLabel(month.month, locale)} ${String(month.year).slice(-2)}`,
    };
    for (const series of trend.series) row[series.categoryId] = series.values[index] ?? 0;
    return row;
  });
  const hasData = trend.series.some((series) => series.total > 0);

  return (
    <article className={`${financeUi.formCard} min-w-0`}>
      <header className='mb-3'>
        <h2 className={financeUi.sectionTitle}>{title}</h2>
        <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{subtitle}</p>
      </header>
      {hasData ? (
        <ChartSlot className='h-72 min-w-0'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
              <XAxis dataKey='month' tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(value) => compactMoney(value)} />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value: unknown) => formatMoney(Number(value), { locale, currency })}
              />
              <Legend />
              {trend.series.map((series) => (
                <Line
                  key={series.categoryId}
                  type='monotone'
                  dataKey={series.categoryId}
                  name={series.categoryName}
                  stroke={series.color}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartSlot>
      ) : (
        <div className={financeUi.emptyState}>{emptyText}</div>
      )}
    </article>
  );
}

export function DashboardCharts({
  charts,
  locale,
  currency,
  copy,
}: {
  charts: DashboardChartsPayload;
  locale: string;
  currency: string;
  copy: DashboardChartCopy;
}) {
  const monthlyData = charts.monthly_cash_flow.map((item) => ({
    ...item,
    month_label: formatMonthLabel(item.month_index, locale),
  }));

  const hasFlowData = monthlyData.some((item) => item.income > 0 || item.expense > 0);
  const hasCategoryData = charts.spending_by_category.some((item) => item.spent > 0);
  const hasAccountExpenseData = charts.expenses_by_account.some((item) => item.spent > 0);

  return (
    <section className='grid gap-4 xl:grid-cols-2'>
      <article className={`${financeUi.formCard} min-w-0`}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.incomeVsExpensesTitle}</h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{copy.incomeVsExpensesSubtitle}</p>
        </header>

        {hasFlowData ? (
          <ChartSlot className='h-72 min-w-0'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={monthlyData} barGap={6}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
                <XAxis dataKey='month_label' tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(value) => compactMoney(value)} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: unknown) => formatMoney(Number(value), { locale, currency })}
                  labelFormatter={(label) => `${label} ${charts.selected_year}`}
                />
                <Legend />
                <Bar dataKey='income' name={copy.income} radius={[8, 8, 0, 0]} fill='#0891b2' />
                <Bar dataKey='expense' name={copy.expenses} radius={[8, 8, 0, 0]} fill='#e11d48' />
              </BarChart>
            </ResponsiveContainer>
          </ChartSlot>
        ) : (
          <div className={financeUi.emptyState}>{copy.noFlowData}</div>
        )}
      </article>

      <article className={`${financeUi.formCard} min-w-0`}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.cumulativeBalanceTitle}</h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{copy.cumulativeBalanceSubtitle}</p>
        </header>

        {hasFlowData ? (
          <ChartSlot className='h-72 min-w-0'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id='monityCumulativeFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#10b981' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#10b981' stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
                <XAxis dataKey='month_label' tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(value) => compactMoney(value)} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: unknown) => formatMoney(Number(value), { locale, currency })}
                  labelFormatter={(label) => `${label} ${charts.selected_year}`}
                />
                <Area
                  type='monotone'
                  dataKey='cumulative_balance'
                  name={copy.cumulative}
                  stroke='#059669'
                  strokeWidth={2.5}
                  fill='url(#monityCumulativeFill)'
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartSlot>
        ) : (
          <div className={financeUi.emptyState}>{copy.noFlowData}</div>
        )}
      </article>

      <article className={`${financeUi.formCard} min-w-0`}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.spendingDistributionTitle}</h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{copy.spendingDistributionSubtitle}</p>
        </header>

        {hasCategoryData ? (
          <div className='flex min-w-0 flex-col gap-4 md:h-72 md:flex-row md:items-center md:gap-5'>
            {/* Chart Container - Fixed size, vertically centered on desktop */}
            <ChartSlot className='mx-auto h-56 w-56 shrink-0 md:h-64 md:w-56'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={charts.spending_by_category}
                    dataKey='spent'
                    nameKey='category_name'
                    cx='50%'
                    cy='50%'
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {charts.spending_by_category.map((entry) => (
                      <Cell key={entry.category_id} fill={entry.color || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...chartTooltipProps}
                    formatter={(value: unknown) => formatMoney(Number(value), { locale, currency })}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartSlot>

            <div className='w-full flex-1 space-y-2 pr-2 md:max-h-full md:overflow-y-auto md:pl-1 custom-scrollbar'>
              {charts.spending_by_category.map((item) => (
                <div
                  key={item.category_id}
                  className='flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-linear-to-r from-white to-slate-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:from-slate-800/70 dark:to-slate-800/45 sm:flex-row sm:items-center sm:justify-between'
                >
                  <span className='shrink-0 flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300'>
                    <div className='flex w-full items-start justify-between gap-2'>
                      <span className='flex min-w-0 flex-1 items-start gap-1'>
                        <span className='mt-1 h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: item.color }} />
                        <span
                          className='min-w-0 wrap-break-words leading-snug text-xs text-left'
                          title={item.category_name}
                        >
                          {item.category_name}
                        </span>
                      </span>

                      <span className='shrink-0 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400'>
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                    <span className='font-semibold text-amber-600'>
                      {formatMoney(item.spent, { locale, currency })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={financeUi.emptyState}>{copy.noCategoryData}</div>
        )}
      </article>

      <article className={`${financeUi.formCard} min-w-0`}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.expensesByAccountTitle}</h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{copy.expensesByAccountSubtitle}</p>
        </header>

        {hasAccountExpenseData ? (
          <ChartSlot className='h-72 min-w-0'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={charts.expenses_by_account} layout='vertical' margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' horizontal={false} />
                <XAxis
                  type='number'
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={(value) => compactMoney(value)}
                />
                <YAxis
                  dataKey='account_name'
                  type='category'
                  width={120}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: unknown) => formatMoney(Number(value), { locale, currency })}
                />
                <Bar dataKey='spent' name={copy.expenses} radius={[0, 8, 8, 0]} fill='#f97316' />
              </BarChart>
            </ResponsiveContainer>
          </ChartSlot>
        ) : (
          <div className={financeUi.emptyState}>{copy.noAccountExpenseData}</div>
        )}
      </article>
    </section>
  );
}

function compactMoney(value: number) {
  if (Math.abs(value) < 1000) return `${Math.round(value)}`;
  if (Math.abs(value) < 1000000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1000000).toFixed(1)}m`;
}
