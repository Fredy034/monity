import { NextResponse } from 'next/server';

import { applyRecurringForUser } from '@/lib/finance/recurring';
import { parseTransactionPayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

async function verifyReferences(
  client: ReturnType<typeof createServerInsForgeClient>,
  userId: string,
  accountId: string,
  categoryId: string,
) {
  const [accountRes, categoryRes] = await Promise.all([
    client.database.from('accounts').select('id').eq('id', accountId).eq('user_id', userId).maybeSingle(),
    client.database
      .from('categories')
      .select('id, user_id')
      .eq('id', categoryId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .maybeSingle(),
  ]);

  return {
    accountExists: Boolean(accountRes.data),
    categoryExists: Boolean(categoryRes.data),
    error: accountRes.error ?? categoryRes.error,
  };
}

export async function GET(request: Request) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const generation = await applyRecurringForUser(client, session.user.id);
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get('accountId');
  const categoryId = url.searchParams.get('categoryId');
  const limit = Number(url.searchParams.get('limit') ?? 50);

  let query = client.database
    .from('transactions')
    .select('id, account_id, category_id, type, amount, description, transaction_date, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50);

  if (accountId) query = query.eq('account_id', accountId);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;

  if (error) {
    return jsonError(500, 'TRANSACTIONS_READ_FAILED', error.message);
  }

  const normalized = (data ?? []).map((item) => ({ ...item, amount: Number(item.amount) }));

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

  const parsed = parseTransactionPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const refs = await verifyReferences(client, session.user.id, parsed.value.account_id, parsed.value.category_id);

  if (refs.error) {
    return jsonError(500, 'REFERENCE_CHECK_FAILED', refs.error.message);
  }

  if (!refs.accountExists) {
    return jsonError(400, 'INVALID_ACCOUNT', 'The selected account does not belong to you.');
  }

  if (!refs.categoryExists) {
    return jsonError(400, 'INVALID_CATEGORY', 'The selected category is not available.');
  }

  const { data, error } = await client.database
    .from('transactions')
    .insert([{ user_id: session.user.id, ...parsed.value }])
    .select('id, account_id, category_id, type, amount, description, transaction_date, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(500, 'TRANSACTION_CREATE_FAILED', error?.message ?? 'Could not create transaction.');
  }

  return withSessionCookies(
    NextResponse.json({ data: { ...data, amount: Number(data.amount) } }, { status: 201 }),
    session,
  );
}
