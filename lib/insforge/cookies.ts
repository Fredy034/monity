import type { NextResponse } from 'next/server';

import { AUTH_ACCESS_COOKIE, AUTH_OAUTH_VERIFIER_COOKIE, AUTH_REFRESH_COOKIE, type ResolvedSession } from './session';

const isProduction = process.env.NODE_ENV === 'production';

function cookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
  };
}

export function persistSessionCookies(
  response: NextResponse,
  session: Pick<ResolvedSession, 'accessToken' | 'refreshToken'>,
) {
  response.cookies.set(AUTH_ACCESS_COOKIE, session.accessToken, {
    ...cookieBaseOptions(),
    maxAge: 60 * 60 * 24,
  });

  if (session.refreshToken) {
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshToken, {
      ...cookieBaseOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_COOKIE, '', {
    ...cookieBaseOptions(),
    maxAge: 0,
  });

  response.cookies.set(AUTH_REFRESH_COOKIE, '', {
    ...cookieBaseOptions(),
    maxAge: 0,
  });

  return response;
}

export function persistOAuthVerifierCookie(response: NextResponse, codeVerifier: string) {
  response.cookies.set(AUTH_OAUTH_VERIFIER_COOKIE, codeVerifier, {
    ...cookieBaseOptions(),
    maxAge: 60 * 10,
  });

  return response;
}

export function clearOAuthVerifierCookie(response: NextResponse) {
  response.cookies.set(AUTH_OAUTH_VERIFIER_COOKIE, '', {
    ...cookieBaseOptions(),
    maxAge: 0,
  });

  return response;
}
