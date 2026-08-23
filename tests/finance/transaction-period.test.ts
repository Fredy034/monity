import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTransactionDateWindow } from '../../lib/finance/transaction-period.ts';

test('leaves transactions unrestricted when no custom dates exist', () => {
  assert.deepEqual(resolveTransactionDateWindow({ fromDate: '', toDate: '' }), {
    fromDate: '',
    toDate: '',
    isCustom: false,
  });
});

test('allows either valid custom boundary to restrict transactions', () => {
  assert.deepEqual(resolveTransactionDateWindow({ fromDate: '2026-07-15', toDate: '' }), {
    fromDate: '2026-07-15',
    toDate: '',
    isCustom: true,
  });
  assert.deepEqual(resolveTransactionDateWindow({ fromDate: '', toDate: '2026-09-10' }), {
    fromDate: '',
    toDate: '2026-09-10',
    isCustom: true,
  });
});

test('ignores malformed custom boundaries', () => {
  assert.deepEqual(resolveTransactionDateWindow({ fromDate: '08/01/2026', toDate: '' }), {
    fromDate: '',
    toDate: '',
    isCustom: false,
  });
});
