'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DashboardCharts, type DashboardChartsPayload } from '@/components/finance/dashboard-charts';
import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { formatMoney } from '@/lib/finance/formatting';
import { useDashboardExport } from '@/lib/finance/use-dashboard-export';
import { useI18n } from '@/lib/i18n/client';

type DashboardPayload = {
  totals: {
    total_balance: number;
    month_income: number;
    month_expense: number;
    month_net: number;
  };
  accounts: Array<{ id: string; name: string; currency: string; current_balance: number }>;
  recent_transactions: Array<{
    id: string;
    account_id: string;
    category_id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string | null;
    transaction_date: string;
  }>;
  spending_by_category: Array<{
    category_id: string;
    category_name: string;
    color: string;
    spent: number;
  }>;
  charts: DashboardChartsPayload;
  budgets: Array<{
    id: string;
    category_name: string;
    limit_amount: number;
    spent: number;
    utilization_percent: number;
    is_exceeded: boolean;
  }>;
};

type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
};

const QUICK_ADD_STORAGE_KEY = 'monity.dashboard.quickAddOpen';

export function DashboardOverview() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const { exportDashboardToPDF } = useDashboardExport();
  const currentYear = new Date().getUTCFullYear();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedAccountScope, setSelectedAccountScope] = useState<string>('all');

  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [quickAddAccountId, setQuickAddAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [hasLoadedQuickAddPreference, setHasLoadedQuickAddPreference] = useState(false);

  const filteredCategories = useMemo(() => categories.filter((item) => item.type === txType), [categories, txType]);
  const defaultCurrency = data?.accounts[0]?.currency ?? 'USD';

  useEffect(() => {
    const stored = window.localStorage.getItem(QUICK_ADD_STORAGE_KEY);
    if (stored === '1') {
      setIsQuickAddOpen(true);
    }

    setHasLoadedQuickAddPreference(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedQuickAddPreference) return;
    window.localStorage.setItem(QUICK_ADD_STORAGE_KEY, isQuickAddOpen ? '1' : '0');
  }, [hasLoadedQuickAddPreference, isQuickAddOpen]);

  const fetchDashboard = useCallback(async () => {
    const query = new URLSearchParams({ year: String(selectedYear) });
    if (selectedAccountScope !== 'all') {
      query.set('accountId', selectedAccountScope);
    }

    const response = await fetch(`/api/dashboard?${query.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('dashboard.loadFailed');
      setError(message);
      addToast({ title: t('dashboard.loadErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setError(null);
    setData(payload.data);

    const nextYear = Number(payload.data?.charts?.selected_year ?? selectedYear);
    if (Number.isFinite(nextYear) && nextYear !== selectedYear) {
      setSelectedYear(nextYear);
    }

    const nextAccount = (payload.data?.charts?.selected_account_id as string | null) ?? 'all';
    if (nextAccount !== selectedAccountScope) {
      setSelectedAccountScope(nextAccount);
    }
  }, [addToast, selectedAccountScope, selectedYear, t]);

  const fetchCategories = useCallback(async () => {
    const response = await fetch('/api/categories');
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('dashboard.loadCategoriesFailed');
      setError(message);
      addToast({ title: t('dashboard.loadCategoriesErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setCategories(payload.data ?? []);
  }, [addToast, t]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchDashboard(), fetchCategories()]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchCategories, fetchDashboard]);

  useEffect(() => {
    if (!quickAddAccountId && data?.accounts[0]?.id) {
      setQuickAddAccountId(data.accounts[0].id);
    }
  }, [data?.accounts, quickAddAccountId]);

  useEffect(() => {
    if (!categoryId && filteredCategories[0]?.id) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [categoryId, filteredCategories]);

  async function onAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const selectedAccount = quickAddAccountId || data?.accounts[0]?.id;
    const selectedCategory = categoryId || filteredCategories[0]?.id;

    if (!selectedAccount || !selectedCategory) {
      const message = t('dashboard.missingDetails');
      setError(message);
      addToast({ title: t('dashboard.missingDetailsTitle'), description: message, variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          accountId: selectedAccount,
          categoryId: selectedCategory,
          amount: Number(amount),
          description,
          transactionDate,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload.message ?? t('dashboard.addFailed');
        setError(message);
        addToast({ title: t('dashboard.saveErrorTitle'), description: message, variant: 'error' });
        return;
      }

      setAmount('0');
      setDescription('');
      addToast({ title: t('dashboard.added'), description: t('dashboard.addedDescription') });
      await fetchDashboard();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExport() {
    setError(null);
    if (!data) {
      return;
    }

    setIsExporting(true);
    try {
      await exportDashboardToPDF({
        data,
        locale,
        t,
      });
      addToast({
        title: t('dashboard.exportSuccessTitle'),
        description: t('dashboard.exportSuccessDescription'),
        variant: 'success',
      });
    } catch (err) {
      console.error('Export failed:', err);
      const message = t('dashboard.exportErrorDescription');
      setError(message);
      addToast({
        title: t('dashboard.exportErrorTitle'),
        description: message,
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }

  if (error) return <p className={financeUi.errorBanner}>{error}</p>;
  if (isLoading || !data)
    return (
      <div className={financeUi.loadingWrap}>
        <span className={financeUi.spinner} />
        <span>{t('dashboard.loading')}</span>
      </div>
    );

  return (
    <div className='space-y-6'>
      <div className={financeUi.formCard}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className={financeUi.sectionTitle}>{t('dashboard.exportTitle')}</h2>
          <button type='button' className={financeUi.secondaryButton} onClick={handleExport} disabled={isExporting}>
            {isExporting ? t('dashboard.exporting') : t('dashboard.exportPDF')}
          </button>
        </div>
      </div>

      <div className='space-y-6'>
        <section className={financeUi.formCard}>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className={financeUi.sectionTitle}>{t('dashboard.quickAdd')}</h2>
            <button
              type='button'
              className={financeUi.secondaryButton}
              onClick={() => setIsQuickAddOpen((value) => !value)}
              aria-expanded={isQuickAddOpen}
            >
              {isQuickAddOpen ? t('dashboard.hideQuickAdd') : t('dashboard.showQuickAdd')}
            </button>
          </div>

          {isQuickAddOpen ? (
            <form className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6' onSubmit={onAddTransaction}>
              <div>
                <label className={financeUi.label}>{t('dashboard.type')}</label>
                <StyledSelect
                  value={txType}
                  onChange={(event) => setTxType(event.target.value as 'income' | 'expense')}
                >
                  <option value='expense'>{t('dashboard.expense')}</option>
                  <option value='income'>{t('dashboard.income')}</option>
                </StyledSelect>
              </div>
              <div>
                <label className={financeUi.label}>{t('dashboard.account')}</label>
                <StyledSelect value={quickAddAccountId} onChange={(event) => setQuickAddAccountId(event.target.value)}>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </StyledSelect>
              </div>
              <div>
                <label className={financeUi.label}>{t('dashboard.category')}</label>
                <StyledSelect value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </StyledSelect>
              </div>
              <div>
                <label className={financeUi.label}>{t('dashboard.amount')}</label>
                <input
                  type='number'
                  step='0.01'
                  className={financeUi.input}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onFocus={() => {
                    if (amount === '0') setAmount('');
                  }}
                  required
                />
              </div>
              <div>
                <label className={financeUi.label}>{t('dashboard.date')}</label>
                <input
                  type='date'
                  className={financeUi.input}
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  required
                />
              </div>
              <div className='flex items-end'>
                <button type='submit' className={`${financeUi.primaryButton} w-full`} disabled={isSubmitting}>
                  {isSubmitting ? t('dashboard.saving') : t('dashboard.add')}
                </button>
              </div>
              <div className='sm:col-span-2 xl:col-span-6'>
                <label className={financeUi.label}>{t('dashboard.description')}</label>
                <input
                  className={financeUi.input}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('dashboard.descriptionPlaceholder')}
                />
              </div>
            </form>
          ) : null}
        </section>

        <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <StatCard
            label={t('dashboard.totalBalance')}
            value={data.totals.total_balance}
            currency={defaultCurrency}
            locale={locale}
            highlight='text-emerald-600'
          />
          <StatCard
            label={t('dashboard.incomeMonth')}
            value={data.totals.month_income}
            currency={defaultCurrency}
            locale={locale}
            highlight='text-cyan-600'
          />
          <StatCard
            label={t('dashboard.expenseMonth')}
            value={data.totals.month_expense}
            currency={defaultCurrency}
            locale={locale}
            highlight='text-rose-600'
          />
          <StatCard
            label={t('dashboard.netMonth')}
            value={data.totals.month_net}
            currency={defaultCurrency}
            locale={locale}
            highlight={data.totals.month_net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
        </section>

        <section className={financeUi.formCard}>
          <div className='flex flex-wrap items-end gap-3'>
            <div className='min-w-45 flex-1'>
              <label className={financeUi.label}>{t('dashboard.periodYear')}</label>
              <StyledSelect
                value={String(selectedYear)}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {(data.charts.available_years.length > 0 ? data.charts.available_years : [selectedYear]).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </StyledSelect>
            </div>
            <div className='min-w-55 flex-[1.4]'>
              <label className={financeUi.label}>{t('dashboard.accountScope')}</label>
              <StyledSelect
                value={selectedAccountScope}
                onChange={(event) => setSelectedAccountScope(event.target.value)}
              >
                <option value='all'>{t('dashboard.allAccounts')}</option>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>
        </section>

        <DashboardCharts
          charts={data.charts}
          locale={locale}
          currency={defaultCurrency}
          copy={{
            income: t('dashboard.income'),
            expenses: t('dashboard.expense'),
            cumulative: t('dashboard.cumulativeBalanceLegend'),
            incomeVsExpensesTitle: t('dashboard.incomeVsExpensesTitle'),
            incomeVsExpensesSubtitle: t('dashboard.incomeVsExpensesSubtitle'),
            cumulativeBalanceTitle: t('dashboard.cumulativeBalanceTitle'),
            cumulativeBalanceSubtitle: t('dashboard.cumulativeBalanceSubtitle'),
            spendingDistributionTitle: t('dashboard.spendingDistributionTitle'),
            spendingDistributionSubtitle: t('dashboard.spendingDistributionSubtitle'),
            expensesByAccountTitle: t('dashboard.expensesByAccountTitle'),
            expensesByAccountSubtitle: t('dashboard.expensesByAccountSubtitle'),
            noFlowData: t('dashboard.noFlowData'),
            noCategoryData: t('dashboard.noCategoryChartData'),
            noAccountExpenseData: t('dashboard.noAccountExpenseChartData'),
          }}
        />

        <section className='grid gap-4 lg:grid-cols-2'>
          <article className='grid grid-cols-1 gap-4'>
            <div className={financeUi.formCard}>
              <h2 className={financeUi.sectionTitle}>{t('dashboard.accountBalances')}</h2>
              <div className='mt-3 space-y-2'>
                {data.accounts.length === 0 ? (
                  <div className={financeUi.emptyState}>{t('dashboard.noAccounts')}</div>
                ) : null}
                {data.accounts.map((item) => (
                  <div key={item.id} className={financeUi.listRow}>
                    <span className='font-medium text-slate-800 dark:text-slate-100'>{item.name}</span>
                    <span className='max-w-full text-right break-all text-emerald-600'>
                      {formatMoney(item.current_balance, { locale, currency: item.currency })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={financeUi.formCard}>
              <h2 className={financeUi.sectionTitle}>{t('dashboard.budgetUsage')}</h2>
              <div className='mt-3 space-y-3'>
                {data.budgets.length === 0 ? (
                  <div className={financeUi.emptyState}>{t('dashboard.noBudgets')}</div>
                ) : null}
                {data.budgets.map((item) => (
                  <div
                    key={item.id}
                    className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/30'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span className='font-medium text-slate-900 dark:text-slate-100'>{item.category_name}</span>
                      <span
                        className={`max-w-full text-right break-all ${item.is_exceeded ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {formatMoney(item.spent, { locale, currency: defaultCurrency })} /{' '}
                        {formatMoney(item.limit_amount, { locale, currency: defaultCurrency })}
                      </span>
                    </div>
                    <div className='mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700'>
                      <div
                        className={
                          item.is_exceeded ? 'h-2 rounded-full bg-rose-500' : 'h-2 rounded-full bg-emerald-500'
                        }
                        style={{ width: `${Math.min(item.utilization_percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className={financeUi.formCard}>
            <h2 className={financeUi.sectionTitle}>{t('dashboard.recentTransactions')}</h2>
            <div className='mt-3 space-y-2'>
              {data.recent_transactions.length === 0 ? (
                <div className={financeUi.emptyState}>{t('dashboard.noRecentTransactions')}</div>
              ) : null}
              {data.recent_transactions.map((item) => (
                <div key={item.id} className={financeUi.listRow}>
                  <div className='min-w-0'>
                    <p className='font-medium text-slate-900 dark:text-slate-100'>
                      {item.description || t('dashboard.noDescription')}
                    </p>
                    <div className='mt-1 flex flex-wrap items-center gap-2'>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>{item.transaction_date}</p>
                      <CategoryBadge
                        category={categories.find((category) => category.id === item.category_id)}
                        fallbackLabel={t('transactions.unknownCategory')}
                      />
                    </div>
                  </div>
                  <span
                    className={`max-w-full text-right break-all ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatMoney(item.amount, {
                      locale,
                      currency:
                        data.accounts.find((account) => account.id === item.account_id)?.currency ?? defaultCurrency,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  currency,
  locale,
  highlight,
}: {
  label: string;
  value: number;
  currency: string;
  locale: string;
  highlight: string;
}) {
  return (
    <article className={`${financeUi.formCard} min-w-0`}>
      <p className='text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400'>{label}</p>
      <p className={`mt-2 max-w-full break-all text-xl font-semibold sm:text-2xl ${highlight}`}>
        {formatMoney(value, { locale, currency })}
      </p>
    </article>
  );
}

function CategoryBadge({ category, fallbackLabel }: { category?: Category; fallbackLabel: string }) {
  return (
    <span
      className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200'
      title={category?.name}
    >
      <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: category?.color ?? '#94A3B8' }} />
      {category?.name ?? fallbackLabel}
    </span>
  );
}
