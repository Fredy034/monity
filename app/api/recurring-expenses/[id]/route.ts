import { NextResponse } from 'next/server';

import { applyRecurringForUser, todayDateOnly } from '@/lib/finance/recurring';
import { parseRecurringExpenseUpdatePayload } from '@/lib/finance/validation';
import { getErrorMessage, jsonError, readJsonBody } from '@/lib/insforge/api';
import { getApiSessionContext, withSessionCookies } from '@/lib/insforge/route-session';

async function verifyReferences(
  client: ReturnType<(typeof import('@/lib/insforge/client'))['createServerInsForgeClient']>,
  userId: string,
  accountId?: string,
  categoryId?: string,
) {
  if (accountId) {
    const { data, error } = await client.database
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { ok: false as const, message: error.message };
    if (!data) return { ok: false as const, message: 'Invalid account reference.' };
  }

  if (categoryId) {
    const { data, error } = await client.database
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .eq('type', 'expense')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .maybeSingle();

    if (error) return { ok: false as const, message: error.message };
    if (!data) return { ok: false as const, message: 'Invalid category reference.' };
  }

  return { ok: true as const };
}

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

  const parsed = parseRecurringExpenseUpdatePayload(payload);
  if (!parsed.ok) return jsonError(400, 'VALIDATION_ERROR', parsed.message);

  const { data: existing, error: existingError } = await client.database
    .from('recurring_expenses')
    .select('id, start_date')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existingError) {
    return jsonError(500, 'RECURRING_READ_FAILED', existingError.message);
  }

  if (!existing) {
    return jsonError(404, 'RECURRING_NOT_FOUND', 'Recurring expense not found.');
  }

  if (parsed.value.start_date && parsed.value.start_date < todayDateOnly()) {
    return jsonError(400, 'INVALID_START_DATE', 'Start date cannot be moved to the past.');
  }

  const refs = await verifyReferences(client, session.user.id, parsed.value.account_id, parsed.value.category_id);
  if (!refs.ok) {
    return jsonError(400, 'INVALID_REFERENCE', refs.message);
  }

  const { amount, amount_effective_from, ...updatableFields } = parsed.value;

  if (Object.keys(updatableFields).length > 0) {
    const { error: updateError } = await client.database
      .from('recurring_expenses')
      .update(updatableFields)
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (updateError) {
      return jsonError(500, 'RECURRING_UPDATE_FAILED', updateError.message);
    }
  }

  if (amount !== undefined) {
    const generation = await applyRecurringForUser(client, session.user.id, todayDateOnly());
    if (generation.error) {
      return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
    }

    if (amount_effective_from && amount_effective_from < todayDateOnly()) {
      return jsonError(400, 'INVALID_EFFECTIVE_DATE', 'Amount changes must be effective today or later.');
    }

    const { error: amountError } = await client.database.from('recurring_expense_amounts').upsert(
      [
        {
          user_id: session.user.id,
          recurring_expense_id: id,
          amount,
          effective_from: amount_effective_from ?? todayDateOnly(),
        },
      ],
      { onConflict: 'recurring_expense_id,effective_from' },
    );

    if (amountError) {
      return jsonError(500, 'RECURRING_AMOUNT_UPDATE_FAILED', amountError.message);
    }
  }

  const generation = await applyRecurringForUser(client, session.user.id, todayDateOnly());
  if (generation.error) {
    return jsonError(500, 'RECURRING_GENERATION_FAILED', generation.error.message);
  }

  const [recurringRes, amountHistoryRes] = await Promise.all([
    client.database
      .from('recurring_expenses')
      .select('id, name, account_id, category_id, frequency, start_date, is_active, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single(),
    client.database
      .from('recurring_expense_amounts')
      .select('amount, effective_from, created_at')
      .eq('user_id', session.user.id)
      .eq('recurring_expense_id', id)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const firstError = recurringRes.error ?? amountHistoryRes.error;
  if (firstError) {
    return jsonError(500, 'RECURRING_READ_FAILED', firstError.message);
  }

  const history = (amountHistoryRes.data ?? []).map((entry) => ({
    amount: Number(entry.amount),
    effective_from: entry.effective_from,
    created_at: entry.created_at,
  }));

  return withSessionCookies(
    NextResponse.json({
      data: {
        ...recurringRes.data,
        current_amount: history[0]?.amount ?? null,
        amount_history: history,
      },
    }),
    session,
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionContext();
  if (!auth.ok) return auth.response;

  const { client, session } = auth.ctx;
  const { id } = await params;

  const { error } = await client.database
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return jsonError(404, 'RECURRING_DELETE_FAILED', error.message);
  }

  return withSessionCookies(NextResponse.json({ success: true }), session);
}
