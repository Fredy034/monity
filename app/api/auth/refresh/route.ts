import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { persistSessionCookies } from '@/lib/insforge/cookies';
import { AUTH_REFRESH_COOKIE, upsertUserProfile } from '@/lib/insforge/session';
import { isUserProfileActive } from '@/lib/insforge/session-policy';

type RefreshPayload = {
  refreshToken?: string;
};

export async function POST(request: Request) {
  let payload: RefreshPayload;

  try {
    payload = await readJsonBody<RefreshPayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body'));
  }

  const cookieStore = await cookies();
  const refreshToken = payload.refreshToken?.trim() ?? cookieStore.get(AUTH_REFRESH_COOKIE)?.value ?? null;

  if (!refreshToken) {
    return jsonError(400, 'VALIDATION_ERROR', 'refreshToken is required.');
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.refreshSession({ refreshToken });

  if (error || !data?.accessToken || !data.user) {
    return jsonError(
      error?.statusCode ?? 401,
      error?.error ?? 'REFRESH_FAILED',
      error?.message ?? 'Session refresh failed.',
    );
  }

  const profile = await upsertUserProfile({
    accessToken: data.accessToken,
    user: data.user,
  });

  if (!profile) {
    return jsonError(500, 'PROFILE_SYNC_FAILED', 'Could not initialize the application profile.');
  }

  if (!isUserProfileActive(profile)) {
    return jsonError(403, 'ACCOUNT_INACTIVE', 'This account is inactive.');
  }

  const response = NextResponse.json({ user: data.user, nextStep: '/dashboard' });
  persistSessionCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
  });

  return response;
}
