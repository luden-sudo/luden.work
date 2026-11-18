begin;
create or replace function public.aurum_management_cash(p_profile text,p_action text,p jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare prefix text; m jsonb; ev public.aurum_management_events; item public.aurum_management_items; acc uuid; dest uuid; a numeric; linked boolean;
begin
 if p_profile not in ('luden','danil','miguel') then raise exception 'Perfil no válido.'; end if;
 prefix=p_profile||'_';
 perform pg_advisory_xact_lock(hashtextextended('management:'||p_profile,0));
 if p_action='delete_order' then
  select * into item from aurum_management_items where id=(p->>'id')::uuid and profile=p_profile for update;
  if not found then raise exception 'Pedido no encontrado.'; end if;
  if item.data->>'deleted_at' is not null then return '{}'::jsonb; end if;
  if item.version<>(p->>'version')::int then raise exception 'El pedido ha cambiado. Actualiza y vuelve a intentar.'; end if;
  for ev in select * from aurum_management_events where profile=p_profile and item_id=item.id and not voided and kind in ('compra','gasto','cobro','reembolso_proveedor','devolucion_cliente','aportacion','recuperacion','traspaso') loop
   perform aurum_management_mutate(p_profile,'void',jsonb_build_object('id',ev.id,'request_id',gen_random_uuid()));
  end loop;
  update aurum_management_items set data=data||jsonb_build_object('deleted_at',now()),version=version+1,updated_at=now() where id=item.id;
  insert into aurum_management_events(profile,item_id,kind,date,note,request_id) values(p_profile,item.id,'estado',current_date,'Pedido eliminado y movimientos propios anulados',gen_random_uuid());
  return '{}'::jsonb;
 end if;
 if p_action not in ('cash_edit','cash_delete') then raise exception 'Operación no válida.'; end if;
 execute format('select to_jsonb(t) from %I t where id=$1 for update',prefix||'transactions') into m using (p->>'id')::uuid;
 if m is null then raise exception 'Movimiento no encontrado. Actualiza la lista.'; end if;
 execute format('select exists(select 1 from %I where scope=''business'' and (id=$1 or id=$2))',prefix||'accounts') into linked using (m->>'account_id')::uuid,(m->>'destination_account_id')::uuid;
 if not linked then raise exception 'Este movimiento no pertenece a Caja.'; end if;
 if m->>'updated_at' is distinct from p->'previous'->>'updated_at' or (m->>'amount')::numeric is distinct from (p->'previous'->>'amount')::numeric or m->>'title' is distinct from p->'previous'->>'title' or m->>'date' is distinct from p->'previous'->>'date' then raise exception 'El movimiento ha cambiado. Actualiza antes de modificarlo.'; end if;
 if p_action='cash_delete' then
  for ev in select * from aurum_management_events where profile=p_profile and transaction_id=(p->>'id')::uuid and not voided for update loop
   perform aurum_management_mutate(p_profile,'void',jsonb_build_object('id',ev.id,'request_id',gen_random_uuid()));
  end loop;
  execute format('delete from %I where id=$1',prefix||'transactions') using (p->>'id')::uuid;
 else
  a=(p->>'amount')::numeric; acc=(p->>'account_id')::uuid; dest=nullif(p->>'destination_account_id','')::uuid;
  if a is null or a<=0 or a>999999999 or a<>round(a,2) or length(trim(p->>'title')) not between 1 and 160 then raise exception 'Revisa el concepto y el importe.'; end if;
  execute format('select exists(select 1 from %I where id=$1)',prefix||'accounts') into linked using acc;
  if not linked then raise exception 'Cuenta no válida.'; end if;
  if m->>'type'='traspaso' then
   execute format('select exists(select 1 from %I where id=$1)',prefix||'accounts') into linked using dest;
   if not linked or acc=dest then raise exception 'Elige dos cuentas distintas.'; end if;
  else dest=null; end if;
  execute format('select exists(select 1 from %I where scope=''business'' and (id=$1 or id=$2))',prefix||'accounts') into linked using acc,dest;
  if not linked then raise exception 'Selecciona una cuenta de Caja.'; end if;
  execute format('update %I set title=$1,amount=$2,date=$3,account_id=$4,destination_account_id=$5 where id=$6',prefix||'transactions') using trim(p->>'title'),a,(p->>'date')::date,acc,dest,(p->>'id')::uuid;
  update aurum_management_events set amount=a,date=(p->>'date')::date,account_id=acc,note=trim(p->>'title'),details=details||jsonb_build_object('last_cash_edit',now(),'previous_cash',m) where profile=p_profile and transaction_id=(p->>'id')::uuid and not voided;
 end if;
 insert into aurum_management_events(profile,kind,date,note,request_id,details) values(p_profile,'estado',current_date,case when p_action='cash_delete' then 'Movimiento de Caja eliminado' else 'Movimiento de Caja editado' end,gen_random_uuid(),jsonb_build_object('previous',m));
 return '{}'::jsonb;
end $$;
revoke all on function public.aurum_management_cash(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.aurum_management_cash(text,text,jsonb) to service_role;
commit;
