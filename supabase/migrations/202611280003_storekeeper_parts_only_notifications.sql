-- Keep Store Keeper notifications limited to parts-only information.
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
      select p.user_id, p.role
      from public.profiles p
      where p.is_active = true
        and (p.role in ('admin', 'storekeeper') or (p.role = 'supervisor' and p.site_id = v_site_id))
    loop
      perform private.insert_notification(v_recipient.user_id, v_title, case when v_recipient.role = 'storekeeper' then v_part_name || ' · ' || v_request_number || ' · Status: ' || coalesce(new.status, 'new') else v_message end, v_category, v_module, v_record_id, v_dedupe || ':' || v_recipient.user_id::text);
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

