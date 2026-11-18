-- Explicitly public workspace, requested by the owner. Legacy private tables are preserved.
begin;
create table if not exists public.luden_settings (
 id text primary key default 'luden' check (id = 'luden'),
 currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','MXN')),
 salary numeric(14,2) not null default 0 check (salary >= 0),
 monthly_budget numeric(14,2) not null default 0 check (monthly_budget >= 0),
 goal_name text not null default 'Ahorro',
 savings_goal numeric(14,2) not null default 0 check (savings_goal >= 0)
);
create table if not exists public.luden_accounts (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 1 and 80),
 kind text not null check (kind in ('Banco','Efectivo','Cripto','Ahorro')),
 opening_balance numeric(14,2) not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.luden_transactions (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.luden_accounts(id) on delete restrict,
 destination_account_id uuid references public.luden_accounts(id) on delete restrict,
 title text not null check (length(trim(title)) between 1 and 160),
 category text not null,
 amount numeric(14,2) not null check (amount > 0),
 type text not null check (type in ('gasto','ingreso','traspaso')),
 date date not null,
 micro boolean not null default false,
 created_at timestamptz not null default now(),
 constraint luden_transactions_transfer_accounts_check check ((type = 'traspaso' and destination_account_id is not null and destination_account_id <> account_id) or (type <> 'traspaso' and destination_account_id is null))
);
create index if not exists luden_transactions_date on public.luden_transactions(date desc);
create index if not exists luden_transactions_account on public.luden_transactions(account_id);
create table if not exists public.luden_budgets (
 category text primary key,
 amount numeric(14,2) not null check (amount >= 0)
);
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
insert into public.luden_settings(id,currency,salary,monthly_budget,goal_name,savings_goal)
 select 'luden',currency,salary,monthly_budget,goal_name,savings_goal from public.profiles order by updated_at desc limit 1
 on conflict do nothing;
insert into public.luden_settings(id) values ('luden') on conflict do nothing;
insert into public.luden_accounts(name,kind,opening_balance) values
 ('Cuenta principal','Banco',coalesce((select bank from public.profiles order by updated_at desc limit 1),0)),
 ('Efectivo','Efectivo',coalesce((select cash from public.profiles order by updated_at desc limit 1),0)),
 ('Cripto','Cripto',coalesce((select crypto from public.profiles order by updated_at desc limit 1),0)) on conflict do nothing;
do $$ declare t text; begin
 foreach t in array array['luden_settings','luden_accounts','luden_transactions','luden_budgets','luden_debts','luden_debt_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
  execute format('drop policy if exists shared_workspace on public.%I',t);
 end loop;
end $$;
-- The singleton cannot be removed by clients.
revoke insert,delete on public.luden_settings from anon,authenticated;
commit;
