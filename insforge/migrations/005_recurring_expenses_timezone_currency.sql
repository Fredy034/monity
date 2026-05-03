CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL,
  quote_currency CHAR(3) NOT NULL,
  rate NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
  rate_date DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_pair_distinct CHECK (base_currency <> quote_currency),
  CONSTRAINT exchange_rates_unique_pair_day UNIQUE (base_currency, quote_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON public.exchange_rates(base_currency, quote_currency, rate_date DESC);

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS currency CHAR(3),
  ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE public.recurring_expenses re
SET currency = a.currency
FROM public.accounts a
WHERE a.id = re.account_id
  AND (re.currency IS NULL OR btrim(re.currency) = '');

UPDATE public.recurring_expenses
SET currency = 'USD'
WHERE currency IS NULL OR btrim(currency) = '';

UPDATE public.recurring_expenses
SET timezone = 'UTC'
WHERE timezone IS NULL OR btrim(timezone) = '';

ALTER TABLE public.recurring_expenses
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN timezone SET DEFAULT 'UTC',
  ALTER COLUMN timezone SET NOT NULL;

ALTER TABLE public.recurring_expense_occurrences
  ADD COLUMN IF NOT EXISTS source_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS source_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS account_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS account_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

UPDATE public.recurring_expense_occurrences o
SET source_currency = COALESCE(o.source_currency, re.currency, a.currency),
    source_amount = COALESCE(o.source_amount, o.amount),
    account_currency = COALESCE(o.account_currency, a.currency),
    account_amount = COALESCE(o.account_amount, o.amount),
    exchange_rate = COALESCE(o.exchange_rate, 1),
    executed_at = COALESCE(o.executed_at, o.created_at)
FROM public.recurring_expenses re,
     public.accounts a
WHERE re.id = o.recurring_expense_id
  AND a.id = o.account_id;

UPDATE public.recurring_expense_occurrences
SET source_currency = 'USD'
WHERE source_currency IS NULL OR btrim(source_currency) = '';

UPDATE public.recurring_expense_occurrences
SET account_currency = 'USD'
WHERE account_currency IS NULL OR btrim(account_currency) = '';

UPDATE public.recurring_expense_occurrences
SET source_amount = amount
WHERE source_amount IS NULL;

UPDATE public.recurring_expense_occurrences
SET account_amount = amount
WHERE account_amount IS NULL;

UPDATE public.recurring_expense_occurrences
SET exchange_rate = 1
WHERE exchange_rate IS NULL;

UPDATE public.recurring_expense_occurrences
SET executed_at = created_at
WHERE executed_at IS NULL;

ALTER TABLE public.recurring_expense_occurrences
  ALTER COLUMN source_currency SET NOT NULL,
  ALTER COLUMN source_amount SET NOT NULL,
  ALTER COLUMN account_currency SET NOT NULL,
  ALTER COLUMN account_amount SET NOT NULL,
  ALTER COLUMN exchange_rate SET NOT NULL,
  ALTER COLUMN executed_at SET NOT NULL;

DROP FUNCTION IF EXISTS public.apply_due_recurring_expenses(UUID, DATE);
DROP FUNCTION IF EXISTS public.apply_due_recurring_expenses_for_all(DATE);

CREATE OR REPLACE FUNCTION public.apply_due_recurring_expenses(
  p_user_id UUID DEFAULT auth.uid(),
  p_execution_time TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(created_occurrences INTEGER, created_transactions INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_occurrences INTEGER := 0;
  v_created_transactions INTEGER := 0;
  v_rate_cutoff_date DATE := (p_execution_time AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'apply_due_recurring_expenses requires a user id.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot apply recurring expenses for another user.';
  END IF;

  WITH recurring_scope AS (
    SELECT
      re.id AS recurring_expense_id,
      re.user_id,
      re.name,
      re.account_id,
      re.category_id,
      re.currency AS source_currency,
      re.start_date,
      re.timezone,
      a.currency AS account_currency,
      (p_execution_time AT TIME ZONE re.timezone)::DATE AS local_business_date
    FROM public.recurring_expenses re
    JOIN public.accounts a ON a.id = re.account_id
    WHERE re.user_id = p_user_id
      AND re.is_active = true
      AND re.frequency = 'monthly'
  ),
  due_occurrences AS (
    SELECT
      scope.recurring_expense_id,
      scope.user_id,
      scope.name,
      scope.account_id,
      scope.category_id,
      scope.source_currency,
      scope.account_currency,
      scope.local_business_date,
      date_trunc('month', series.month_start)::DATE AS occurrence_month,
      public.compute_monthly_charge_date(
        date_trunc('month', series.month_start)::DATE,
        EXTRACT(DAY FROM scope.start_date)::INTEGER
      ) AS scheduled_date
    FROM recurring_scope scope
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', scope.start_date)::DATE,
      date_trunc('month', scope.local_business_date)::DATE,
      interval '1 month'
    ) AS series(month_start)
  ),
  due_with_amount AS (
    SELECT
      due.recurring_expense_id,
      due.user_id,
      due.name,
      due.account_id,
      due.category_id,
      due.source_currency,
      due.account_currency,
      due.occurrence_month,
      due.scheduled_date,
      amt.amount AS source_amount,
      CASE
        WHEN due.source_currency = due.account_currency THEN 1::NUMERIC(18, 8)
        ELSE fx.rate
      END AS exchange_rate,
      ROUND(
        (
          amt.amount * CASE
            WHEN due.source_currency = due.account_currency THEN 1::NUMERIC(18, 8)
            ELSE fx.rate
          END
        )::NUMERIC,
        2
      ) AS account_amount
    FROM due_occurrences due
    JOIN LATERAL (
      SELECT a.amount
      FROM public.recurring_expense_amounts a
      WHERE a.recurring_expense_id = due.recurring_expense_id
        AND a.effective_from <= due.scheduled_date
      ORDER BY a.effective_from DESC, a.created_at DESC
      LIMIT 1
    ) amt ON true
    LEFT JOIN LATERAL (
      SELECT er.rate
      FROM public.exchange_rates er
      WHERE er.base_currency = due.source_currency
        AND er.quote_currency = due.account_currency
        AND er.rate_date <= v_rate_cutoff_date
      ORDER BY er.rate_date DESC
      LIMIT 1
    ) fx ON due.source_currency <> due.account_currency
    WHERE due.scheduled_date <= due.local_business_date
      AND (due.source_currency = due.account_currency OR fx.rate IS NOT NULL)
  ),
  inserted_occurrences AS (
    INSERT INTO public.recurring_expense_occurrences (
      recurring_expense_id,
      user_id,
      occurrence_month,
      scheduled_date,
      amount,
      source_currency,
      source_amount,
      account_currency,
      account_amount,
      exchange_rate,
      executed_at,
      name_snapshot,
      account_id,
      category_id
    )
    SELECT
      due.recurring_expense_id,
      due.user_id,
      due.occurrence_month,
      due.scheduled_date,
      due.account_amount,
      due.source_currency,
      due.source_amount,
      due.account_currency,
      due.account_amount,
      due.exchange_rate,
      p_execution_time,
      due.name,
      due.account_id,
      due.category_id
    FROM due_with_amount due
    ON CONFLICT (recurring_expense_id, occurrence_month) DO NOTHING
    RETURNING id, recurring_expense_id, user_id, account_id, category_id, account_amount, name_snapshot, scheduled_date
  ),
  inserted_transactions AS (
    INSERT INTO public.transactions (
      user_id,
      account_id,
      category_id,
      type,
      amount,
      description,
      transaction_date,
      recurring_expense_id,
      recurring_occurrence_id
    )
    SELECT
      io.user_id,
      io.account_id,
      io.category_id,
      'expense',
      io.account_amount,
      io.name_snapshot,
      io.scheduled_date,
      io.recurring_expense_id,
      io.id
    FROM inserted_occurrences io
    RETURNING id, recurring_occurrence_id
  ),
  updated_occurrences AS (
    UPDATE public.recurring_expense_occurrences o
    SET transaction_id = it.id
    FROM inserted_transactions it
    WHERE o.id = it.recurring_occurrence_id
    RETURNING o.id
  )
  SELECT
    COALESCE((SELECT COUNT(*) FROM inserted_occurrences), 0),
    COALESCE((SELECT COUNT(*) FROM inserted_transactions), 0)
  INTO v_created_occurrences, v_created_transactions;

  RETURN QUERY SELECT v_created_occurrences, v_created_transactions;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_due_recurring_expenses_for_all(
  p_execution_time TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(processed_users INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_processed INTEGER := 0;
BEGIN
  FOR v_user_id IN
    SELECT DISTINCT re.user_id
    FROM public.recurring_expenses re
    WHERE re.is_active = true
  LOOP
    PERFORM public.apply_due_recurring_expenses(v_user_id, p_execution_time);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_expenses(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses(UUID, TIMESTAMPTZ) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ) TO authenticated;