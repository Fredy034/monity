import { financePeriodDateRange, type FinancePeriod } from './period.ts';

export type CustomDateRange = {
  fromDate: string;
  toDate: string;
};

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function resolveTransactionDateWindow(period: FinancePeriod, customRange: CustomDateRange) {
  const monthRange = financePeriodDateRange(period);
  const customFrom = isValidDateOnly(customRange.fromDate) ? customRange.fromDate : '';
  const customTo = isValidDateOnly(customRange.toDate) ? customRange.toDate : '';
  return {
    fromDate: customFrom || monthRange.fromDate,
    toDate: customTo || monthRange.toDate,
    isCustom: Boolean(customFrom || customTo),
  };
}
