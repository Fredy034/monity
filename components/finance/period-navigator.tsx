'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { financeUi } from '@/components/finance/ui';
import { formatMonthLabel } from '@/lib/finance/dates';
import { type FinancePeriod, shiftFinancePeriod } from '@/lib/finance/period';
import { useI18n } from '@/lib/i18n/client';

type PeriodNavigatorProps = {
  value: FinancePeriod;
  availableYears?: number[];
  locale: string;
  onChange: (period: FinancePeriod) => void;
};

export function PeriodNavigator({ value, availableYears = [], locale, onChange }: PeriodNavigatorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const years = useMemo(
    () => Array.from(new Set([...availableYears, value.year])).sort((a, b) => b - a),
    [availableYears, value.year],
  );
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: formatMonthLabel(index + 1, locale, 'long'),
      })),
    [locale],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className='relative'>
      <div className='inline-flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'>
        <button
          type='button'
          className='flex h-full w-11 items-center justify-center transition hover:bg-slate-100 dark:hover:bg-slate-700'
          aria-label={t('dashboard.previousMonth')}
          onClick={() => onChange(shiftFinancePeriod(value, -1))}
        >
          <span aria-hidden='true'>‹</span>
        </button>
        <button
          type='button'
          className='h-full border-x border-slate-200 px-4 text-sm font-medium capitalize hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700'
          aria-label={t('dashboard.choosePeriod')}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {formatMonthLabel(value.month, locale, 'long')} {value.year}
        </button>
        <button
          type='button'
          className='flex h-full w-11 items-center justify-center transition hover:bg-slate-100 dark:hover:bg-slate-700'
          aria-label={t('dashboard.nextMonth')}
          onClick={() => onChange(shiftFinancePeriod(value, 1))}
        >
          <span aria-hidden='true'>›</span>
        </button>
      </div>

      {isOpen ? (
        <div className='absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-5'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={financeUi.label}>{t('dashboard.periodMonth')}</label>
              <StyledSelect
                value={String(value.month)}
                onChange={(event) => {
                  onChange({ ...value, month: Number(event.target.value) });
                  setIsOpen(false);
                }}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </StyledSelect>
            </div>
            <div>
              <label className={financeUi.label}>{t('dashboard.periodYear')}</label>
              <StyledSelect
                value={String(value.year)}
                onChange={(event) => {
                  onChange({ ...value, year: Number(event.target.value) });
                  setIsOpen(false);
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>
          <button type='button' className={`${financeUi.secondaryButton} mt-3 w-full`} onClick={() => setIsOpen(false)}>
            {t('dashboard.closePeriodSelector')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
