import { NextResponse } from 'next/server';

import { createServerInsForgeClient, getAppUrl } from '@/lib/insforge/client';
import { persistOAuthVerifierCookie } from '@/lib/insforge/cookies';

export async function GET() {
  const client = createServerInsForgeClient();
  const redirectTo = `${getAppUrl()}/api/auth/oauth/google/callback`;

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    redirectTo,
    skipBrowserRedirect: true,
  });

  if (error || !data.url || !data.codeVerifier) {
    return NextResponse.json(
      {
        error: error?.error ?? 'OAUTH_START_FAILED',
        message: error?.message ?? 'Could not start Google sign-in.',
        statusCode: error?.statusCode ?? 400,
      },
      { status: error?.statusCode ?? 400 },
    );
  }

  const response = NextResponse.json({ url: data.url });
  return persistOAuthVerifierCookie(response, data.codeVerifier);
}
