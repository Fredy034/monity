'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';

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
};

export function DashboardOverview() {
  const { addToast } = useToast();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = useMemo(() => categories.filter((item) => item.type === txType), [categories, txType]);

  const fetchDashboard = useCallback(async () => {
    const response = await fetch('/api/dashboard');
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? 'Failed to load dashboard data.';
      setError(message);
      addToast({ title: 'Could not load dashboard', description: message, variant: 'error' });
      return;
    }

    setData(payload.data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const response = await fetch('/api/categories');
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? 'Failed to load categories.';
      setError(message);
      addToast({ title: 'Could not load categories', description: message, variant: 'error' });
      return;
    }

    setCategories(payload.data ?? []);
  }, []);

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
    if (!accountId && data?.accounts[0]?.id) {
      setAccountId(data.accounts[0].id);
    }
  }, [accountId, data?.accounts]);

  useEffect(() => {
    if (!categoryId && filteredCategories[0]?.id) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [categoryId, filteredCategories]);

  async function onAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const selectedAccount = accountId || data?.accounts[0]?.id;
    const selectedCategory = categoryId || filteredCategories[0]?.id;

    if (!selectedAccount || !selectedCategory) {
      const message = 'Please select an account and category before adding a transaction.';
      setError(message);
      addToast({ title: 'Missing transaction details', description: message, variant: 'error' });
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
        const message = payload.message ?? 'Failed to add transaction.';
        setError(message);
        addToast({ title: 'Transaction save failed', description: message, variant: 'error' });
        return;
      }

      setAmount('0');
      setDescription('');
      addToast({ title: 'Transaction added', description: 'Dashboard metrics were refreshed.' });
      await fetchDashboard();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) return <p className={financeUi.errorBanner}>{error}</p>;
  if (isLoading || !data)
    return (
      <div className={financeUi.loadingWrap}>
        <span className={financeUi.spinner} />
        <span>Loading dashboard data...</span>
      </div>
    );

  return (
    <div className='space-y-6'>
      <section className={financeUi.formCard}>
        <h2 className={financeUi.sectionTitle}>Quick add transaction</h2>
        <form className='mt-3 grid gap-3 md:grid-cols-6' onSubmit={onAddTransaction}>
          <div>
            <label className={financeUi.label}>Type</label>
            <StyledSelect value={txType} onChange={(event) => setTxType(event.target.value as 'income' | 'expense')}>
              <option value='expense'>Expense</option>
              <option value='income'>Income</option>
            </StyledSelect>
          </div>
          <div>
            <label className={financeUi.label}>Account</label>
            <StyledSelect value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <label className={financeUi.label}>Category</label>
            <StyledSelect value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </StyledSelect>
          </div>
          <div>
            <label className={financeUi.label}>Amount</label>
            <input
              type='number'
              step='0.01'
              className={financeUi.input}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <div>
            <label className={financeUi.label}>Date</label>
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
              {isSubmitting ? 'Saving...' : 'Add'}
            </button>
          </div>
          <div className='md:col-span-6'>
            <label className={financeUi.label}>Description</label>
            <input
              className={financeUi.input}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='Optional note'
            />
          </div>
        </form>
      </section>

      <section className='grid gap-4 md:grid-cols-4'>
        <StatCard label='Total balance' value={data.totals.total_balance} highlight='text-emerald-600' />
        <StatCard label='Income (month)' value={data.totals.month_income} highlight='text-cyan-600' />
        <StatCard label='Expense (month)' value={data.totals.month_expense} highlight='text-rose-600' />
        <StatCard
          label='Net (month)'
          value={data.totals.month_net}
          highlight={data.totals.month_net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </section>

      <section className='grid gap-4 lg:grid-cols-2'>
        <div className={financeUi.formCard}>
          <h2 className={financeUi.sectionTitle}>Account balances</h2>
          <div className='mt-3 space-y-2'>
            {data.accounts.length === 0 ? <div className={financeUi.emptyState}>No accounts available yet.</div> : null}
            {data.accounts.map((item) => (
              <div key={item.id} className={financeUi.listRow}>
                <span className='font-medium text-slate-800'>{item.name}</span>
                <span className='text-emerald-600'>
                  {item.current_balance.toFixed(2)} {item.currency}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={financeUi.formCard}>
          <h2 className={financeUi.sectionTitle}>Recent transactions</h2>
          <div className='mt-3 space-y-2'>
            {data.recent_transactions.length === 0 ? (
              <div className={financeUi.emptyState}>No recent transactions to show.</div>
            ) : null}
            {data.recent_transactions.map((item) => (
              <div key={item.id} className={financeUi.listRow}>
                <div>
                  <p className='font-medium text-slate-900'>{item.description || 'No description'}</p>
                  <p className='text-xs text-slate-500'>{item.transaction_date}</p>
                </div>
                <span className={item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                  {item.type === 'income' ? '+' : '-'}
                  {item.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='grid gap-4 lg:grid-cols-2'>
        <div className={financeUi.formCard}>
          <h2 className={financeUi.sectionTitle}>Spending by category</h2>
          <div className='mt-3 space-y-2'>
            {data.spending_by_category.length === 0 ? (
              <div className={financeUi.emptyState}>No spending data for this month.</div>
            ) : null}
            {data.spending_by_category.map((item) => (
              <div key={item.category_id} className={financeUi.listRow}>
                <span className='inline-flex items-center gap-2 text-slate-800'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: item.color }} />
                  {item.category_name}
                </span>
                <span className='font-semibold text-amber-600'>{item.spent.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={financeUi.formCard}>
          <h2 className={financeUi.sectionTitle}>Budget usage</h2>
          <div className='mt-3 space-y-3'>
            {data.budgets.length === 0 ? (
              <div className={financeUi.emptyState}>No budgets set for this month.</div>
            ) : null}
            {data.budgets.map((item) => (
              <div key={item.id} className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-slate-900'>{item.category_name}</span>
                  <span className={item.is_exceeded ? 'text-rose-600' : 'text-emerald-600'}>
                    {item.spent.toFixed(2)} / {item.limit_amount.toFixed(2)}
                  </span>
                </div>
                <div className='mt-2 h-2 rounded-full bg-slate-200'>
                  <div
                    className={item.is_exceeded ? 'h-2 rounded-full bg-rose-500' : 'h-2 rounded-full bg-emerald-500'}
                    style={{ width: `${Math.min(item.utilization_percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight: string }) {
  return (
    <article className={financeUi.formCard}>
      <p className='text-xs uppercase tracking-[0.12em] text-slate-500'>{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlight}`}>{value.toFixed(2)}</p>
    </article>
  );
}
