import { NextResponse } from 'next/server';

import { parseBudgetPayload } from '@/lib/finance/validation';
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

  const parsed = parseBudgetPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data, error } = await client.database
    .from('budgets')
    .update(parsed.value)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('id, category_id, period_month, limit_amount, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(404, 'BUDGET_UPDATE_FAILED', error?.message ?? 'Could not update budget.');
  }

  return withSessionCookies(NextResponse.json({ data: { ...data, limit_amount: Number(data.limit_amount) } }), session);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

  const { error } = await client.database.from('budgets').delete().eq('id', id).eq('user_id', session.user.id);

  if (error) {
    return jsonError(404, 'BUDGET_DELETE_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ success: true }), session);
}
