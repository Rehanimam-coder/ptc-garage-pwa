create table if not exists public.maintenance_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  source_type text not null default 'xlsx',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  exception_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  status text not null default 'staged' check (status in ('staged','imported','partial','failed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.maintenance_import_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.maintenance_import_batches(id) on delete cascade,
  row_number integer not null,
  data jsonb not null default '{}'::jsonb,
  validation_errors text[] not null default '{}',
  is_selected boolean not null default true,
  import_status text not null default 'pending' check (import_status in ('pending','imported','skipped')),
  created_at timestamptz not null default now(),
  unique(batch_id,row_number)
);
create table if not exists public.maintenance_history (
  id uuid primary key default gen_random_uuid(),
  maintenance_date date,
  ptc_id text,
  vehicle_number text,
  site_id uuid references public.sites(id),
  source_site text,
  work_spare_parts text not null,
  unit text,
  quantity numeric,
  price numeric,
  mechanic_name text,
  ref_number text,
  remark text,
  source_sheet text,
  source_file text,
  batch_id uuid references public.maintenance_import_batches(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists maintenance_history_date_idx on public.maintenance_history(maintenance_date desc);
create index if not exists maintenance_history_ptc_idx on public.maintenance_history(ptc_id);
create index if not exists maintenance_history_site_idx on public.maintenance_history(site_id);
create index if not exists maintenance_staging_batch_idx on public.maintenance_import_staging(batch_id,row_number);
alter table public.maintenance_history enable row level security;
alter table public.maintenance_import_batches enable row level security;
alter table public.maintenance_import_staging enable row level security;
drop policy if exists maintenance_history_read on public.maintenance_history;
create policy maintenance_history_read on public.maintenance_history for select to authenticated
using (current_app_role()='admin' or (current_app_role()='supervisor' and site_id=current_app_site_id()));
drop policy if exists maintenance_history_admin_write on public.maintenance_history;
create policy maintenance_history_admin_write on public.maintenance_history for all to authenticated
using (current_app_role()='admin') with check (current_app_role()='admin');
drop policy if exists maintenance_batches_admin_all on public.maintenance_import_batches;
create policy maintenance_batches_admin_all on public.maintenance_import_batches for all to authenticated
using (current_app_role()='admin') with check (current_app_role()='admin');
drop policy if exists maintenance_staging_admin_all on public.maintenance_import_staging;
create policy maintenance_staging_admin_all on public.maintenance_import_staging for all to authenticated
using (current_app_role()='admin') with check (current_app_role()='admin');
grant select, insert, update, delete on public.maintenance_history to authenticated;
grant select, insert, update, delete on public.maintenance_import_batches to authenticated;
grant select, insert, update, delete on public.maintenance_import_staging to authenticated;
