import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTransactionDateWindow } from '../../lib/finance/transaction-period.ts';

test('uses selected-month boundaries when no custom dates exist', () => {
  assert.deepEqual(resolveTransactionDateWindow({ year: 2026, month: 8 }, { fromDate: '', toDate: '' }), {
    fromDate: '2026-08-01',
    toDate: '2026-08-31',
    isCustom: false,
  });
});

test('allows either custom boundary to override its selected-month boundary', () => {
  assert.deepEqual(resolveTransactionDateWindow({ year: 2026, month: 8 }, { fromDate: '2026-07-15', toDate: '' }), {
    fromDate: '2026-07-15',
    toDate: '2026-08-31',
    isCustom: true,
  });
  assert.deepEqual(resolveTransactionDateWindow({ year: 2026, month: 8 }, { fromDate: '', toDate: '2026-09-10' }), {
    fromDate: '2026-08-01',
    toDate: '2026-09-10',
    isCustom: true,
  });
});

test('ignores malformed custom boundaries', () => {
  assert.deepEqual(resolveTransactionDateWindow({ year: 2026, month: 8 }, { fromDate: '08/01/2026', toDate: '' }), {
    fromDate: '2026-08-01',
    toDate: '2026-08-31',
    isCustom: false,
  });
});
