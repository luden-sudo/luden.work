-- Independent savings balance. Existing account balances are not moved or copied.
begin;
alter table public.luden_accounts drop constraint if exists luden_accounts_kind_check;
alter table public.luden_accounts add constraint luden_accounts_kind_check
  check (kind in ('Banco','Efectivo','Cripto','Ahorro'));
insert into public.luden_accounts(name,kind,opening_balance)
select 'Cuenta de ahorro','Ahorro',0
where not exists (select 1 from public.luden_accounts where kind = 'Ahorro')
on conflict (name) do nothing;
commit;
