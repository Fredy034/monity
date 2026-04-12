import { NextResponse } from 'next/server';

import { parseBudgetPayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

export async function GET(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const url = new URL(request.url);
  const periodMonth = url.searchParams.get('periodMonth');

  let query = client.database
    .from('budgets')
    .select('id, category_id, period_month, limit_amount, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('period_month', { ascending: false });

  if (periodMonth) {
    query = query.eq('period_month', periodMonth);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(500, 'BUDGETS_READ_FAILED', error.message);
  }

  const normalized = (data ?? []).map((item) => ({ ...item, limit_amount: Number(item.limit_amount) }));

  return withSessionCookies(NextResponse.json({ data: normalized }), session);
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

  const parsed = parseBudgetPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data: category } = await client.database
    .from('categories')
    .select('id')
    .eq('id', parsed.value.category_id)
    .or(`user_id.eq.${session.user.id},user_id.is.null`)
    .maybeSingle();

  if (!category) {
    return jsonError(400, 'INVALID_CATEGORY', 'Budget category is not available.');
  }

  const { data, error } = await client.database
    .from('budgets')
    .upsert([{ user_id: session.user.id, ...parsed.value }], {
      onConflict: 'user_id,category_id,period_month',
    })
    .select('id, category_id, period_month, limit_amount, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(500, 'BUDGET_SAVE_FAILED', error?.message ?? 'Could not save budget.');
  }

  return withSessionCookies(
    NextResponse.json({ data: { ...data, limit_amount: Number(data.limit_amount) } }, { status: 201 }),
    session,
  );
}
