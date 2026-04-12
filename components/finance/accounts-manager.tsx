'use client';

import { useEffect, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';

type Account = {
  id: string;
  name: string;
  type: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
};

const accountTypes = [
  { value: 'bank', label: 'Bank account' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'debit_card', label: 'Debit card' },
];

export function AccountsManager() {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Failed to load accounts.');
      setAccounts(payload.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load accounts.';
      setError(message);
      addToast({ title: 'Could not load accounts', description: message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      const message = payload.message ?? 'Failed to create account.';
      setError(message);
      addToast({ title: 'Account creation failed', description: message, variant: 'error' });
      return;
    }

    setName('');
    setInitialBalance('0');
    addToast({ title: 'Account created', description: 'The account was added successfully.' });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? 'Failed to delete account.';
      setError(message);
      addToast({ title: 'Account deletion failed', description: message, variant: 'error' });
      return;
    }

    addToast({ title: 'Account deleted', description: 'The account was removed.' });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 md:grid-cols-5`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>Account name</label>
          <input
            className={financeUi.input}
            placeholder='Main checking'
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>Type</label>
          <StyledSelect value={type} onChange={(event) => setType(event.target.value)}>
            {accountTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>Currency</label>
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
          <label className={financeUi.label}>Opening balance</label>
          <input
            type='number'
            step='0.01'
            className={financeUi.input}
            placeholder='0.00'
            value={initialBalance}
            onChange={(event) => setInitialBalance(event.target.value)}
            required
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            Add account
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>Loading accounts...</span>
        </div>
      ) : null}

      <div className='space-y-3'>
        {!isLoading && accounts.length === 0 ? (
          <div className={financeUi.emptyState}>
            No accounts yet. Create an account above to start tracking balances.
          </div>
        ) : null}
        {accounts.map((account) => (
          <article key={account.id} className={`${financeUi.listCard} flex items-center justify-between`}>
            <div>
              <p className='font-semibold text-slate-900'>{account.name}</p>
              <p className='text-sm text-slate-600'>
                {account.type.replace('_', ' ')} | {account.currency}
              </p>
              <p className='mt-1 text-sm font-medium text-emerald-600'>
                Current balance: {account.current_balance.toFixed(2)} {account.currency}
              </p>
            </div>
            <button type='button' className={financeUi.dangerButton} onClick={() => onDelete(account.id)}>
              Delete
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
