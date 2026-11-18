-- Day-specific changes; weekly routines and finance are preserved.
begin;
create table if not exists public.luden_day_changes (
 day date primary key,
 overrides jsonb not null default '[]'::jsonb check (jsonb_typeof(overrides)='array'),
 updated_at timestamptz not null default now()
);
alter table public.luden_day_changes enable row level security;
revoke all on public.luden_day_changes from anon,authenticated;
grant select,insert,update,delete on public.luden_day_changes to service_role;
commit;
