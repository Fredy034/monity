# Monity

Monity is a secure personal finance tracker built with Next.js and InsForge.

It includes:

- Email/password authentication with optional Google OAuth
- Profile persistence in `user_profiles`
- Account management (bank, cash, cards)
- Transaction tracking (income and expense)
- Category management (system + custom)
- Monthly budgets with utilization tracking
- Dashboard aggregates (balances, month totals, spending by category, recent transactions)

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- InsForge SDK (`@insforge/sdk`)

## Project Structure

```text
app/
	api/
		auth/                # auth and session endpoints
		accounts/            # account CRUD
		categories/          # category CRUD
		transactions/        # transaction CRUD
		budgets/             # budget CRUD
		dashboard/           # analytics endpoint
		user/me/             # profile read/update
	sign-in|sign-up|verify-email/
	accounts|transactions|categories|budgets|dashboard/

components/
	auth/                  # auth layouts/forms
	finance/               # finance shell and managers
	ui/                    # shared UI utilities (toasts)

insforge/migrations/
	001_auth.sql           # user profile table + RLS + trigger
	002_finance.sql        # finance tables + indexes + RLS + seed categories

lib/
	insforge/              # client/session/cookie/api helpers
	finance/validation.ts  # API payload parsing/validation
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_INSFORGE_URL=https://your-project.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Supported aliases in code:

- InsForge URL: `NEXT_PUBLIC_INSFORGE_URL` or `INSFORGE_URL` or `INSFORGE_BASE_URL`
- Anon key: `NEXT_PUBLIC_INSFORGE_ANON_KEY` or `INSFORGE_ANON_KEY`
- App URL: `NEXT_PUBLIC_APP_URL` or `APP_URL`

## Setup and Run

1. Install dependencies.
2. Configure `.env.local`.
3. Apply SQL migrations in `insforge/migrations/` to your InsForge Postgres database.
4. Start the app.

```bash
pnpm install
pnpm dev
```

Production commands:

```bash
pnpm build
pnpm start
```

Lint:

```bash
pnpm lint
```

## Authentication and Session Model

Monity uses InsForge auth and stores session tokens in HTTP-only cookies:

- `monity_access_token` (1 day)
- `monity_refresh_token` (30 days)
- `monity_oauth_code_verifier` (10 minutes, OAuth handshake)

Supported auth flows:

- Register with email/password
- Login with email/password
- Verify email with OTP
- Resend verification email
- Refresh session using refresh token
- Logout
- Google OAuth sign-in (`/api/auth/oauth/google/start` and callback)

The app upserts profile data in `public.user_profiles` on successful auth.

## Database Overview

### `001_auth.sql`

- Creates `public.user_profiles`
- Enables RLS
- Adds policies so authenticated users can only read/write their own profile
- Adds shared `public.set_updated_at()` trigger function

### `002_finance.sql`

Creates:

- `public.accounts`
- `public.categories`
- `public.transactions`
- `public.budgets`

Also includes:

- Validation constraints (enum-like checks, positive amounts, period month first-day check)
- Indexes for user/date/category/account lookups
- Seeded system categories (Food, Transport, Housing, etc.)
- RLS policies to scope data by authenticated user
- Triggers for `updated_at`

## API Reference

All finance/profile endpoints require an authenticated session cookie.

### Auth

- `POST /api/auth/register`
  - body: `{ email, password, name? }`
- `POST /api/auth/login`
  - body: `{ email, password }`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
  - body: `{ refreshToken? }` (falls back to refresh cookie)
- `POST /api/auth/verify-email`
  - body: `{ email, otp }`
- `POST /api/auth/resend-verification`
  - body: `{ email }`
- `GET /api/auth/me`
- `GET /api/auth/oauth/google/start`
- `GET /api/auth/oauth/google/callback`

### User

- `GET /api/user/me`
- `PATCH /api/user/me`
  - body: `{ displayName }` (1-80 chars after normalization)

### Accounts

- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id`

Account payload:

```json
{
  "name": "Main Checking",
  "type": "bank",
  "initialBalance": 1200,
  "currency": "USD",
  "isActive": true
}
```

Allowed account `type` values:

- `bank`
- `cash`
- `credit_card`
- `debit_card`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Category payload:

```json
{
  "name": "Groceries",
  "type": "expense",
  "color": "#22C55E",
  "icon": "cart"
}
```

Allowed category `type` values:

- `income`
- `expense`

System categories are read-only; only user-owned non-system categories can be updated/deleted.

### Transactions

- `GET /api/transactions?accountId=&categoryId=&limit=`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

Transaction payload:

```json
{
  "accountId": "uuid",
  "categoryId": "uuid",
  "type": "expense",
  "amount": 34.9,
  "description": "Lunch",
  "transactionDate": "2026-04-12"
}
```

Validation highlights:

- `amount > 0`
- `transactionDate` format `YYYY-MM-DD`
- account must belong to current user
- category must be either system category or current user's category

### Budgets

- `GET /api/budgets?periodMonth=YYYY-MM-01`
- `POST /api/budgets`
- `PATCH /api/budgets/:id`
- `DELETE /api/budgets/:id`

Budget payload:

```json
{
  "categoryId": "uuid",
  "periodMonth": "2026-04-01",
  "limitAmount": 500
}
```

Validation highlights:

- `periodMonth` must be first day of month (`YYYY-MM-01`)
- `limitAmount > 0`
- upsert conflict key is `(user_id, category_id, period_month)`

### Dashboard

- `GET /api/dashboard`

Returns aggregated finance data:

- totals (`total_balance`, `month_income`, `month_expense`, `month_net`)
- account balances (`initial_balance`, computed `current_balance`)
- recent transactions (latest 10)
- spending by category (current month)
- budgets with utilization and exceeded flag

## Frontend Routes

Public/auth:

- `/` (landing, redirects to `/dashboard` when authenticated)
- `/sign-in`
- `/sign-up`
- `/verify-email`

Protected finance pages:

- `/dashboard`
- `/accounts`
- `/transactions`
- `/categories`
- `/budgets`

## Validation Rules Summary

Core request parsing lives in `lib/finance/validation.ts`:

- Currency must be 3-letter uppercase code
- Amounts are numeric and rounded to 2 decimals
- Date parsing enforces `YYYY-MM-DD`
- Transaction and category types are strictly validated

## Notes

- `next.config.ts` currently uses default configuration.
- TypeScript path alias `@/*` maps to project root.
- `strict` mode is enabled in `tsconfig.json`.

## License

Private project.
