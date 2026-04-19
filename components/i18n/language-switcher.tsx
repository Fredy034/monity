'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { withoutLocalePrefix } from '@/lib/i18n';
import { getSupportedLocales, localeFromPathname, useI18n, withLocale } from '@/lib/i18n/client';
import type { AppLocale } from '@/lib/i18n/config';

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: '🇺🇸 EN',
  es: '🇪🇸 ES',
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  function onLocaleChange(nextLocale: AppLocale) {
    const path = withoutLocalePrefix(pathname || '/');
    const query = searchParams.toString();
    const nextPath = withLocale(nextLocale, query ? `${path}?${query}` : path);
    router.replace(nextPath);
    router.refresh();
  }

  const currentLocale = localeFromPathname(pathname) ?? locale;

  return (
    <label
      className={`inline-flex max-w-full items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 ${className ?? ''}`}
    >
      <span className='sr-only'>{t('common.language')}1</span>
      <span
        aria-hidden='true'
        className='hidden text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 sm:inline'
      >
        {t('common.language')}
      </span>
      <select
        className='h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-500 sm:w-auto'
        aria-label={t('common.language')}
        value={currentLocale}
        onChange={(event) => onLocaleChange(event.target.value as AppLocale)}
      >
        {getSupportedLocales().map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
