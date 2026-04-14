import type { createServerInsForgeClient } from '@/lib/insforge/client';

export type RecurringExpenseRow = {
  id: string;
  name: string;
  account_id: string;
  category_id: string;
  frequency: 'monthly';
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
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

export async function applyRecurringForUser(
  client: ReturnType<typeof createServerInsForgeClient>,
  userId: string,
  upToDate: string = todayDateOnly(),
) {
  const { error } = await client.database.rpc('apply_due_recurring_expenses', {
    p_user_id: userId,
    p_up_to_date: upToDate,
  });

  return { error };
}
