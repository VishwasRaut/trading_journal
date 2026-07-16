# Ledger — Trading Journal

> A private, multi-account trading journal built with Next.js 16, Supabase, and
> a fintech-grade UI. Log every trade, attach chart screenshots, review your
> weekly / monthly P&L, and import MT5 broker statements — all in one place.

---

## Table of contents

1. [What Ledger is (and isn't)](#1-what-ledger-is-and-isnt)
2. [Feature timeline — how the app was built](#2-feature-timeline--how-the-app-was-built)
3. [Tech stack](#3-tech-stack)
4. [Data model](#4-data-model)
5. [File & folder structure](#5-file--folder-structure)
6. [Local setup](#6-local-setup)
7. [Deployment — free & personal](#7-deployment--free--personal)
8. [Migrations](#8-migrations)
9. [Advanced analytics — what's already in](#9-advanced-analytics--whats-already-in)
10. [Roadmap](#10-roadmap)

---

## 1. What Ledger is (and isn't)

**Is:**
- A personal trading journal for **Forex, Crypto, Stocks/Equity, Options and Futures**.
- Log entry & exit prices, sizes, stops, targets, fees, notes, tags and chart
  screenshots — per trade, per account.
- Analyse performance weekly, monthly, by day-of-week, hour-of-day, symbol,
  and long-vs-short.
- Track multiple broker/exchange accounts side-by-side (XM Live, Vantage Demo,
  Binance Spot, etc.).
- Import MT5 broker statements to save typing.
- Multi-user, RLS-secured, dark & light themes, animated UI.

**Is not:**
- A trading platform. It doesn't place trades or connect live to brokers.
- A password vault. Broker credentials are never stored — statement imports
  and read-only API keys are the safe paths.

---

## 2. Feature timeline — how the app was built

Each row corresponds to a milestone that shipped end-to-end (types, UI, tests,
build verified). Timeline reads top-to-bottom in the order features were added.

### Phase 1 — Foundation

- **Scaffolded Next.js 16 (App Router, TypeScript, Turbopack)**.
- Installed **Tailwind CSS v4**, **shadcn/ui** (`base-nova` style, built on
  `@base-ui/react`), **Framer Motion**, **Recharts**, **React Hook Form + zod**,
  **TanStack Query**, **date-fns**, **lucide-react**, **sonner**, **next-themes**.
- Wrote a custom OKLCH theme with a violet primary, emerald `--profit`, rose
  `--loss`, tabular-numerics baseline, custom scrollbars.
- Created providers: `ThemeProvider`, `QueryProvider`, `TooltipProvider`.

### Phase 2 — Supabase

- Wrote migration **`0001_init.sql`**: `profiles`, `trades`, `trade_tags`,
  `trade_images` tables with RLS policies and the `trade-charts` storage bucket.
- Auto-create-profile trigger on `auth.users` insert.
- Split Supabase clients into `lib/supabase/client.ts` (browser),
  `lib/supabase/server.ts` (RSC), and `lib/supabase/middleware.ts`
  (session refresh + route protection).
- Added a `/setup` fallback page shown when env vars are missing so the app
  never crashes on first run.

### Phase 3 — Auth

- Built `/login` and `/signup` pages with a glassmorphism form panel and an
  animated marketing panel (features list + gradient headline).
- Zod-validated forms; toast success/error via sonner.

### Phase 4 — App shell

- Sidebar with active-route indicator that slides between items using Framer
  Motion `layoutId`.
- Sticky topbar with mobile-drawer Sheet, account avatar with dropdown.
- `PageTransition` wrapper — fade + y-shift on route change.
- Animated gradient background, faint grid overlay.

### Phase 5 — Trade CRUD

- **Trade form** with market picker, direction toggle (Long/Short cards),
  entry/exit prices, quantity, stops, fees, notes ("Why I took the trade" +
  "What happened" + "Mistakes"), strategy, tags.
- **Image uploader** with drag-drop, previews, direct Supabase Storage upload,
  per-image `kind` (entry chart / exit chart / other) and caption.
- **Trades list** — sortable/filterable table with search, status filter,
  market filter, row-fade-in animation.
- **Trade detail** — hero symbol + P&L, entry/exit summary cards, notes
  columns, chart gallery with lightbox.
- **Edit** & **Delete** with confirmation modal.

### Phase 6 — Dashboard v1

- KPI cards with **count-up animations** (Framer Motion `useMotionValue`):
  Total P&L, Win rate, Avg R:R, This-month P&L.
- Basic equity curve.
- Recent trades widget.

### Phase 7 — Analytics & Calendar

- Weekly / monthly P&L bar charts (Recharts, coloured by profit/loss).
- Win rate donut, best/worst trade cards, current streak, avg hold, active
  trading days.
- **Calendar heatmap** — in-house component (no @nivo dependency) with
  colour intensity per day, click a day → modal with that day's trades.

### Phase 8 — Symbol picker & MT5 sizing

- Built `lib/symbols.ts` with **170+ curated symbols**:
  - **Forex** (66) — Majors, Minors (crosses), Exotics, Spot metals
    (XAUUSD, XAGUSD, XPTUSD, XPDUSD, XAUEUR).
  - **Crypto** (~70) — Top 10, Large caps, DeFi, L1s, Gaming/NFT, Memes,
    AI & Data, RWA, USD pairs.
  - **Commodities / Futures** (32) — Metals, Energy, Grains, Softs, Livestock,
    Index futures (ES, NQ, YM, RTY, MES, MNQ).
- Custom `SymbolPicker` component — keyboard-navigable, grouped, portal-rendered
  so it never gets clipped by parent cards.
- **"All markets" option** — browse every symbol across markets in one list;
  picking a preset auto-snaps the market select to the symbol's category.
- Each symbol carries a `contractSize` so the P&L calculator knows the
  multiplier (100,000 for FX standard lot, 100 oz for XAUUSD, 5,000 oz for
  XAGUSD, $50/point for ES, etc.).
- Trade form now uses market-aware size labels: **"Lot size"** for forex,
  **"Amount"** for crypto, **"Shares"** for equity, **"Contracts"** for
  options/futures. Contract-size field auto-fills from the picked symbol and
  is hidden for markets where it doesn't apply.
- **Position value preview** — shows `qty × contract_size = total units` so
  you can sanity-check the position before saving.

### Phase 9 — Trending equity curve & advanced analytics

- **`EquityCurvePro`** — the dashboard centerpiece:
  - Huge display-serif equity number + animated delta pill.
  - Range chips (1W / 1M / 3M / 6M / YTD / ALL) with a sliding pill (Framer
    `layoutId`).
  - Gradient area chart with SVG glow filter on the active dot.
  - Vertical dashed crosshair on hover.
  - **Peak & Low markers** labeled.
  - **Trade ribbon** below the chart — every closed trade as a tiny bar,
    height = |P&L|, colour = profit/loss (a "heartbeat" of trades).
- **New analytics functions** in `lib/analytics.ts`:
  - `maxDrawdown` — worst peak-to-trough dip in $ and %.
  - `expectancy` — winRate × avgWin − lossRate × |avgLoss|.
  - `longShortBreakdown` — separate stats for longs and shorts.
  - `dayOfWeekPnl` — Mon–Sun bars with win rate.
  - `hourOfDayPnl` — 24 cells with trade counts.
  - `symbolPerformance` — top-N symbols by P&L.
- Analytics page now shows: 6 stat cards (R:R, expectancy, max drawdown,
  streak, avg hold, active days), Long-vs-Short comparison, best/worst symbols,
  day-of-week horizontal bar chart, hour-of-day heatmap.

### Phase 10 — Typography pass

- Switched fonts to **Inter** (UI) + **Instrument Serif** (display) + **JetBrains
  Mono** (numbers).
- Stylistic sets enabled for cleaner letterforms.
- `tabular-nums slashed-zero` on every price/P&L number via a `.num` utility
  class.
- Tighter tracking on hero headings; refined uppercase micro-labels
  (0.14em tracking).
- Custom scrollbars, selection tint, refined rhythm.

### Phase 11 — Trading accounts (migration 0002)

- Added **`trading_accounts`** table: name, broker, account_type
  (`live` / `demo` / `paper`), currency, starting_balance, colour, is_default,
  is_archived.
- Added `account_id` FK on `trades`.
- **`ensureDefaultAccount`** helper auto-creates a "Main" account on first
  visit and back-fills any orphan trades.
- Added **`AccountSwitcher`** in the topbar — shows current account + balance,
  dropdown lists all accounts with per-account live balances, sentinel
  "All accounts" for a combined view.
- New **`/accounts`** page with per-account cards (coloured accent stripe,
  live balance, total P&L, trade count, open positions) and a full CRUD
  modal for create/edit/archive/delete/set-default.
- Account picker added to the trade form; defaults to whichever account is
  active in the switcher.
- **Every page filters by account** — dashboard, trades, analytics, calendar.
  Current account persists in a cookie; server components read it via
  `lib/accounts-server.ts` (kept separate so client components don't pull in
  `next/headers`).

### Phase 12 — Light / dark theme toggle

- Added a **`ThemeToggle`** button in the topbar (sun / moon with Framer
  rotate+crossfade).
- Wrapped `next-themes` `ThemeProvider` in a client wrapper so its inline
  hydration script plays nicely with Next 16's stricter renderer.

### Phase 13 — MT5 statement importer (migration 0003)

- Added `source` (`manual` / `mt5_import` / `csv_import` / `api_sync`) and
  `external_id` (broker's position id) columns to `trades`.
- Unique index on `(account_id, external_id)` → **re-uploading the same
  statement is safe** (dedup via `upsert`).
- **`lib/mt5-parser.ts`** — client-safe, dependency-free parser that:
  - Auto-detects HTML vs CSV vs TSV.
  - Handles `.` and `,` decimal separators.
  - Uses positional heuristics (looks for `buy`/`sell` + two datetime cells +
    a symbol-shaped cell) so it survives MT5 language / version differences.
  - Skips balance / deposit / withdrawal / open-position rows.
  - Auto-classifies each symbol into a market.
- **`/import`** page — drag-drop file, account picker, preview table
  (all detected trades with green/red P&L colouring), stat chips (detected,
  wins, losses, net P&L), and a big "Import N trades" button.
- Server action `importTrades` performs the upsert and reports
  `inserted / updated / skipped` counts.
- Discoverability: **Import** sidebar entry + **Import** button on `/trades`
  next to "New trade".

### Manual entry & imports coexist

Manual trade entry (`/trades/new`) is unchanged and stays the primary path —
the importer is purely additive. Imported trades get `source = "mt5_import"`
and an `external_id`; manual trades stay `source = "manual"` with a null
external_id.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, RSC, Server Actions) | Zero-config Vercel deploy, RSC eliminates API boilerplate |
| Language | **TypeScript 5** | End-to-end type safety through zod + Supabase types |
| Styling | **Tailwind CSS v4** | Utility-first, plays perfectly with shadcn |
| Components | **shadcn/ui** — `base-nova` style on `@base-ui/react` | Copy-in components, fully themeable, headless |
| Animations | **Framer Motion 12** | Page transitions, count-ups, `layoutId` for sliding pills |
| Charts | **Recharts 3** | Area / bar / donut — all custom-styled |
| Forms | **react-hook-form 7** + **zod 4** | Type-safe validation |
| Backend | **Supabase** (Postgres + Auth + Storage + RLS) | Free tier is generous, RLS-first |
| Auth | Supabase Auth (email/password) | Cookie-based sessions via `@supabase/ssr` |
| State | **TanStack Query 5** + **Zustand 5** | Query cache + client-only UI state |
| Theming | **next-themes** | Light/dark with system-aware option (currently dark-first) |
| Icons | **lucide-react** | Standard with shadcn |
| Dates | **date-fns 4** | Tree-shakeable, immutable |
| Notifications | **sonner** | Rich, animated toasts |
| Seeding | **tsx** + **dotenv** | Run `.ts` scripts against Supabase via service role |

---

## 4. Data model

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users` |
| `display_name` | text |  |
| `default_currency` | text | e.g. USD, INR |
| `starting_capital` | numeric | fallback for accounts |
| `created_at` | timestamptz |  |

### `trading_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users` |
| `name` | text | e.g. "MT5 Live · IC Markets" |
| `broker` | text nullable | "XM", "Binance", etc. |
| `account_type` | text | `live` / `demo` / `paper` |
| `currency` | text | ISO code |
| `starting_balance` | numeric |  |
| `color` | text nullable | Hex, used in UI accents |
| `is_default` | boolean | Only one per user (partial unique index) |
| `is_archived` | boolean |  |
| `created_at`, `updated_at` | timestamptz |  |

### `trades`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users` |
| `account_id` | uuid nullable | FK → `trading_accounts` |
| `symbol` | text |  |
| `market` | enum | `forex` / `crypto` / `equity` / `options` / `futures` |
| `direction` | enum | `long` / `short` |
| `entry_price`, `exit_price` | numeric | exit null while open |
| `quantity` | numeric | lots / shares / contracts / coins |
| `lot_size` | numeric nullable | contract multiplier (100_000 for FX) |
| `entry_at`, `exit_at` | timestamptz |  |
| `status` | enum | `open` / `closed` |
| `pnl`, `pnl_percent` | numeric nullable | computed on close |
| `fees` | numeric | commission + swap combined |
| `stop_loss`, `take_profit` | numeric nullable |  |
| `strategy` | text nullable |  |
| `notes_entry`, `notes_exit`, `mistakes` | text nullable |  |
| `source` | text | `manual` / `mt5_import` / `csv_import` / `api_sync` |
| `external_id` | text nullable | Broker position id for dedup |
| `created_at`, `updated_at` | timestamptz |  |

Indexes: `(user_id, entry_at desc)`, `(user_id, status)`, `(account_id)`,
unique `(account_id, external_id)` where `external_id is not null`.

### `trade_tags`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `trade_id` | uuid | FK → `trades` (cascade) |
| `tag` | text |  |

Unique `(trade_id, tag)`.

### `trade_images`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `trade_id` | uuid | FK → `trades` (cascade) |
| `kind` | enum | `entry_chart` / `exit_chart` / `other` |
| `storage_path` | text | `<user_id>/<trade_id>/<filename>` in `trade-charts` bucket |
| `caption` | text nullable |  |
| `created_at` | timestamptz |  |

### Storage
- Bucket **`trade-charts`** (private).
- Storage RLS: user can only read/write files under `<their user_id>/…`.

### RLS
Every user-owned table has `for all using (auth.uid() = user_id)`.
`trade_tags` and `trade_images` check ownership via the parent trade.

---

## 5. File & folder structure

```
app/
  (auth)/
    layout.tsx                       # brand panel + form panel
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx                       # auth guard + AppShell + account bootstrap
    actions/
      account.ts                     # set-current, save, archive, delete, set-default
      import.ts                      # upsert imported trades
    dashboard/page.tsx               # KPIs + EquityCurvePro + recent trades
    trades/
      page.tsx                       # sortable table with search / filters
      new/page.tsx                   # multi-section trade form
      [id]/page.tsx                  # trade detail + chart gallery
      [id]/edit/page.tsx
    analytics/page.tsx               # weekly/monthly + win rate + advanced metrics
    calendar/page.tsx                # in-house P&L heatmap
    accounts/page.tsx                # multi-account CRUD
    import/page.tsx                  # MT5 statement importer
    settings/page.tsx
  setup/page.tsx                     # shown when Supabase env is missing
  layout.tsx                         # ThemeProvider / Query / Tooltip / Toaster
  page.tsx                           # redirects to /dashboard

components/
  auth/                              # login-form, signup-form, auth-shell
  layout/                            # app-shell, sidebar, topbar, page-transition, page-header, theme-toggle
  accounts/                          # account-switcher, accounts-view, account-form
  trades/                            # trade-form, trades-table, trade-charts, image-uploader, symbol-picker
  charts/                            # equity-curve-pro, pnl-bar-chart, win-rate-donut, day-of-week-chart, hour-of-day-heatmap
  dashboard/                         # kpi-card (count-up)
  analytics/                         # analytics-view
  calendar/                          # calendar-view
  import/                            # import-view
  settings/                          # settings-form
  providers/                         # query-provider, theme-provider
  ui/                                # shadcn primitives (base-nova)

lib/
  supabase/
    client.ts                        # browser
    server.ts                        # RSC / server components
    middleware.ts                    # session refresh + route guard
  analytics.ts                       # pure aggregations (win rate, drawdown, expectancy…)
  accounts.ts                        # client-safe helpers (fetchAccounts, ensureDefaultAccount, accountBalance, constants)
  accounts-server.ts                 # server-only readCurrentAccountId (uses next/headers)
  trades.ts                          # fetchTrades, fetchTrade, signedImageUrl
  mt5-parser.ts                      # HTML + CSV/TSV → ParsedTrade[]
  symbols.ts                         # curated symbol universe + contractSize + market classifier
  schemas.ts                         # zod schemas (trade form, auth)
  format.ts                          # formatCurrency, formatSigned, formatPercent
  utils.ts                           # cn()

types/database.ts                    # hand-typed Supabase Database interface (RLS-safe)

supabase/migrations/
  0001_init.sql                      # profiles / trades / trade_tags / trade_images + RLS + storage bucket
  0002_trading_accounts.sql          # trading_accounts + trades.account_id
  0003_import_metadata.sql           # trades.source + trades.external_id + dedup unique index

scripts/seed.ts                      # inserts ~30 realistic sample trades (needs service_role key)

middleware.ts                        # Next.js middleware entrypoint
next.config.ts                       # Turbopack root + Supabase image domains
.env.local.example
```

---

## 6. Local setup

Prerequisites: **Node 20+**, **npm**, a free **Supabase** project.

### 1. Install deps
```powershell
npm install
```

### 2. Create Supabase project + run migrations
- Go to https://supabase.com/dashboard → New project.
- SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
- Same for `0002_trading_accounts.sql` and `0003_import_metadata.sql`.

### 3. Configure env vars
Copy `.env.local.example` to `.env.local` and paste in:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
# Only needed to run the seed script (not for the app itself)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 4. Dev server
```powershell
npm run dev
```
Open http://localhost:3000. You'll be redirected to `/login`. Create an
account. A "Main" trading account is auto-created on your first visit.

### 5. (Optional) Seed sample data
```powershell
npm run seed -- you@example.com
```
Populates ~30 realistic trades across Forex, Crypto, Equity and Futures so the
dashboard & analytics look alive while you explore.

---

## 7. Deployment — free & personal

Total cost: **$0**. Vercel Hobby + Supabase Free are enough forever for
personal use.

1. **Push to a personal GitHub account** (private repo):
   ```powershell
   git add -A && git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ledger.git
   git push -u origin main
   ```
2. **Deploy on Vercel** at https://vercel.com/signup with your **personal**
   email (not a work SSO). Import the repo, add these env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Point Supabase at the new URL**: Auth → URL Configuration → set Site URL
   and add the Vercel URL to Redirect URLs.
4. Every `git push` to `main` auto-deploys. PRs get preview URLs.

Custom domain is optional — Vercel gives you `<project>.vercel.app` for free.

---

## 8. Migrations

All schema lives in `supabase/migrations/*.sql`. Run each in the Supabase
SQL Editor **in numeric order** if you're starting a fresh project.

| # | File | What it adds |
|---|---|---|
| 0001 | `0001_init.sql` | `profiles`, `trades`, `trade_tags`, `trade_images`, RLS policies, `trade-charts` storage bucket, `handle_new_user` trigger, `touch_updated_at` trigger. |
| 0002 | `0002_trading_accounts.sql` | `trading_accounts` table (multi-account) + `trades.account_id` FK. |
| 0003 | `0003_import_metadata.sql` | `trades.source` + `trades.external_id` + unique dedup index for imports. |

---

## 9. Advanced analytics — what's already in

All pure functions in `lib/analytics.ts`:

| Metric | Where you see it |
|---|---|
| Total P&L, Win rate, Avg R:R, Current-month P&L | Dashboard KPI cards |
| Equity curve + peak/trough + trade ribbon | Dashboard hero chart |
| Expectancy per trade | Analytics stat cards |
| **Max drawdown** ($ and % from peak) | Analytics stat cards |
| Winning / losing streak | Analytics stat cards |
| Avg hold days, Active trading days | Analytics stat cards |
| **Long vs Short** — P&L, count, win rate | Analytics section |
| **Best & worst symbols** — top 8 by P&L | Analytics section |
| **Day of week** — bars with win rate | Analytics section |
| **Hour of day** — 24-cell heatmap | Analytics section |
| Weekly + monthly P&L bars | Analytics tabs |
| Best / worst individual trade | Analytics section |
| P&L calendar heatmap | Calendar page |

---

## 10. Roadmap

Things worth building next (in rough order of value):

1. **Broker CSV import for non-MT5 brokers** (Zerodha, Alpaca, IBKR flex).
2. **Binance / Bybit read-only API sync** (background job, safe by design).
3. **R-multiple tracking** — record P&L in units of risk, not just currency.
4. **Playbook / setup library** — save named setups with rules & checklists
   and tag trades with the setup used.
5. **Emotion tagging** — calm / FOMO / patient / revenge / disciplined per
   trade, then correlate with performance.
6. **Rules-followed** checkbox on the trade form + "rule violations" metric.
7. **Sharpe / Sortino ratios** (needs daily equity samples).
8. **Deposits & withdrawals** as ledger entries so account balance stays
   accurate over time.
9. **CSV / PDF export** of the entire journal.
10. **Bulk-move trades** between accounts.
11. **Multi-currency FX conversion** for the "All accounts" combined balance.
12. **Share links** — publish a specific trade (or a whole month) via a
    signed public URL for review with a coach.
13. **Google & Apple OAuth** sign-in.
14. **PWA / installable app** — already almost there; needs a manifest and
    service worker.
15. **Screenshot annotation** — draw on chart images directly in the app.
