import assert from 'node:assert/strict';
import test from 'node:test';

import { canLoadMoreTransactions } from '../../lib/finance/transaction-pagination.ts';

test('blocks infinite-scroll pagination while the first page is being replaced', () => {
  assert.equal(
    canLoadMoreTransactions({
      hasMore: true,
      nextCursor: 'old-period-cursor',
      isLoading: false,
      isLoadingMore: false,
      isResetPending: true,
    }),
    false,
  );
});

test('allows pagination only when a stable page has another cursor', () => {
  assert.equal(
    canLoadMoreTransactions({
      hasMore: true,
      nextCursor: 'stable-cursor',
      isLoading: false,
      isLoadingMore: false,
      isResetPending: false,
    }),
    true,
  );
  assert.equal(
    canLoadMoreTransactions({
      hasMore: false,
      nextCursor: null,
      isLoading: false,
      isLoadingMore: false,
      isResetPending: false,
    }),
    false,
  );
});
