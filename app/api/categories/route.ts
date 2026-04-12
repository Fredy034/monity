import { NextResponse } from 'next/server';

import { parseCategoryPayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

export async function GET() {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const { data, error } = await client.database
    .from('categories')
    .select('id, user_id, name, type, color, icon, is_system, created_at, updated_at')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return jsonError(500, 'CATEGORIES_READ_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ data: data ?? [] }), session);
}

export async function POST(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    return jsonError(400, 'BAD_REQUEST', getErrorMessage(error, 'Invalid request body.'));
  }

  const parsed = parseCategoryPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data, error } = await client.database
    .from('categories')
    .insert([{ user_id: session.user.id, is_system: false, ...parsed.value }])
    .select('id, user_id, name, type, color, icon, is_system, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(500, 'CATEGORY_CREATE_FAILED', error?.message ?? 'Could not create category.');
  }

  return withSessionCookies(NextResponse.json({ data }, { status: 201 }), session);
}
