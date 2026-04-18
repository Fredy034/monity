'use client';

import Link from 'next/link';

import { LogoutButton } from '@/components/auth/logout-button';
import { financeUi } from '@/components/finance/ui';
import { useI18n } from '@/lib/i18n/client';
import Image from 'next/image';

type SidebarAccountSectionProps = {
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function getInitials(name: string, fallbackEmail: string) {
  const source = name.trim() || fallbackEmail;
  const words = source.replace(/@.*/, '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function SidebarAccountSection({ email = '', displayName = '', avatarUrl = null }: SidebarAccountSectionProps) {
  const { t, withLocale } = useI18n();
  const initials = getInitials(displayName ?? '', email);

  return (
    <div className='mt-auto border-t border-slate-200 pt-4 dark:border-slate-700'>
      <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
          {t('profile.accountLabel')}
        </p>

        <div className='mt-3 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100'>
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
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-slate-900 dark:text-slate-100'>
              {displayName || t('profile.yourAccount')}
            </p>
            {email ? <p className='truncate text-xs text-slate-500 dark:text-slate-400'>{email}</p> : null}
          </div>
        </div>

        <div className='mt-4 grid grid-cols-1 gap-2'>
          <Link className={financeUi.secondaryButton} href={withLocale('/settings/profile')}>
            {t('profile.editProfile')}
          </Link>
          <LogoutButton className='w-full rounded-xl' />
        </div>
      </div>
    </div>
  );
}
