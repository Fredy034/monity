'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { financeUi } from '@/components/finance/ui';
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
  selected_account_id: string | null;
  available_years: number[];
  monthly_cash_flow: DashboardMonthlyFlowPoint[];
  spending_by_category: DashboardCategorySpendPoint[];
  expenses_by_account: DashboardAccountExpensePoint[];
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
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  const monthlyData = charts.monthly_cash_flow.map((item) => ({
    ...item,
    month_label: monthFormatter.format(new Date(Date.UTC(charts.selected_year, Math.max(item.month_index - 1, 0), 1))),
  }));

  const hasFlowData = monthlyData.some((item) => item.income > 0 || item.expense > 0);
  const hasCategoryData = charts.spending_by_category.some((item) => item.spent > 0);
  const hasAccountExpenseData = charts.expenses_by_account.some((item) => item.spent > 0);

  return (
    <section className='grid gap-4 xl:grid-cols-2'>
      <article className={financeUi.formCard}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.incomeVsExpensesTitle}</h2>
          <p className='mt-1 text-sm text-slate-500'>{copy.incomeVsExpensesSubtitle}</p>
        </header>

        {hasFlowData ? (
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={monthlyData} barGap={6}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
                <XAxis dataKey='month_label' tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(value) => compactMoney(value)} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value, { locale, currency })}
                  labelFormatter={(label) => `${label} ${charts.selected_year}`}
                />
                <Legend />
                <Bar dataKey='income' name={copy.income} radius={[8, 8, 0, 0]} fill='#0891b2' />
                <Bar dataKey='expense' name={copy.expenses} radius={[8, 8, 0, 0]} fill='#e11d48' />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={financeUi.emptyState}>{copy.noFlowData}</div>
        )}
      </article>

      <article className={financeUi.formCard}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.cumulativeBalanceTitle}</h2>
          <p className='mt-1 text-sm text-slate-500'>{copy.cumulativeBalanceSubtitle}</p>
        </header>

        {hasFlowData ? (
          <div className='h-72'>
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
                  formatter={(value: number) => formatMoney(value, { locale, currency })}
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
          </div>
        ) : (
          <div className={financeUi.emptyState}>{copy.noFlowData}</div>
        )}
      </article>

      <article className={financeUi.formCard}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.spendingDistributionTitle}</h2>
          <p className='mt-1 text-sm text-slate-500'>{copy.spendingDistributionSubtitle}</p>
        </header>

        {hasCategoryData ? (
          <div className='flex flex-col gap-4 md:h-72 md:flex-row md:items-center'>
            {/* Chart Container - Fixed size, vertically centered on desktop */}
            <div className='mx-auto h-56 w-full max-w-[220px] shrink-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={charts.spending_by_category}
                    dataKey='spent'
                    nameKey='category_name'
                    cx='50%'
                    cy='50%'
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {charts.spending_by_category.map((entry) => (
                      <Cell key={entry.category_id} fill={entry.color || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatMoney(value, { locale, currency })} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Scrollable Legend Container */}
            <div className='w-full flex-1 space-y-2 pr-2 md:max-h-full md:overflow-y-auto custom-scrollbar'>
              {charts.spending_by_category.map((item) => (
                <div key={item.category_id} className={financeUi.listRow}>
                  <span className='inline-flex min-w-0 items-center gap-2 text-slate-800'>
                    <span className='h-2.5 w-2.5 shrink-0 rounded-full' style={{ backgroundColor: item.color }} />
                    <span className='truncate' title={item.category_name}>
                      {item.category_name}
                    </span>
                  </span>
                  <span className='shrink-0 text-right'>
                    <span className='block text-xs text-slate-500'>{item.percent.toFixed(1)}%</span>
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

      <article className={financeUi.formCard}>
        <header className='mb-3'>
          <h2 className={financeUi.sectionTitle}>{copy.expensesByAccountTitle}</h2>
          <p className='mt-1 text-sm text-slate-500'>{copy.expensesByAccountSubtitle}</p>
        </header>

        {hasAccountExpenseData ? (
          <div className='h-72'>
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
                  width={92}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  interval={0}
                />
                <Tooltip formatter={(value: number) => formatMoney(value, { locale, currency })} />
                <Bar dataKey='spent' name={copy.expenses} radius={[0, 8, 8, 0]} fill='#f97316' />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
