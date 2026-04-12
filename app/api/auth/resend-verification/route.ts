import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient, getAppUrl } from '@/lib/insforge/client';

type ResendPayload = {
  email?: string;
};

export async function POST(request: Request) {
  let payload: ResendPayload;

  try {
    payload = await readJsonBody<ResendPayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body'));
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return jsonError(400, 'VALIDATION_ERROR', 'Email is required.');
  }

  const client = createServerInsForgeClient();
  const { data, error } = await client.auth.resendVerificationEmail({
    email,
    redirectTo: `${getAppUrl()}/verify-email`,
  });

  if (error || !data) {
    return jsonError(
      error?.statusCode ?? 400,
      error?.error ?? 'VERIFICATION_RESEND_FAILED',
      error?.message ?? 'Could not resend verification email.',
    );
  }

  return NextResponse.json({ success: true, message: data.message });
}
