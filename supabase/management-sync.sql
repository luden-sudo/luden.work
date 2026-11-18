-- Authoritative ledger synchronization and lightweight, per-profile revisions.
begin;
create table if not exists public.aurum_management_revisions (
 profile text primary key check(profile in ('luden','danil','miguel')),
 revision bigint not null default 0
);
alter table public.aurum_management_revisions enable row level security;
revoke all on public.aurum_management_revisions from public,anon,authenticated;
grant select,insert,update on public.aurum_management_revisions to service_role;
insert into public.aurum_management_revisions(profile) values('luden'),('danil'),('miguel') on conflict do nothing;

create or replace function public.aurum_management_write_lock() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('management:'||tg_argv[0],0));
 return null;
end $$;

create or replace function public.aurum_management_revision_changed() returns trigger
language plpgsql security invoker set search_path=public as $$
declare owner_profile text;
begin
 if tg_nargs>0 then owner_profile=tg_argv[0]; elsif tg_op='DELETE' then owner_profile=old.profile; else owner_profile=new.profile; end if;
 insert into aurum_management_revisions(profile,revision) values(owner_profile,1)
 on conflict(profile) do update set revision=aurum_management_revisions.revision+1;
 return null;
end $$;

create or replace function public.aurum_management_ledger_changed() returns trigger
language plpgsql security invoker set search_path=public as $$
declare owner_profile text=tg_argv[0]; ev public.aurum_management_events; price numeric; other_collected numeric; linked boolean;
begin
 if tg_argv[1]='debt_id' then
  if new.direction is distinct from old.direction then
   execute format('select exists(select 1 from public.%I p join aurum_management_events e on e.debt_payment_id=p.id and e.profile=$2 and not e.voided where p.debt_id=$1)',owner_profile||'_debt_payments') into linked using old.id,owner_profile;
   if linked then raise exception 'No se puede cambiar la dirección de una deuda con cobros vinculados a pedidos.'; end if;
  end if;
  return null;
 end if;
 for ev in select * from aurum_management_events where profile=owner_profile and not voided and
  ((tg_argv[1]='transaction_id' and transaction_id=old.id) or (tg_argv[1]='debt_payment_id' and debt_payment_id=old.id)) for update loop
  if tg_op='UPDATE' then
   if (tg_argv[1]='transaction_id' and to_jsonb(new)->>'type' is distinct from to_jsonb(old)->>'type') or
      (tg_argv[1]='debt_payment_id' and to_jsonb(new)->>'debt_id' is distinct from to_jsonb(old)->>'debt_id') then
    raise exception 'No se puede cambiar el tipo ni la deuda de un movimiento vinculado a un pedido. Abre su gestión.';
   end if;
   if ev.kind='cobro' and new.amount is distinct from old.amount then
    select coalesce((data->>'price')::numeric,0) into price from aurum_management_items where id=ev.item_id and profile=owner_profile;
    select coalesce(sum(amount),0) into other_collected from aurum_management_events where item_id=ev.item_id and profile=owner_profile and kind='cobro' and not voided and id<>ev.id;
    if new.amount>greatest(0,price-other_collected) then raise exception 'El cobro supera el importe pendiente del pedido.'; end if;
   end if;
   update aurum_management_events set amount=new.amount,date=new.date,account_id=new.account_id,
    details=details||jsonb_build_object('ledger_previous',to_jsonb(old),'ledger_edited_at',now()) where id=ev.id;
  else
   update aurum_management_events set voided=true,transaction_id=null,debt_payment_id=null,
    details=details||jsonb_build_object('original_transaction_id',ev.transaction_id,'original_debt_payment_id',ev.debt_payment_id,'ledger_deleted_at',now(),'ledger_previous',to_jsonb(old)) where id=ev.id;
  end if;
  update aurum_management_items set updated_at=now() where id=ev.item_id and profile=owner_profile;
 end loop;
 return null;
end $$;

do $$ declare owner_profile text; suffix text; target text; link_column text; begin
 foreach owner_profile in array array['luden','danil','miguel'] loop
  foreach suffix in array array['accounts','transactions','debts','debt_payments'] loop
   target=owner_profile||'_'||suffix;
   execute format('drop trigger if exists aurum_management_write_lock on public.%I',target);
   execute format('create trigger aurum_management_write_lock before insert or update or delete on public.%I for each statement execute function public.aurum_management_write_lock(%L)',target,owner_profile);
   execute format('drop trigger if exists aurum_management_revision on public.%I',target);
   execute format('create trigger aurum_management_revision after insert or update or delete on public.%I for each statement execute function public.aurum_management_revision_changed(%L)',target,owner_profile);
   if suffix in ('transactions','debt_payments','debts') then
    link_column=case when suffix='transactions' then 'transaction_id' when suffix='debts' then 'debt_id' else 'debt_payment_id' end;
    execute format('drop trigger if exists aurum_management_ledger_sync on public.%I',target);
    execute format('create trigger aurum_management_ledger_sync after update or delete on public.%I for each row execute function public.aurum_management_ledger_changed(%L,%L)',target,owner_profile,link_column);
   end if;
  end loop;
 end loop;
 foreach target in array array['aurum_management_items','aurum_management_events'] loop
  execute format('drop trigger if exists aurum_management_revision on public.%I',target);
  execute format('create trigger aurum_management_revision after insert or update or delete on public.%I for each row execute function public.aurum_management_revision_changed()',target);
 end loop;
end $$;

create or replace function public.aurum_management_snapshot(p_profile text) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
declare result jsonb; rows jsonb; pair text[];
begin
 if p_profile not in ('luden','danil','miguel') then raise exception 'Perfil no válido.'; end if;
 result=jsonb_build_object('revision',coalesce((select revision::text from aurum_management_revisions where profile=p_profile),'0'),
  'items',(select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc,i.id),'[]'::jsonb) from aurum_management_items i where profile=p_profile and data->>'deleted_at' is null),
  'events',(select coalesce(jsonb_agg(to_jsonb(e)-'details'||jsonb_build_object('details',e.details-'previous'-'data'-'previous_cash'-'ledger_previous') order by e.created_at desc,e.id),'[]'::jsonb)
   from aurum_management_events e where e.profile=p_profile and
    (e.kind not in ('estado','anulacion','nota') or (e.kind='estado' and e.details->>'incident_id' is not null)) and
    (e.item_id is null or exists(select 1 from aurum_management_items i where i.id=e.item_id and i.profile=p_profile and i.data->>'deleted_at' is null))));
 foreach pair slice 1 in array array[['accounts','accounts'],['movements','transactions'],['debts','debts'],['debtPayments','debt_payments']] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb) from public.%I t',p_profile||'_'||pair[2]) into rows;
  result=result||jsonb_build_object(pair[1],rows);
 end loop;
 return result;
end $$;

create or replace function public.aurum_management_links(p_profile text) returns jsonb
language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('item_id',e.item_id,'transaction_id',e.transaction_id,'debt_payment_id',e.debt_payment_id)),'[]'::jsonb)
 from aurum_management_events e join aurum_management_items i on i.id=e.item_id and i.profile=e.profile
 where e.profile=p_profile and p_profile in ('luden','danil','miguel') and not e.voided and i.data->>'deleted_at' is null and (e.transaction_id is not null or e.debt_payment_id is not null);
$$;
revoke all on function public.aurum_management_write_lock(),public.aurum_management_revision_changed(),public.aurum_management_ledger_changed(),public.aurum_management_snapshot(text),public.aurum_management_links(text) from public,anon,authenticated;
grant execute on function public.aurum_management_write_lock(),public.aurum_management_revision_changed(),public.aurum_management_ledger_changed(),public.aurum_management_snapshot(text),public.aurum_management_links(text) to service_role;
commit;
