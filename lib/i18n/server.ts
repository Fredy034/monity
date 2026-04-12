import { cookies, headers } from 'next/headers';

import { getTranslatorForLocale, localeFromAcceptLanguage } from '@/lib/i18n';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale, type AppLocale } from '@/lib/i18n/config';

export async function getRequestLocale(): Promise<AppLocale> {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get('x-monity-locale');
  if (isSupportedLocale(headerLocale)) return headerLocale;

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = requestHeaders.get('accept-language');
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

export async function getServerTranslator() {
  const locale = await getRequestLocale();

  return {
    locale,
    ...getTranslatorForLocale(locale),
  };
}
