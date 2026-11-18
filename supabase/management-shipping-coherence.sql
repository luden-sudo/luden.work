begin;
do $$
declare r record; next_data jsonb;
begin
 for r in select * from aurum_management_items
  where data->>'activity'='ventas' and data->>'sale'<>'Para mí' and data->>'tracking'<>'Cancelado'
    and (data->>'shipping_status'='sent' or data->>'tracking'='Enviado' or (data->>'shipping_status' is null and (data->>'delivery_status'='delivered' or data->>'tracking'='Entregado')))
    and (data->>'sale'<>'Vendido' or data->>'tracking'<>'Enviado' or data->>'shipping_status' is distinct from 'sent')
  order by profile,id for update
 loop
  perform pg_advisory_xact_lock(hashtextextended('management:'||r.profile,0));
  next_data=r.data||jsonb_build_object('shipping_status','sent','tracking','Enviado','sale','Vendido');
  update aurum_management_items set data=next_data,version=version+1,updated_at=now() where id=r.id;
  insert into aurum_management_events(profile,item_id,kind,date,note,request_id,details)
   values(r.profile,r.id,'estado',(now() at time zone 'Europe/Madrid')::date,'Seguimiento y venta sincronizados con el envío al comprador',gen_random_uuid(),jsonb_build_object('previous',r.data,'data',next_data,'shipping_coherence_v1',true));
 end loop;
end $$;
commit;
