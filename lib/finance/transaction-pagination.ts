type PaginationState = {
  hasMore: boolean;
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isResetPending: boolean;
};

export function canLoadMoreTransactions(state: PaginationState) {
  return Boolean(
    state.hasMore &&
      state.nextCursor &&
      !state.isLoading &&
      !state.isLoadingMore &&
      !state.isResetPending,
  );
}
