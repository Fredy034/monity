'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { ActionButton } from '@/components/finance/action-button';
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

const ADD_PANEL_STORAGE_KEY = 'monity.transactions.addPanelOpen';
const FILTERS_PANEL_STORAGE_KEY = 'monity.transactions.filtersPanelOpen';

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
  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingAmount, setEditingAmount] = useState('0');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDate, setEditingDate] = useState(new Date().toISOString().slice(0, 10));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalHostReady, setIsModalHostReady] = useState(false);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const [hasLoadedPanelPreferences, setHasLoadedPanelPreferences] = useState(false);

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

  useEffect(() => {
    setIsModalHostReady(true);
  }, []);

  useEffect(() => {
    const addPanelStored = window.localStorage.getItem(ADD_PANEL_STORAGE_KEY);
    const filtersPanelStored = window.localStorage.getItem(FILTERS_PANEL_STORAGE_KEY);

    if (addPanelStored === '1') setIsAddPanelOpen(true);
    if (filtersPanelStored === '1') setIsFiltersPanelOpen(true);

    setHasLoadedPanelPreferences(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPanelPreferences) return;
    window.localStorage.setItem(ADD_PANEL_STORAGE_KEY, isAddPanelOpen ? '1' : '0');
    window.localStorage.setItem(FILTERS_PANEL_STORAGE_KEY, isFiltersPanelOpen ? '1' : '0');
  }, [hasLoadedPanelPreferences, isAddPanelOpen, isFiltersPanelOpen]);

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
    setEditingTx(tx);
    setEditingCategoryId(tx.category_id);
    setEditingAmount(String(tx.amount));
    setEditingDescription(tx.description ?? '');
    setEditingDate(tx.transaction_date);
  }

  function cancelEdit() {
    setEditingTx(null);
    setEditingCategoryId('');
    setEditingAmount('0');
    setEditingDescription('');
    setEditingDate(new Date().toISOString().slice(0, 10));
  }

  async function onUpdateTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTx) return;

    const nextCategoryId = editingCategoryId || editingTx.category_id;
    const parsedAmount = Number(editingAmount);

    if (!nextCategoryId) {
      const message = t('transactions.categoryRequired');
      setError(message);
      addToast({ title: t('transactions.categoryRequiredTitle'), description: message, variant: 'error' });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const message = t('transactions.invalidAmount');
      setError(message);
      addToast({ title: t('transactions.updateErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingTx.type,
          accountId: editingTx.account_id,
          categoryId: nextCategoryId,
          amount: parsedAmount,
          description: editingDescription,
          transactionDate: editingDate,
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
      <section className={financeUi.formCard}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className={financeUi.sectionTitle}>{t('transactions.addPanelTitle')}</h2>
          <ActionButton type='button' variant='secondary' onClick={() => setIsAddPanelOpen((value) => !value)}>
            {isAddPanelOpen ? t('transactions.hideAddPanel') : t('transactions.showAddPanel')}
          </ActionButton>
        </div>

        {isAddPanelOpen ? (
          <form className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6' onSubmit={onCreate}>
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
        ) : null}
      </section>

      <section className={financeUi.formCard}>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className={financeUi.sectionTitle}>{t('transactions.filtersTitle')}</h2>
          <div className='flex flex-wrap gap-2'>
            {isFiltersPanelOpen ? (
              <ActionButton type='button' variant='secondary' onClick={clearFilters}>
                {t('transactions.clearFilters')}
              </ActionButton>
            ) : null}
            <ActionButton type='button' variant='secondary' onClick={() => setIsFiltersPanelOpen((value) => !value)}>
              {isFiltersPanelOpen ? t('transactions.hideFiltersPanel') : t('transactions.showFiltersPanel')}
            </ActionButton>
          </div>
        </div>

        {isFiltersPanelOpen ? (
          <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
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
        ) : null}
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
            </div>
            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-start'>
              <p className={tx.type === 'income' ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                {tx.type === 'income' ? '+' : '-'}
                {formatMoney(tx.amount, { locale, currency: accountMap.get(tx.account_id)?.currency })}
              </p>
              <ActionButton type='button' variant='secondary' fullWidthOnMobile onClick={() => startEdit(tx)}>
                {t('common.edit')}
              </ActionButton>
              <ActionButton type='button' variant='danger' fullWidthOnMobile onClick={() => onDelete(tx.id)}>
                {t('common.delete')}
              </ActionButton>
            </div>
          </article>
        ))}
      </div>

      {editingTx && isModalHostReady
        ? createPortal(
            <div className='fixed inset-0 z-100 flex items-center justify-center p-4'>
              <button
                type='button'
                className='absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]'
                onClick={cancelEdit}
                aria-label={t('common.close')}
              />

              <section className={`${financeUi.formCard} relative z-10 w-full max-w-xl`}>
                <div className='mb-4 flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>{t('transactions.editModalTitle')}</h3>
                    <p className='mt-1 text-sm text-slate-600'>{t('transactions.editModalSubtitle')}</p>
                  </div>
                  <ActionButton type='button' variant='secondary' onClick={cancelEdit}>
                    {t('common.close')}
                  </ActionButton>
                </div>

                <form className='grid gap-3 sm:grid-cols-2' onSubmit={onUpdateTransaction}>
                  <div>
                    <label className={financeUi.label}>{t('transactions.category')}</label>
                    <StyledSelect
                      value={editingCategoryId}
                      onChange={(event) => setEditingCategoryId(event.target.value)}
                    >
                      {categories
                        .filter((category) => category.type === editingTx.type)
                        .map((category) => (
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
                      value={editingAmount}
                      onChange={(event) => setEditingAmount(event.target.value)}
                      onFocus={() => {
                        if (editingAmount === '0') setEditingAmount('');
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className={financeUi.label}>{t('transactions.date')}</label>
                    <input
                      type='date'
                      className={financeUi.input}
                      value={editingDate}
                      onChange={(event) => setEditingDate(event.target.value)}
                      required
                    />
                  </div>

                  <div className='sm:col-span-2'>
                    <label className={financeUi.label}>{t('transactions.description')}</label>
                    <input
                      className={financeUi.input}
                      placeholder={t('transactions.descriptionPlaceholder')}
                      value={editingDescription}
                      onChange={(event) => setEditingDescription(event.target.value)}
                    />
                  </div>

                  <div className='sm:col-span-2 flex flex-wrap justify-end gap-2'>
                    <ActionButton type='button' variant='secondary' onClick={cancelEdit}>
                      {t('common.cancel')}
                    </ActionButton>
                    <ActionButton type='submit' variant='primary' disabled={isUpdating}>
                      {isUpdating ? t('dashboard.saving') : t('common.save')}
                    </ActionButton>
                  </div>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}
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
