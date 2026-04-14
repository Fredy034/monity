CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly')),
  start_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_expense_amounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expense_amounts_unique_effective_from UNIQUE (recurring_expense_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.recurring_expense_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurrence_month DATE NOT NULL,
  scheduled_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  name_snapshot TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expense_occurrences_month_first_day CHECK (date_trunc('month', occurrence_month) = occurrence_month),
  CONSTRAINT recurring_expense_occurrences_unique_month UNIQUE (recurring_expense_id, occurrence_month)
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_occurrence_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_recurring_occurrence_fk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_recurring_occurrence_fk
      FOREIGN KEY (recurring_occurrence_id)
      REFERENCES public.recurring_expense_occurrences(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_active ON public.recurring_expenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_amounts_user ON public.recurring_expense_amounts(user_id, recurring_expense_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_occurrences_user_month ON public.recurring_expense_occurrences(user_id, occurrence_month DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_expense ON public.transactions(user_id, recurring_expense_id, transaction_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurring_occurrence_unique
  ON public.transactions(recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.compute_monthly_charge_date(month_start DATE, anchor_day INTEGER)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT make_date(
    EXTRACT(YEAR FROM month_start)::INTEGER,
    EXTRACT(MONTH FROM month_start)::INTEGER,
    LEAST(
      GREATEST(anchor_day, 1),
      EXTRACT(DAY FROM (date_trunc('month', month_start) + interval '1 month - 1 day'))::INTEGER
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_recurring_expense_refs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  account_owner UUID;
  category_owner UUID;
  category_type TEXT;
BEGIN
  SELECT a.user_id INTO account_owner
  FROM public.accounts a
  WHERE a.id = NEW.account_id;

  IF account_owner IS NULL OR account_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Invalid account for recurring expense.';
  END IF;

  SELECT c.user_id, c.type INTO category_owner, category_type
  FROM public.categories c
  WHERE c.id = NEW.category_id;

  IF category_type IS NULL OR category_type <> 'expense' THEN
    RAISE EXCEPTION 'Recurring expense category must be an expense category.';
  END IF;

  IF category_owner IS NOT NULL AND category_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Invalid category for recurring expense.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_due_recurring_expenses(
  p_user_id UUID DEFAULT auth.uid(),
  p_up_to_date DATE DEFAULT (now() AT TIME ZONE 'utc')::DATE
)
RETURNS TABLE(created_occurrences INTEGER, created_transactions INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_occurrences INTEGER := 0;
  v_created_transactions INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'apply_due_recurring_expenses requires a user id.';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot apply recurring expenses for another user.';
  END IF;

  WITH due_occurrences AS (
    SELECT
      re.id AS recurring_expense_id,
      re.user_id,
      re.name,
      re.account_id,
      re.category_id,
      date_trunc('month', series.month_start)::DATE AS occurrence_month,
      public.compute_monthly_charge_date(
        date_trunc('month', series.month_start)::DATE,
        EXTRACT(DAY FROM re.start_date)::INTEGER
      ) AS scheduled_date
    FROM public.recurring_expenses re
    CROSS JOIN LATERAL generate_series(
      date_trunc('month', re.start_date)::DATE,
      date_trunc('month', p_up_to_date)::DATE,
      interval '1 month'
    ) AS series(month_start)
    WHERE re.user_id = p_user_id
      AND re.is_active = true
      AND re.frequency = 'monthly'
  ),
  due_with_amount AS (
    SELECT
      due.recurring_expense_id,
      due.user_id,
      due.name,
      due.account_id,
      due.category_id,
      due.occurrence_month,
      due.scheduled_date,
      amt.amount
    FROM due_occurrences due
    JOIN LATERAL (
      SELECT a.amount
      FROM public.recurring_expense_amounts a
      WHERE a.recurring_expense_id = due.recurring_expense_id
        AND a.effective_from <= due.scheduled_date
      ORDER BY a.effective_from DESC, a.created_at DESC
      LIMIT 1
    ) amt ON true
    WHERE due.scheduled_date <= p_up_to_date
  ),
  inserted_occurrences AS (
    INSERT INTO public.recurring_expense_occurrences (
      recurring_expense_id,
      user_id,
      occurrence_month,
      scheduled_date,
      amount,
      name_snapshot,
      account_id,
      category_id
    )
    SELECT
      due.recurring_expense_id,
      due.user_id,
      due.occurrence_month,
      due.scheduled_date,
      due.amount,
      due.name,
      due.account_id,
      due.category_id
    FROM due_with_amount due
    ON CONFLICT (recurring_expense_id, occurrence_month) DO NOTHING
    RETURNING id, recurring_expense_id, user_id, account_id, category_id, amount, name_snapshot, scheduled_date
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
      io.amount,
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
  p_up_to_date DATE DEFAULT (now() AT TIME ZONE 'utc')::DATE
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
    PERFORM public.apply_due_recurring_expenses(v_user_id, p_up_to_date);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed;
END;
$$;

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_amounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_expenses_select_own ON public.recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_insert_own ON public.recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_update_own ON public.recurring_expenses;
DROP POLICY IF EXISTS recurring_expenses_delete_own ON public.recurring_expenses;

CREATE POLICY recurring_expenses_select_own
ON public.recurring_expenses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY recurring_expenses_insert_own
ON public.recurring_expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_expenses_update_own
ON public.recurring_expenses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_expenses_delete_own
ON public.recurring_expenses FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_expense_amounts_select_own ON public.recurring_expense_amounts;
DROP POLICY IF EXISTS recurring_expense_amounts_insert_own ON public.recurring_expense_amounts;
DROP POLICY IF EXISTS recurring_expense_amounts_update_own ON public.recurring_expense_amounts;
DROP POLICY IF EXISTS recurring_expense_amounts_delete_own ON public.recurring_expense_amounts;

CREATE POLICY recurring_expense_amounts_select_own
ON public.recurring_expense_amounts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY recurring_expense_amounts_insert_own
ON public.recurring_expense_amounts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_expense_amounts_update_own
ON public.recurring_expense_amounts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY recurring_expense_amounts_delete_own
ON public.recurring_expense_amounts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_expense_occurrences_select_own ON public.recurring_expense_occurrences;

CREATE POLICY recurring_expense_occurrences_select_own
ON public.recurring_expense_occurrences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS recurring_expenses_set_updated_at ON public.recurring_expenses;
DROP TRIGGER IF EXISTS recurring_expense_amounts_set_updated_at ON public.recurring_expense_amounts;
DROP TRIGGER IF EXISTS recurring_expense_occurrences_set_updated_at ON public.recurring_expense_occurrences;
DROP TRIGGER IF EXISTS recurring_expenses_validate_refs ON public.recurring_expenses;

CREATE TRIGGER recurring_expenses_set_updated_at
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recurring_expense_amounts_set_updated_at
BEFORE UPDATE ON public.recurring_expense_amounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recurring_expense_occurrences_set_updated_at
BEFORE UPDATE ON public.recurring_expense_occurrences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recurring_expenses_validate_refs
BEFORE INSERT OR UPDATE ON public.recurring_expenses
FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_expense_refs();

REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_expenses(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses(UUID, DATE) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(DATE) TO authenticated;
