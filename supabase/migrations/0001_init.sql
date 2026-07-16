-- Trading Journal — initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ------------- enums -------------
do $$ begin
  create type market as enum ('forex', 'crypto', 'equity', 'options', 'futures');
exception when duplicate_object then null; end $$;

do $$ begin
  create type direction as enum ('long', 'short');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trade_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type image_kind as enum ('entry_chart', 'exit_chart', 'other');
exception when duplicate_object then null; end $$;

-- ------------- profiles -------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_currency text not null default 'USD',
  starting_capital numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------- trades -------------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market market not null,
  direction direction not null,
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  lot_size numeric,
  entry_at timestamptz not null,
  exit_at timestamptz,
  status trade_status not null default 'open',
  pnl numeric,
  pnl_percent numeric,
  fees numeric not null default 0,
  stop_loss numeric,
  take_profit numeric,
  strategy text,
  notes_entry text,
  notes_exit text,
  mistakes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_id_entry_at_idx
  on public.trades (user_id, entry_at desc);
create index if not exists trades_user_id_status_idx
  on public.trades (user_id, status);

alter table public.trades enable row level security;

drop policy if exists "trades_owner_all" on public.trades;
create policy "trades_owner_all" on public.trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trades_touch_updated_at on public.trades;
create trigger trades_touch_updated_at
  before update on public.trades
  for each row execute function public.touch_updated_at();

-- ------------- trade_tags -------------
create table if not exists public.trade_tags (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  tag text not null,
  unique (trade_id, tag)
);

create index if not exists trade_tags_trade_id_idx on public.trade_tags (trade_id);
create index if not exists trade_tags_tag_idx on public.trade_tags (tag);

alter table public.trade_tags enable row level security;

drop policy if exists "trade_tags_owner_all" on public.trade_tags;
create policy "trade_tags_owner_all" on public.trade_tags
  for all
  using (exists (
    select 1 from public.trades t
    where t.id = trade_tags.trade_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trades t
    where t.id = trade_tags.trade_id and t.user_id = auth.uid()
  ));

-- ------------- trade_images -------------
create table if not exists public.trade_images (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  kind image_kind not null default 'other',
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists trade_images_trade_id_idx on public.trade_images (trade_id);

alter table public.trade_images enable row level security;

drop policy if exists "trade_images_owner_all" on public.trade_images;
create policy "trade_images_owner_all" on public.trade_images
  for all
  using (exists (
    select 1 from public.trades t
    where t.id = trade_images.trade_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.trades t
    where t.id = trade_images.trade_id and t.user_id = auth.uid()
  ));

-- ------------- storage bucket -------------
insert into storage.buckets (id, name, public)
values ('trade-charts', 'trade-charts', false)
on conflict (id) do nothing;

-- Storage policies: files are namespaced by <user_id>/<trade_id>/<filename>
drop policy if exists "trade_charts_owner_read" on storage.objects;
create policy "trade_charts_owner_read" on storage.objects
  for select
  using (
    bucket_id = 'trade-charts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "trade_charts_owner_write" on storage.objects;
create policy "trade_charts_owner_write" on storage.objects
  for insert
  with check (
    bucket_id = 'trade-charts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "trade_charts_owner_update" on storage.objects;
create policy "trade_charts_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'trade-charts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "trade_charts_owner_delete" on storage.objects;
create policy "trade_charts_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'trade-charts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
