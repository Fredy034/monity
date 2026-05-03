import type { createServerInsForgeClient } from '@/lib/insforge/client';

const DEFAULT_TIME_ZONE = 'UTC';
const DEFAULT_CURRENCY = 'USD';
const FX_PROVIDER = 'frankfurter';
const FX_API_BASE_URL = process.env.FX_RATE_API_URL ?? 'https://api.frankfurter.app';

type ServerInsForgeClient = ReturnType<typeof createServerInsForgeClient>;

export type RecurringExpenseRow = {
  id: string;
  name: string;
  account_id: string;
  category_id: string;
  currency: string;
  frequency: 'monthly';
  start_date: string;
  is_active: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type ExchangePair = {
  baseCurrency: string;
  quoteCurrency: string;
};

type FxApiResponse = {
  date?: string;
  rates?: Record<string, number>;
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function normalizeCurrency(value?: string | null) {
  if (!value) return DEFAULT_CURRENCY;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY;
}

export function normalizeTimeZone(value?: string | null) {
  if (!value) return DEFAULT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function getDateFormatter(timeZone: string) {
  const normalized = normalizeTimeZone(timeZone);
  const cached = dateFormatterCache.get(normalized);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalized,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  dateFormatterCache.set(normalized, formatter);
  return formatter;
}

export function formatDateOnlyInTimeZone(date: Date, timeZone: string = DEFAULT_TIME_ZONE) {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

export function todayDateOnly(timeZone: string = DEFAULT_TIME_ZONE) {
  return formatDateOnlyInTimeZone(new Date(), timeZone);
}

export function currentExecutionTime() {
  return new Date().toISOString();
}

export function monthStart(dateOnly: string) {
  return `${dateOnly.slice(0, 7)}-01`;
}

function daysInMonth(year: number, monthIndexZeroBased: number) {
  return new Date(Date.UTC(year, monthIndexZeroBased + 1, 0)).getUTCDate();
}

function asDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addMonths(dateOnly: string, delta: number) {
  const [yearStr, monthStr, dayStr] = dateOnly.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);

  const shiftedMonth = month + delta;
  const nextYear = year + Math.floor(shiftedMonth / 12);
  const nextMonth = ((shiftedMonth % 12) + 12) % 12;
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));

  return asDateOnly(new Date(Date.UTC(nextYear, nextMonth, nextDay)));
}

export function nextMonthlyChargeDate(startDate: string, referenceDate: string) {
  let candidate = `${referenceDate.slice(0, 7)}-${startDate.slice(8, 10)}`;
  candidate = addMonths(candidate, 0);

  if (candidate < startDate) {
    candidate = startDate;
  }

  if (candidate <= referenceDate) {
    candidate = addMonths(candidate, 1);
  }

  return candidate;
}

async function fetchLatestRates(baseCurrency: string, quoteCurrencies: string[]) {
  const base = normalizeCurrency(baseCurrency);
  const quotes = [
    ...new Set(quoteCurrencies.map((value) => normalizeCurrency(value)).filter((value) => value !== base)),
  ];

  if (quotes.length === 0) {
    return { rateDate: todayDateOnly('UTC'), rates: {} as Record<string, number> };
  }

  const url = new URL('/latest', FX_API_BASE_URL);
  url.searchParams.set('from', base);
  url.searchParams.set('to', quotes.join(','));

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch exchange rates for ${base}.`);
  }

  const payload = (await response.json()) as FxApiResponse;
  const rates = payload.rates ?? {};
  const missingQuotes = quotes.filter((quote) => typeof rates[quote] !== 'number' || !Number.isFinite(rates[quote]));

  if (missingQuotes.length > 0) {
    throw new Error(`Missing exchange rates for ${base} to ${missingQuotes.join(', ')}.`);
  }

  return {
    rateDate: payload.date ?? todayDateOnly('UTC'),
    rates,
  };
}

export async function ensureExchangeRatesAvailable(client: ServerInsForgeClient, pairs: ExchangePair[]) {
  const grouped = new Map<string, Set<string>>();

  for (const pair of pairs) {
    const baseCurrency = normalizeCurrency(pair.baseCurrency);
    const quoteCurrency = normalizeCurrency(pair.quoteCurrency);

    if (baseCurrency === quoteCurrency) continue;

    const quotes = grouped.get(baseCurrency) ?? new Set<string>();
    quotes.add(quoteCurrency);
    grouped.set(baseCurrency, quotes);
  }

  if (grouped.size === 0) {
    return { error: null };
  }

  try {
    for (const [baseCurrency, quoteCurrencies] of grouped) {
      const { rateDate, rates } = await fetchLatestRates(baseCurrency, [...quoteCurrencies]);
      const rows = Object.entries(rates).map(([quoteCurrency, rate]) => ({
        base_currency: baseCurrency,
        quote_currency: normalizeCurrency(quoteCurrency),
        rate,
        rate_date: rateDate,
        provider: FX_PROVIDER,
      }));

      if (rows.length === 0) continue;

      const { error } = await client.database.from('exchange_rates').upsert(rows, {
        onConflict: 'base_currency,quote_currency,rate_date',
      });

      if (error) {
        return { error: new Error(error.message) };
      }
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Could not synchronize exchange rates for recurring expenses.'),
    };
  }
}

async function syncRecurringExchangeRates(client: ServerInsForgeClient, options: { userId?: string } = {}) {
  let recurringQuery = client.database.from('recurring_expenses').select('account_id, currency').eq('is_active', true);
  if (options.userId) {
    recurringQuery = recurringQuery.eq('user_id', options.userId);
  }

  const { data: recurringRows, error: recurringError } = await recurringQuery;
  if (recurringError) {
    return { error: new Error(recurringError.message) };
  }

  const accountIds = [...new Set((recurringRows ?? []).map((row) => row.account_id).filter(Boolean))];
  if (accountIds.length === 0) {
    return { error: null };
  }

  const { data: accountRows, error: accountError } = await client.database
    .from('accounts')
    .select('id, currency')
    .in('id', accountIds);

  if (accountError) {
    return { error: new Error(accountError.message) };
  }

  const accountCurrencyById = new Map((accountRows ?? []).map((row) => [row.id, normalizeCurrency(row.currency)]));
  const pairs: ExchangePair[] = [];

  for (const row of recurringRows ?? []) {
    const quoteCurrency = accountCurrencyById.get(row.account_id);
    if (!quoteCurrency) continue;

    pairs.push({
      baseCurrency: normalizeCurrency(row.currency),
      quoteCurrency,
    });
  }

  return ensureExchangeRatesAvailable(client, pairs);
}

export async function applyRecurringForUser(
  client: ServerInsForgeClient,
  userId: string,
  executionTime: string = currentExecutionTime(),
) {
  const sync = await syncRecurringExchangeRates(client, { userId });
  if (sync.error) {
    return { error: sync.error };
  }

  const { error } = await client.database.rpc('apply_due_recurring_expenses', {
    p_user_id: userId,
    p_execution_time: executionTime,
  });

  return { error };
}

export async function applyRecurringForAllUsers(
  client: ServerInsForgeClient,
  executionTime: string = currentExecutionTime(),
) {
  const sync = await syncRecurringExchangeRates(client);
  if (sync.error) {
    return { data: null, error: sync.error };
  }

  const { data, error } = await client.database.rpc('apply_due_recurring_expenses_for_all', {
    p_execution_time: executionTime,
  });

  return { data, error };
}
