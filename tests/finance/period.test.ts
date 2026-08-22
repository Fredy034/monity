import assert from 'node:assert/strict';
import test from 'node:test';

import {
  financePeriodDateRange,
  parseFinancePeriodParams,
  serializeFinancePeriod,
  shiftFinancePeriod,
} from '../../lib/finance/period.ts';

test('shifts January backward across the year boundary', () => {
  assert.deepEqual(shiftFinancePeriod({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
});

test('shifts December forward across the year boundary', () => {
  assert.deepEqual(shiftFinancePeriod({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
});

test('invalid URL values fall back to the supplied period', () => {
  assert.deepEqual(
    parseFinancePeriodParams(new URLSearchParams('year=nope&month=19'), { year: 2026, month: 8 }),
    { year: 2026, month: 8 },
  );
});

test('creates an inclusive leap-year calendar-month date range', () => {
  assert.deepEqual(financePeriodDateRange({ year: 2024, month: 2 }), {
    fromDate: '2024-02-01',
    toDate: '2024-02-29',
  });
});

test('serializes stable year and month query values', () => {
  assert.equal(serializeFinancePeriod({ year: 2026, month: 8 }).toString(), 'year=2026&month=8');
});
