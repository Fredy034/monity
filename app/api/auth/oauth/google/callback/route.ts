import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { createServerInsForgeClient, getAppUrl } from '@/lib/insforge/client';
import { clearOAuthVerifierCookie, clearSessionCookies, persistSessionCookies } from '@/lib/insforge/cookies';
import { AUTH_OAUTH_VERIFIER_COOKIE, upsertUserProfile } from '@/lib/insforge/session';
import { isUserProfileActive } from '@/lib/insforge/session-policy';

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const code = request.nextUrl.searchParams.get('insforge_code');
  const oauthError = request.nextUrl.searchParams.get('error');
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get(AUTH_OAUTH_VERIFIER_COOKIE)?.value;

  if (oauthError) {
    const response = NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(oauthError)}`, appUrl));
    clearOAuthVerifierCookie(response);
    return response;
  }

  if (!code || !codeVerifier) {
    const response = NextResponse.redirect(new URL('/sign-in?error=oauth_callback_invalid', appUrl));
    clearOAuthVerifierCookie(response);
    return clearSessionCookies(response);
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.exchangeOAuthCode(code, codeVerifier);

  if (error || !data?.accessToken || !data.user) {
    const response = NextResponse.redirect(new URL('/sign-in?error=oauth_exchange_failed', appUrl));
    clearOAuthVerifierCookie(response);
    return clearSessionCookies(response);
  }

  const profile = await upsertUserProfile({
    accessToken: data.accessToken,
    user: data.user,
  });

  if (!profile || !isUserProfileActive(profile)) {
    const errorCode = profile ? 'account_inactive' : 'profile_sync_failed';
    const response = NextResponse.redirect(new URL(`/sign-in?error=${errorCode}`, appUrl));
    clearOAuthVerifierCookie(response);
    return clearSessionCookies(response);
  }

  const response = NextResponse.redirect(new URL('/dashboard', appUrl));
  clearOAuthVerifierCookie(response);
  return persistSessionCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
  });
}
