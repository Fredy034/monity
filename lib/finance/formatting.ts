const DEFAULT_CURRENCY = 'USD';

function normalizeCurrency(value?: string) {
  if (!value) return DEFAULT_CURRENCY;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY;
}

export function formatMoney(value: number, options?: { locale?: string; currency?: string }) {
  const amount = Number.isFinite(value) ? value : 0;
  const currency = normalizeCurrency(options?.currency);

  return new Intl.NumberFormat(options?.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
