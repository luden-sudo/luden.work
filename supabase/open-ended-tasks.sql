-- Tasks can have only a start time. Bounded events still reject overlaps.
begin;
do $$
declare profile text; target text; constraint_row record;
begin
 foreach profile in array array['luden','danil','miguel'] loop
  target:=profile||'_day_blocks';
  for constraint_row in select conname from pg_constraint where conrelid=('public.'||target)::regclass and
   (contype='x' or (contype='c' and pg_get_constraintdef(oid) like '%plan_date%')) loop
    execute format('alter table public.%I drop constraint %I',target,constraint_row.conname);
  end loop;
  execute format('alter table public.%I add constraint %I check ((plan_date is null and end_time is null) or (plan_date is not null and (end_time is null or (end_time ~ %L and time < end_time))))',target,profile||'_day_plan_range','^([01][0-9]|2[0-3]):[0-5][0-9]$');
  execute format('alter table public.%I add constraint %I exclude using gist (int8range((plan_date-date %L)::bigint*1440+substring(time,1,2)::int*60+substring(time,4,2)::int,(plan_date-date %L)::bigint*1440+substring(end_time,1,2)::int*60+substring(end_time,4,2)::int,%L) with &&) where (plan_date is not null and end_time is not null)',target,profile||'_day_plans_no_overlap','2000-01-01','2000-01-01','[)');
 end loop;
end $$;
commit;
notify pgrst,'reload schema';

