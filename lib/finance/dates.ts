const monthFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getMonthFormatter(locale: string, monthStyle: 'short' | 'long') {
  const cacheKey = `${locale}:${monthStyle}`;
  const cached = monthFormatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(locale, {
    month: monthStyle,
    timeZone: 'UTC',
  });

  monthFormatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatMonthLabel(monthNumber: number, locale: string, monthStyle: 'short' | 'long' = 'short') {
  const normalizedMonth = Number.isInteger(monthNumber) ? Math.min(Math.max(monthNumber, 1), 12) : 1;
  return getMonthFormatter(locale, monthStyle).format(new Date(Date.UTC(2000, normalizedMonth - 1, 1)));
}
