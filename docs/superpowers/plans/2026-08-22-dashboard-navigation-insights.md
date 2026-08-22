# Dashboard Navigation and Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Monity's desktop sidebar with top navigation, add shared month/year navigation to Dashboard and Transactions, preserve all existing analytics, and add category trends plus privacy-first hybrid insights.

**Architecture:** Shared pure period utilities and a reusable `PeriodNavigator` own calendar behavior and URL serialization. The existing Dashboard API remains the source of normal aggregates and gains six-month category trends plus deterministic insight inputs; optional AI analysis is isolated behind an authenticated endpoint that reconstructs and allowlists aggregates server-side before invoking InsForge AI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Recharts 3, date-fns 4, InsForge TypeScript SDK, Tailwind utility classes, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-22-dashboard-navigation-insights-design.md`

## Global Constraints

- Preserve income-versus-expenses, cumulative-balance, spending-distribution, expenses-by-account, budgets, recent transactions, and quick-add behavior.
- Never send transaction descriptions, transaction IDs, account names/IDs, user identifiers, names, emails, avatar data, or session/authentication values to AI.
- Build AI input server-side with an explicit allowlist; do not accept client-supplied aggregate objects.
- Keep deterministic insights available when AI fails or is disabled.
- Provide every new user-facing string in English and Spanish.
- Retain light/dark themes, localization, exports, authenticated routes, and mobile navigation.
- Do not introduce a Tailwind upgrade; preserve the repository's current styling toolchain during this feature.
- Fetch current official InsForge AI and database SDK documentation immediately before editing InsForge integration code.
- Run focused tests after each task and full `pnpm test`, `pnpm lint`, and `pnpm build` before completion.

## File Structure

- `lib/finance/period.ts`: pure month normalization, movement, date-window, and URL parsing helpers.
- `lib/finance/dashboard-analytics.ts`: pure six-month category aggregation and comparison calculations.
- `lib/finance/insights.ts`: deterministic insight rules, prioritization, and display-neutral data types.
- `lib/finance/ai-insights.ts`: strict anonymized AI payload builder and structured response validator.
- `components/finance/period-navigator.tsx`: reusable accessible month/year control.
- `components/finance/finance-shell.tsx`: two-tier top navigation and responsive drawer.
- `components/finance/dashboard-overview.tsx`: period URL state, dashboard hierarchy, deterministic and optional AI insight orchestration.
- `components/finance/dashboard-charts.tsx`: preserve four current charts and add the category trend chart.
- `components/finance/smart-insights.tsx`: deterministic insight list and optional AI analysis interaction.
- `components/finance/transactions-manager.tsx`: period-first filtering and custom-range override.
- `app/api/dashboard/route.ts`: user-scoped query window and extended aggregate response.
- `app/api/insights/route.ts`: authenticated, privacy-safe optional AI analysis.
- `lib/i18n/dictionaries/en.ts`, `lib/i18n/dictionaries/es.ts`: complete localized copy.
- `tests/finance/*.test.ts`: pure behavior, analytics, insight, and anonymization tests.

---

### Task 1: Test Harness and Shared Period Model

**Files:**
- Modify: `package.json`
- Create: `lib/finance/period.ts`
- Create: `tests/finance/period.test.ts`

**Interfaces:**
- Produces: `FinancePeriod`, `normalizeFinancePeriod`, `shiftFinancePeriod`, `financePeriodDateRange`, `parseFinancePeriodParams`, and `serializeFinancePeriod`.
- Consumes: no feature-specific interfaces.

- [ ] **Step 1: Add the Node test command**

Add this script without changing dependency versions:

```json
"test": "node --test --experimental-strip-types tests/finance/*.test.ts"
```

- [ ] **Step 2: Write failing period tests**

Create `tests/finance/period.test.ts` with direct relative imports and cases equivalent to:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  financePeriodDateRange,
  parseFinancePeriodParams,
  serializeFinancePeriod,
  shiftFinancePeriod,
} from '../../lib/finance/period.ts';

test('shifts January backward across the year boundary', () => {
  assert.deepEqual(shiftFinancePeriod({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
});

test('shifts December forward across the year boundary', () => {
  assert.deepEqual(shiftFinancePeriod({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
});

test('invalid URL values fall back to the supplied period', () => {
  assert.deepEqual(
    parseFinancePeriodParams(new URLSearchParams('year=nope&month=19'), { year: 2026, month: 8 }),
    { year: 2026, month: 8 },
  );
});

test('creates an inclusive calendar-month date range', () => {
  assert.deepEqual(financePeriodDateRange({ year: 2024, month: 2 }), {
    fromDate: '2024-02-01',
    toDate: '2024-02-29',
  });
});

test('serializes stable year and month query values', () => {
  assert.equal(serializeFinancePeriod({ year: 2026, month: 8 }).toString(), 'year=2026&month=8');
});
```

- [ ] **Step 3: Run the test and confirm failure**

Run: `pnpm test -- --test-name-pattern="year boundary|URL values|date range|serializes"`

Expected: FAIL because `lib/finance/period.ts` does not exist.

- [ ] **Step 4: Implement the pure period helpers**

Create a focused module with these exact signatures:

```ts
export type FinancePeriod = { year: number; month: number };

export function normalizeFinancePeriod(value: FinancePeriod, fallback: FinancePeriod): FinancePeriod;
export function shiftFinancePeriod(value: FinancePeriod, deltaMonths: number): FinancePeriod;
export function financePeriodDateRange(value: FinancePeriod): { fromDate: string; toDate: string };
export function parseFinancePeriodParams(params: URLSearchParams, fallback: FinancePeriod): FinancePeriod;
export function serializeFinancePeriod(value: FinancePeriod): URLSearchParams;
```

Use UTC dates and `Date.UTC`; accept integer years from 1900 through 2200 and months 1 through 12. `shiftFinancePeriod` must normalize across years, and the inclusive end date must use day zero of the following month.

- [ ] **Step 5: Run the focused and complete tests**

Run: `pnpm test`

Expected: all period tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/finance/period.ts tests/finance/period.test.ts
git commit -m "feat: add shared finance period model"
```

### Task 2: Reusable Period Navigator

**Files:**
- Create: `components/finance/period-navigator.tsx`
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/es.ts`
- Modify: `components/finance/dashboard-overview.tsx`
- Delete: `components/finance/dashboard-month-select.tsx`

**Interfaces:**
- Consumes: `FinancePeriod` and `shiftFinancePeriod` from Task 1; existing `formatMonthLabel` and `StyledSelect`.
- Produces: `PeriodNavigator({ value, availableYears, locale, onChange })`.

- [ ] **Step 1: Implement the controlled navigator shell**

Create the client component with the exact prop contract:

```ts
type PeriodNavigatorProps = {
  value: FinancePeriod;
  availableYears?: number[];
  locale: string;
  onChange: (period: FinancePeriod) => void;
};
```

Render previous and next buttons around a center button. The arrows call `onChange(shiftFinancePeriod(value, -1))` and `onChange(shiftFinancePeriod(value, 1))`. The center displays `formatMonthLabel(value.month, locale, 'long')` and `value.year`, toggles a compact popover containing month/year selects, and closes after either selection. Include `aria-label`, `aria-expanded`, and a visible focus state.

- [ ] **Step 2: Add bilingual navigator copy**

Add keys for previous month, next month, choose period, month, year, and close period selector. English and Spanish dictionaries must have matching shapes.

- [ ] **Step 3: Replace the Dashboard's independent selects**

Replace `selectedYear` and `selectedMonth` UI controls with one controlled `FinancePeriod` value while retaining the existing request query shape. Use the API's `available_years` plus the selected year for fast jumps. Remove `DashboardMonthSelect` after its last import is gone.

- [ ] **Step 4: Verify navigation manually and statically**

Run: `pnpm lint`

Expected: PASS with no missing dictionary keys or hook errors. Manually verify January → December and December → January through the Dashboard control.

- [ ] **Step 5: Commit**

```bash
git add components/finance/period-navigator.tsx components/finance/dashboard-overview.tsx components/finance/dashboard-month-select.tsx lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/es.ts
git commit -m "feat: add reusable month and year navigator"
```

### Task 3: Two-Tier Top Navigation Shell

**Files:**
- Modify: `components/finance/finance-shell.tsx`
- Modify: `components/finance/sidebar-account-section.tsx`
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/es.ts`

**Interfaces:**
- Consumes: existing `FinanceShell` props and locale-aware routes.
- Produces: the same public `FinanceShell` API, so route pages require no contract changes.

- [ ] **Step 1: Preserve the shell API and replace desktop grid geometry**

Keep `title`, `subtitle`, `actions`, `children`, and `account` props unchanged. Replace `lg:grid-cols-[280px_minmax(0,1fr)]` and the desktop sidebar with a single full-width panel or page surface.

- [ ] **Step 2: Build the utility row**

Place the light/dark-compatible Monity logo at the start and language, theme, and account controls at the end. Adapt `SidebarAccountSection` through an optional `variant: 'sidebar' | 'header'` prop so its profile/settings/logout behavior can be reused without duplicating account logic.

- [ ] **Step 3: Build route tabs with active state**

Use `usePathname()` and locale-normalized path comparison. Render all six existing routes in a horizontal route row. Provide text plus underline/background differentiation for the active route and `aria-current="page"`.

- [ ] **Step 4: Preserve the mobile drawer**

Keep the existing overlay/drawer interaction under the desktop breakpoint. Ensure the menu button, close button, route links, and account controls remain keyboard reachable and localized.

- [ ] **Step 5: Verify routes and responsive states**

Run: `pnpm lint`

Expected: PASS. Manually inspect Dashboard and Transactions at approximately 1280px and 375px in light and dark themes.

- [ ] **Step 6: Commit**

```bash
git add components/finance/finance-shell.tsx components/finance/sidebar-account-section.tsx lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/es.ts
git commit -m "feat: move finance navigation to the top"
```

### Task 4: Dashboard Analytics Aggregation

**Files:**
- Create: `lib/finance/dashboard-analytics.ts`
- Create: `tests/finance/dashboard-analytics.test.ts`
- Modify: `app/api/dashboard/route.ts`
- Modify: `components/finance/dashboard-charts.tsx`

**Interfaces:**
- Produces: `CategoryTrendPoint`, `DashboardComparisons`, `buildCategoryTrend`, and `buildDashboardComparisons`.
- Consumes: normalized user-scoped transaction rows and category metadata already loaded by the Dashboard API.

- [ ] **Step 1: Write failing aggregation tests**

Cover a six-month window that crosses a year boundary, zero-filled missing months, category ranking by total spend, a five-series cap, account-scoped input, and zero prior-period baselines. Use this core expectation:

```ts
const result = buildCategoryTrend({
  period: { year: 2026, month: 2 },
  transactions: [
    { categoryId: 'food', amount: 80, transactionDate: '2025-11-03', type: 'expense' },
    { categoryId: 'food', amount: 100, transactionDate: '2026-02-02', type: 'expense' },
  ],
  categories: [{ id: 'food', name: 'Food', color: '#06b6d4' }],
});
assert.equal(result.months.length, 6);
assert.deepEqual(result.months.map((item) => item.monthKey), [
  '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
]);
assert.deepEqual(result.series[0].values, [0, 0, 80, 0, 0, 100]);
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `pnpm test -- --test-name-pattern="category trend|dashboard comparisons"`

Expected: FAIL because the analytics module does not exist.

- [ ] **Step 3: Implement pure aggregate functions**

Define exact output types:

```ts
export type CategoryTrendPoint = {
  months: Array<{ monthKey: string; year: number; month: number }>;
  series: Array<{ categoryId: string; categoryName: string; color: string; total: number; values: number[] }>;
};

export type DashboardComparisons = {
  previousMonthIncome: number;
  previousMonthExpense: number;
  recentAverageExpense: number;
  categoryPreviousMonth: Record<string, number>;
  categoryRecentAverage: Record<string, number>;
};
```

Round money outputs to two decimals. Ignore income transactions in category spending. Stable-sort equal category totals by category name.

- [ ] **Step 4: Fetch current InsForge database docs before route edits**

Use the repository-provided InsForge `fetch-docs`/`fetch-sdk-docs` capability for TypeScript database queries. Confirm `.gte`, `.lte`, `.eq`, `.order`, and result `{ data, error }` behavior before editing the route.

- [ ] **Step 5: Extend the Dashboard API query window and payload**

Load enough transactions for the selected year charts and the six-month trend/comparison window without exposing raw rows. Continue validating `accountId` against the authenticated user's accounts. Add `charts.category_spending_trend` and `comparisons` to the response while preserving every existing property and export consumer.

- [ ] **Step 6: Run tests and lint**

Run: `pnpm test && pnpm lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/finance/dashboard-analytics.ts tests/finance/dashboard-analytics.test.ts app/api/dashboard/route.ts components/finance/dashboard-charts.tsx
git commit -m "feat: add category spending trend aggregates"
```

### Task 5: Deterministic Insights and Complete Dashboard Hierarchy

**Files:**
- Create: `lib/finance/insights.ts`
- Create: `tests/finance/insights.test.ts`
- Create: `components/finance/smart-insights.tsx`
- Modify: `components/finance/dashboard-overview.tsx`
- Modify: `components/finance/dashboard-charts.tsx`
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/es.ts`

**Interfaces:**
- Consumes: existing totals/budgets, `DashboardComparisons`, and `CategoryTrendPoint` from Task 4.
- Produces: `buildDeterministicInsights(input, copy): DeterministicInsight[]` and a `SmartInsights` UI component.

- [ ] **Step 1: Write failing insight-rule tests**

Define and test:

```ts
export type DeterministicInsight = {
  id: string;
  severity: 'positive' | 'info' | 'warning';
  title: string;
  description: string;
  action?: string;
};
```

Tests must cover budget exceeded, budget nearing 80%, negative net, savings rate, category increase versus recent average, positive budget health, maximum three returned insights, and omission of percentage language when the baseline is zero.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `pnpm test -- --test-name-pattern="insight"`

Expected: FAIL because `lib/finance/insights.ts` does not exist.

- [ ] **Step 3: Implement prioritized pure insight rules**

Accept localized copy functions/strings as input rather than embedding English in the finance module. Assign explicit numeric priority internally: exceeded budget and negative net first, material category changes next, positive reinforcement last. Return at most three unique insights.

- [ ] **Step 4: Add the new category trend chart**

Add a Recharts multi-line chart above the existing four chart panels. Transform the `values` arrays into month-keyed rows in the component, use localized month labels, cap the legend to the server-provided series, preserve tooltips, and show a localized empty state. Do not alter or delete the four existing chart components.

- [ ] **Step 5: Build the Smart Insights panel**

Render deterministic insights with text/icon severity cues and no AI call on mount. Define the complete optional-analysis action contract for Task 7 now: `onGenerate`, `isGenerating`, `aiResult`, and `aiError` props; keep the button disabled until `onGenerate` is supplied.

- [ ] **Step 6: Reorder the dashboard without removing content**

Place summary cards first, then a responsive two-column decision layer containing the trend and insights, then all current yearly charts, then budgets/spending details/recent transactions/quick add. Keep PDF export data compatibility; update export layout only if the component relocation affects capture order.

- [ ] **Step 7: Run tests, lint, and manually compare content**

Run: `pnpm test && pnpm lint`

Expected: PASS. Confirm all four original chart titles still appear in the rendered component tree/source.

- [ ] **Step 8: Commit**

```bash
git add lib/finance/insights.ts tests/finance/insights.test.ts components/finance/smart-insights.tsx components/finance/dashboard-overview.tsx components/finance/dashboard-charts.tsx lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/es.ts
git commit -m "feat: add spending trends and deterministic insights"
```

### Task 6: Period-First Transactions Filtering

**Files:**
- Modify: `components/finance/transactions-manager.tsx`
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/es.ts`
- Create: `tests/finance/transaction-period.test.ts`
- Create: `lib/finance/transaction-period.ts`

**Interfaces:**
- Consumes: `FinancePeriod`, `financePeriodDateRange`, `parseFinancePeriodParams`, and `PeriodNavigator`.
- Produces: `resolveTransactionDateWindow(period, customRange)`.

- [ ] **Step 1: Write failing override tests**

Test this exact contract:

```ts
export type CustomDateRange = { fromDate: string; toDate: string };
export function resolveTransactionDateWindow(
  period: FinancePeriod,
  customRange: CustomDateRange,
): { fromDate: string; toDate: string; isCustom: boolean };
```

An entirely empty range returns the month bounds with `isCustom: false`. Any non-empty custom boundary overrides its corresponding month boundary and returns `isCustom: true`. Clearing both restores month bounds.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm test -- --test-name-pattern="transaction date window"`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the resolver**

Keep this module pure and validate that non-empty dates use `YYYY-MM-DD`; invalid custom values fall back to the month boundary they would replace.

- [ ] **Step 4: Initialize period from URL and render the navigator**

In `TransactionsManager`, derive the initial period from `window.location.search` after hydration, use `history.replaceState` to retain unrelated filter parameters when period changes, and render `PeriodNavigator` above the collapsible advanced filters.

- [ ] **Step 5: Apply override semantics to requests**

Replace direct `fromDate`/`toDate` request use with `resolveTransactionDateWindow`. Reset rows, `nextCursor`, and pagination state whenever period or custom date range changes. Show a localized custom-range indicator and “Return to selected month” action that clears both custom fields.

- [ ] **Step 6: Run tests and lint**

Run: `pnpm test && pnpm lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/finance/transaction-period.ts tests/finance/transaction-period.test.ts components/finance/transactions-manager.tsx lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/es.ts
git commit -m "feat: add period-first transaction filtering"
```

### Task 7: Privacy-Safe Optional AI Analysis

**Files:**
- Create: `lib/finance/ai-insights.ts`
- Create: `tests/finance/ai-insights.test.ts`
- Create: `app/api/insights/route.ts`
- Modify: `components/finance/dashboard-overview.tsx`
- Modify: `components/finance/smart-insights.tsx`
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/es.ts`

**Interfaces:**
- Consumes: authenticated session utilities, server-side Dashboard aggregate functions, selected `FinancePeriod`, and optional validated account scope.
- Produces: `buildAiInsightPayload`, `containsProhibitedAiFields`, `parseAiInsightResponse`, and authenticated `POST /api/insights`.

- [ ] **Step 1: Fetch current official InsForge AI docs**

Use `fetch-docs` for `ai-integration-sdk` or `fetch-sdk-docs` for feature `ai`, language `typescript`. Record the current OpenAI-compatible client call shape, supported structured output behavior, model requirements, `{ data, error }` handling, and server-only credential guidance before writing the endpoint.

- [ ] **Step 2: Write failing anonymization tests**

Define an allowlisted payload containing only period, currency, totals, neutral category aggregates, budget utilization, and comparisons. Test recursively that serialized output excludes these exact keys and values: `description`, `transactionId`, `accountId`, `accountName`, `userId`, `email`, `displayName`, `avatarUrl`, `accessToken`, and `refreshToken`.

Also test structured response validation:

```ts
export type AiInsightResult = {
  summary: string;
  observations: Array<{ title: string; explanation: string; action: string }>;
};
```

Limit the summary to 600 characters, observations to three, and every observation field to 300 characters.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `pnpm test -- --test-name-pattern="AI insight|prohibited"`

Expected: FAIL because `lib/finance/ai-insights.ts` does not exist.

- [ ] **Step 4: Implement the strict payload builder and validator**

Use an explicit object literal for every outbound field; never spread an API request, transaction row, account row, session object, or Dashboard payload. Add `containsProhibitedAiFields(value): boolean` as a defense-in-depth assertion used immediately before the provider call.

- [ ] **Step 5: Implement the authenticated Insights endpoint**

Accept only `{ year: number, month: number, accountId?: string }`. Revalidate account ownership, query/construct aggregates server-side, build the allowlisted payload, reject if the prohibited-field assertion fails, then invoke InsForge AI using the freshly fetched SDK pattern. The system instruction must request educational guidance, concise structured JSON, no professional-adviser claims, and no invented facts. Return normalized `AiInsightResult`; map provider failures to a generic localized-compatible error code without returning provider payloads.

- [ ] **Step 6: Connect the user-triggered UI**

In `DashboardOverview`, call `POST /api/insights` only from the Generate button. Send only year, month, and optional account ID. Clear prior AI output when period/account scope changes. Keep deterministic insights visible during loading and errors. Display an AI-generated label, retry action, and the validated summary/observations.

- [ ] **Step 7: Run privacy tests, all tests, and lint**

Run: `pnpm test -- --test-name-pattern="AI insight|prohibited" && pnpm test && pnpm lint`

Expected: PASS. Inspect the actual provider-call object and confirm none of the prohibited fields can reach it.

- [ ] **Step 8: Commit**

```bash
git add lib/finance/ai-insights.ts tests/finance/ai-insights.test.ts app/api/insights/route.ts components/finance/dashboard-overview.tsx components/finance/smart-insights.tsx lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/es.ts
git commit -m "feat: add anonymized optional AI insights"
```

### Task 8: URL Synchronization, Race Safety, and Final Verification

**Files:**
- Modify: `components/finance/dashboard-overview.tsx`
- Modify: `components/finance/transactions-manager.tsx`
- Modify: `README.md`
- Modify: any focused file above only when verification exposes an in-scope defect.

**Interfaces:**
- Consumes: all feature interfaces from Tasks 1–7.
- Produces: a verified end-to-end implementation and updated user-facing project documentation.

- [ ] **Step 1: Make Dashboard URL state authoritative**

Read initial year/month from `window.location.search` after hydration, retain unrelated parameters, and use `history.replaceState` on period change. Guard data loads with `AbortController` or a monotonically increasing request token so stale Dashboard responses cannot overwrite newer selections.

- [ ] **Step 2: Apply the same stale-response protection to Transactions**

Abort or ignore prior list requests when period/filter state changes. Treat `AbortError` as expected and do not show an error toast for it.

- [ ] **Step 3: Update README feature documentation**

Document two-tier navigation, month/year browsing across years, category spending trends, deterministic insights, optional anonymized AI analysis, and transaction custom-range overrides. Update the Dashboard API response summary and add `POST /api/insights` with its allowed request fields and privacy guarantee.

- [ ] **Step 4: Run the complete automated verification**

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm lint`

Expected: exit code 0.

Run: `pnpm build`

Expected: production build completes with no TypeScript, route, or prerender errors.

- [ ] **Step 5: Run manual acceptance checks**

Verify authenticated Dashboard and Transactions at approximately 1280px and 375px, in English/Spanish and light/dark themes. Confirm:

- Top navigation contains every finance route and highlights the active page.
- Mobile menu opens, closes, and navigates.
- August → July and January → December cross years correctly.
- Dashboard selection persists through refresh and account-scope changes.
- All four existing chart panels remain visible.
- Category trend ends at the selected month and handles empty data.
- Deterministic insights handle normal, exceeded-budget, zero-income, and empty states.
- AI is never called before the button is pressed.
- AI loading/failure leaves deterministic insights intact.
- Transactions default to the selected month, custom range overrides it, and reset restores it.
- PDF export still completes.

- [ ] **Step 6: Inspect final diff for privacy and scope**

Run:

```bash
git diff --check
git status --short
rg -n "description|account_name|accountId|userId|email|accessToken|refreshToken" app/api/insights lib/finance/ai-insights.ts
```

Expected: no whitespace errors; only intended files changed; any prohibited field names appear only in validation/defense tests or rejection logic, never in the provider payload builder.

- [ ] **Step 7: Commit final integration and documentation**

```bash
git add components/finance/dashboard-overview.tsx components/finance/transactions-manager.tsx README.md
git commit -m "feat: complete dashboard navigation and insights"
```

- [ ] **Step 8: Request final code review**

Invoke `superpowers:requesting-code-review` against the completed diff. Address only validated in-scope findings, rerun affected tests plus `pnpm test`, `pnpm lint`, and `pnpm build`, then use `superpowers:verification-before-completion` before claiming success.
