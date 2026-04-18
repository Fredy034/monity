'use client';

import { useCallback, useEffect, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { formatMoney } from '@/lib/finance/formatting';
import { useI18n } from '@/lib/i18n/client';

type Account = {
  id: string;
  name: string;
  type: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
};

export function AccountsManager() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? t('accounts.loadFailed'));
      setAccounts(payload.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounts.loadFailed');
      setError(message);
      addToast({ title: t('accounts.loadErrorTitle'), description: message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        currency,
        initialBalance: Number(initialBalance),
        isActive: true,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('accounts.createFailed');
      setError(message);
      addToast({ title: t('accounts.createErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setName('');
    setInitialBalance('0');
    addToast({ title: t('accounts.createSuccessTitle'), description: t('accounts.createSuccessText') });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? t('accounts.deleteFailed');
      setError(message);
      addToast({ title: t('accounts.deleteErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({ title: t('accounts.deleteSuccessTitle'), description: t('accounts.deleteSuccessText') });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 sm:grid-cols-2 xl:grid-cols-5`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>{t('accounts.name')}</label>
          <input
            className={financeUi.input}
            placeholder={t('accounts.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>{t('accounts.type')}</label>
          <StyledSelect value={type} onChange={(event) => setType(event.target.value)}>
            <option value='bank'>{t('accounts.accountTypeBank')}</option>
            <option value='cash'>{t('accounts.accountTypeCash')}</option>
            <option value='credit_card'>{t('accounts.accountTypeCreditCard')}</option>
            <option value='debit_card'>{t('accounts.accountTypeDebitCard')}</option>
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('accounts.currency')}</label>
          <input
            className={financeUi.input}
            placeholder='USD'
            value={currency}
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>{t('accounts.openingBalance')}</label>
          <input
            type='number'
            step='0.01'
            className={financeUi.input}
            placeholder='0.00'
            value={initialBalance}
            onChange={(event) => setInitialBalance(event.target.value)}
            onFocus={() => {
              if (initialBalance === '0') setInitialBalance('');
            }}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            {t('accounts.add')}
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('accounts.loading')}</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && accounts.length === 0 ? <div className={financeUi.emptyState}>{t('accounts.empty')}</div> : null}
        {accounts.map((account) => (
          <article
            key={account.id}
            className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div className='min-w-0'>
              <p className='font-semibold text-slate-900 dark:text-slate-100'>{account.name}</p>
              <p className='text-sm text-slate-600 dark:text-slate-400'>
                {account.type.replace('_', ' ')} | {account.currency}
              </p>
              <p className='mt-1 text-sm font-medium text-emerald-600'>
                {t('accounts.currentBalance')}:{' '}
                {formatMoney(account.current_balance, { locale, currency: account.currency })}
              </p>
            </div>
            <button
              type='button'
              className={`${financeUi.dangerButton} w-full sm:w-auto`}
              onClick={() => onDelete(account.id)}
            >
              {t('common.delete')}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
