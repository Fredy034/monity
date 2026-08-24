-- Restrict cross-tenant recurring generation to the server-only project admin role.
REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ)
TO project_admin;

ALTER FUNCTION public.apply_due_recurring_expenses(UUID, TIMESTAMPTZ)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.apply_due_recurring_expenses_for_all(TIMESTAMPTZ)
  SET search_path = pg_catalog, public, pg_temp;

-- Account status is administrator-controlled. Authenticated users may update only profile fields.
REVOKE UPDATE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (email, display_name, last_login_at, updated_at)
ON public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS profile
    WHERE profile.user_id = auth.uid()
      AND profile.status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

CREATE POLICY user_profiles_active_user_select
ON public.user_profiles AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY user_profiles_active_user_update
ON public.user_profiles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY user_profiles_active_user_delete
ON public.user_profiles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.is_active_user());

CREATE POLICY accounts_active_user_only
ON public.accounts AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY categories_active_user_only
ON public.categories AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY transactions_active_user_only
ON public.transactions AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY budgets_active_user_only
ON public.budgets AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY recurring_expenses_active_user_only
ON public.recurring_expenses AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY recurring_expense_amounts_active_user_only
ON public.recurring_expense_amounts AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE POLICY recurring_expense_occurrences_active_user_only
ON public.recurring_expense_occurrences AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_user())
WITH CHECK (public.is_active_user());

CREATE OR REPLACE FUNCTION public.reject_inactive_user_finance_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Inactive users cannot modify financial records.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_inactive_user_finance_write()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER transactions_reject_inactive_user_write
BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.reject_inactive_user_finance_write();

CREATE TRIGGER recurring_occurrences_reject_inactive_user_write
BEFORE INSERT OR UPDATE OR DELETE ON public.recurring_expense_occurrences
FOR EACH ROW EXECUTE FUNCTION public.reject_inactive_user_finance_write();

-- Durable fixed-window quota for paid AI analysis.
CREATE TABLE IF NOT EXISTS public.ai_insight_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0 AND request_count <= 10),
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.ai_insight_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_insight_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_insight_quota(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := to_timestamp(
    floor(extract(epoch FROM now()) / 3600) * 3600
  );
  v_count INTEGER;
  v_allowed BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Cannot consume AI quota for another user.';
  END IF;

  INSERT INTO public.ai_insight_usage (user_id, window_start, request_count)
  VALUES (p_user_id, v_window_start, 1)
  ON CONFLICT (user_id, window_start) DO UPDATE
    SET request_count = public.ai_insight_usage.request_count + 1
    WHERE public.ai_insight_usage.request_count < 10
  RETURNING request_count INTO v_count;

  v_allowed := FOUND;

  IF NOT v_allowed THEN
    SELECT usage.request_count INTO v_count
    FROM public.ai_insight_usage AS usage
    WHERE usage.user_id = p_user_id
      AND usage.window_start = v_window_start;
  END IF;

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(10 - COALESCE(v_count, 10), 0),
    v_window_start + interval '1 hour';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_insight_quota(UUID)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_insight_quota(UUID)
TO authenticated;
