import { NextResponse } from 'next/server';

import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

type UpdateProfilePayload = {
  displayName?: string;
};

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length > 80) return null;
  return normalized;
}

export async function GET() {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const { data: profile, error } = await client.database
    .from('user_profiles')
    .select('user_id, email, display_name, status, last_login_at, created_at, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    return jsonError(500, 'PROFILE_READ_FAILED', error.message);
  }

  return withSessionCookies(
    NextResponse.json({
      user: session.user,
      profile: profile ?? null,
    }),
    session,
  );
}

export async function PATCH(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  let payload: UpdateProfilePayload;
  try {
    payload = await readJsonBody<UpdateProfilePayload>(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body.'));
  }

  const displayName = normalizeDisplayName(payload.displayName);
  if (!displayName) {
    return jsonError(400, 'VALIDATION_ERROR', 'displayName is required and must be 1-80 characters.');
  }

  const { data, error } = await client.database
    .from('user_profiles')
    .update({ display_name: displayName })
    .eq('user_id', session.user.id)
    .select('user_id, email, display_name, status, last_login_at, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(500, 'PROFILE_UPDATE_FAILED', error?.message ?? 'Could not update profile.');
  }

  return withSessionCookies(NextResponse.json({ profile: data }), session);
}
