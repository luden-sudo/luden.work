-- Apply to an existing shared-profile database to enable account transfers.
begin;
alter table public.luden_transactions
 add column if not exists destination_account_id uuid references public.luden_accounts(id) on delete restrict;
alter table public.luden_transactions drop constraint if exists luden_transactions_type_check;
alter table public.luden_transactions add constraint luden_transactions_type_check check (type in ('gasto','ingreso','traspaso'));
alter table public.luden_transactions drop constraint if exists luden_transactions_transfer_accounts_check;
alter table public.luden_transactions add constraint luden_transactions_transfer_accounts_check
 check ((type = 'traspaso' and destination_account_id is not null and destination_account_id <> account_id) or (type <> 'traspaso' and destination_account_id is null));
commit;
