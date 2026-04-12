CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'debit_card')),
  initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budgets_period_month_first_day CHECK (date_trunc('month', period_month) = period_month)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_system_unique
ON public.categories(type, lower(name))
WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_unique
ON public.categories(user_id, type, lower(name))
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique
ON public.budgets(user_id, category_id, period_month);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON public.accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date ON public.transactions(user_id, account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date ON public.transactions(user_id, category_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, period_month);

INSERT INTO public.categories (user_id, name, type, color, icon, is_system)
VALUES
  (NULL, 'Food', 'expense', '#EF4444', 'utensils', true),
  (NULL, 'Transport', 'expense', '#0EA5E9', 'bus', true),
  (NULL, 'Housing', 'expense', '#8B5CF6', 'home', true),
  (NULL, 'Health', 'expense', '#22C55E', 'heart', true),
  (NULL, 'Entertainment', 'expense', '#F97316', 'film', true),
  (NULL, 'Salary', 'income', '#10B981', 'wallet', true),
  (NULL, 'Freelance', 'income', '#14B8A6', 'briefcase', true),
  (NULL, 'Investments', 'income', '#6366F1', 'chart-line', true)
ON CONFLICT DO NOTHING;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_select_own ON public.accounts;
DROP POLICY IF EXISTS accounts_insert_own ON public.accounts;
DROP POLICY IF EXISTS accounts_update_own ON public.accounts;
DROP POLICY IF EXISTS accounts_delete_own ON public.accounts;

CREATE POLICY accounts_select_own
ON public.accounts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY accounts_insert_own
ON public.accounts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY accounts_update_own
ON public.accounts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY accounts_delete_own
ON public.accounts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS categories_select_scoped ON public.categories;
DROP POLICY IF EXISTS categories_insert_own ON public.categories;
DROP POLICY IF EXISTS categories_update_own ON public.categories;
DROP POLICY IF EXISTS categories_delete_own ON public.categories;

CREATE POLICY categories_select_scoped
ON public.categories FOR SELECT TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY categories_insert_own
ON public.categories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY categories_update_own
ON public.categories FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND is_system = false)
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY categories_delete_own
ON public.categories FOR DELETE TO authenticated
USING (auth.uid() = user_id AND is_system = false);

DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_own ON public.transactions;

CREATE POLICY transactions_select_own
ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY transactions_insert_own
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_update_own
ON public.transactions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_delete_own
ON public.transactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS budgets_select_own ON public.budgets;
DROP POLICY IF EXISTS budgets_insert_own ON public.budgets;
DROP POLICY IF EXISTS budgets_update_own ON public.budgets;
DROP POLICY IF EXISTS budgets_delete_own ON public.budgets;

CREATE POLICY budgets_select_own
ON public.budgets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY budgets_insert_own
ON public.budgets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY budgets_update_own
ON public.budgets FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY budgets_delete_own
ON public.budgets FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS accounts_set_updated_at ON public.accounts;
DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
DROP TRIGGER IF EXISTS transactions_set_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS budgets_set_updated_at ON public.budgets;

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER budgets_set_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
