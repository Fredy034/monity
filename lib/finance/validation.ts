export type AccountType = 'bank' | 'cash' | 'credit_card' | 'debit_card';
export type TransactionType = 'income' | 'expense';
export type RecurringFrequency = 'monthly';

const ACCOUNT_TYPES: AccountType[] = ['bank', 'cash', 'credit_card', 'debit_card'];
const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense'];
const RECURRING_FREQUENCIES: RecurringFrequency[] = ['monthly'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCurrency(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) return null;
  return value;
}

export function parseAmount(input: unknown): number | null {
  const value = typeof input === 'number' ? input : typeof input === 'string' ? Number(input) : NaN;
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
}

export function parseIsoDate(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

export function parseMonthStart(input: unknown): string | null {
  const date = parseIsoDate(input);
  if (!date) return null;
  return date.endsWith('-01') ? date : null;
}

export function parseAccountPayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const initialBalance = parseAmount(input.initialBalance ?? 0);
  const currency = parseCurrency(input.currency ?? 'USD');
  const isActive = typeof input.isActive === 'boolean' ? input.isActive : true;

  if (!name) return { ok: false as const, message: 'Account name is required.' };
  if (!ACCOUNT_TYPES.includes(type as AccountType)) {
    return { ok: false as const, message: 'Invalid account type.' };
  }
  if (initialBalance === null) return { ok: false as const, message: 'Invalid initial balance.' };
  if (!currency) return { ok: false as const, message: 'Invalid currency.' };

  return {
    ok: true as const,
    value: {
      name,
      type: type as AccountType,
      initial_balance: initialBalance,
      currency,
      is_active: isActive,
    },
  };
}

export function parseCategoryPayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const color = typeof input.color === 'string' ? input.color.trim() : null;
  const icon = typeof input.icon === 'string' ? input.icon.trim() : null;

  if (!name) return { ok: false as const, message: 'Category name is required.' };
  if (!TRANSACTION_TYPES.includes(type as TransactionType)) {
    return { ok: false as const, message: 'Invalid category type.' };
  }

  return {
    ok: true as const,
    value: {
      name,
      type: type as TransactionType,
      color: color || null,
      icon: icon || null,
    },
  };
}

export function parseTransactionPayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const accountId = typeof input.accountId === 'string' ? input.accountId.trim() : '';
  const categoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  const type = typeof input.type === 'string' ? input.type.trim() : '';
  const amount = parseAmount(input.amount);
  const description = typeof input.description === 'string' ? input.description.trim() : null;
  const transactionDate = parseIsoDate(input.transactionDate);

  if (!accountId) return { ok: false as const, message: 'Associated account is required.' };
  if (!categoryId) return { ok: false as const, message: 'Associated category is required.' };
  if (!TRANSACTION_TYPES.includes(type as TransactionType)) {
    return { ok: false as const, message: 'Invalid transaction type.' };
  }
  if (amount === null || amount <= 0) return { ok: false as const, message: 'Amount must be greater than 0.' };
  if (!transactionDate) return { ok: false as const, message: 'Invalid transaction date.' };

  return {
    ok: true as const,
    value: {
      account_id: accountId,
      category_id: categoryId,
      type: type as TransactionType,
      amount,
      description: description || null,
      transaction_date: transactionDate,
    },
  };
}

export function parseBudgetPayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const categoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  const periodMonth = parseMonthStart(input.periodMonth);
  const limitAmount = parseAmount(input.limitAmount);

  if (!categoryId) return { ok: false as const, message: 'Category is required.' };
  if (!periodMonth) return { ok: false as const, message: 'periodMonth must be the first day of month (YYYY-MM-01).' };
  if (limitAmount === null || limitAmount <= 0) {
    return { ok: false as const, message: 'Budget limit must be greater than 0.' };
  }

  return {
    ok: true as const,
    value: {
      category_id: categoryId,
      period_month: periodMonth,
      limit_amount: limitAmount,
    },
  };
}

export function parseRecurringExpensePayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const accountId = typeof input.accountId === 'string' ? input.accountId.trim() : '';
  const categoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
  const amount = parseAmount(input.amount);
  const frequency = typeof input.frequency === 'string' ? input.frequency.trim() : 'monthly';
  const startDate = parseIsoDate(input.startDate);
  const isActive = typeof input.isActive === 'boolean' ? input.isActive : true;

  if (!name) return { ok: false as const, message: 'Recurring expense name is required.' };
  if (!accountId) return { ok: false as const, message: 'Associated account is required.' };
  if (!categoryId) return { ok: false as const, message: 'Associated category is required.' };
  if (amount === null || amount <= 0) return { ok: false as const, message: 'Amount must be greater than 0.' };
  if (!RECURRING_FREQUENCIES.includes(frequency as RecurringFrequency)) {
    return { ok: false as const, message: 'Invalid recurring frequency.' };
  }
  if (!startDate) return { ok: false as const, message: 'Invalid start date.' };

  return {
    ok: true as const,
    value: {
      name,
      account_id: accountId,
      category_id: categoryId,
      amount,
      frequency: frequency as RecurringFrequency,
      start_date: startDate,
      is_active: isActive,
    },
  };
}

export function parseRecurringExpenseUpdatePayload(input: unknown) {
  if (!isObject(input)) return { ok: false as const, message: 'Invalid payload.' };

  const next: {
    name?: string;
    account_id?: string;
    category_id?: string;
    frequency?: RecurringFrequency;
    start_date?: string;
    is_active?: boolean;
    amount?: number;
    amount_effective_from?: string;
  } = {};

  if ('name' in input) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) return { ok: false as const, message: 'Recurring expense name is required.' };
    next.name = name;
  }

  if ('accountId' in input) {
    const accountId = typeof input.accountId === 'string' ? input.accountId.trim() : '';
    if (!accountId) return { ok: false as const, message: 'Associated account is required.' };
    next.account_id = accountId;
  }

  if ('categoryId' in input) {
    const categoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : '';
    if (!categoryId) return { ok: false as const, message: 'Associated category is required.' };
    next.category_id = categoryId;
  }

  if ('frequency' in input) {
    const frequency = typeof input.frequency === 'string' ? input.frequency.trim() : '';
    if (!RECURRING_FREQUENCIES.includes(frequency as RecurringFrequency)) {
      return { ok: false as const, message: 'Invalid recurring frequency.' };
    }
    next.frequency = frequency as RecurringFrequency;
  }

  if ('startDate' in input) {
    const startDate = parseIsoDate(input.startDate);
    if (!startDate) return { ok: false as const, message: 'Invalid start date.' };
    next.start_date = startDate;
  }

  if ('isActive' in input) {
    if (typeof input.isActive !== 'boolean') {
      return { ok: false as const, message: 'Invalid active status.' };
    }
    next.is_active = input.isActive;
  }

  if ('amount' in input) {
    const amount = parseAmount(input.amount);
    if (amount === null || amount <= 0) {
      return { ok: false as const, message: 'Amount must be greater than 0.' };
    }

    const amountEffectiveFrom =
      input.amountEffectiveFrom === undefined
        ? new Date().toISOString().slice(0, 10)
        : parseIsoDate(input.amountEffectiveFrom);

    if (!amountEffectiveFrom) {
      return { ok: false as const, message: 'Invalid amount effective date.' };
    }

    next.amount = amount;
    next.amount_effective_from = amountEffectiveFrom;
  }

  if (Object.keys(next).length === 0) {
    return { ok: false as const, message: 'At least one field is required for update.' };
  }

  return { ok: true as const, value: next };
}

export function signedAmount(type: TransactionType, amount: number): number {
  return type === 'income' ? amount : -amount;
}
