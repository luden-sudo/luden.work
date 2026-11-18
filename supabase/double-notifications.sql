-- Two separate deliveries per activity; start time also distinguishes resumed blocks.
begin;
alter table public.luden_push_deliveries add column if not exists event_key text not null default 'start';
update public.luden_push_deliveries d set event_key='start:'||b.time from public.luden_day_blocks b where d.block_id=b.id and d.event_key='start';
alter table public.luden_push_deliveries drop constraint if exists luden_push_deliveries_pkey;
alter table public.luden_push_deliveries add primary key(subscription_id,block_id,day,event_key);
commit;
notify pgrst,'reload schema';
