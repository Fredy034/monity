import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type AppLocale } from '@/lib/i18n/config';
import { en } from '@/lib/i18n/dictionaries/en';
import { es } from '@/lib/i18n/dictionaries/es';

const dictionaries = {
  en,
  es,
} as const;

type Dictionary = (typeof dictionaries)[AppLocale];

function getByPath(source: unknown, path: string): string | undefined {
  const segments = path.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

export function localeFromAcceptLanguage(value: string | null): AppLocale {
  if (!value) return DEFAULT_LOCALE;
  const normalized = value.toLowerCase();
  if (normalized.includes('es')) return 'es';
  return DEFAULT_LOCALE;
}

export function localeFromPathname(pathname: string | null): AppLocale | null {
  if (!pathname) return null;

  const segment = pathname.split('/').filter(Boolean)[0];
  if (isSupportedLocale(segment)) return segment;
  return null;
}

export function withoutLocalePrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';

  if (isSupportedLocale(parts[0])) {
    const next = parts.slice(1).join('/');
    return next ? `/${next}` : '/';
  }

  return pathname;
}

export function withLocale(locale: AppLocale, href: string): string {
  if (!href.startsWith('/')) return href;

  if (href === '/') return `/${locale}`;

  const [pathname, search = ''] = href.split('?');
  const cleanPathname = withoutLocalePrefix(pathname);
  const prefixedPath = cleanPathname === '/' ? `/${locale}` : `/${locale}${cleanPathname}`;

  return search ? `${prefixedPath}?${search}` : prefixedPath;
}

export function getTranslatorForLocale(locale: AppLocale) {
  const dictionary = dictionaries[locale] as Dictionary;

  return {
    t: (key: string, fallback?: string) => getByPath(dictionary, key) ?? fallback ?? key,
  };
}

export function getSupportedLocales() {
  return SUPPORTED_LOCALES;
}
