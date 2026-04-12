import type { SelectHTMLAttributes } from 'react';

import { financeUi } from '@/components/finance/ui';

type StyledSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function StyledSelect({ className, children, ...props }: StyledSelectProps) {
  return (
    <div className='relative'>
      <select {...props} className={`${financeUi.select} pr-10 ${className ?? ''}`}>
        {children}
      </select>
      <span className='pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400'>
        <svg viewBox='0 0 20 20' className='h-4 w-4' aria-hidden='true'>
          <path
            d='M5.5 7.5 10 12l4.5-4.5'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
    </div>
  );
}
