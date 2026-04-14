'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { formatMoney } from '@/lib/finance/formatting';
import { useI18n } from '@/lib/i18n/client';

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
  const { t, locale } = useI18n();
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
        const message = categoriesPayload.message ?? budgetsPayload.message ?? t('budgets.loadFailed');
        setError(message);
        addToast({ title: t('budgets.loadErrorTitle'), description: message, variant: 'error' });
        return;
      }

      const categoryData = categoriesPayload.data ?? [];
      setCategories(categoryData);
      setBudgets(budgetsPayload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, periodMonth, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedCategoryId = categoryId || expenseCategories[0]?.id;
    if (!selectedCategoryId) {
      const message = t('budgets.createCategoryFirst');
      setError(message);
      addToast({ title: t('budgets.categoryRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    const response = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: selectedCategoryId, periodMonth, limitAmount: Number(limitAmount) }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('budgets.saveFailed');
      setError(message);
      addToast({ title: t('budgets.saveErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({ title: t('budgets.saveSuccessTitle'), description: t('budgets.saveSuccessText') });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? t('budgets.deleteFailed');
      setError(message);
      addToast({ title: t('budgets.deleteErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({ title: t('budgets.deleteSuccessTitle'), description: t('budgets.deleteSuccessText') });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`} onSubmit={onSave}>
        <div>
          <label className={financeUi.label}>{t('budgets.month')}</label>
          <input
            type='date'
            className={financeUi.input}
            value={periodMonth}
            onChange={(event) => setPeriodMonth(event.target.value)}
          />
        </div>
        <div>
          <label className={financeUi.label}>{t('budgets.category')}</label>
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
          <label className={financeUi.label}>{t('budgets.limitAmount')}</label>
          <input
            type='number'
            step='0.01'
            className={financeUi.input}
            value={limitAmount}
            onChange={(event) => setLimitAmount(event.target.value)}
            onFocus={() => {
              if (limitAmount === '0') setLimitAmount('');
            }}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            {t('budgets.save')}
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('budgets.loading')}</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && budgets.length === 0 ? <div className={financeUi.emptyState}>{t('budgets.empty')}</div> : null}
        {budgets.map((budget) => {
          const category = categories.find((item) => item.id === budget.category_id);
          return (
            <article
              key={budget.id}
              className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className='min-w-0'>
                <p className='font-semibold text-slate-900'>{category?.name ?? t('budgets.unknownCategory')}</p>
                <p className='text-sm text-slate-600'>{budget.period_month}</p>
              </div>
              <div className='flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start'>
                <p className='font-semibold text-amber-600'>{formatMoney(budget.limit_amount, { locale })}</p>
                <button
                  type='button'
                  className={`${financeUi.dangerButton} w-full sm:w-auto`}
                  onClick={() => onDelete(budget.id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
