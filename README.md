# Monity

Monity is a secure personal finance tracker built with Next.js and InsForge.

It includes:

- Email/password authentication with optional Google OAuth
- Profile persistence in `user_profiles`
- Account management (bank, cash, cards)
- Transaction tracking (income and expense)
- Transaction filtering (search, type, category, date range, amount range)
- Transaction editing modal (category, amount, date, description)
- Category management (system + custom)
- Category editing modal for custom categories (name + color)
- Monthly budgets with utilization tracking
- Dashboard aggregates (balances, month totals, spending by category, recent transactions)
- Recurring expenses with monthly generation and amount history
- Collapsible finance panels (dashboard quick add, transactions add/filters) with local persistence
- Locale-aware money formatting across finance views

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- InsForge SDK (`@insforge/sdk`)

## Latest Improvements (April 2026)

- Dashboard quick add is collapsible and persisted in local storage.
- Transactions page now has collapsible Add and Filters sections, both persisted in local storage.
- Transactions supports advanced client-side filters:
  - text search by description/account/category
  - type and category filters
  - date range filters
  - amount range filters
- Transaction editing moved to a full-screen centered modal with editable category, amount, date, and description.
- Custom category editing added through a modal (name and color only; type remains read-only).
- Money values are now formatted with locale-aware currency formatting for improved clarity.
- Language switcher and mobile finance interactions were refined for better usability.

## Project Structure

```text
app/
	api/
		auth/                # auth and session endpoints
		accounts/            # account CRUD
		categories/          # category CRUD
		transactions/        # transaction CRUD
    recurring-expenses/  # recurring expense CRUD + generation workflow
		budgets/             # budget CRUD
		dashboard/           # analytics endpoint
		user/me/             # profile read/update
	sign-in|sign-up|verify-email/
  accounts|transactions|recurring-expenses|categories|budgets|dashboard/

components/
	auth/                  # auth layouts/forms
	finance/               # finance shell and managers
	ui/                    # shared UI utilities (toasts)

insforge/migrations/
	001_auth.sql           # user profile table + RLS + trigger
	002_finance.sql        # finance tables + indexes + RLS + seed categories
  003_recurring_expenses.sql # recurring expense tables, function, and policies

lib/
	insforge/              # client/session/cookie/api helpers
  finance/formatting.ts  # locale-aware money formatting
	finance/validation.ts  # API payload parsing/validation
```

## Project Image Guidelines

Brand assets live in `public/` and should be used consistently across app surfaces.

Available files:

- `public/monity-logo.png` and `public/monity-logo.webp`: primary logo (icon + wordmark) for light backgrounds.
- `public/monity-logo_black.png` and `public/monity-logo_black.webp`: navy wordmark variant for neutral/light UI where stronger text contrast is needed.
- `public/file.svg`: primary SVG logo for scalable UI placements when vector output is preferred.
- `public/monity-icon.png` and `public/monity-icon.webp`: icon-only mark for compact placements (favicon-like, app tiles, sidebar, avatar-style badges).
- `public/image-guideline.png`: reference board showing approved color and composition variants.

Usage rules:

- Prefer `.webp` in UI for better payload size; keep `.png` as fallback for environments that need it.
- Prefer `.svg` for sharp rendering at varied sizes when no raster effects are required.
- Do not stretch logos non-uniformly; preserve original aspect ratio.
- Keep clear space around logos (at least the icon's smallest bar width on each side).
- Use icon-only assets only when horizontal space is constrained.
- On dark surfaces, use gradient/bright variants with sufficient contrast.
- Avoid adding drop-shadows, recoloring, or overlay effects that alter brand colors.

Implementation notes (Next.js):

- Use `next/image` for raster assets (`.webp`, `.png`) to get automatic optimization.
- Place static brand references in `public/` and load them via absolute paths (for example, `/monity-logo.webp`).

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

### `003_recurring_expenses.sql`

Creates and configures recurring-expense support:

- `public.recurring_expenses`
- `public.recurring_expense_amounts`
- `public.recurring_expense_occurrences`
- transaction link fields for recurring traceability
- recurring generation function and supporting constraints/indexes
- RLS policies for recurring entities

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

### Recurring Expenses

- `GET /api/recurring-expenses`
- `POST /api/recurring-expenses`
- `PATCH /api/recurring-expenses/:id`
- `DELETE /api/recurring-expenses/:id`

Recurring payload (create):

```json
{
  "name": "Gym membership",
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": 29.99,
  "frequency": "monthly",
  "startDate": "2026-04-01",
  "isActive": true
}
```

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
- `/recurring-expenses`
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
