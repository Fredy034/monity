import { NextResponse } from 'next/server';

import { parseTransactionPayload } from '@/lib/finance/validation';
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

  const parsed = parseTransactionPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data: account } = await client.database
    .from('accounts')
    .select('id')
    .eq('id', parsed.value.account_id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  const { data: category } = await client.database
    .from('categories')
    .select('id')
    .eq('id', parsed.value.category_id)
    .or(`user_id.eq.${session.user.id},user_id.is.null`)
    .maybeSingle();

  if (!account) return jsonError(400, 'INVALID_ACCOUNT', 'The selected account does not belong to you.');
  if (!category) return jsonError(400, 'INVALID_CATEGORY', 'The selected category is not available.');

  const { data, error } = await client.database
    .from('transactions')
    .update(parsed.value)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('id, account_id, category_id, type, amount, description, transaction_date, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(404, 'TRANSACTION_UPDATE_FAILED', error?.message ?? 'Could not update transaction.');
  }

  return withSessionCookies(NextResponse.json({ data: { ...data, amount: Number(data.amount) } }), session);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

  const { error } = await client.database.from('transactions').delete().eq('id', id).eq('user_id', session.user.id);

  if (error) {
    return jsonError(404, 'TRANSACTION_DELETE_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ success: true }), session);
}
