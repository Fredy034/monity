'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';
import { useI18n } from '@/lib/i18n/client';

type ProfileSettingsFormProps = {
  initialDisplayName: string;
  initialEmail: string;
  avatarUrl?: string | null;
};

function getInitials(name: string, fallbackEmail: string) {
  const source = name.trim() || fallbackEmail;
  const words = source.replace(/@.*/, '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function ProfileSettingsForm({ initialDisplayName, initialEmail, avatarUrl = null }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialDisplayName);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = displayName.trim().replace(/\s+/g, ' ');

    if (!trimmed || trimmed.length > 80) {
      addToast({
        title: t('profile.invalidNameTitle'),
        description: t('profile.invalidNameText'),
        variant: 'error',
      });
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed }),
      });

      const payload = (await response.json()) as { message?: string; profile?: { display_name?: string | null } };

      if (!response.ok) {
        addToast({
          title: t('profile.updateFailedTitle'),
          description: payload.message ?? t('profile.updateFailedText'),
          variant: 'error',
        });
        return;
      }

      const updatedName = payload.profile?.display_name ?? trimmed;
      setDisplayName(updatedName);
      addToast({ title: t('profile.updatedTitle'), description: t('profile.updatedText') });
      router.refresh();
    });
  }

  const initials = getInitials(displayName, initialEmail);

  return (
    <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
      <section className={financeUi.formCard}>
        <div className='flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950 dark:text-slate-100'>{t('profile.detailsTitle')}</h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>{t('profile.detailsText')}</p>
          </div>
          <div className='hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/40 sm:block'>
            <div className='flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-700'>
              {avatarUrl ? (
                <img alt={t('profile.accountLabel')} className='h-full w-full object-cover' src={avatarUrl} />
              ) : (
                initials
              )}
            </div>
          </div>
        </div>

        <form className='mt-4 space-y-4' onSubmit={onSubmit}>
          <div>
            <label className={financeUi.label}>{t('profile.displayName')}</label>
            <input
              className={financeUi.input}
              maxLength={80}
              minLength={1}
              name='displayName'
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              value={displayName}
              required
            />
          </div>

          <div>
            <label className={financeUi.label}>{t('profile.email')}</label>
            <input
              className={`${financeUi.input} cursor-not-allowed bg-slate-100 dark:bg-slate-700/60 dark:text-slate-300`}
              value={initialEmail}
              readOnly
            />
            <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>{t('profile.emailHint')}</p>
          </div>

          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400'>
            <p className='font-semibold text-slate-900 dark:text-slate-100'>{t('profile.futureReadyTitle')}</p>
            <p className='mt-1'>{t('profile.futureReadyText')}</p>
          </div>

          <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <button type='button' className={financeUi.secondaryButton} onClick={() => router.back()}>
              {t('common.cancel')}
            </button>
            <button type='submit' className={financeUi.primaryButton} disabled={isPending}>
              {isPending ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          </div>
        </form>
      </section>

      <aside className='space-y-4'>
        <div className={financeUi.panelSoft}>
          <p className={financeUi.sectionTitle}>{t('profile.currentIdentity')}</p>
          <div className='mt-3 flex items-center gap-3'>
            <div className='flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-700'>
              {avatarUrl ? (
                <img alt={t('profile.accountLabel')} className='h-full w-full object-cover' src={avatarUrl} />
              ) : (
                initials
              )}
            </div>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-slate-900 dark:text-slate-100'>
                {displayName || t('profile.yourAccount')}
              </p>
              <p className='truncate text-xs text-slate-500 dark:text-slate-400'>{initialEmail}</p>
            </div>
          </div>
        </div>

        <div className={financeUi.panelSoft}>
          <p className={financeUi.sectionTitle}>{t('profile.extensibility')}</p>
          <ul className='mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400'>
            <li>{t('profile.extensibilityItem1')}</li>
            <li>{t('profile.extensibilityItem2')}</li>
            <li>{t('profile.extensibilityItem3')}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
