import { NextResponse } from 'next/server';

import { validateCategoryDelete } from '@/lib/finance/delete-validation';
import { parseCategoryPayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

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
    .update(parsed.value)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('is_system', false)
    .select('id, user_id, name, type, color, icon, is_system, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(404, 'CATEGORY_UPDATE_FAILED', error?.message ?? 'Could not update category.');
  }

  return withSessionCookies(NextResponse.json({ data }), session);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

  const validation = await validateCategoryDelete(client, session.user.id, id);
  if (!validation.ok) {
    return jsonError(validation.status, validation.code, validation.message, validation.nextActions);
  }

  const { error } = await client.database
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('is_system', false);

  if (error) {
    return jsonError(500, 'CATEGORY_DELETE_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ success: true }), session);
}
