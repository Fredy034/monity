-- Improves cursor pagination scans and type-filtered transaction queries.
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_id
  ON public.transactions(user_id, transaction_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date
  ON public.transactions(user_id, type, transaction_date DESC);
