-- Additive and idempotent. Existing routines, progress, RLS and finance stay unchanged.
begin;
alter table public.luden_day_blocks add column if not exists plan_date date;
alter table public.luden_day_blocks add column if not exists end_time text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='luden_day_plan_range' and conrelid='public.luden_day_blocks'::regclass) then
  alter table public.luden_day_blocks add constraint luden_day_plan_range check (
   (plan_date is null and end_time is null) or
   (plan_date is not null and end_time is not null and end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and time < end_time)
  );
 end if;
 -- A single integer range encodes date + minute. Built-in GiST, no extension required.
 -- This prevents overlapping plans even when two devices save concurrently.
 if not exists(select 1 from pg_constraint where conname='luden_day_plans_no_overlap' and conrelid='public.luden_day_blocks'::regclass) then
  alter table public.luden_day_blocks add constraint luden_day_plans_no_overlap exclude using gist (
   int8range(
    (plan_date-date '2000-01-01')::bigint*1440+substring(time,1,2)::int*60+substring(time,4,2)::int,
    (plan_date-date '2000-01-01')::bigint*1440+substring(end_time,1,2)::int*60+substring(end_time,4,2)::int,'[)'
   ) with &&
  ) where (plan_date is not null);
 end if;
end $$;
commit;
