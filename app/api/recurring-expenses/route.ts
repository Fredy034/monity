import { NextResponse } from 'next/server';

import { applyRecurringForUser, nextMonthlyChargeDate, todayDateOnly } from '@/lib/finance/recurring';
import { parseRecurringExpensePayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

type AmountHistoryRow = {
  recurring_expense_id: string;
  amount: number | string;
  effective_from: string;
  created_at: string;
};

type OccurrenceRow = {
  recurring_expense_id: string;
  scheduled_date: string;
  occurrence_month: string;
  amount: number | string;
  transaction_id: string | null;
};

async function verifyReferences(
  client: ReturnType<(typeof import('@/lib/insforge/client'))['createServerInsForgeClient']>,
  userId: string,
  accountId: string,
  categoryId: string,
) {
  const [accountRes, categoryRes] = await Promise.all([
    client.database.from('accounts').select('id').eq('id', accountId).eq('user_id', userId).maybeSingle(),
    client.database
      .from('categories')
      .select('id, type, user_id')
      .eq('id', categoryId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .maybeSingle(),
  ]);

  return {
    accountExists: Boolean(accountRes.data),
    categoryExists: Boolean(categoryRes.data),
    isExpenseCategory: categoryRes.data?.type === 'expense',
    error: accountRes.error ?? categoryRes.error,
  };
}

export async function GET() {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;

  const generation = await applyRecurringForUser(client, session.user.id);
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  const [recurringRes, amountHistoryRes, occurrencesRes] = await Promise.all([
    client.database
      .from('recurring_expenses')
      .select('id, name, account_id, category_id, frequency, start_date, is_active, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    client.database
      .from('recurring_expense_amounts')
      .select('recurring_expense_id, amount, effective_from, created_at')
      .eq('user_id', session.user.id)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false }),
    client.database
      .from('recurring_expense_occurrences')
      .select('recurring_expense_id, scheduled_date, occurrence_month, amount, transaction_id')
      .eq('user_id', session.user.id)
      .order('scheduled_date', { ascending: false }),
  ]);

  const firstError = recurringRes.error ?? amountHistoryRes.error ?? occurrencesRes.error;
  if (firstError) {
    return jsonError(500, 'RECURRING_READ_FAILED', firstError.message);
  }

  const today = todayDateOnly();
  const amountHistory = (amountHistoryRes.data ?? []) as AmountHistoryRow[];
  const occurrences = (occurrencesRes.data ?? []) as OccurrenceRow[];

  const historyByRecurring = new Map<string, AmountHistoryRow[]>();
  for (const row of amountHistory) {
    const rows = historyByRecurring.get(row.recurring_expense_id) ?? [];
    rows.push(row);
    historyByRecurring.set(row.recurring_expense_id, rows);
  }

  const lastOccurrenceByRecurring = new Map<string, OccurrenceRow>();
  for (const occurrence of occurrences) {
    if (!lastOccurrenceByRecurring.has(occurrence.recurring_expense_id)) {
      lastOccurrenceByRecurring.set(occurrence.recurring_expense_id, occurrence);
    }
  }

  const data = (recurringRes.data ?? []).map((item) => {
    const history = historyByRecurring.get(item.id) ?? [];
    const currentAmountRow = history.find((entry) => entry.effective_from <= today) ?? history.at(0) ?? null;

    const lastOccurrence = lastOccurrenceByRecurring.get(item.id) ?? null;
    const referenceDate = lastOccurrence?.scheduled_date ?? today;

    return {
      ...item,
      current_amount: currentAmountRow ? Number(currentAmountRow.amount) : null,
      next_charge_date: item.is_active ? nextMonthlyChargeDate(item.start_date, referenceDate) : null,
      last_generated_date: lastOccurrence?.scheduled_date ?? null,
      amount_history: history.map((entry) => ({
        amount: Number(entry.amount),
        effective_from: entry.effective_from,
        created_at: entry.created_at,
      })),
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

  const parsed = parseRecurringExpensePayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const refs = await verifyReferences(client, session.user.id, parsed.value.account_id, parsed.value.category_id);
  if (refs.error) {
    return jsonError(500, 'REFERENCE_CHECK_FAILED', refs.error.message);
  }

  if (!refs.accountExists) {
    return jsonError(400, 'INVALID_ACCOUNT', 'The selected account does not belong to you.');
  }

  if (!refs.categoryExists || !refs.isExpenseCategory) {
    return jsonError(400, 'INVALID_CATEGORY', 'The selected category must be an expense category available to you.');
  }

  const { amount, ...basePayload } = parsed.value;

  const { data: recurring, error: recurringError } = await client.database
    .from('recurring_expenses')
    .insert([{ user_id: session.user.id, ...basePayload }])
    .select('id, name, account_id, category_id, frequency, start_date, is_active, created_at, updated_at')
    .single();

  if (recurringError || !recurring) {
    return jsonError(500, 'RECURRING_CREATE_FAILED', recurringError?.message ?? 'Could not create recurring expense.');
  }

  const { error: amountError } = await client.database.from('recurring_expense_amounts').insert([
    {
      user_id: session.user.id,
      recurring_expense_id: recurring.id,
      amount,
      effective_from: recurring.start_date,
    },
  ]);

  if (amountError) {
    return jsonError(500, 'RECURRING_AMOUNT_CREATE_FAILED', amountError.message);
  }

  const generation = await applyRecurringForUser(client, session.user.id);
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  return withSessionCookies(
    NextResponse.json(
      {
        data: {
          ...recurring,
          current_amount: amount,
        },
      },
      { status: 201 },
    ),
    session,
  );
}
