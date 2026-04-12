'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';

type Budget = {
  id: string;
  category_id: string;
  period_month: string;
  limit_amount: number;
};

type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

function currentMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function BudgetsManager() {
  const { addToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periodMonth, setPeriodMonth] = useState(currentMonthStart());
  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const expenseCategories = useMemo(() => categories.filter((item) => item.type === 'expense'), [categories]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesRes, budgetsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/budgets?periodMonth=${periodMonth}`),
      ]);

      const [categoriesPayload, budgetsPayload] = await Promise.all([categoriesRes.json(), budgetsRes.json()]);

      if (!categoriesRes.ok || !budgetsRes.ok) {
        const message = categoriesPayload.message ?? budgetsPayload.message ?? 'Failed to load budgets.';
        setError(message);
        addToast({ title: 'Could not load budgets', description: message, variant: 'error' });
        return;
      }

      const categoryData = categoriesPayload.data ?? [];
      setCategories(categoryData);
      setBudgets(budgetsPayload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [periodMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedCategoryId = categoryId || expenseCategories[0]?.id;
    if (!selectedCategoryId) {
      const message = 'Please create an expense category first.';
      setError(message);
      addToast({ title: 'Category required', description: message, variant: 'error' });
      return;
    }

    const response = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: selectedCategoryId, periodMonth, limitAmount: Number(limitAmount) }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? 'Failed to save budget.';
      setError(message);
      addToast({ title: 'Budget save failed', description: message, variant: 'error' });
      return;
    }

    addToast({ title: 'Budget saved', description: 'Your monthly budget has been updated.' });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? 'Failed to delete budget.';
      setError(message);
      addToast({ title: 'Budget deletion failed', description: message, variant: 'error' });
      return;
    }

    addToast({ title: 'Budget deleted', description: 'The budget was removed.' });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 md:grid-cols-4`} onSubmit={onSave}>
        <div>
          <label className={financeUi.label}>Month</label>
          <input
            type='date'
            className={financeUi.input}
            value={periodMonth}
            onChange={(event) => setPeriodMonth(event.target.value)}
          />
        </div>
        <div>
          <label className={financeUi.label}>Category</label>
          <StyledSelect
            value={categoryId || expenseCategories[0]?.id || ''}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>Limit amount</label>
          <input
            type='number'
            step='0.01'
            className={financeUi.input}
            value={limitAmount}
            onChange={(event) => setLimitAmount(event.target.value)}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            Save budget
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>Loading budgets...</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && budgets.length === 0 ? (
          <div className={financeUi.emptyState}>No budgets yet. Create a monthly limit to start tracking spending.</div>
        ) : null}
        {budgets.map((budget) => {
          const category = categories.find((item) => item.id === budget.category_id);
          return (
            <article key={budget.id} className={`${financeUi.listCard} flex items-center justify-between`}>
              <div>
                <p className='font-semibold text-slate-900'>{category?.name ?? 'Unknown category'}</p>
                <p className='text-sm text-slate-600'>{budget.period_month}</p>
              </div>
              <div className='flex items-center gap-4'>
                <p className='font-semibold text-amber-600'>{budget.limit_amount.toFixed(2)}</p>
                <button type='button' className={financeUi.dangerButton} onClick={() => onDelete(budget.id)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
