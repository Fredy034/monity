import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { jsonError } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { persistSessionCookies } from '@/lib/insforge/cookies';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, getResolvedSession } from '@/lib/insforge/session';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value ?? null;

  const session = await getResolvedSession({ accessToken, refreshToken });

  if (!session) {
    return jsonError(401, 'UNAUTHENTICATED', 'You must be signed in to access this resource.');
  }

  const client = createServerInsForgeClient(session.accessToken);
  const { data: profile } = await client.database
    .from('user_profiles')
    .select('user_id, email, display_name, status, last_login_at, created_at, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const response = NextResponse.json({
    user: session.user,
    profile: profile ?? null,
  });

  return persistSessionCookies(response, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}
