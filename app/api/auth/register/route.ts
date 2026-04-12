import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient, getAppUrl } from '@/lib/insforge/client';
import { persistSessionCookies } from '@/lib/insforge/cookies';
import { upsertUserProfile } from '@/lib/insforge/session';

type RegisterPayload = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  let payload: RegisterPayload;

  try {
    payload = await readJsonBody<RegisterPayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body'));
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const name = payload.name?.trim();

  if (!email || !password) {
    return jsonError(400, 'VALIDATION_ERROR', 'Email and password are required.');
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    name: name || undefined,
    redirectTo: `${getAppUrl()}/verify-email`,
  });

  if (error || !data) {
    return jsonError(
      error?.statusCode ?? 400,
      error?.error ?? 'REGISTRATION_FAILED',
      error?.message ?? 'Could not create account.',
    );
  }

  const response = NextResponse.json(
    {
      user: data.user ?? null,
      requiresVerification: Boolean(data.requireEmailVerification),
      nextStep: data.accessToken ? '/dashboard' : '/verify-email',
    },
    { status: 201 },
  );

  if (data.accessToken && data.user) {
    persistSessionCookies(response, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
    });

    await upsertUserProfile({
      accessToken: data.accessToken,
      user: data.user,
    });
  }

  return response;
}
