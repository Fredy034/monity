'use client';

import { useCallback, useEffect, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { useI18n } from '@/lib/i18n/client';

type Account = { id: string; name: string; currency: string; is_active: boolean };
type Category = { id: string; name: string; type: 'income' | 'expense' };
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
  const { t } = useI18n();
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

  const filteredCategories = categories.filter((item) => item.type === type);

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

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('transactions.loading')}</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && transactions.length === 0 ? (
          <div className={financeUi.emptyState}>{t('transactions.empty')}</div>
        ) : null}
        {transactions.map((tx) => (
          <article key={tx.id} className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div className='min-w-0'>
              <p className='font-semibold text-slate-900'>{tx.description || t('transactions.noDescription')}</p>
              <p className='text-sm text-slate-600'>{tx.transaction_date}</p>
            </div>
            <div className='flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start'>
              <p className={tx.type === 'income' ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                {tx.type === 'income' ? '+' : '-'}
                {tx.amount.toFixed(2)}
              </p>
              <button type='button' className={`${financeUi.dangerButton} w-full sm:w-auto`} onClick={() => onDelete(tx.id)}>
                {t('common.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
