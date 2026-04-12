'use client';

import { useEffect, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';

type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  is_system: boolean;
};

export function CategoriesManager() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState('#64748B');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    setIsLoading(true);
    const response = await fetch('/api/categories');
    const payload = await response.json();
    if (!response.ok) {
      const message = payload.message ?? 'Failed to load categories.';
      setError(message);
      addToast({ title: 'Could not load categories', description: message, variant: 'error' });
      setIsLoading(false);
      return;
    }

    setCategories(payload.data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
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
      const message = payload.message ?? 'Failed to create category.';
      setError(message);
      addToast({ title: 'Category creation failed', description: message, variant: 'error' });
      return;
    }

    setName('');
    addToast({ title: 'Category created', description: 'The category was added successfully.' });
    await load();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      const message = payload.message ?? 'Failed to delete category.';
      setError(message);
      addToast({ title: 'Category deletion failed', description: message, variant: 'error' });
      return;
    }

    addToast({ title: 'Category deleted', description: 'The category was removed.' });
    await load();
  }

  return (
    <div className='space-y-6'>
      <form className={`${financeUi.formCard} grid gap-3 md:grid-cols-4`} onSubmit={onCreate}>
        <div>
          <label className={financeUi.label}>Category name</label>
          <input
            className={financeUi.input}
            placeholder='Groceries'
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <label className={financeUi.label}>Type</label>
          <StyledSelect value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}>
            <option value='expense'>Expense</option>
            <option value='income'>Income</option>
          </StyledSelect>
        </div>
        <div>
          <label className={financeUi.label}>Color</label>
          <input
            type='color'
            className='h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2'
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>
        <div className='flex items-end'>
          <button type='submit' className={`${financeUi.primaryButton} w-full`}>
            Add category
          </button>
        </div>
      </form>

      {error ? <p className={financeUi.errorBanner}>{error}</p> : null}

      {isLoading ? (
        <div className={financeUi.loadingWrap}>
          <span className={financeUi.spinner} />
          <span>Loading categories...</span>
        </div>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-2'>
        {!isLoading && categories.length === 0 ? (
          <div className={`${financeUi.emptyState} sm:col-span-2`}>
            No categories yet. Add one above to start organizing your transactions.
          </div>
        ) : null}
        {categories.map((category) => (
          <article key={category.id} className={`${financeUi.listCard} flex items-center justify-between`}>
            <div className='flex items-center gap-3'>
              <span className='h-3 w-3 rounded-full' style={{ backgroundColor: category.color ?? '#94A3B8' }} />
              <div>
                <p className='font-semibold text-slate-900'>{category.name}</p>
                <p className='text-xs uppercase tracking-wide text-slate-500'>
                  {category.type} {category.is_system ? '| System' : '| Custom'}
                </p>
              </div>
            </div>
            {!category.is_system ? (
              <button type='button' className={financeUi.dangerButton} onClick={() => onDelete(category.id)}>
                Delete
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
