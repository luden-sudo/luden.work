-- Additive: existing account balances and movement dates are preserved.
begin;
alter table public.luden_transactions add column if not exists savings_month text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='luden_transactions_savings_month_check' and conrelid='public.luden_transactions'::regclass) then
  alter table public.luden_transactions add constraint luden_transactions_savings_month_check check (savings_month is null or savings_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
 end if;
end $$;
insert into public.luden_budgets(category,amount) values('__aurum_savings_default__',200) on conflict(category) do nothing;
insert into public.luden_budgets(category,amount)
 select '__aurum_savings_goal__:'||to_char(now() at time zone 'Europe/Madrid','YYYY-MM'),amount from public.luden_budgets where category='__aurum_savings_default__'
 on conflict(category) do nothing;
commit;
