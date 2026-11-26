-- Capture core operational and administration changes for the Admin audit screen.
create or replace function public.capture_garage_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  record_key text;
begin
  if tg_op='DELETE' then payload := to_jsonb(old); else payload := to_jsonb(new); end if;
  record_key := coalesce(payload->>'id',payload->>'user_id');
  insert into public.audit_logs(user_id,action,module,record_id,details)
  values(auth.uid(),lower(tg_op),tg_table_name,record_key,jsonb_build_object('record',payload));
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare t text;
begin
 foreach t in array array['vehicle_visits','parts_orders','parts_receipts','sites','profiles','employee_directory'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_audit_log',t);
  execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_garage_audit_log()',t||'_audit_log',t);
 end loop;
end $$;
