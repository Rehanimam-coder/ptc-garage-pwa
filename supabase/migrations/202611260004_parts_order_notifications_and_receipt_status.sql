-- Keep parts order lifecycle in sync with receipts and notify the responsible teams.
create or replace function public.notify_parts_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id,title,message)
    select p.user_id,'New parts request','A new parts request was submitted for site ' || coalesce((select s.name from public.sites s where s.id=new.site_id),'Unknown site') || '.'
    from public.profiles p where p.role='storekeeper' and p.is_active=true;
  elsif new.status is distinct from old.status then
    insert into public.notifications(user_id,title,message)
    select p.user_id,'Parts order update','A parts order for site ' || coalesce((select s.name from public.sites s where s.id=new.site_id),'Unknown site') || ' is now ' || new.status || '.'
    from public.profiles p where p.role='supervisor' and p.site_id=new.site_id and p.is_active=true;
  end if;
  return new;
end;
$$;

drop trigger if exists parts_order_notify_changes on public.parts_orders;
create trigger parts_order_notify_changes
after insert or update on public.parts_orders
for each row execute function public.notify_parts_order_changes();

create or replace function public.sync_parts_order_receipt_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order_id uuid;
  ordered_qty numeric;
  received_qty numeric;
  invoice text;
begin
  if tg_op = 'DELETE' then target_order_id := old.order_id; else target_order_id := new.order_id; end if;
  select quantity, invoice_number into ordered_qty, invoice
  from public.parts_orders where id=target_order_id;
  if ordered_qty is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  select coalesce(sum(quantity_received),0) into received_qty
  from public.parts_receipts where order_id=target_order_id;
  update public.parts_orders
  set status = case
    when received_qty >= ordered_qty then 'received'
    when received_qty > 0 then 'partially_received'
    when invoice is not null and length(trim(invoice)) > 0 then 'purchased'
    else 'ordered'
  end
  where id=target_order_id;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists parts_receipts_sync_order_status on public.parts_receipts;
create trigger parts_receipts_sync_order_status
after insert or update or delete on public.parts_receipts
for each row execute function public.sync_parts_order_receipt_status();
