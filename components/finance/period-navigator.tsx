'use client';

import { useMemo, useState } from 'react';

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

  return (
    <div className='relative'>
      <div className='inline-flex h-11 items-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950'>
        <button
          type='button'
          className='flex h-full w-11 items-center justify-center transition hover:bg-white/10 dark:hover:bg-slate-200'
          aria-label={t('dashboard.previousMonth')}
          onClick={() => onChange(shiftFinancePeriod(value, -1))}
        >
          <span aria-hidden='true'>‹</span>
        </button>
        <button
          type='button'
          className='h-full border-x border-white/20 px-4 text-sm font-medium capitalize dark:border-slate-300'
          aria-label={t('dashboard.choosePeriod')}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {formatMonthLabel(value.month, locale, 'long')} {value.year}
        </button>
        <button
          type='button'
          className='flex h-full w-11 items-center justify-center transition hover:bg-white/10 dark:hover:bg-slate-200'
          aria-label={t('dashboard.nextMonth')}
          onClick={() => onChange(shiftFinancePeriod(value, 1))}
        >
          <span aria-hidden='true'>›</span>
        </button>
      </div>

      {isOpen ? (
        <div className={`${financeUi.formCard} absolute right-0 z-30 mt-2 w-72 shadow-xl`}>
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
