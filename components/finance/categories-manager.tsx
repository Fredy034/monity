'use client';

import { useCallback, useEffect, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { useI18n } from '@/lib/i18n/client';

type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  is_system: boolean;
};

export function CategoriesManager() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState('#64748B');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch('/api/categories');
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('categories.loadFailed');
      setError(message);
      addToast({ title: t('categories.loadErrorTitle'), description: message, variant: 'error' });
      setIsLoading(false);
      return;
    }

    setCategories(payload.data ?? []);
    setIsLoading(false);
  }, [addToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, color }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? t('categories.createFailed');
      setError(message);
      addToast({ title: t('categories.createErrorTitle'), description: message, variant: 'error' });
      return;
    }

    setName('');
    addToast({ title: t('categories.createSuccessTitle'), description: t('categories.createSuccessText') });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? t('categories.deleteFailed');
      setError(message);
      addToast({ title: t('categories.deleteErrorTitle'), description: message, variant: 'error' });
      return;
    }

    addToast({ title: t('categories.deleteSuccessTitle'), description: t('categories.deleteSuccessText') });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>{t('categories.name')}</label>
          <input
            className={financeUi.input}
            placeholder={t('categories.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>{t('categories.type')}</label>
          <StyledSelect value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}>
            <option value='expense'>{t('dashboard.expense')}</option>
            <option value='income'>{t('dashboard.income')}</option>
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>{t('categories.color')}</label>
          <input
            type='color'
            className='h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2'
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            {t('categories.add')}
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>{t('categories.loading')}</span>
        </div>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-2'>
        {!isLoading && categories.length === 0 ? (
          <div className={`${financeUi.emptyState} sm:col-span-2`}>{t('categories.empty')}</div>
        ) : null}
        {categories.map((category) => (
          <article key={category.id} className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div className='flex items-center gap-3'>
              <span className='h-3 w-3 rounded-full' style={{ backgroundColor: category.color ?? '#94A3B8' }} />
              <div>
                <p className='font-semibold text-slate-900'>{category.name}</p>
                <p className='text-xs uppercase tracking-wide text-slate-500'>
                  {category.type === 'income' ? t('dashboard.income') : t('dashboard.expense')} {category.is_system ? `| ${t('categories.system')}` : `| ${t('categories.custom')}`}
                </p>
              </div>
            </div>
            {!category.is_system ? (
              <button
                type='button'
                className={`${financeUi.dangerButton} w-full sm:w-auto`}
                onClick={() => onDelete(category.id)}
              >
                {t('common.delete')}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
