type ServerInsForgeClient = ReturnType<(typeof import('@/lib/insforge/client'))['createServerInsForgeClient']>;

type ValidationFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
  nextActions?: string;
};

type ValidationSuccess<TRecord> = {
  ok: true;
  record: TRecord;
};

export type DeleteValidationResult<TRecord> = ValidationFailure | ValidationSuccess<TRecord>;

function fail(status: number, code: string, message: string, nextActions?: string): ValidationFailure {
  return {
    ok: false,
    status,
    code,
    message,
    ...(nextActions ? { nextActions } : {}),
  };
}

async function countRows(
  client: ServerInsForgeClient,
  table: string,
  userId: string,
  field: string,
  value: string,
): Promise<{ count: number | null; error: string | null }> {
  const result = await client.database
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq(field, value);

  return {
    count: result.count,
    error: result.error?.message ?? null,
  };
}

export async function validateAccountDelete(
  client: ServerInsForgeClient,
  userId: string,
  id: string,
): Promise<DeleteValidationResult<{ id: string; name: string }>> {
  const accountResult = await client.database
    .from('accounts')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (accountResult.error) {
    return fail(500, 'ACCOUNT_READ_FAILED', accountResult.error.message);
  }

  if (!accountResult.data) {
    return fail(404, 'ACCOUNT_NOT_FOUND', 'Account not found.');
  }

  const [transactionDeps, recurringDeps] = await Promise.all([
    countRows(client, 'transactions', userId, 'account_id', id),
    countRows(client, 'recurring_expenses', userId, 'account_id', id),
  ]);

  if (transactionDeps.error || recurringDeps.error) {
    return fail(
      500,
      'ACCOUNT_DEPENDENCY_CHECK_FAILED',
      transactionDeps.error ?? recurringDeps.error ?? 'Could not validate account dependencies.',
    );
  }

  const txCount = transactionDeps.count ?? 0;
  const recurringCount = recurringDeps.count ?? 0;

  if (txCount > 0 || recurringCount > 0) {
    return fail(
      409,
      'ACCOUNT_DELETE_BLOCKED',
      'This account cannot be deleted because it is still referenced by transactions or recurring expenses.',
      'Move or delete dependent transactions/recurring expenses first.',
    );
  }

  return { ok: true, record: accountResult.data };
}

export async function validateCategoryDelete(
  client: ServerInsForgeClient,
  userId: string,
  id: string,
): Promise<DeleteValidationResult<{ id: string; name: string }>> {
  const categoryResult = await client.database
    .from('categories')
    .select('id, user_id, name, is_system')
    .eq('id', id)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .maybeSingle();

  if (categoryResult.error) {
    return fail(500, 'CATEGORY_READ_FAILED', categoryResult.error.message);
  }

  if (!categoryResult.data || categoryResult.data.user_id !== userId) {
    return fail(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  }

  if (categoryResult.data.is_system) {
    return fail(409, 'CATEGORY_DELETE_BLOCKED', 'System categories cannot be deleted.');
  }

  const [transactionDeps, budgetDeps, recurringDeps] = await Promise.all([
    countRows(client, 'transactions', userId, 'category_id', id),
    countRows(client, 'budgets', userId, 'category_id', id),
    countRows(client, 'recurring_expenses', userId, 'category_id', id),
  ]);

  if (transactionDeps.error || budgetDeps.error || recurringDeps.error) {
    return fail(
      500,
      'CATEGORY_DEPENDENCY_CHECK_FAILED',
      transactionDeps.error ?? budgetDeps.error ?? recurringDeps.error ?? 'Could not validate category dependencies.',
    );
  }

  const txCount = transactionDeps.count ?? 0;
  const budgetCount = budgetDeps.count ?? 0;
  const recurringCount = recurringDeps.count ?? 0;

  if (txCount > 0 || budgetCount > 0 || recurringCount > 0) {
    return fail(
      409,
      'CATEGORY_DELETE_BLOCKED',
      'This category cannot be deleted because it is still referenced by budgets, transactions, or recurring expenses.',
      'Reassign or delete dependent records first.',
    );
  }

  return {
    ok: true,
    record: {
      id: categoryResult.data.id,
      name: categoryResult.data.name,
    },
  };
}

export async function validateBudgetDelete(
  client: ServerInsForgeClient,
  userId: string,
  id: string,
): Promise<DeleteValidationResult<{ id: string }>> {
  const budgetResult = await client.database
    .from('budgets')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (budgetResult.error) {
    return fail(500, 'BUDGET_READ_FAILED', budgetResult.error.message);
  }

  if (!budgetResult.data) {
    return fail(404, 'BUDGET_NOT_FOUND', 'Budget not found.');
  }

  return { ok: true, record: budgetResult.data };
}

export async function validateTransactionDelete(
  client: ServerInsForgeClient,
  userId: string,
  id: string,
): Promise<DeleteValidationResult<{ id: string }>> {
  const transactionResult = await client.database
    .from('transactions')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (transactionResult.error) {
    return fail(500, 'TRANSACTION_READ_FAILED', transactionResult.error.message);
  }

  if (!transactionResult.data) {
    return fail(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
  }

  return { ok: true, record: transactionResult.data };
}

export async function validateRecurringExpenseDelete(
  client: ServerInsForgeClient,
  userId: string,
  id: string,
): Promise<DeleteValidationResult<{ id: string; name: string }>> {
  const recurringResult = await client.database
    .from('recurring_expenses')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (recurringResult.error) {
    return fail(500, 'RECURRING_READ_FAILED', recurringResult.error.message);
  }

  if (!recurringResult.data) {
    return fail(404, 'RECURRING_NOT_FOUND', 'Recurring expense not found.');
  }

  const transactionsResult = await client.database
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('recurring_expense_id', id);

  if (transactionsResult.error) {
    return fail(500, 'RECURRING_DEPENDENCY_CHECK_FAILED', transactionsResult.error.message);
  }

  if ((transactionsResult.count ?? 0) > 0) {
    return fail(
      409,
      'RECURRING_DELETE_BLOCKED',
      'This recurring expense has generated transactions and cannot be deleted.',
      'Pause it instead to preserve historical records.',
    );
  }

  return { ok: true, record: recurringResult.data };
}
