begin;
-- Preserve old clients' routine consent; the new API explicitly opts finance-only devices out.
alter table public.luden_push_subscriptions add column if not exists routine_enabled boolean not null default true;
alter table public.luden_push_subscriptions add column if not exists finance_enabled boolean not null default false;
alter table public.luden_push_subscriptions add column if not exists finance_details boolean not null default false;
alter table public.luden_push_subscriptions add column if not exists finance_hour integer not null default 9 check (finance_hour between 0 and 23);
create table if not exists public.luden_finance_push_deliveries (
  subscription_id uuid not null references public.luden_push_subscriptions(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, day)
);
alter table public.luden_finance_push_deliveries enable row level security;
revoke all on public.luden_finance_push_deliveries from public, anon, authenticated;
grant all on public.luden_finance_push_deliveries to service_role;
notify pgrst, 'reload schema';
commit;
