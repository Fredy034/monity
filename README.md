# Monity

Monity is a secure personal finance tracker built with Next.js and InsForge.

## Main Features

- **Accounts & Balances**: Track multiple accounts (bank, cash, cards) with real-time balances and account management.
- **Transactions**: Add, edit, and filter income or expenses. Advanced search, full-screen editing, and category assignment.
- **Budgets**: Set monthly budgets per category, track utilization, and get alerts when limits are exceeded.
- **Recurring Expenses**: Automate regular expenses with flexible scheduling and automatic transaction generation.
- **Categories**: Organize your finances with system and custom categories, color coding, and easy editing.
- **Dashboard & Insights**: Visualize balances, income, expenses, and trends with interactive charts and analytics.
- **Authentication & Security**: Secure login, email verification, Google OAuth, and privacy-first data protection.
- **Localization**: Multi-language support and locale-aware money formatting for a global experience.
- **Profile Management**: Edit your display name, avatar, and email; profile data is persisted securely.
- **Collapsible Panels**: Dashboard quick add and transaction filter/add panels are collapsible and persist state locally.
- **Mobile Friendly**: Responsive design and refined mobile finance interactions.

---

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
- Recurring expenses now support flexible scheduling and automatic transaction generation.
- Dashboard analytics and charts improved for better insights.
- Enhanced security and privacy-first data handling.

## Project Structure

```text
Root
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── proxy.ts
├── skills-lock.json
└── tsconfig.json

app/
  api/
    auth/
      login/route.ts
      logout/route.ts
      me/route.ts
      oauth/google/
        callback/route.ts
        start/route.ts
      refresh/route.ts
      register/route.ts
      resend-verification/route.ts
      verify-email/route.ts
    accounts/
      [id]/route.ts
      route.ts
    budgets/
      [id]/route.ts
      route.ts
    categories/
      [id]/route.ts
      route.ts
    dashboard/route.ts
    internal/recurring-expenses/run/route.ts
    recurring-expenses/
      [id]/route.ts
      route.ts
    transactions/
      [id]/route.ts
      route.ts
    user/me/route.ts
  accounts/page.tsx
  budgets/page.tsx
  categories/page.tsx
  dashboard/page.tsx
  globals.css
  layout.tsx
  page.tsx
  recurring-expenses/page.tsx
  settings/profile/page.tsx
  sign-in/page.tsx
  sign-up/page.tsx
  transactions/page.tsx
  verify-email/page.tsx
  apple-icon.png
  favicon.ico
  icon.png

components/
  auth/
    auth-shell.tsx
    credentials-form.tsx
    logout-button.tsx
    verification-form.tsx
  finance/
    accounts-manager.tsx
    action-button.tsx
    budgets-manager.tsx
    categories-manager.tsx
    dashboard-charts.tsx
    dashboard-overview.tsx
    finance-shell.tsx
    profile-settings-form.tsx
    recurring-expenses-manager.tsx
    sidebar-account-section.tsx
    styled-select.tsx
    transactions-manager.tsx
    ui-dark.ts
    ui.ts
  i18n/
    language-switcher.tsx
    theme-toggle.tsx
  ui/
    toast-provider.tsx

insforge/
  migrations/
    001_auth.sql
    002_finance.sql
    003_recurring_expenses.sql
    004_transactions_pagination_indexes.sql

lib/
  finance/
    formatting.ts
    pdf-export.ts
    recurring.ts
    use-dashboard-export.ts
    use-transaction-export.ts
    validation.ts
  i18n/
    client.ts
    config.ts
    index.ts
    server.ts
    dictionaries/
      en.ts
      es.ts
  insforge/
    api.ts
    client.ts
    cookies.ts
    route-session.ts
    session.ts
  theme/
    theme-provider.tsx

public/
  file.svg
  globe.svg
  image-guideline.png
  monity-icon.png
  monity-logo.png
  monity-logo_black.png
  next.svg
  vercel.svg
  window.svg
  icons/
    google.svg
```

## Project Image Guidelines

Brand assets live in `public/` and should be used consistently across app surfaces.

Available files:

- `public/monity-logo.png`: primary logo (icon + wordmark) for light backgrounds.
- `public/monity-logo_black.png`: navy wordmark variant for neutral/light UI where stronger text contrast is needed.
- `public/file.svg`: primary SVG logo for scalable UI placements when vector output is preferred.
- `public/monity-icon.png`: icon-only mark for compact placements (favicon-like, app tiles, sidebar, avatar-style badges).
- `public/image-guideline.png`: reference board showing approved color and composition variants.
- `public/icons/google.svg`: Google brand icon used in auth UI.

Usage rules:

- Prefer `.svg` for sharp rendering at varied sizes when no raster effects are required.
- Do not stretch logos non-uniformly; preserve original aspect ratio.
- Keep clear space around logos (at least the icon's smallest bar width on each side).
- Use icon-only assets only when horizontal space is constrained.
- On dark surfaces, use gradient/bright variants with sufficient contrast.
- Avoid adding drop-shadows, recoloring, or overlay effects that alter brand colors.

Implementation notes (Next.js):

- Use `next/image` for raster assets (`.png`) to get automatic optimization.
- Place static brand references in `public/` and load them via absolute paths (for example, `/monity-logo.png`).

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
pnpm run deploy
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
