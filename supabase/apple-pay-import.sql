-- Import-only Apple Pay bridge. No bank access or payment capability.
begin;
create table if not exists public.luden_apple_pay_receipts(
 event_key text primary key, payload_digest text not null,
 transaction_id uuid references public.luden_transactions(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.luden_apple_pay_receipts enable row level security;
revoke all on public.luden_apple_pay_receipts from public,anon,authenticated;
grant select,insert on public.luden_apple_pay_receipts to service_role;
create or replace function public.luden_import_apple_pay(token_digest text,event_key text,payload_digest text,merchant_name text,paid_amount numeric,currency_code text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare configuration jsonb; account uuid; existing public.luden_apple_pay_receipts%rowtype; movement uuid; expected_currency text;
begin
 select value::jsonb into configuration from luden_app_config where key='apple_pay_import';
 if configuration is null or (configuration->>'token_hash') is distinct from token_digest or (configuration->>'expires_at')::timestamptz<=now() then
  raise exception 'Invalid import key' using errcode='42501';
 end if;
 if event_key is null or length(event_key) not between 8 and 200 or merchant_name is null or length(trim(merchant_name)) not between 1 and 140 or paid_amount is null or paid_amount<=0 or paid_amount>=1000000000000 or paid_amount<>round(paid_amount,2) then
  raise exception 'Invalid transaction' using errcode='22023';
 end if;
 account:=(configuration->>'account_id')::uuid;
 if not exists(select 1 from luden_accounts where id=account and kind='Banco') then raise exception 'Missing bank account' using errcode='22023';end if;
 select currency into expected_currency from luden_settings where id='luden';
 if currency_code is distinct from expected_currency then raise exception 'Currency does not match account' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(event_key,0));
 select * into existing from luden_apple_pay_receipts r where r.event_key=luden_import_apple_pay.event_key;
 if found then
  if existing.payload_digest<>payload_digest then raise exception 'Event already used' using errcode='23505';end if;
  return jsonb_build_object('ok',true,'duplicate',true,'id',existing.transaction_id);
 end if;
 insert into luden_transactions(account_id,title,category,amount,type,date,micro)
 values(account,'Apple Pay · '||trim(merchant_name),'Compras',paid_amount,'gasto',(now() at time zone 'Europe/Madrid')::date,false) returning id into movement;
 insert into luden_apple_pay_receipts(event_key,payload_digest,transaction_id) values(event_key,payload_digest,movement);
 return jsonb_build_object('ok',true,'duplicate',false,'id',movement);
end $$;
revoke all on function public.luden_import_apple_pay(text,text,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.luden_import_apple_pay(text,text,text,text,numeric,text) to service_role;
commit;
notify pgrst,'reload schema';

