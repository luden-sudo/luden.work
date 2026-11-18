-- Apply AFTER deploying the session-protected /api/finance routes.
-- No rows are changed. Server service_role retains access.
begin;
do $$ declare t text; begin
 foreach t in array array['luden_settings','luden_accounts','luden_transactions','luden_budgets','luden_debts','luden_debt_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('drop policy if exists shared_workspace on public.%I',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
end $$;
commit;
