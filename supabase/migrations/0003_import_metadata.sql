-- 0003_import_metadata.sql
-- Adds fields the app needs to import trades from broker statements without
-- creating duplicates when the same statement is re-uploaded.

alter table public.trades
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text;

-- Dedup by (account_id, external_id): re-importing the same MT5 position ID
-- into the same account is treated as an update, not a duplicate.
create unique index if not exists trades_account_external_id_uniq
  on public.trades (account_id, external_id)
  where external_id is not null and account_id is not null;

comment on column public.trades.source is
  'How the trade was created: manual | mt5_import | csv_import | api_sync';
comment on column public.trades.external_id is
  'Broker-side identifier (e.g. MT5 Position ID) used for import dedup.';
