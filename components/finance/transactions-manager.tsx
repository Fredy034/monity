'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { formatMoney } from '@/lib/finance/formatting';
import { useI18n } from '@/lib/i18n/client';

type Account = { id: string; name: string; currency: string; is_active: boolean };
type Category = { id: string; name: string; type: 'income' | 'expense'; color: string | null };
type Tx = {
  id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  transaction_date: string;
};

export function TransactionsManager() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const filteredCategories = categories.filter((item) => item.type === type);
  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const filterCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter((category) => category.type === filterType);
  }, [categories, filterType]);

  const filteredTransactions = useMemo(() => {
    const minAmountValue = minAmount.trim() ? Number(minAmount) : null;
    const maxAmountValue = maxAmount.trim() ? Number(maxAmount) : null;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return transactions.filter((tx) => {
      const category = categoryMap.get(tx.category_id);
      const account = accountMap.get(tx.account_id);

      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategoryId !== 'all' && tx.category_id !== filterCategoryId) return false;
      if (fromDate && tx.transaction_date < fromDate) return false;
      if (toDate && tx.transaction_date > toDate) return false;

      if (minAmountValue !== null && Number.isFinite(minAmountValue) && tx.amount < minAmountValue) return false;
      if (maxAmountValue !== null && Number.isFinite(maxAmountValue) && tx.amount > maxAmountValue) return false;

      if (normalizedQuery) {
        const haystack = [tx.description ?? '', category?.name ?? '', account?.name ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [
    accountMap,
    categoryMap,
    filterCategoryId,
    filterType,
    fromDate,
    maxAmount,
    minAmount,
    searchQuery,
    toDate,
    transactions,
  ]);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/transactions?limit=100'),
      ]);

      const [accountsPayload, categoriesPayload, transactionsPayload] = await Promise.all([
        accountsRes.json(),
        categoriesRes.json(),
        transactionsRes.json(),
      ]);

      if (!accountsRes.ok || !categoriesRes.ok || !transactionsRes.ok) {
        const message =
          accountsPayload.message ??
          categoriesPayload.message ??
          transactionsPayload.message ??
          t('transactions.loadFailed');
        setError(message);
        addToast({ title: t('transactions.loadErrorTitle'), description: message, variant: 'error' });
        return;
      }

      const accountData = (accountsPayload.data ?? []).filter((item: Account) => item.is_active);
      const categoryData = categoriesPayload.data ?? [];

      setAccounts(accountData);
      setCategories(categoryData);
      setTransactions(transactionsPayload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedAccountId = accountId || accounts[0]?.id;
    const selectedCategoryId = categoryId || filteredCategories[0]?.id;

    if (!selectedAccountId) {
      const message = t('transactions.accountRequired');
      setError(message);
      addToast({ title: t('transactions.accountRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    if (!selectedCategoryId) {
      const message = t('transactions.categoryRequired');
      setError(message);
      addToast({ title: t('transactions.categoryRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        amount: Number(amount),
        description,
        transactionDate,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('transactions.createFailed');
      setError(message);
      addToast({ title: t('transactions.createErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setDescription('');
    setAmount('0');
    addToast({ title: t('transactions.createSuccessTitle'), description: t('transactions.createSuccessText') });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? t('transactions.deleteFailed');
      setError(message);
      addToast({ title: t('transactions.deleteErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({ title: t('transactions.deleteSuccessTitle'), description: t('transactions.deleteSuccessText') });
    await load();
  }

  function startEdit(tx: Tx) {
    setEditingId(tx.id);
    setEditingCategoryId(tx.category_id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingCategoryId('');
  }

  async function onUpdateCategory(tx: Tx) {
    const nextCategoryId = editingCategoryId || tx.category_id;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tx.type,
          accountId: tx.account_id,
          categoryId: nextCategoryId,
          amount: tx.amount,
          description: tx.description ?? '',
          transactionDate: tx.transaction_date,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload.message ?? t('transactions.updateFailed');
        setError(message);
        addToast({ title: t('transactions.updateErrorTitle'), description: message, variant: 'error' });
        return;
      }

      addToast({ title: t('transactions.updateSuccessTitle'), description: t('transactions.updateSuccessText') });
      cancelEdit();
      await load();
    } finally {
      setIsUpdating(false);
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setFilterType('all');
    setFilterCategoryId('all');
    setFromDate('');
    setToDate('');
    setMinAmount('');
    setMaxAmount('');
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 sm:grid-cols-2 xl:grid-cols-6`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>{t('transactions.type')}</label>
          <StyledSelect value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}>
            <option value='expense'>{t('dashboard.expense')}</option>
            <option value='income'>{t('dashboard.income')}</option>
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('transactions.account')}</label>
          <StyledSelect
            value={accountId || accounts[0]?.id || ''}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('transactions.category')}</label>
          <StyledSelect
            value={categoryId || filteredCategories[0]?.id || ''}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('transactions.amount')}</label>
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
          <label className={financeUi.label}>{t('transactions.date')}</label>
          <input
            type='date'
            className={financeUi.input}
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            {t('transactions.add')}
          </button>
        </div>
        <div className='sm:col-span-2 xl:col-span-6'>
          <label className={financeUi.label}>{t('transactions.description')}</label>
          <input
            className={financeUi.input}
            placeholder={t('transactions.descriptionPlaceholder')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </form>

      <section className={`${financeUi.formCard} space-y-3`}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className={financeUi.sectionTitle}>{t('transactions.filtersTitle')}</h2>
          <button type='button' className={financeUi.secondaryButton} onClick={clearFilters}>
            {t('transactions.clearFilters')}
          </button>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <div className='xl:col-span-2'>
            <label className={financeUi.label}>{t('transactions.search')}</label>
            <input
              className={financeUi.input}
              placeholder={t('transactions.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.type')}</label>
            <StyledSelect
              value={filterType}
              onChange={(event) => {
                const nextType = event.target.value as 'all' | 'income' | 'expense';
                setFilterType(nextType);
                setFilterCategoryId('all');
              }}
            >
              <option value='all'>{t('transactions.allTypes')}</option>
              <option value='expense'>{t('dashboard.expense')}</option>
              <option value='income'>{t('dashboard.income')}</option>
            </StyledSelect>
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.category')}</label>
            <StyledSelect value={filterCategoryId} onChange={(event) => setFilterCategoryId(event.target.value)}>
              <option value='all'>{t('transactions.allCategories')}</option>
              {filterCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </StyledSelect>
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.fromDate')}</label>
            <input
              type='date'
              className={financeUi.input}
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.toDate')}</label>
            <input
              type='date'
              className={financeUi.input}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.minAmount')}</label>
            <input
              type='number'
              step='0.01'
              className={financeUi.input}
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
            />
          </div>

          <div>
            <label className={financeUi.label}>{t('transactions.maxAmount')}</label>
            <input
              type='number'
              step='0.01'
              className={financeUi.input}
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
            />
          </div>
        </div>
      </section>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('transactions.loading')}</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && filteredTransactions.length === 0 ? (
          <div className={financeUi.emptyState}>{t('transactions.empty')}</div>
        ) : null}
        {filteredTransactions.map((tx) => (
          <article
            key={tx.id}
            className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div className='min-w-0'>
              <p className='font-semibold text-slate-900'>{tx.description || t('transactions.noDescription')}</p>
              <div className='mt-1 flex flex-wrap items-center gap-2'>
                <p className='text-sm text-slate-600'>{tx.transaction_date}</p>
                <CategoryBadge
                  category={categoryMap.get(tx.category_id)}
                  fallbackLabel={t('transactions.unknownCategory')}
                />
              </div>
              {editingId === tx.id ? (
                <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'>
                  <StyledSelect
                    value={editingCategoryId}
                    onChange={(event) => setEditingCategoryId(event.target.value)}
                    className='sm:max-w-xs'
                  >
                    {categories
                      .filter((category) => category.type === tx.type)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </StyledSelect>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      className={financeUi.primaryButton}
                      disabled={isUpdating}
                      onClick={() => onUpdateCategory(tx)}
                    >
                      {t('common.save')}
                    </button>
                    <button type='button' className={financeUi.secondaryButton} onClick={cancelEdit}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className='flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start'>
              <p className={tx.type === 'income' ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                {tx.type === 'income' ? '+' : '-'}
                {formatMoney(tx.amount, { locale, currency: accountMap.get(tx.account_id)?.currency })}
              </p>
              {editingId !== tx.id ? (
                <button
                  type='button'
                  className={`${financeUi.secondaryButton} w-full sm:w-auto`}
                  onClick={() => startEdit(tx)}
                >
                  {t('common.edit')}
                </button>
              ) : null}
              <button
                type='button'
                className={`${financeUi.dangerButton} w-full sm:w-auto`}
                onClick={() => onDelete(tx.id)}
              >
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CategoryBadge({ category, fallbackLabel }: { category?: Category; fallbackLabel: string }) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700'>
      <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: category?.color ?? '#94A3B8' }} />
      {category?.name ?? fallbackLabel}
    </span>
  );
}
