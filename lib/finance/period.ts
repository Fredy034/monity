export type FinancePeriod = {
  year: number;
  month: number;
};

const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

function isValidPeriod(value: FinancePeriod) {
  return (
    Number.isInteger(value.year) &&
    value.year >= MIN_YEAR &&
    value.year <= MAX_YEAR &&
    Number.isInteger(value.month) &&
    value.month >= 1 &&
    value.month <= 12
  );
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function normalizeFinancePeriod(value: FinancePeriod, fallback: FinancePeriod): FinancePeriod {
  if (isValidPeriod(value)) return value;
  if (isValidPeriod(fallback)) return fallback;
  return { year: new Date().getUTCFullYear(), month: new Date().getUTCMonth() + 1 };
}

export function shiftFinancePeriod(value: FinancePeriod, deltaMonths: number): FinancePeriod {
  const normalized = normalizeFinancePeriod(value, {
    year: new Date().getUTCFullYear(),
    month: new Date().getUTCMonth() + 1,
  });
  const shifted = new Date(Date.UTC(normalized.year, normalized.month - 1 + Math.trunc(deltaMonths), 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function financePeriodDateRange(value: FinancePeriod) {
  const normalized = normalizeFinancePeriod(value, {
    year: new Date().getUTCFullYear(),
    month: new Date().getUTCMonth() + 1,
  });
  const start = new Date(Date.UTC(normalized.year, normalized.month - 1, 1));
  const end = new Date(Date.UTC(normalized.year, normalized.month, 0));
  return { fromDate: dateOnly(start), toDate: dateOnly(end) };
}

export function parseFinancePeriodParams(params: URLSearchParams, fallback: FinancePeriod): FinancePeriod {
  const parsed = {
    year: Number(params.get('year')),
    month: Number(params.get('month')),
  };
  return normalizeFinancePeriod(parsed, fallback);
}

export function serializeFinancePeriod(value: FinancePeriod) {
  const normalized = normalizeFinancePeriod(value, value);
  return new URLSearchParams({ year: String(normalized.year), month: String(normalized.month) });
}
