begin;
create or replace function public.aurum_management_mutate(p_profile text,p_action text,p jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 prefix text; item public.aurum_management_items; ev public.aurum_management_events;
 newdata jsonb; v_id uuid; tx_id uuid; payment_id uuid; acc uuid; dest uuid;
 a numeric; collected numeric; event_kind text; movement_type text; m jsonb; d jsonb; req uuid;
 result jsonb='[]'; entry jsonb; created boolean=false;
begin
 if p_profile not in ('luden','danil','miguel') then raise exception 'Perfil no válido.'; end if;
 prefix=p_profile||'_';
 -- Serialize concurrent writes within a profile; retries share a stable request key.
 perform pg_advisory_xact_lock(hashtextextended('management:'||p_profile,0));
 if p_action='setup' then
  execute format('insert into %I(name,kind,opening_balance,scope) values (''Gestiones · Efectivo'',''Efectivo'',0,''business''),(''Gestiones · Banco'',''Banco'',0,''business'') on conflict(name) do nothing',prefix||'accounts');
  return '{}'::jsonb;
 end if;
 if p_action in ('save','import','save_many') then
  for entry in select value from jsonb_array_elements(case when p_action in ('import','save_many') then p->'items' else jsonb_build_array(p) end) loop
   v_id=nullif(entry->>'id','')::uuid; newdata=entry->'data';
   if v_id is null then
    insert into aurum_management_items(profile,data,source_key) values(p_profile,newdata,nullif(entry->>'source_key','')) on conflict(profile,source_key) do nothing returning * into item;
    created=found;
    if not created then select * into item from aurum_management_items where profile=p_profile and source_key=entry->>'source_key'; end if;
   else
    select * into item from aurum_management_items where id=v_id and profile=p_profile for update;
    if not found then raise exception 'Gestión no encontrada.'; end if;
    if item.version<>(entry->>'version')::int then raise exception 'Esta ficha cambió en otro dispositivo. Actualiza antes de editar.'; end if;
    if item.data->>'activity'<>newdata->>'activity' then raise exception 'La actividad no se puede cambiar. Crea otra ficha si corresponde.'; end if;
    entry=entry||jsonb_build_object('previous',item.data);
    update aurum_management_items set data=newdata,version=version+1,updated_at=now() where id=v_id returning * into item;
    created=true;
   end if;
   if created then
    insert into aurum_management_events(profile,item_id,kind,date,note,request_id,details) values(p_profile,item.id,'estado',current_date,case when v_id is null then 'Ficha creada' else 'Ficha actualizada' end,gen_random_uuid(),jsonb_build_object('previous',case when v_id is null then null else entry->'previous' end,'data',newdata));
    if v_id is null and p_action<>'import' and newdata->>'activity'<>'bonos' then
     acc=nullif(p->>'payment_account_id','')::uuid;
     execute format('select to_jsonb(a) from %I a where id=$1 and scope=''business''',prefix||'accounts') into d using acc;
     if d is null then raise exception 'Elige la cuenta de Caja desde la que pagas el pedido.'; end if;
     if newdata->>'tracking' in ('Cancelado','Por revisar') then raise exception 'Elige un estado válido para crear y pagar el pedido.'; end if;
     a=round(coalesce((newdata->>'cost')::numeric,0)+coalesce((newdata->>'expenses')::numeric,0),2);
     if a<0 then raise exception 'Revisa el coste del pedido.'; end if;
     if a>0 then
      execute format('insert into %I(account_id,title,category,amount,type,date,micro) values($1,$2,''Gestiones'',$3,''gasto'',$4,false) returning id',prefix||'transactions') into tx_id using acc,'Compra · '||(newdata->>'model'),a,coalesce(nullif(newdata->>'purchase_date','')::date,(now() at time zone 'Europe/Madrid')::date);
      insert into aurum_management_events(profile,item_id,kind,amount,date,note,account_id,transaction_id,request_id,details) values(p_profile,item.id,'compra',a,coalesce(nullif(newdata->>'purchase_date','')::date,(now() at time zone 'Europe/Madrid')::date),'Pago al crear el pedido',acc,tx_id,gen_random_uuid(),jsonb_build_object('owned',true,'auto_purchase',true,'phone_excluded',true));
     end if;
    end if;
   end if;
   result=result||jsonb_build_array(to_jsonb(item));
  end loop;
  return result;
 end if;
 if p_action='archive' then
  update aurum_management_items set archived=coalesce((p->>'archived')::boolean,true),version=version+1,updated_at=now() where id=(p->>'id')::uuid and profile=p_profile returning * into item;
  if not found then raise exception 'Gestión no encontrada.'; end if;
  insert into aurum_management_events(profile,item_id,kind,date,note,request_id) values(p_profile,item.id,'estado',current_date,case when item.archived then 'Ficha archivada' else 'Ficha restaurada' end,gen_random_uuid());
  return to_jsonb(item);
 end if;
 req=(p->>'request_id')::uuid;
 select * into ev from aurum_management_events where profile=p_profile and request_id=req;
 if found then return to_jsonb(ev); end if;
 if p_action='case_status' then
  select * into item from aurum_management_items where id=(p->>'id')::uuid and profile=p_profile for update;
  if not found or item.data->>'activity'='bonos' then raise exception 'Pedido no encontrado.'; end if;
  if item.archived then raise exception 'Restaura el pedido antes de modificarlo.'; end if;
  if p->>'case_type'='refund' and p->>'status' in ('none','requested','received') then
   if coalesce(item.data->>'refund_status','none')=p->>'status' then return to_jsonb(item); end if;
   newdata=item.data||jsonb_build_object('refund_status',p->>'status');
   if p->>'status'='received' then
    newdata=newdata||jsonb_build_object('refund_original_cost',(item.data->>'cost')::numeric,'cost',3.70,'refund_cost_adjusted',true);
   elsif item.data->>'refund_cost_adjusted'='true' then
    newdata=newdata||jsonb_build_object('cost',coalesce((item.data->>'refund_original_cost')::numeric,(item.data->>'cost')::numeric),'refund_cost_adjusted',false);
   end if;
  elsif p->>'case_type'='exchange' and p->>'status' in ('none','requested','completed') then
   if coalesce(item.data->>'exchange_status','none')=p->>'status' then return to_jsonb(item); end if;
   newdata=item.data||jsonb_build_object('exchange_status',p->>'status');
  else raise exception 'Estado no válido.'; end if;
  insert into aurum_management_events(profile,item_id,kind,date,note,request_id,details) values(p_profile,item.id,'estado',(now() at time zone 'Europe/Madrid')::date,
   case when p->>'case_type'='refund' then case p->>'status' when 'received' then 'Reembolso recibido · coste final 3,70 €' when 'requested' then 'Reembolso pedido' else 'Reembolso desmarcado' end else case p->>'status' when 'completed' then 'Intercambio completado' when 'requested' then 'Intercambio pedido' else 'Intercambio desmarcado' end end,
   req,jsonb_build_object('previous',item.data,'data',newdata,'case_type',p->>'case_type'));
  update aurum_management_items set data=newdata,version=version+1,updated_at=now() where id=item.id returning * into item;
  return to_jsonb(item);
 end if;
 if p_action='void' then
  select * into ev from aurum_management_events where id=(p->>'id')::uuid and profile=p_profile for update;
  if not found then raise exception 'Registro no encontrado.'; end if;
  if ev.voided then return to_jsonb(ev); end if;
  if ev.kind not in ('compra','gasto','cobro','reembolso_proveedor','devolucion_cliente','aportacion','recuperacion','traspaso') then raise exception 'Este registro pertenece al historial.'; end if;
  if ev.details->>'owned'='true' then
   if ev.transaction_id is not null then execute format('delete from %I where id=$1',prefix||'transactions') using ev.transaction_id; end if;
   if ev.debt_payment_id is not null then execute format('delete from %I where id=$1',prefix||'debt_payments') using ev.debt_payment_id; end if;
  end if;
  update aurum_management_events set voided=true,transaction_id=null,debt_payment_id=null,details=details||jsonb_build_object('original_transaction_id',ev.transaction_id,'original_debt_payment_id',ev.debt_payment_id) where id=ev.id;
  insert into aurum_management_events(profile,item_id,kind,date,note,request_id,details) values(p_profile,ev.item_id,'anulacion',current_date,'Registro anulado: '||ev.kind,req,jsonb_build_object('event_id',ev.id));
  return '{}'::jsonb;
 end if;
 event_kind=p->>'kind'; a=coalesce((p->>'amount')::numeric,0); acc=nullif(p->>'account_id','')::uuid;
 if p_action='transfer' then
  dest=(p->>'destination_account_id')::uuid;
  execute format('select to_jsonb(a) from %I a where id=$1',prefix||'accounts') into m using acc;
  execute format('select to_jsonb(a) from %I a where id=$1',prefix||'accounts') into d using dest;
  if m is null or d is null or acc=dest or (m->>'scope'<>'business' and d->>'scope'<>'business') then raise exception 'Elige dos cuentas distintas y una cuenta de Gestiones.'; end if;
  execute format('insert into %I(account_id,destination_account_id,title,category,amount,type,date,micro) values($1,$2,$3,''Traspaso'',$4,''traspaso'',$5,false) returning id',prefix||'transactions') into tx_id using acc,dest,p->>'note',a,(p->>'date')::date;
  insert into aurum_management_events(profile,kind,amount,date,note,account_id,transaction_id,request_id,details) values(p_profile,'traspaso',a,(p->>'date')::date,p->>'note',acc,tx_id,req,jsonb_build_object('owned',true));
  return '{}'::jsonb;
 end if;
 select * into item from aurum_management_items where id=(p->>'item_id')::uuid and profile=p_profile for update;
 if not found then raise exception 'Gestión no encontrada.'; end if;
 if item.archived or nullif(item.data->>'deleted_at','') is not null then raise exception 'Restaura la ficha antes de añadir registros.'; end if;
 if event_kind in ('nota','incidencia','estado') then
  if event_kind='estado' and p->'details'->>'incident_id' is not null and not exists(select 1 from aurum_management_events where id=(p->'details'->>'incident_id')::uuid and item_id=item.id and profile=p_profile and kind='incidencia') then raise exception 'Incidencia no encontrada.'; end if;
 elsif item.data->>'activity'='bonos' then
  if event_kind not in ('aportacion','recuperacion') or acc is not null or nullif(p->>'transaction_id','') is not null or nullif(p->>'debt_id','') is not null or nullif(p->>'debt_payment_id','') is not null then raise exception 'Los bonos no modifican cuentas.'; end if;
 else
  if event_kind not in ('compra','gasto','cobro','reembolso_proveedor','devolucion_cliente') then raise exception 'Tipo de operación no válido.'; end if;
  movement_type=case when event_kind in ('cobro','reembolso_proveedor') then 'ingreso' else 'gasto' end;
  if nullif(p->>'debt_payment_id','') is not null then
   payment_id=(p->>'debt_payment_id')::uuid;
   execute format('select to_jsonb(dp)||jsonb_build_object(''direction'',d.direction) from %I dp join %I d on d.id=dp.debt_id where dp.id=$1',prefix||'debt_payments',prefix||'debts') into m using payment_id;
   if m is null or event_kind<>'cobro' or m->>'direction'<>'me_deben' then raise exception 'Elige un cobro de deuda válido.'; end if;
   a=(m->>'amount')::numeric; acc=(m->>'account_id')::uuid;
  elsif nullif(p->>'debt_id','') is not null then
   execute format('select to_jsonb(d) from %I d where id=$1 for update',prefix||'debts') into d using (p->>'debt_id')::uuid;
   execute format('select coalesce(sum(amount),0) from %I where debt_id=$1',prefix||'debt_payments') into m using (p->>'debt_id')::uuid;
   if d is null or d->>'direction'<>'me_deben' or event_kind<>'cobro' or a>(d->>'total')::numeric-coalesce(m::numeric,0) then raise exception 'El cobro supera la deuda pendiente.'; end if;
   execute format('insert into %I(debt_id,amount,date,account_id,notes) values($1,$2,$3,$4,$5) returning id',prefix||'debt_payments') into payment_id using (p->>'debt_id')::uuid,a,(p->>'date')::date,acc,'Gestiones · '||(item.data->>'model');
   created=true;
  elsif nullif(p->>'transaction_id','') is not null then
   tx_id=(p->>'transaction_id')::uuid;
   execute format('select to_jsonb(t) from %I t where id=$1',prefix||'transactions') into m using tx_id;
   if m is null or m->>'type'<>movement_type then raise exception 'El movimiento no coincide con este tipo de operación.'; end if;
   a=(m->>'amount')::numeric; acc=(m->>'account_id')::uuid;
  else
   execute format('insert into %I(account_id,title,category,amount,type,date,micro) values($1,$2,''Gestiones'',$3,$4,$5,false) returning id',prefix||'transactions') into tx_id using acc,event_kind||' · '||(item.data->>'model'),a,movement_type,(p->>'date')::date;
   created=true;
  end if;
  execute format('select to_jsonb(a) from %I a where id=$1',prefix||'accounts') into d using acc;
  if d is null or (created and event_kind<>'cobro' and d->>'scope'<>'business') then raise exception 'Elige Efectivo o Banco de Gestiones.'; end if;
 end if;
 if event_kind not in ('nota','estado','incidencia') and a<=0 then raise exception 'Introduce un importe mayor que cero.'; end if;
 if event_kind='cobro' then
  if item.data->>'tracking' in ('Cancelado','Por revisar') or item.data->>'sale'='Por revisar' or not (item.data->>'activity'='amigos' or item.data->>'sale' in ('Vendido','Reservado')) then raise exception 'Este pedido no admite cobros en su estado actual.'; end if;
  select coalesce(sum(amount),0) into collected from aurum_management_events where item_id=item.id and profile=p_profile and kind='cobro' and not voided;
  if a>greatest(0,coalesce((item.data->>'price')::numeric,0)-collected) then raise exception 'El cobro supera el importe pendiente. Actualiza los datos del pedido.'; end if;
 end if;
 insert into aurum_management_events(profile,item_id,kind,amount,date,note,account_id,transaction_id,debt_payment_id,request_id,details)
 values(p_profile,item.id,event_kind,a,case when m->>'date' is not null then (m->>'date')::date else (p->>'date')::date end,coalesce(p->>'note',''),acc,tx_id,payment_id,req,coalesce(p->'details','{}')||jsonb_build_object('owned',created)) returning * into ev;
 update aurum_management_items set updated_at=now() where id=item.id;
 return to_jsonb(ev);
end $$;

-- Only correct owned auto-purchases whose original snapshot and linked movement match exactly.
do $$
declare r record; original jsonb; phone numeric; expected numeric; actual numeric; corrected numeric;
begin
 for r in select e.* from aurum_management_events e where not e.voided and e.details->>'auto_purchase'='true' and coalesce(e.details->>'phone_excluded','false')<>'true' for update loop
  perform pg_advisory_xact_lock(hashtextextended('management:'||r.profile,0));
  select details->'data' into original from aurum_management_events where item_id=r.item_id and profile=r.profile and kind='estado' and details->'previous'='null'::jsonb order by created_at limit 1;
  phone=coalesce((original->>'phone_cost')::numeric,0);
  expected=round(coalesce((original->>'cost')::numeric,0)+coalesce((original->>'expenses')::numeric,0)+phone,2);
  if phone<=0 or r.amount<>expected or r.transaction_id is null or r.details->>'owned'<>'true' then continue; end if;
  execute format('select amount from %I where id=$1 and type=''gasto'' and account_id=$2 for update',r.profile||'_transactions') into actual using r.transaction_id,r.account_id;
  corrected=round(r.amount-phone,2);
  if actual is distinct from r.amount or corrected<=0 then continue; end if;
  execute format('update %I set amount=$1 where id=$2',r.profile||'_transactions') using corrected,r.transaction_id;
  update aurum_management_events set amount=corrected,note='Pago del artículo y gastos · teléfono fuera de Caja',details=details||jsonb_build_object('phone_excluded',true,'phone_excluded_amount',phone,'original_amount_with_phone',r.amount,'phone_adjusted_at',now()) where id=r.id;
 end loop;
end $$;

commit;
