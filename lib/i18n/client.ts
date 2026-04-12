'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getSupportedLocales, getTranslatorForLocale, localeFromPathname, withLocale } from '@/lib/i18n';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

export function useI18n() {
  const pathname = usePathname();

  return useMemo(() => {
    const locale = localeFromPathname(pathname) ?? DEFAULT_LOCALE;
    const translator = getTranslatorForLocale(locale);

    return {
      locale,
      t: translator.t,
      withLocale: (href: string) => withLocale(locale, href),
    };
  }, [pathname]);
}

export { getSupportedLocales, localeFromPathname, withLocale };

