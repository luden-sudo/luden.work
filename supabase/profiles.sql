-- Private tables for the two additional profiles. Existing luden data stays in place.
begin;
do $$
declare profile text; source text; target text; item record; definition text;
begin
 foreach profile in array array['danil','miguel'] loop
  for source in select tablename from pg_tables where schemaname='public' and tablename like 'luden_%' and tablename not in ('luden_app_config','luden_pin_attempts') loop
   target:=replace(source,'luden_',profile||'_');
   execute format('create table if not exists public.%I (like public.%I including all)',target,source);
   execute format('alter table public.%I enable row level security',target);
   execute format('revoke all on public.%I from public,anon,authenticated',target);
   execute format('grant select,insert,update,delete on public.%I to service_role',target);
  end loop;
  -- LIKE copies indexes/checks/defaults, but foreign keys must point to this profile.
  for item in select c.conname,c.conrelid::regclass::text source_table,pg_get_constraintdef(c.oid) definition
   from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='public' and t.relname like 'luden_%' and c.contype='f' loop
   target:=replace(item.source_table,'luden_',profile||'_');
   definition:=replace(item.definition,'luden_',profile||'_');
   if not exists(select 1 from pg_constraint where conrelid=target::regclass and conname=replace(item.conname,'luden_',profile||'_')) then
    execute format('alter table %s add constraint %I %s',target,replace(item.conname,'luden_',profile||'_'),definition);
   end if;
  end loop;
  execute format('insert into public.%I (id) values (%L) on conflict do nothing',profile||'_settings','luden');
 end loop;
end $$;
commit;
notify pgrst,'reload schema';

