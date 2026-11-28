-- Lock Store Keeper purchasing fields after Invoice Number and Total Cost are both saved.
-- Admin retains unrestricted correction access. Receipt-triggered status updates remain allowed.
create or replace function public.guard_parts_order_updates()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if public.current_app_role() = 'storekeeper' then
    if old.invoice_number is not null
       and length(trim(old.invoice_number)) > 0
       and old.invoice_cost is not null then
      if new.request_number is distinct from old.request_number
        or new.request_date is distinct from old.request_date
        or new.supplier_company_name is distinct from old.supplier_company_name
        or new.invoice_number is distinct from old.invoice_number
        or new.invoice_date is distinct from old.invoice_date
        or new.invoice_cost is distinct from old.invoice_cost
        or new.invoice_currency is distinct from old.invoice_currency
      then
        raise exception 'This purchasing record is locked after Invoice Number and Total Cost are saved. Contact Admin for corrections.';
      end if;
    end if;

    if new.site_id is distinct from old.site_id
      or new.vehicle_visit_id is distinct from old.vehicle_visit_id
      or new.created_by is distinct from old.created_by
      or new.part_name is distinct from old.part_name
      or new.part_number is distinct from old.part_number
      or new.quantity is distinct from old.quantity
      or new.unit is distinct from old.unit
      or new.priority is distinct from old.priority
      or new.notes is distinct from old.notes
      or (new.status is distinct from old.status and pg_trigger_depth() <= 1)
      or new.ordered_at is distinct from old.ordered_at
      or new.created_at is distinct from old.created_at
      or new.purchased_at is distinct from old.purchased_at
      or new.purchased_by is distinct from old.purchased_by
    then
      raise exception 'Store Keeper can update only Request Number, Request Date, Invoice Number, Invoice Date, Supplier Company, Cost and Currency.';
    end if;

    if (new.invoice_number is not null or new.invoice_date is not null or new.invoice_cost is not null)
       and old.purchased_at is null then
      new.purchased_at := now();
      new.purchased_by := auth.uid();
    end if;
  end if;
  return new;
end;
$function$;
