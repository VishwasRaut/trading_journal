-- 0004_playbooks_and_plan.sql
-- Turns Ledger into a pro-grade journal:
--   1. Playbook / setup library so trades can be grouped by strategy.
--   2. Pre-trade planning: thesis + planned entry/stop/target and a "planned"
--      status so a trade can be logged before it fires.
--   3. R-multiples: initial_risk lets us compute pnl / initial_risk (R),
--      which is how professionals measure edge.
--   4. Rule adherence: playbooks carry a checklist; each trade records which
--      items were ticked and gets an execution grade.

-- ------------- enum additions -------------

-- Add 'planned' to the existing trade_status enum. `alter type ... add value`
-- can't run inside a subtransaction, so this must be a bare statement (not
-- wrapped in `do $$ ... end $$`). Idempotent via `if not exists`.
alter type trade_status add value if not exists 'planned' before 'open';

do $$ begin
  create type execution_grade as enum ('A', 'B', 'C', 'D', 'F');
exception when duplicate_object then null; end $$;

-- ------------- playbooks -------------
create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  -- Target R:R this setup aims for. Purely informational — analytics compares
  -- actual R vs this to flag setups where you keep exiting early.
  target_r_multiple numeric,
  -- Ordered list of rule strings the trader must confirm before entering.
  -- Stored as jsonb array of {id: text, label: text} objects so we can add
  -- items without renumbering old trades' checklist_completed arrays.
  checklist jsonb not null default '[]'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playbooks_user_id_idx
  on public.playbooks (user_id);

alter table public.playbooks enable row level security;

drop policy if exists "playbooks_owner_all" on public.playbooks;
create policy "playbooks_owner_all" on public.playbooks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists playbooks_touch_updated_at on public.playbooks;
create trigger playbooks_touch_updated_at
  before update on public.playbooks
  for each row execute function public.touch_updated_at();

-- ------------- trades: plan, risk, playbook, grade -------------
alter table public.trades
  add column if not exists playbook_id uuid
    references public.playbooks(id) on delete set null,
  -- Dollar amount the trader was prepared to lose on this trade. Used to
  -- derive r_multiple = pnl / initial_risk. Required for proper expectancy.
  add column if not exists initial_risk numeric,
  add column if not exists planned_entry numeric,
  add column if not exists planned_stop numeric,
  add column if not exists planned_target numeric,
  add column if not exists thesis text,
  -- Array of playbook checklist item ids that were ticked at entry.
  add column if not exists checklist_completed jsonb not null default '[]'::jsonb,
  -- Grade the *execution*, not the outcome. A losing A-grade trade is fine.
  add column if not exists execution_grade execution_grade;

create index if not exists trades_playbook_id_idx
  on public.trades (playbook_id);

comment on column public.trades.initial_risk is
  'Dollar amount at risk on entry. r_multiple = pnl / initial_risk.';
comment on column public.trades.checklist_completed is
  'jsonb array of playbook checklist item ids that were ticked at entry.';
comment on column public.trades.execution_grade is
  'Trader grade of how well the plan was followed (A best, F worst).';
