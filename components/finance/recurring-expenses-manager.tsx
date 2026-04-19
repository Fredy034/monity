'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { formatMoney } from '@/lib/finance/formatting';
import { useI18n } from '@/lib/i18n/client';

type Account = { id: string; name: string; currency: string; is_active: boolean };
type Category = { id: string; name: string; type: 'income' | 'expense' };

type AmountHistory = {
  amount: number;
  effective_from: string;
  created_at: string;
};

type RecurringExpense = {
  id: string;
  name: string;
  account_id: string;
  category_id: string;
  frequency: 'monthly';
  start_date: string;
  is_active: boolean;
  current_amount: number | null;
  next_charge_date: string | null;
  last_generated_date: string | null;
  amount_history: AmountHistory[];
};

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringExpensesManager() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<RecurringExpense[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(todayDateOnly());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('0');
  const [editAmountEffectiveFrom, setEditAmountEffectiveFrom] = useState(todayDateOnly());
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editStartDate, setEditStartDate] = useState(todayDateOnly());
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const expenseCategories = useMemo(() => categories.filter((item) => item.type === 'expense'), [categories]);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [accountsRes, categoriesRes, recurringRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/recurring-expenses'),
      ]);

      const [accountsPayload, categoriesPayload, recurringPayload] = await Promise.all([
        accountsRes.json(),
        categoriesRes.json(),
        recurringRes.json(),
      ]);

      if (!accountsRes.ok || !categoriesRes.ok || !recurringRes.ok) {
        const message =
          accountsPayload.message ?? categoriesPayload.message ?? recurringPayload.message ?? t('recurring.loadFailed');
        setError(message);
        addToast({ title: t('recurring.loadErrorTitle'), description: message, variant: 'error' });
        return;
      }

      setAccounts((accountsPayload.data ?? []).filter((row: Account) => row.is_active));
      setCategories(categoriesPayload.data ?? []);
      setItems(recurringPayload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedAccount = accountId || accounts[0]?.id;
    const selectedCategory = categoryId || expenseCategories[0]?.id;

    if (!selectedAccount) {
      const message = t('recurring.accountRequired');
      setError(message);
      addToast({ title: t('recurring.accountRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    if (!selectedCategory) {
      const message = t('recurring.categoryRequired');
      setError(message);
      addToast({ title: t('recurring.categoryRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    const response = await fetch('/api/recurring-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        amount: Number(amount),
        accountId: selectedAccount,
        categoryId: selectedCategory,
        frequency: 'monthly',
        startDate,
        isActive: true,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('recurring.createFailed');
      setError(message);
      addToast({ title: t('recurring.createErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setName('');
    setAmount('0');
    setStartDate(todayDateOnly());
    addToast({ title: t('recurring.createSuccessTitle'), description: t('recurring.createSuccessText') });
    await load();
  }

  function beginEdit(item: RecurringExpense) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.current_amount?.toFixed(2) ?? '0');
    setEditAmountEffectiveFrom(todayDateOnly());
    setEditAccountId(item.account_id);
    setEditCategoryId(item.category_id);
    setEditStartDate(item.start_date);
  }

  async function onToggleActive(item: RecurringExpense) {
    const response = await fetch(`/api/recurring-expenses/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.is_active }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('recurring.updateFailed');
      setError(message);
      addToast({ title: t('recurring.updateErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({
      title: item.is_active ? t('recurring.pauseSuccessTitle') : t('recurring.resumeSuccessTitle'),
      description: item.is_active ? t('recurring.pauseSuccessText') : t('recurring.resumeSuccessText'),
    });
    await load();
  }

  async function onSaveEdit(item: RecurringExpense) {
    setIsSavingEdit(true);

    try {
      const body: Record<string, unknown> = {
        name: editName,
        accountId: editAccountId,
        categoryId: editCategoryId,
        startDate: editStartDate,
      };

      const normalizedCurrentAmount = Number((item.current_amount ?? 0).toFixed(2));
      const normalizedNewAmount = Number(Number(editAmount).toFixed(2));

      if (normalizedCurrentAmount !== normalizedNewAmount) {
        body.amount = normalizedNewAmount;
        body.amountEffectiveFrom = editAmountEffectiveFrom;
      }

      const response = await fetch(`/api/recurring-expenses/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload.message ?? t('recurring.updateFailed');
        setError(message);
        addToast({ title: t('recurring.updateErrorTitle'), description: message, variant: 'error' });
        return;
      }

      addToast({ title: t('recurring.updateSuccessTitle'), description: t('recurring.updateSuccessText') });
      setEditingId(null);
      await load();
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 sm:grid-cols-2 xl:grid-cols-6`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>{t('recurring.name')}</label>
          <input
            className={financeUi.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('recurring.namePlaceholder')}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>{t('recurring.amount')}</label>
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
          <label className={financeUi.label}>{t('recurring.account')}</label>
          <StyledSelect
            value={accountId || accounts[0]?.id || ''}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('recurring.category')}</label>
          <StyledSelect
            value={categoryId || expenseCategories[0]?.id || ''}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('recurring.startDate')}</label>
          <input
            type='date'
            className={financeUi.input}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            {t('recurring.add')}
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('recurring.loading')}</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && items.length === 0 ? <div className={financeUi.emptyState}>{t('recurring.empty')}</div> : null}
        {items.map((item) => {
          const account = accounts.find((row) => row.id === item.account_id);
          const category = expenseCategories.find((row) => row.id === item.category_id);
          const amountCurrency = account?.currency;

          return (
            <article key={item.id} className={`${financeUi.listCard} space-y-4`}>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate font-semibold text-slate-900 dark:text-slate-100'>{item.name}</p>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    {t('recurring.amount')}:{' '}
                    {formatMoney(item.current_amount ?? 0, { locale, currency: amountCurrency })}
                  </p>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    {t('recurring.account')}: {account?.name ?? t('recurring.unknownAccount')} |{' '}
                    {t('recurring.category')}: {category?.name ?? t('recurring.unknownCategory')}
                  </p>
                </div>
                <div className='text-right text-sm text-slate-600 dark:text-slate-400'>
                  <span
                    className={item.is_active ? financeUi.badge : `${financeUi.badge} border-amber-200 text-amber-700`}
                  >
                    {item.is_active ? t('recurring.active') : t('recurring.paused')}
                  </span>
                  <p className='mt-2'>
                    {t('recurring.nextCharge')}: {item.next_charge_date ?? t('recurring.notScheduled')}
                  </p>
                  <p>
                    {t('recurring.lastGenerated')}: {item.last_generated_date ?? t('recurring.notGeneratedYet')}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                <button type='button' className={financeUi.secondaryButton} onClick={() => beginEdit(item)}>
                  {t('common.edit')}
                </button>
                <button
                  type='button'
                  className={item.is_active ? financeUi.dangerButton : financeUi.secondaryButton}
                  onClick={() => onToggleActive(item)}
                >
                  {item.is_active ? t('recurring.pause') : t('recurring.resume')}
                </button>
              </div>

              {editingId === item.id ? (
                <div className='grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30 sm:grid-cols-2 xl:grid-cols-3'>
                  <div>
                    <label className={financeUi.label}>{t('recurring.name')}</label>
                    <input
                      className={financeUi.input}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={financeUi.label}>{t('recurring.amount')}</label>
                    <input
                      type='number'
                      step='0.01'
                      className={financeUi.input}
                      value={editAmount}
                      onChange={(event) => setEditAmount(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={financeUi.label}>{t('recurring.amountEffectiveFrom')}</label>
                    <input
                      type='date'
                      className={financeUi.input}
                      value={editAmountEffectiveFrom}
                      onChange={(event) => setEditAmountEffectiveFrom(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={financeUi.label}>{t('recurring.account')}</label>
                    <StyledSelect value={editAccountId} onChange={(event) => setEditAccountId(event.target.value)}>
                      {accounts.map((accountRow) => (
                        <option key={accountRow.id} value={accountRow.id}>
                          {accountRow.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div>
                    <label className={financeUi.label}>{t('recurring.category')}</label>
                    <StyledSelect value={editCategoryId} onChange={(event) => setEditCategoryId(event.target.value)}>
                      {expenseCategories.map((categoryRow) => (
                        <option key={categoryRow.id} value={categoryRow.id}>
                          {categoryRow.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  <div>
                    <label className={financeUi.label}>{t('recurring.startDate')}</label>
                    <input
                      type='date'
                      className={financeUi.input}
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                    />
                  </div>
                  <div className='sm:col-span-2 xl:col-span-3 flex flex-wrap gap-2'>
                    <button
                      type='button'
                      className={financeUi.primaryButton}
                      disabled={isSavingEdit}
                      onClick={() => onSaveEdit(item)}
                    >
                      {isSavingEdit ? t('dashboard.saving') : t('recurring.saveChanges')}
                    </button>
                    <button type='button' className={financeUi.secondaryButton} onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className='bg-transparent'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400'>
                  {t('recurring.amountHistory')}
                </p>
                {item.amount_history.length === 0 ? (
                  <p className='text-sm text-slate-600 dark:text-slate-400'>{t('recurring.noHistory')}</p>
                ) : (
                  <div className='space-y-2'>
                    {item.amount_history.map((history) => (
                      <div
                        key={`${history.effective_from}-${history.created_at}`}
                        className='flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-linear-to-r from-white to-slate-50/80 px-3 py-2 text-sm dark:border-slate-700 dark:from-slate-800/70 dark:to-slate-800/45'
                      >
                        <span className='text-slate-900 dark:text-slate-100'>
                          {formatMoney(history.amount, { locale, currency: amountCurrency })}
                        </span>
                        <span className='text-xs text-slate-500 dark:text-slate-400'>
                          {t('recurring.effectiveFrom')}: {history.effective_from}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
