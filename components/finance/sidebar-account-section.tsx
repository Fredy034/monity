'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { financeUi } from '@/components/finance/ui';
import { useI18n } from '@/lib/i18n/client';
import Image from 'next/image';

type SidebarAccountSectionProps = {
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  variant?: 'sidebar' | 'header';
};

function getInitials(name: string, fallbackEmail: string) {
  const source = name.trim() || fallbackEmail;
  const words = source.replace(/@.*/, '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function SidebarAccountSection({
  email = '',
  displayName = '',
  avatarUrl = null,
  variant = 'sidebar',
}: SidebarAccountSectionProps) {
  const { t, withLocale } = useI18n();
  const initials = getInitials(displayName ?? '', email);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  const avatar = (
    <div className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100'>
      {avatarUrl ? (
        <Image
          alt={t('profile.accountLabel')}
          className='h-full w-full object-cover'
          src={avatarUrl}
          width={156}
          height={42}
          priority
        />
      ) : (
        initials
      )}
    </div>
  );

  if (variant === 'header') {
    return (
      <div ref={rootRef} className='relative flex h-10 items-center border-l border-slate-200 pl-3 dark:border-slate-700'>
        <button
          type='button'
          className='flex h-10 w-10 items-center justify-center rounded-xl p-0 align-middle outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20'
          aria-label={t('profile.accountLabel')}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {avatar}
        </button>
        {isOpen ? (
          <div className='absolute right-0 z-40 mt-2 grid w-56 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900'>
            <div className='min-w-0 border-b border-slate-200 px-1 pb-3 dark:border-slate-700'>
              <p className='truncate text-sm font-semibold text-slate-900 dark:text-slate-100'>
                {displayName || t('profile.yourAccount')}
              </p>
              {email ? <p className='mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400'>{email}</p> : null}
            </div>
            <Link className={financeUi.secondaryButton} href={withLocale('/settings/profile')} onClick={() => setIsOpen(false)}>
              {t('profile.editProfile')}
            </Link>
            <LogoutButton className='w-full rounded-xl' />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className='relative mt-auto border-t border-slate-200 pt-4 dark:border-slate-700'>
      <button
        type='button'
        className='flex w-full items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20'
        aria-label={t('profile.accountLabel')}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {avatar}
        <span className='min-w-0'>
          <span className='block truncate text-sm font-semibold text-slate-900 dark:text-slate-100'>
            {displayName || t('profile.yourAccount')}
          </span>
          {email ? <span className='mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400'>{email}</span> : null}
        </span>
      </button>
      {isOpen ? (
        <div className='absolute bottom-14 left-0 grid w-full grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900'>
          <Link
            className={financeUi.secondaryButton}
            href={withLocale('/settings/profile')}
            onClick={() => setIsOpen(false)}
          >
            {t('profile.editProfile')}
          </Link>
          <LogoutButton className='w-full rounded-xl' />
        </div>
      ) : null}
    </div>
  );
}
