-- Preserve a complete, append-only history of General Stores item changes.
create table if not exists public.general_store_item_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  site_id uuid not null,
  action text not null check (action in ('snapshot','insert','update','delete')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

alter table public.general_store_item_history enable row level security;

drop policy if exists general_store_item_history_read on public.general_store_item_history;
create policy general_store_item_history_read
on public.general_store_item_history
for select
to authenticated
using (
  current_app_role() = 'admin'
  or current_app_role() = 'storekeeper'
  or (
    current_app_role() = 'supervisor'
    and site_id = current_app_site_id()
  )
);

revoke all on public.general_store_item_history from anon;
grant select on public.general_store_item_history to authenticated;

create or replace function public.capture_general_store_item_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.general_store_item_history
      (item_id, site_id, action, old_values, new_values, changed_by, changed_at)
    values
      (new.id, new.site_id, 'insert', null, to_jsonb(new), auth.uid(), coalesce(new.updated_at, new.created_at, now()));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.general_store_item_history
      (item_id, site_id, action, old_values, new_values, changed_by, changed_at)
    values
      (new.id, new.site_id, 'update', to_jsonb(old), to_jsonb(new), auth.uid(), coalesce(new.updated_at, now()));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.general_store_item_history
      (item_id, site_id, action, old_values, new_values, changed_by, changed_at)
    values
      (old.id, old.site_id, 'delete', to_jsonb(old), null, auth.uid(), now());
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists general_store_items_history_capture on public.general_store_items;
create trigger general_store_items_history_capture
after insert or update or delete on public.general_store_items
for each row execute function public.capture_general_store_item_history();

-- Seed one opening snapshot for every item that existed before history tracking.
insert into public.general_store_item_history
  (item_id, site_id, action, old_values, new_values, changed_by, changed_at)
select
  g.id, g.site_id, 'snapshot', null, to_jsonb(g), g.created_by,
  coalesce(g.created_at, now())
from public.general_store_items g
where not exists (
  select 1
  from public.general_store_item_history h
  where h.item_id = g.id
);
