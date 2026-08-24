import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { persistSessionCookies } from '@/lib/insforge/cookies';
import { upsertUserProfile } from '@/lib/insforge/session';
import { isUserProfileActive } from '@/lib/insforge/session-policy';

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: LoginPayload;

  try {
    payload = await readJsonBody<LoginPayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body'));
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();

  if (!email || !password) {
    return jsonError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data) {
    const message = error?.message ?? 'Invalid email or password.';
    return jsonError(error?.statusCode ?? 401, error?.error ?? 'INVALID_CREDENTIALS', message);
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

  const response = NextResponse.json(
    {
      user: data.user,
      nextStep: '/dashboard',
    },
    { status: 200 },
  );

  persistSessionCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
  });

  return response;
}
