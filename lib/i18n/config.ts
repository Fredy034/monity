export const SUPPORTED_LOCALES = ['en', 'es'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE_NAME = 'monity_locale';

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'es';
}
