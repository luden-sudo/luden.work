-- Permit collections in any account of the selected profile; preserve all other guards.
begin;
do $$
declare
 definition text;
 previous_guard text := 'if d is null or (created and d->>''scope''<>''business'') then';
 updated_guard text := 'if d is null or (created and event_kind<>''cobro'' and d->>''scope''<>''business'') then';
begin
 select pg_get_functiondef('public.aurum_management_mutate(text,text,jsonb)'::regprocedure) into definition;
 if strpos(definition,previous_guard)>0 then
  if length(definition)-length(replace(definition,previous_guard,''))<>length(previous_guard) then
   raise exception 'Unexpected duplicate account guard; review the deployed function.';
  end if;
  execute replace(definition,previous_guard,updated_guard);
 elsif strpos(definition,updated_guard)=0 then
  raise exception 'The deployed account guard changed; review before migrating.';
 end if;
end $$;
commit;
