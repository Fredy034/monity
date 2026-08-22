# Monity Dashboard, Navigation, and Insights Design

Date: 2026-08-22
Status: Approved for implementation planning

## Purpose

Improve Monity's information density and financial guidance without removing any existing dashboard analytics. The redesign moves primary navigation to the top, introduces a consistent month-and-year browsing experience on Dashboard and Transactions, adds category spending trends, and provides privacy-first financial insights.

## Goals

- Recover horizontal page space by replacing the desktop sidebar with top navigation.
- Make month-by-month browsing fast and consistent across Dashboard and Transactions, including navigation across year boundaries.
- Preserve all current dashboard charts and detail sections.
- Add a category spending trend that explains how spending changes over time.
- Provide useful deterministic insights by default and optional deeper AI analysis using anonymized aggregates only.
- Preserve responsive behavior, localization, light/dark themes, exports, and existing finance-management flows.

## Non-goals

- Persisting AI conversations or historical AI responses.
- Sending raw transactions, descriptions, account names, user identifiers, or profile data to an AI model.
- Replacing existing finance charts or redesigning account, category, budget, or recurring-expense business logic.
- Adding forecasting, investment analysis, or automated financial actions.

## Chosen Direction

The interface uses a two-tier top navigation inspired by approved visual option B, combined with the unified previous/next period navigator from option A.

The implementation extends the existing Dashboard API for chart-ready aggregates and deterministic insight inputs. A separate Insights endpoint handles optional AI analysis so normal dashboard loading remains independent of AI availability.

## Application Shell and Navigation

### Desktop

The existing left sidebar is replaced with two horizontal rows:

1. A utility row containing the Monity brand, language selector, theme toggle, and account/profile controls.
2. A route row containing Dashboard, Transactions, Accounts, Recurring Expenses, Categories, and Budgets.

The active route has a visible text and underline treatment. The shell remains constrained to Monity's existing maximum content width but no longer reserves a sidebar column, allowing charts and tables to use the full width.

### Mobile

Mobile retains a compact header and menu trigger. Opening the trigger shows the existing drawer-style navigation adapted to the new route hierarchy. Account, language, and theme controls remain reachable without crowding the header.

## Shared Period Navigator

A reusable period navigator is used on Dashboard and Transactions.

- The center displays the localized full month and four-digit year.
- Previous and next arrows move by one calendar month.
- Moving backward from January selects December of the previous year; moving forward from December selects January of the next year.
- Activating the center exposes explicit month and year selection controls for fast jumps.
- The selected period is synchronized to URL query parameters (`year` and `month`) and restored on refresh.
- Invalid URL values fall back to the current calendar month.
- The control is keyboard accessible and has descriptive labels for screen readers.

### Dashboard behavior

The selected period controls monthly totals, budgets, recent transactions, category trend end date, and deterministic insights. The existing account-scope selector continues to narrow the data. Existing yearly charts use the selected year and remain on the page.

### Transactions behavior

The selected period is the default transaction date window. Existing search, type, account, category, and amount filters continue to work within that period.

Entering a custom date range temporarily overrides the month window. The UI explicitly indicates this override and offers a clear action to return to the selected month. Clearing the custom range restores the period window. Pagination cursors reset whenever the period or any filter changes.

## Dashboard Content Hierarchy

The dashboard is organized as follows:

1. Page heading, account scope, export actions, and period navigator.
2. Existing balance, income, expense, and net summary cards.
3. New decision layer:
   - Category spending trend.
   - Smart insights.
4. Existing yearly analytics:
   - Income versus expenses.
   - Cumulative balance.
   - Spending distribution by category.
   - Expenses by account.
5. Existing budget progress, spending-by-category details, recent transactions, and quick-add transaction flow.

No existing chart or dashboard detail is removed. Responsive layouts stack panels when horizontal space becomes limited.

## Category Spending Trend

The new chart shows expense totals by category across the six calendar months ending in the selected month. Its purpose is to reveal whether important categories are rising, falling, or unusually volatile.

- Categories are ranked by total spending across the six-month window.
- The chart displays the highest-spending categories, capped at five series for legibility.
- Remaining categories are excluded from the lines rather than combined into a misleading category.
- The legend identifies each category and allows Recharts' normal tooltip behavior.
- Missing months are represented as zero so time spacing remains consistent.
- The chart uses existing category colors when they meet display needs and stable fallback chart colors otherwise.
- Empty periods display a localized no-data state.

## Deterministic Insights

Rule-based insights are generated from aggregate metrics and always load with the dashboard. Insights are contextual to the selected month and selected account scope.

Initial insight rules include:

- Category spending change compared with the previous month and the recent multi-month average.
- Budget utilization, nearing-limit warnings, and exceeded budgets.
- Savings rate derived from monthly net divided by income when income is greater than zero.
- Income/expense imbalance and negative net cash flow.
- Concentration of spending in the largest category.
- Positive reinforcement when budgets are healthy or spending improves materially.

The UI shows a small prioritized set rather than every matching rule. Severity, expected usefulness, and materiality determine ordering. Percentage comparisons are omitted when the comparison baseline is zero. Wording remains educational and avoids claiming professional financial advice.

## Optional AI Analysis

The Smart Insights panel includes a user-triggered “Generate deeper analysis” action. AI is not invoked during normal dashboard loading.

### Privacy boundary

The browser sends only the selected period and account-scope request to Monity's server. The server constructs a strict, validated aggregate payload for the AI provider containing only:

- Selected month and year.
- Currency code when required for readable amounts.
- Total income, expenses, and net.
- Category totals using neutral category labels or locally meaningful category names without transaction details.
- Budget limits and utilization percentages by category.
- Month-over-month changes and recent aggregate averages.

The AI payload must not contain transaction descriptions, transaction identifiers, account names, account identifiers, user identifiers, names, email addresses, avatar data, or authentication/session values. The endpoint uses an explicit allowlist schema rather than forwarding client-provided objects.

The endpoint returns concise structured guidance: a summary plus a limited list of observations and suggested actions. Responses are not persisted. The UI labels the result as AI-generated and allows retrying.

### Failure behavior

If the AI service is unavailable, rate-limited, or returns invalid output, deterministic insights remain visible. Only the optional analysis area shows a quiet localized error and retry action. Dashboard loading and navigation are unaffected.

## API and Data Flow

### Dashboard API

The existing `GET /api/dashboard` endpoint continues accepting `year`, `month`, and optional `accountId`. Its response is extended with:

- Six-month category trend points.
- Previous-month and recent-average aggregates required by deterministic rules.
- Budget and cash-flow comparison metrics.
- Explicit selected-period metadata.

The server performs user-scoped InsForge queries and aggregation. It does not expose additional raw transactions to the browser.

### AI Insights API

A dedicated authenticated endpoint accepts the selected period and optional account scope, reloads authorized aggregate data server-side, constructs the allowlisted anonymized payload, calls InsForge's OpenAI-compatible AI service, validates the structured response, and returns it to the client.

The endpoint does not trust financial aggregates supplied directly by the browser. Account scope is validated against the authenticated user before aggregation.

## State and URL Behavior

- Dashboard and Transactions read initial period values from the URL.
- Period changes update the URL without a full page reload.
- Account and filter changes retain the selected period unless the user explicitly resets all filters.
- Fetches use loading states that preserve the existing layout and avoid blanking unrelated controls.
- Stale responses must not overwrite newer period selections.

## Localization and Accessibility

- All added labels, empty states, errors, insight templates, and AI disclosure text are provided in English and Spanish dictionaries.
- Month names use the existing locale-aware formatting utilities.
- Navigation, period controls, chart summaries, loading states, and dialogs have accessible names and keyboard behavior.
- Color is not the sole indicator of insight severity, active navigation, or chart meaning.
- Existing light and dark theme support is retained.

## Security and Privacy

- All new endpoints require the existing authenticated session flow.
- InsForge queries remain scoped to the authenticated user and validated account ownership.
- AI input is built server-side from an explicit aggregate schema.
- Raw transaction records and personally identifying fields never enter the AI prompt.
- Error messages do not expose provider payloads, secrets, session values, or database details.
- Request validation and reasonable response-size limits apply to the Insights endpoint.

## Testing and Verification

Automated tests should cover the separable pure logic introduced by this work, with framework-level verification where the current project permits it:

- Month navigation across January/December year boundaries.
- URL parsing, invalid-value fallback, and URL synchronization.
- Transaction month windows and custom-date overrides.
- Pagination reset after period/filter changes.
- Six-month category aggregation, zero-filled months, ranking, and series cap.
- Deterministic insight prioritization and zero-baseline handling.
- AI aggregate allowlist and explicit rejection/absence of prohibited fields.
- Account ownership validation for scoped insights.
- AI failure behavior preserving deterministic insights.
- English and Spanish copy coverage.
- Responsive top navigation and mobile drawer behavior.

Before completion, run lint and a production build. Manually verify Dashboard and Transactions at desktop and mobile widths, both themes, both languages, year-boundary navigation, empty data, and AI error states.

## Expected Files and Boundaries

Likely implementation areas include:

- `components/finance/finance-shell.tsx` for the top navigation shell.
- A new reusable finance period navigator component and date-period utilities.
- `components/finance/dashboard-overview.tsx` and `dashboard-charts.tsx` for layout and visualization changes.
- `components/finance/transactions-manager.tsx` for the period-first filtering behavior.
- `app/api/dashboard/route.ts` for additional aggregates.
- A new authenticated Insights API route plus isolated insight rule and anonymization modules.
- English and Spanish dictionaries.
- Focused tests and any minimal test-runner setup required by the repository.

Implementation must follow current InsForge SDK documentation fetched immediately before editing integration code. Tailwind changes must respect the repository's explicit project constraints rather than introducing an unrelated framework upgrade.
