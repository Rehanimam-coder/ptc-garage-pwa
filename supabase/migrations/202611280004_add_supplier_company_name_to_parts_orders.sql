alter table public.parts_orders
  add column if not exists supplier_company_name text;
