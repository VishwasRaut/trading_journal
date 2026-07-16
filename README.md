# Ledger — Trading Journal

A trendy, animated trading journal built with **Next.js 16**, **Supabase**,
**Tailwind CSS v4**, **shadcn/ui** (base-nova) and **Framer Motion**.

Log every trade (entry, exit, P&L), attach chart screenshots with notes on
*why* you took the trade and *what happened*, and review your performance
weekly / monthly across Forex, Crypto, Stocks/Equity, Options and Futures.

## Features

- Multi-user auth (email + password) via Supabase, with row-level security
- Log open & closed trades with entry/exit prices, stops, targets, fees, tags
- Drag-and-drop chart screenshot uploads (entry & exit) with lightbox
- Weekly & monthly P&L bar charts, equity curve, win-rate donut
- GitHub-style calendar heatmap of daily P&L, click a day to see trades
- Best / worst trade cards, current streak, avg R:R, avg hold time
- Animated sidebar with sliding active indicator, page transitions,
  count-up KPI numbers, glassmorphism cards, animated gradient background

## Prerequisites

- Node.js 20+ and npm
- A free Supabase project (https://supabase.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. In the SQL Editor, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and run it. This creates the schema, RLS policies, and the `trade-charts`
   storage bucket.
3. In **Project Settings → API**, copy the *Project URL* and the *anon*
   public key.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and paste the values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Create an
account on `/signup`, then start logging trades.

## Building for production

```bash
npm run build
npm start
```

The app is deployment-ready for [Vercel](https://vercel.com) — connect the
GitHub repo, add the two `NEXT_PUBLIC_SUPABASE_*` env vars and deploy.

## Project structure

```
app/
  (auth)/         # login + signup pages, animated marketing panel
  (app)/          # protected shell — dashboard, trades, analytics, calendar, settings
  layout.tsx      # theme + toaster + query provider
  page.tsx        # redirects to /dashboard

components/
  auth/           # login-form, signup-form, auth-shell
  layout/         # sidebar, topbar, app-shell, page-transition, page-header
  trades/         # trade-form, image-uploader, trades-table, trade-charts
  charts/         # equity-curve, pnl-bar-chart, win-rate-donut
  dashboard/      # kpi-card (count-up animations)
  analytics/      # analytics-view
  calendar/       # calendar-view (in-house P&L heatmap)
  settings/       # settings-form
  ui/             # shadcn primitives (base-nova style, built on @base-ui/react)
  providers/      # QueryProvider

lib/
  analytics.ts    # pure aggregation functions (P&L, win rate, streaks, weekly/monthly, heatmap)
  schemas.ts      # zod schemas for trade + auth forms
  format.ts       # currency / percent formatters
  trades.ts       # Supabase helpers: fetchTrades, fetchTrade, signedImageUrl
  supabase/       # browser client, server client, session-refresh middleware
  utils.ts        # cn()

types/database.ts # Typed Supabase Database interface (RLS-safe)

supabase/migrations/0001_init.sql   # Full schema + policies + storage bucket
```

## Data model

- `profiles` — one row per user (display name, currency, starting capital)
- `trades` — one row per trade (see the migration for all fields)
- `trade_tags` — many-to-many tags per trade (breakout, FVG, news, etc.)
- `trade_images` — chart screenshots stored in the `trade-charts` bucket,
  namespaced by `<user_id>/<trade_id>/<filename>`

Every table enforces RLS: `auth.uid() = user_id` (via trade for tags/images).

## Notes

- Dark mode is on by default. Colors use OKLCH for a wider gamut.
- All animations use Framer Motion; number KPIs count up on mount.
- Charts use Recharts (bar + area) — no @nivo dependency.
- The calendar heatmap is an in-house component so it stays fully typed
  against `TradeWithRelations` and animates via Framer Motion.
