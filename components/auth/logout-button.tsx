'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      router.replace('/sign-in');
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
      className={`inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 ${className ?? ''}`}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
