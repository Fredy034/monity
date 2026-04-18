'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ActionButton } from '@/components/finance/action-button';
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#64748B');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalHostReady, setIsModalHostReady] = useState(false);

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
    void load();
  }, [load]);

  useEffect(() => {
    setIsModalHostReady(true);
  }, []);

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

  function startEdit(category: Category) {
    setEditingCategory(category);
    setEditingName(category.name);
    setEditingColor(category.color ?? '#64748B');
  }

  function cancelEdit() {
    setEditingCategory(null);
    setEditingName('');
    setEditingColor('#64748B');
  }

  async function onUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCategory) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingName,
          color: editingColor,
          type: editingCategory.type,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload.message ?? t('categories.updateFailed');
        setError(message);
        addToast({ title: t('categories.updateErrorTitle'), description: message, variant: 'error' });
        return;
      }

      addToast({ title: t('categories.updateSuccessTitle'), description: t('categories.updateSuccessText') });
      cancelEdit();
      await load();
    } finally {
      setIsUpdating(false);
    }
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
            className='h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-800/50'
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
          <article
            key={category.id}
            className={`${financeUi.listCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div className='flex items-center gap-3'>
              <span className='h-3 w-3 rounded-full' style={{ backgroundColor: category.color ?? '#94A3B8' }} />
              <div>
                <p className='font-semibold text-slate-900 dark:text-slate-100'>{category.name}</p>
                <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                  {category.type === 'income' ? t('dashboard.income') : t('dashboard.expense')}{' '}
                  {category.is_system ? `| ${t('categories.system')}` : `| ${t('categories.custom')}`}
                </p>
              </div>
            </div>
            {!category.is_system ? (
              <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
                <ActionButton type='button' variant='secondary' fullWidthOnMobile onClick={() => startEdit(category)}>
                  {t('common.edit')}
                </ActionButton>
                <ActionButton type='button' variant='danger' fullWidthOnMobile onClick={() => onDelete(category.id)}>
                  {t('common.delete')}
                </ActionButton>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {editingCategory && isModalHostReady
        ? createPortal(
            <div className='fixed inset-0 z-100 flex items-center justify-center p-4'>
              <button
                type='button'
                className='absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]'
                onClick={cancelEdit}
                aria-label={t('common.close')}
              />

              <section className={`${financeUi.modalCard} relative z-10 w-full max-w-lg`}>
                <div className='mb-4 flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>{t('categories.editModalTitle')}</h3>
                    <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>{t('categories.editModalSubtitle')}</p>
                  </div>
                  <ActionButton type='button' variant='secondary' onClick={cancelEdit}>
                    {t('common.close')}
                  </ActionButton>
                </div>

                <form className='grid gap-3 sm:grid-cols-2' onSubmit={onUpdate}>
                  <div className='sm:col-span-2'>
                    <label className={financeUi.label}>{t('categories.name')}</label>
                    <input
                      className={financeUi.input}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className={financeUi.label}>{t('categories.color')}</label>
                    <input
                      type='color'
                      className='h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-800/50'
                      value={editingColor}
                      onChange={(event) => setEditingColor(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={financeUi.label}>{t('categories.type')}</label>
                    <input
                      className={financeUi.input}
                      value={editingCategory.type === 'income' ? t('dashboard.income') : t('dashboard.expense')}
                      disabled
                    />
                  </div>

                  <div className='sm:col-span-2 flex flex-wrap justify-end gap-2'>
                    <ActionButton type='button' variant='secondary' onClick={cancelEdit}>
                      {t('common.cancel')}
                    </ActionButton>
                    <ActionButton type='submit' variant='primary' disabled={isUpdating}>
                      {isUpdating ? t('common.loading') : t('common.save')}
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
