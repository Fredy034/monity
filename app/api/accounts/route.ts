import { NextResponse } from 'next/server';

import { parseAccountPayload, signedAmount, type TransactionType } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

export async function GET() {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const [accountsResult, transactionsResult] = await Promise.all([
    client.database
      .from('accounts')
      .select('id, name, type, initial_balance, currency, is_active, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    client.database.from('transactions').select('account_id, amount, type').eq('user_id', session.user.id),
  ]);

  if (accountsResult.error) {
    return jsonError(500, 'ACCOUNTS_READ_FAILED', accountsResult.error.message);
  }

  if (transactionsResult.error) {
    return jsonError(500, 'TRANSACTIONS_READ_FAILED', transactionsResult.error.message);
  }

  const movementMap = new Map<string, number>();

  for (const tx of transactionsResult.data ?? []) {
    const value = signedAmount(tx.type as TransactionType, Number(tx.amount));
    movementMap.set(tx.account_id, (movementMap.get(tx.account_id) ?? 0) + value);
  }

  const data = (accountsResult.data ?? []).map((account) => {
    const movement = movementMap.get(account.id) ?? 0;
    const currentBalance = Number(account.initial_balance) + movement;

    return {
      ...account,
      initial_balance: Number(account.initial_balance),
      current_balance: Number(currentBalance.toFixed(2)),
    };
  });

  return withSessionCookies(NextResponse.json({ data }), session);
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

  const parsed = parseAccountPayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data, error } = await client.database
    .from('accounts')
    .insert([{ user_id: session.user.id, ...parsed.value }])
    .select('id, name, type, initial_balance, currency, is_active, created_at, updated_at')
    .single();

  if (error || !data) {
    return jsonError(500, 'ACCOUNT_CREATE_FAILED', error?.message ?? 'Could not create account.');
  }

  const response = NextResponse.json(
    {
      data: {
        ...data,
        initial_balance: Number(data.initial_balance),
        current_balance: Number(data.initial_balance),
      },
    },
    { status: 201 },
  );

  return withSessionCookies(response, session);
}
