-- 0002_trading_accounts.sql
-- Adds multi-account support: users can have several trading accounts
-- (e.g. "MT5 Live", "Binance Spot", "IBKR Paper"), and each trade belongs
-- to exactly one account. Existing trades without an account_id keep working.

-- ------------- trading_accounts -------------
create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text,
  account_type text not null default 'live', -- 'live' | 'demo' | 'paper'
  currency text not null default 'USD',
  starting_balance numeric not null default 0,
  color text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trading_accounts_user_id_idx
  on public.trading_accounts (user_id);

-- Only one default account per user
create unique index if not exists trading_accounts_one_default_per_user
  on public.trading_accounts (user_id)
  where is_default = true;

alter table public.trading_accounts enable row level security;

drop policy if exists "accounts_owner_all" on public.trading_accounts;
create policy "accounts_owner_all" on public.trading_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists accounts_touch_updated_at on public.trading_accounts;
create trigger accounts_touch_updated_at
  before update on public.trading_accounts
  for each row execute function public.touch_updated_at();

-- ------------- trades: account_id -------------
alter table public.trades
  add column if not exists account_id uuid
    references public.trading_accounts(id) on delete set null;

create index if not exists trades_account_id_idx
  on public.trades (account_id);
