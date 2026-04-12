'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { withoutLocalePrefix } from '@/lib/i18n';
import { getSupportedLocales, localeFromPathname, useI18n, withLocale } from '@/lib/i18n/client';
import type { AppLocale } from '@/lib/i18n/config';

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
    <label className={`inline-flex items-center gap-2 text-xs font-medium text-slate-600 ${className ?? ''}`}>
      <span className='sr-only'>{t('common.language')}</span>
      <span aria-hidden='true'>{t('common.language')}</span>
      <select
        className='h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-slate-400'
        aria-label={t('common.language')}
        value={currentLocale}
        onChange={(event) => onLocaleChange(event.target.value as AppLocale)}
      >
        {getSupportedLocales().map((value) => (
          <option key={value} value={value}>
            {value === 'en' ? t('common.english') : t('common.spanish')}
          </option>
        ))}
      </select>
    </label>
  );
}
