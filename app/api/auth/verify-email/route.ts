import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { persistSessionCookies } from '@/lib/insforge/cookies';
import { upsertUserProfile } from '@/lib/insforge/session';

type VerifyEmailPayload = {
  email?: string;
  otp?: string;
};

export async function POST(request: Request) {
  let payload: VerifyEmailPayload;

  try {
    payload = await readJsonBody<VerifyEmailPayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body'));
  }

  const email = payload.email?.trim().toLowerCase();
  const otp = payload.otp?.trim();

  if (!email || !otp) {
    return jsonError(400, 'VALIDATION_ERROR', 'Email and verification code are required.');
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.verifyEmail({
    email,
    otp,
  });

  if (error || !data) {
    return jsonError(
      error?.statusCode ?? 400,
      error?.error ?? 'VERIFICATION_FAILED',
      error?.message ?? 'Verification failed.',
    );
  }

  const response = NextResponse.json({
    user: data.user,
    nextStep: '/dashboard',
  });

  persistSessionCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
  });

  await upsertUserProfile({
    accessToken: data.accessToken,
    user: data.user,
  });

  return response;
}
