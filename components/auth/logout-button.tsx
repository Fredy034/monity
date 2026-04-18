'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n/client';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t, withLocale } = useI18n();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      router.replace(withLocale('/sign-in'));
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type='button'
      onClick={handleLogout}
      disabled={isPending}
      className={`inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 ${className ?? ''}`}
    >
      {isPending ? t('auth.logout.signingOut') : t('auth.logout.signOut')}
    </button>
  );
}
