-- 0005_journal_and_prop_firm.sql
-- Phase 3 additions:
--   1. Prop firm guardrails per account: daily_loss_limit + max_drawdown_limit
--      so the dashboard can warn before a rule is broken.
--   2. Emotional state tracking (pre + post) — one of the single most
--      revealing analytics views for a discretionary trader.
--   3. Mistake taxonomy: replace the free-text `mistakes` column with a
--      structured many-to-many so we can *count* recurring mistakes.
--      The free-text column is preserved for existing notes.
--   4. Daily/weekly journal entries — separate from per-trade notes.

-- ------------- enums -------------

do $$ begin
  create type emotion as enum (
    'calm',      'focused',   'confident',
    'anxious',   'fearful',   'greedy',
    'fomo',      'revenge',   'bored',
    'tired',     'euphoric',  'frustrated'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type journal_entry_kind as enum ('daily', 'weekly');
exception when duplicate_object then null; end $$;

-- ------------- trading_accounts: risk limits -------------
alter table public.trading_accounts
  add column if not exists daily_loss_limit numeric,
  add column if not exists max_drawdown_limit numeric,
  -- e.g. FTMO/MyForexFunds evaluation. Free-text so users can label any
  -- prop firm; not enforced.
  add column if not exists prop_firm_name text;

comment on column public.trading_accounts.daily_loss_limit is
  'Absolute dollar loss allowed in a single day before rule breach. Null = no limit.';
comment on column public.trading_accounts.max_drawdown_limit is
  'Absolute dollar drawdown from peak allowed. Null = no limit.';

-- ------------- trades: emotion + mistake tags -------------
alter table public.trades
  add column if not exists emotion_pre emotion,
  add column if not exists emotion_post emotion;

comment on column public.trades.emotion_pre is
  'Emotional state at entry — correlates strongly with execution quality.';
comment on column public.trades.emotion_post is
  'Emotional state at exit — reveals how P&L affects psychology.';

-- Mistake taxonomy — many-to-many so counts are trivial.
create table if not exists public.trade_mistakes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  -- Keep as text so users can define their own taxonomy in future without
  -- a schema migration. Analytics groups by exact string.
  code text not null,
  unique (trade_id, code)
);

create index if not exists trade_mistakes_trade_id_idx
  on public.trade_mistakes (trade_id);
create index if not exists trade_mistakes_code_idx
  on public.trade_mistakes (code);

alter table public.trade_mistakes enable row level security;

drop policy if exists "trade_mistakes_owner_all" on public.trade_mistakes;
create policy "trade_mistakes_owner_all" on public.trade_mistakes
  for all
  using (exists (
    select 1 from public.trades t
    where t.id = trade_mistakes.trade_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trades t
    where t.id = trade_mistakes.trade_id and t.user_id = auth.uid()
  ));

-- ------------- journal_entries -------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind journal_entry_kind not null default 'daily',
  -- The calendar day (or week-start Monday) this entry is for. UTC.
  entry_date date not null,
  mood emotion,
  market_conditions text,
  what_went_well text,
  what_went_wrong text,
  lessons text,
  focus_tomorrow text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One daily / weekly entry per user per date.
  unique (user_id, kind, entry_date)
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_entries_owner_all" on public.journal_entries;
create policy "journal_entries_owner_all" on public.journal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists journal_entries_touch_updated_at on public.journal_entries;
create trigger journal_entries_touch_updated_at
  before update on public.journal_entries
  for each row execute function public.touch_updated_at();
