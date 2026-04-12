import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from '@/lib/i18n/config';

function detectPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.includes('es')) return 'es' as const;
  return DEFAULT_LOCALE;
}

function getLocaleSegment(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0];
  return isSupportedLocale(segment) ? segment : null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const localeInPath = getLocaleSegment(pathname);

  if (!localeInPath) {
    const locale = detectPreferredLocale(request);
    const target = new URL(`/${locale}${pathname}${search}`, request.url);
    const response = NextResponse.redirect(target);
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  const internalPathname = pathname.replace(new RegExp(`^/${localeInPath}(?=/|$)`), '') || '/';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-monity-locale', localeInPath);

  const target = new URL(`${internalPathname}${search}`, request.url);
  const response = NextResponse.rewrite(target, {
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set(LOCALE_COOKIE_NAME, localeInPath, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
