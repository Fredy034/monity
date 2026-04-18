import { NextResponse } from 'next/server';

import { applyRecurringForUser } from '@/lib/finance/recurring';
import { parseTransactionPayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { createServerInsForgeClient } from '@/lib/insforge/client';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type TxCursor = {
  transactionDate: string;
  id: string;
};

function clampPageSize(raw: string | null) {
  const parsed = Number(raw ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_PAGE_SIZE);
}

function parseAmountFilter(raw: string | null) {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function decodeCursor(raw: string | null): TxCursor | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<TxCursor>;
    if (!parsed.transactionDate || !parsed.id) return null;
    return { transactionDate: parsed.transactionDate, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: TxCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

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
  const filterType = url.searchParams.get('type');
  const fromDate = url.searchParams.get('fromDate');
  const toDate = url.searchParams.get('toDate');
  const search = url.searchParams.get('search')?.trim();
  const minAmount = parseAmountFilter(url.searchParams.get('minAmount'));
  const maxAmount = parseAmountFilter(url.searchParams.get('maxAmount'));
  const pageSize = clampPageSize(url.searchParams.get('pageSize'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));

  if (url.searchParams.get('cursor') && !cursor) {
    return jsonError(400, 'INVALID_CURSOR', 'The provided cursor is not valid.');
  }

  if (filterType && filterType !== 'income' && filterType !== 'expense') {
    return jsonError(400, 'INVALID_FILTER', 'The selected transaction type is not valid.');
  }

  let query = client.database
    .from('transactions')
    .select('id, account_id, category_id, type, amount, description, transaction_date, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);

  if (accountId) query = query.eq('account_id', accountId);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (filterType) query = query.eq('type', filterType);
  if (fromDate) query = query.gte('transaction_date', fromDate);
  if (toDate) query = query.lte('transaction_date', toDate);
  if (search) query = query.ilike('description', `%${search}%`);
  if (minAmount !== null) query = query.gte('amount', minAmount);
  if (maxAmount !== null) query = query.lte('amount', maxAmount);

  if (cursor) {
    // Composite cursor keeps pagination stable across date ties.
    query = query.or(
      `transaction_date.lt.${cursor.transactionDate},and(transaction_date.eq.${cursor.transactionDate},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(500, 'TRANSACTIONS_READ_FAILED', error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const normalized = pageRows.map((item) => ({ ...item, amount: Number(item.amount) }));
  const lastItem = pageRows.at(-1);
  const nextCursor =
    hasMore && lastItem
      ? encodeCursor({
          transactionDate: lastItem.transaction_date,
          id: lastItem.id,
        })
      : null;

  return withSessionCookies(
    NextResponse.json({
      data: normalized,
      page: {
        pageSize,
        nextCursor,
        hasMore,
      },
    }),
    session,
  );
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
