-- Username + password accounts with self-service registration.
-- Each account owns one profile: a private copy of the luden_* tables, created on sign-up.
-- Existing PIN profiles keep their tables; they can be linked to an account from Settings.
-- Apply once with a privileged connection (SQL editor or psql). Idempotent.
begin;

create table if not exists public.luden_users (
 id uuid primary key default gen_random_uuid(),
 username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'),
 display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
 password_hash text not null check (password_hash like 'scrypt$%'),
 profile text not null unique check (profile ~ '^[a-z][a-z0-9_]{1,30}$'),
 created_at timestamptz not null default now(),
 last_login_at timestamptz
);
alter table public.luden_users enable row level security;
revoke all on public.luden_users from public,anon,authenticated;
grant select,insert,update,delete on public.luden_users to service_role;

-- A profile exists when its settings table exists (luden keeps the base tables).
create or replace function public.luden_profile_exists(p_profile text) returns boolean
language sql stable security invoker set search_path=public as $$
 select p_profile ~ '^[a-z][a-z0-9_]{1,30}$' and to_regclass('public.'||case when p_profile='luden' then 'luden_settings' else p_profile||'_settings' end) is not null;
$$;

-- Management functions and checks listed three fixed profiles; accept any existing profile instead.
do $$ declare f record; src text; c record; begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'aurum_management%' loop
  src:=pg_get_functiondef(f.oid);
  if position('''luden'',''danil'',''miguel''' in src)>0 then
   src:=replace(src,'p_profile not in (''luden'',''danil'',''miguel'')','not public.luden_profile_exists(p_profile)');
   src:=replace(src,'p_profile in (''luden'',''danil'',''miguel'')','public.luden_profile_exists(p_profile)');
   execute src;
  end if;
 end loop;
 for c in select con.conname,cls.relname from pg_constraint con join pg_class cls on cls.oid=con.conrelid join pg_namespace n on n.oid=cls.relnamespace
  where n.nspname='public' and cls.relname in ('aurum_management_items','aurum_management_events','aurum_management_revisions')
   and con.contype='c' and pg_get_constraintdef(con.oid) like '%danil%' loop
  execute format('alter table public.%I drop constraint %I',c.relname,c.conname);
  execute format('alter table public.%I add constraint %I check (profile ~ %L)',c.relname,c.conname,'^[a-z][a-z0-9_]{1,30}$');
 end loop;
end $$;

-- Creates every private table, foreign key and sync trigger for one profile.
create or replace function public.luden_provision_profile(p_profile text) returns void
language plpgsql security definer set search_path=public as $$
declare base text; target text; item record; link_column text;
begin
 if p_profile !~ '^[a-z][a-z0-9_]{1,30}$' or p_profile='luden' then raise exception 'Perfil no válido.'; end if;
 foreach base in array array['accounts','settings','transactions','budgets','debts','debt_payments','day_blocks','day_done','day_changes','widget_tokens','push_subscriptions','push_deliveries','finance_push_deliveries'] loop
  if to_regclass('public.luden_'||base) is null then continue; end if;
  target:=p_profile||'_'||base;
  execute format('create table if not exists public.%I (like public.%I including all)',target,'luden_'||base);
  execute format('alter table public.%I enable row level security',target);
  execute format('revoke all on public.%I from public,anon,authenticated',target);
  execute format('grant select,insert,update,delete on public.%I to service_role',target);
 end loop;
 -- LIKE copies indexes, checks and defaults; foreign keys must point to this profile's tables.
 for item in select c.conname,t.relname source_table,pg_get_constraintdef(c.oid) definition
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname like 'luden\_%' and c.contype='f' loop
  target:=replace(item.source_table,'luden_',p_profile||'_');
  if to_regclass('public.'||target) is null then continue; end if;
  if not exists(select 1 from pg_constraint where conrelid=('public.'||target)::regclass and conname=replace(item.conname,'luden_',p_profile||'_')) then
   execute format('alter table public.%I add constraint %I %s',target,replace(item.conname,'luden_',p_profile||'_'),replace(item.definition,'luden_',p_profile||'_'));
  end if;
 end loop;
 execute format('insert into public.%I (id) values (%L) on conflict do nothing',p_profile||'_settings','luden');
 -- Orders keep their ledger in sync with these tables (see management-sync.sql).
 if to_regclass('public.aurum_management_revisions') is not null then
  insert into aurum_management_revisions(profile) values(p_profile) on conflict do nothing;
  foreach base in array array['accounts','transactions','debts','debt_payments'] loop
   target:=p_profile||'_'||base;
   execute format('drop trigger if exists aurum_management_write_lock on public.%I',target);
   execute format('create trigger aurum_management_write_lock before insert or update or delete on public.%I for each statement execute function public.aurum_management_write_lock(%L)',target,p_profile);
   execute format('drop trigger if exists aurum_management_revision on public.%I',target);
   execute format('create trigger aurum_management_revision after insert or update or delete on public.%I for each statement execute function public.aurum_management_revision_changed(%L)',target,p_profile);
   if base in ('transactions','debt_payments','debts') then
    link_column:=case when base='transactions' then 'transaction_id' when base='debts' then 'debt_id' else 'debt_payment_id' end;
    execute format('drop trigger if exists aurum_management_ledger_sync on public.%I',target);
    execute format('create trigger aurum_management_ledger_sync after update or delete on public.%I for each row execute function public.aurum_management_ledger_changed(%L,%L)',target,p_profile,link_column);
   end if;
  end loop;
 end if;
 perform pg_notify('pgrst','reload schema');
end $$;

-- Atomic sign-up: the account and its private tables are created together or not at all.
create or replace function public.luden_register_user(p_username text,p_display_name text,p_password_hash text) returns text
language plpgsql security definer set search_path=public as $$
declare new_profile text;
begin
 if exists(select 1 from luden_users where username=p_username) then raise exception 'username_taken' using errcode='23505'; end if;
 loop
  new_profile:='u'||substr(replace(gen_random_uuid()::text,'-',''),1,10);
  exit when not public.luden_profile_exists(new_profile);
 end loop;
 insert into luden_users(username,display_name,password_hash,profile) values(p_username,btrim(p_display_name),p_password_hash,new_profile);
 perform public.luden_provision_profile(new_profile);
 return new_profile;
end $$;

-- Links an existing PIN profile to a username and password (no new tables).
create or replace function public.luden_link_account(p_profile text,p_username text,p_display_name text,p_password_hash text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.luden_profile_exists(p_profile) then raise exception 'Perfil no válido.'; end if;
 insert into luden_users(username,display_name,password_hash,profile) values(p_username,btrim(p_display_name),p_password_hash,p_profile);
end $$;

revoke all on function public.luden_profile_exists(text),public.luden_provision_profile(text),public.luden_register_user(text,text,text),public.luden_link_account(text,text,text,text) from public,anon,authenticated;
grant execute on function public.luden_profile_exists(text),public.luden_provision_profile(text),public.luden_register_user(text,text,text),public.luden_link_account(text,text,text,text) to service_role;
commit;
notify pgrst,'reload schema';
