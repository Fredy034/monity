'use client';

import { useMemo } from 'react';

import { StyledSelect } from '@/components/finance/styled-select';
import { formatMonthLabel } from '@/lib/finance/dates';

export function DashboardMonthSelect({
  value,
  locale,
  onChange,
}: {
  value: number;
  locale: string;
  onChange: (month: number) => void;
}) {
  const options = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1;
        return {
          value: monthNumber,
          label: formatMonthLabel(monthNumber, locale),
        };
      }),
    [locale],
  );

  return (
    <StyledSelect value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </StyledSelect>
  );
}
