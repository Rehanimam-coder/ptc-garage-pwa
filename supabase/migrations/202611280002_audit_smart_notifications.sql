-- Add automatic audit capture and role-aware operational notifications.
-- All functions live in a non-exposed schema and run with a fixed empty search_path.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.notifications
  add column if not exists category text,
  add column if not exists module text,
  add column if not exists record_id text,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_uidx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := '{}'::jsonb;
  v_old jsonb := '{}'::jsonb;
  v_actor uuid;
  v_record_id text;
  v_changed text[];
  v_site_id text;
begin
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new);
  end if;
  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old);
  end if;

  v_actor := auth.uid();
  if v_actor is null then
    v_actor := nullif(coalesce(v_new->>'created_by', v_new->>'user_id', v_old->>'created_by', v_old->>'user_id'), '')::uuid;
  end if;
  v_record_id := coalesce(v_new->>'id', v_old->>'id', v_new->>'user_id', v_old->>'user_id');
  v_site_id := coalesce(v_new->>'site_id', v_old->>'site_id');

  select coalesce(array_agg(k order by k), array[]::text[])
    into v_changed
  from (
    select key as k from jsonb_each(v_new)
    union
    select key as k from jsonb_each(v_old)
  ) as all_keys
  where v_new -> k is distinct from v_old -> k
    and k not in ('id', 'created_at', 'updated_at', 'created_by', 'user_id');

  if tg_op = 'UPDATE' and coalesce(array_length(v_changed, 1), 0) = 0 then
    return new;
  end if;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (
    v_actor,
    lower(tg_op),
    tg_table_name,
    v_record_id,
    jsonb_strip_nulls(jsonb_build_object(
      'changed_fields', to_jsonb(v_changed),
      'site_id', v_site_id,
      'ptc_id', coalesce(v_new->>'ptc_id', v_old->>'ptc_id'),
      'status', coalesce(v_new->>'status', v_old->>'status'),
      'priority', coalesce(v_new->>'priority', v_old->>'priority'),
      'request_number', coalesce(v_new->>'request_number', v_old->>'request_number'),
      'invoice_number', coalesce(v_new->>'invoice_number', v_old->>'invoice_number')
    ))
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.capture_audit_log() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'sites',
    'profiles',
    'vehicle_visits',
    'parts_orders',
    'parts_receipts',
    'breakdown_jobs',
    'preventive_maintenance',
    'ptc_assets',
    'general_store_items',
    'tasks_projects',
    'employee_directory'
  ]
  loop
    execute format('drop trigger if exists ptc_audit_capture on public.%I', v_table);
    execute format(
      'create trigger ptc_audit_capture after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',
      v_table
    );
  end loop;
end;
$$;

create or replace function private.insert_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_category text,
  p_module text,
  p_record_id text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, title, message, category, module, record_id, dedupe_key)
  values (p_user_id, p_title, p_message, p_category, p_module, p_record_id, p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

revoke all on function private.insert_notification(uuid, text, text, text, text, text, text) from public, anon, authenticated;

create or replace function private.notify_operational_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_id uuid;
  v_record_id text;
  v_ptc_id text;
  v_title text;
  v_message text;
  v_category text;
  v_module text;
  v_dedupe text;
  v_part_name text;
  v_request_number text;
  v_quantity text;
  v_recipient record;
  v_order_status text;
begin
  if tg_table_name = 'breakdown_jobs' then
    v_site_id := new.site_id;
    v_record_id := new.id::text;
    v_ptc_id := coalesce(new.ptc_id, 'Vehicle');
    v_module := 'breakdown_jobs';
    v_category := 'breakdown';
    if tg_op = 'INSERT' then
      v_title := 'New breakdown reported';
      v_message := v_ptc_id || ': ' || left(coalesce(new.complaint, 'A new breakdown was reported'), 180);
      v_dedupe := 'breakdown:new:' || new.id::text;
    elsif new.status is distinct from old.status or new.priority is distinct from old.priority then
      v_title := 'Breakdown updated';
      v_message := v_ptc_id || ' · Status: ' || new.status || ' · Priority: ' || new.priority;
      v_dedupe := 'breakdown:update:' || new.id::text || ':' || coalesce(new.status, '') || ':' || coalesce(new.priority, '');
    else
      return new;
    end if;

    for v_recipient in
      select p.user_id
      from public.profiles p
      where p.is_active = true
        and (p.role = 'admin' or (p.role = 'supervisor' and p.site_id = v_site_id))
    loop
      perform private.insert_notification(v_recipient.user_id, v_title, v_message, v_category, v_module, v_record_id, v_dedupe || ':' || v_recipient.user_id::text);
    end loop;

  elsif tg_table_name = 'parts_orders' then
    v_site_id := new.site_id;
    v_record_id := new.id::text;
    v_ptc_id := coalesce(new.vehicle_ptc_id, 'Parts order');
    v_part_name := coalesce(new.part_name, 'requested parts');
    v_request_number := coalesce(new.request_number, 'Request pending');
    v_module := 'parts_orders';
    v_category := 'parts';
    if tg_op = 'INSERT' then
      v_title := 'New parts order';
      v_message := v_part_name || ' · ' || v_ptc_id || ' · ' || v_request_number;
      v_dedupe := 'parts-order:new:' || new.id::text;
    elsif new.status is distinct from old.status then
      v_title := case when new.status = 'received' then 'Parts received' else 'Parts order updated' end;
      v_message := v_part_name || ' · ' || v_ptc_id || ' · Status: ' || new.status;
      v_dedupe := 'parts-order:status:' || new.id::text || ':' || coalesce(new.status, '');
    else
      return new;
    end if;

    for v_recipient in
      select p.user_id
      from public.profiles p
      where p.is_active = true
        and (p.role in ('admin', 'storekeeper') or (p.role = 'supervisor' and p.site_id = v_site_id))
    loop
      perform private.insert_notification(v_recipient.user_id, v_title, v_message, v_category, v_module, v_record_id, v_dedupe || ':' || v_recipient.user_id::text);
    end loop;

  elsif tg_table_name = 'parts_receipts' then
    select po.site_id, po.part_name, po.request_number, po.vehicle_ptc_id, po.status
      into v_site_id, v_part_name, v_request_number, v_ptc_id, v_order_status
    from public.parts_orders po
    where po.id = new.order_id;

    v_record_id := new.order_id::text;
    v_module := 'parts_orders';
    v_category := 'parts';
    v_title := 'Parts receipt recorded';
    v_message := coalesce(v_part_name, 'Parts') || ' · Qty received: ' || new.quantity_received::text || ' · ' || coalesce(v_request_number, 'Request pending');
    v_dedupe := 'parts-receipt:' || new.id::text;

    for v_recipient in
      select p.user_id
      from public.profiles p
      where p.is_active = true
        and (p.role in ('admin', 'storekeeper') or (p.role = 'supervisor' and p.site_id = v_site_id))
    loop
      perform private.insert_notification(v_recipient.user_id, v_title, v_message, v_category, v_module, v_record_id, v_dedupe || ':' || v_recipient.user_id::text);
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function private.notify_operational_event() from public, anon, authenticated;

drop trigger if exists ptc_breakdown_notifications on public.breakdown_jobs;
create trigger ptc_breakdown_notifications
after insert or update of status, priority on public.breakdown_jobs
for each row execute function private.notify_operational_event();

drop trigger if exists ptc_parts_order_notifications on public.parts_orders;
create trigger ptc_parts_order_notifications
after insert or update of status on public.parts_orders
for each row execute function private.notify_operational_event();

drop trigger if exists ptc_parts_receipt_notifications on public.parts_receipts;
create trigger ptc_parts_receipt_notifications
after insert on public.parts_receipts
for each row execute function private.notify_operational_event();

create or replace function private.generate_due_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_recipient record;
  v_dedupe text;
begin
  for v_item in
    select pm.id, pm.site_id, pm.ptc_id, pm.maintenance_work, pm.expected_due_date
    from public.preventive_maintenance pm
    where pm.status = 'Active'
      and pm.expected_due_date is not null
      and pm.expected_due_date <= current_date
  loop
    v_dedupe := 'pm-due:' || v_item.id::text || ':' || v_item.expected_due_date::text;
    for v_recipient in
      select p.user_id
      from public.profiles p
      where p.is_active = true
        and (p.role = 'admin' or (p.role = 'supervisor' and p.site_id = v_item.site_id))
    loop
      perform private.insert_notification(
        v_recipient.user_id,
        case when v_item.expected_due_date < current_date then 'Preventive maintenance overdue' else 'Preventive maintenance due today' end,
        coalesce(v_item.ptc_id, 'Vehicle') || ' · ' || v_item.maintenance_work || ' · Due ' || v_item.expected_due_date::text,
        'maintenance_due',
        'preventive_maintenance',
        v_item.id::text,
        v_dedupe || ':' || v_recipient.user_id::text
      );
    end loop;
  end loop;

  for v_item in
    select t.id, t.site_id, t.title, t.due_date
    from public.tasks_projects t
    where t.status not in ('Completed', 'Cancelled')
      and t.due_date is not null
      and t.due_date <= current_date
  loop
    v_dedupe := 'task-due:' || v_item.id::text || ':' || v_item.due_date::text;
    for v_recipient in
      select p.user_id
      from public.profiles p
      where p.is_active = true
        and (p.role = 'admin' or (p.role = 'supervisor' and p.site_id = v_item.site_id))
    loop
      perform private.insert_notification(
        v_recipient.user_id,
        case when v_item.due_date < current_date then 'Task overdue' else 'Task due today' end,
        v_item.title || ' · Due ' || v_item.due_date::text,
        'task_due',
        'tasks_projects',
        v_item.id::text,
        v_dedupe || ':' || v_recipient.user_id::text
      );
    end loop;
  end loop;
end;
$$;

revoke all on function private.generate_due_notifications() from public, anon, authenticated;

-- Supabase Cron runs once daily at 02:00 UTC. Scheduling is done through cron.schedule,
-- not direct writes to cron.job.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'ptc-garage-due-notifications';

select cron.schedule(
  'ptc-garage-due-notifications',
  '0 2 * * *',
  'select private.generate_due_notifications();'
);
