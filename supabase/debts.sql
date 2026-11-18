-- Add debt tracking to an existing shared-profile database.
begin;
create table if not exists public.luden_debts (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 person text not null check (length(trim(person)) between 1 and 100),
 direction text not null check (direction in ('me_deben','debo')),
 total numeric(14,2) not null check (total > 0),
 payment_type text not null default 'Único',
 start_date date not null default current_date,
 due_date date,
 notes text not null default '' check (length(notes) <= 500),
 created_at timestamptz not null default now()
);
create table if not exists public.luden_debt_payments (
 id uuid primary key default gen_random_uuid(),
 debt_id uuid not null references public.luden_debts(id) on delete cascade,
 amount numeric(14,2) not null check (amount > 0),
 date date not null default current_date,
 account_id uuid references public.luden_accounts(id) on delete set null,
 notes text not null default '' check (length(notes) <= 200),
 created_at timestamptz not null default now()
);
create index if not exists luden_debts_created on public.luden_debts(created_at desc);
create index if not exists luden_debt_payments_debt on public.luden_debt_payments(debt_id,date desc);
do $$ declare t text; begin
 foreach t in array array['luden_debts','luden_debt_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to anon, authenticated',t);
  execute format('drop policy if exists shared_workspace on public.%I',t);
  execute format('create policy shared_workspace on public.%I for all to anon,authenticated using (true) with check (true)',t);
 end loop;
end $$;
commit;
