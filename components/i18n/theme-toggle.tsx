'use client';

import { useTheme } from '@/lib/theme/theme-provider';
import { useEffect, useState } from 'react';

function ThemeToggleInner({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/80 ${className ?? ''}`}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {theme === 'light' ? (
        <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
          <path d='M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z' />
        </svg>
      ) : (
        <svg className='h-5 w-5' viewBox='0 0 20 20' fill='none' aria-hidden='true'>
          <circle cx='10' cy='10' r='3.5' fill='currentColor' />
          <path
            d='M10 2V4M10 16V18M2 10H4M16 10H18M4.34 4.34L5.76 5.76M14.24 14.24L15.66 15.66M4.34 15.66L5.76 14.24M14.24 5.76L15.66 4.34'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
          />
        </svg>
      )}
    </button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <ThemeToggleInner className={className} />;
}
