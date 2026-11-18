create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  salary numeric(14,2) not null default 0,
  bank numeric(14,2) not null default 0,
  cash numeric(14,2) not null default 0,
  crypto numeric(14,2) not null default 0,
  monthly_budget numeric(14,2) not null default 0,
  fixed_expenses numeric(14,2) not null default 0,
  savings_goal numeric(14,2) not null default 0,
  goal_name text not null default '',
  currency text not null default 'EUR',
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  account text not null,
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('gasto','ingreso')),
  transaction_date date not null,
  icon text not null default 'other',
  micro boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles_own_rows" on public.profiles;
create policy "profiles_own_rows" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "transactions_own_rows" on public.transactions;
create policy "transactions_own_rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
