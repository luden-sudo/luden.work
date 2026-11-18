-- Additive migration. Financial tables and existing records are not changed.
create table if not exists public.luden_day_blocks (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 100),
 description text not null default '', time text not null check(time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 weekdays smallint[] not null check(cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
 kind text not null default 'rutina' check(kind in ('rutina','comida','trabajo','estudio','descanso','entreno','noche','compra','casa')),
 remind boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.luden_day_done (
 block_id uuid references public.luden_day_blocks(id) on delete cascade, day date not null,
 primary key(block_id,day)
);
create table if not exists public.luden_app_config (key text primary key,value text not null);
create table if not exists public.luden_widget_tokens (token_hash text primary key,created_at timestamptz not null default now());
create table if not exists public.luden_push_subscriptions (id uuid primary key default gen_random_uuid(),endpoint text unique not null,subscription jsonb not null,created_at timestamptz not null default now());
create table if not exists public.luden_push_deliveries (subscription_id uuid references public.luden_push_subscriptions(id) on delete cascade,block_id uuid references public.luden_day_blocks(id) on delete cascade,day date not null,primary key(subscription_id,block_id,day));
create table if not exists public.luden_pin_attempts (address_hash text primary key,attempts int not null,window_start timestamptz not null);
alter table public.luden_day_blocks enable row level security;
alter table public.luden_day_done enable row level security;
alter table public.luden_app_config enable row level security;
alter table public.luden_widget_tokens enable row level security;
alter table public.luden_push_subscriptions enable row level security;
alter table public.luden_push_deliveries enable row level security;
alter table public.luden_pin_attempts enable row level security;
revoke all on public.luden_day_blocks,public.luden_day_done,public.luden_app_config,public.luden_widget_tokens,public.luden_push_subscriptions,public.luden_push_deliveries,public.luden_pin_attempts from anon,authenticated;
grant all on public.luden_day_blocks,public.luden_day_done,public.luden_app_config,public.luden_widget_tokens,public.luden_push_subscriptions,public.luden_push_deliveries,public.luden_pin_attempts to service_role;
create or replace function public.luden_check_pin_rate(address_hash text) returns boolean language sql security invoker set search_path=public as $$
 insert into luden_pin_attempts as attempts(address_hash,attempts,window_start) values(address_hash,1,now())
 on conflict(address_hash) do update set
 attempts=case when attempts.window_start<now()-interval '15 minutes' then 1 else attempts.attempts+1 end,
 window_start=case when attempts.window_start<now()-interval '15 minutes' then now() else attempts.window_start end
 returning attempts<=10;
$$;
revoke all on function public.luden_check_pin_rate(text) from public,anon,authenticated;
grant execute on function public.luden_check_pin_rate(text) to service_role;
notify pgrst,'reload schema';
