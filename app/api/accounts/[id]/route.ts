import { NextResponse } from 'next/server';

import { parseAccountPayload } from '@/lib/finance/validation';
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

  const parsed = parseAccountPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data, error } = await client.database
    .from('accounts')
    .update(parsed.value)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('id, name, type, initial_balance, currency, is_active, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(404, 'ACCOUNT_UPDATE_FAILED', error?.message ?? 'Could not update account.');
  }

  return withSessionCookies(
    NextResponse.json({ data: { ...data, initial_balance: Number(data.initial_balance) } }),
    session,
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

  const { error } = await client.database.from('accounts').delete().eq('id', id).eq('user_id', session.user.id);

  if (error) {
    return jsonError(404, 'ACCOUNT_DELETE_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ success: true }), session);
}
