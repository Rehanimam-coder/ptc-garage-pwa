-- Additive operational tables for PTC Garage Management.
create table if not exists public.breakdown_jobs (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
 vehicle_visit_id uuid null references public.vehicle_visits(id) on delete set null,
 ptc_id text, vehicle_type text not null, complaint text not null,
 priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
 status text not null default 'Open' check (status in ('Open','In Progress','Waiting for Parts','Completed','Cancelled')),
 assigned_to text, started_at timestamptz, completed_at timestamptz, remarks text,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.preventive_maintenance (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
 ptc_id text not null, vehicle_type text, maintenance_work text not null,
 repeat_by text not null default 'Days' check (repeat_by in ('Days','Kilometres','Operating Hours')),
 repeat_interval numeric not null check (repeat_interval > 0), last_done_value numeric, current_value numeric,
 expected_due_date date, responsible_person text,
 status text not null default 'Active' check (status in ('Active','Paused','Completed')),
 remarks text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ptc_assets (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
 ptc_id text, asset_name text not null, asset_type text, serial_number text, make_model text,
 status text not null default 'Active' check (status in ('Active','Under Repair','Disposed')),
 remarks text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.general_store_items (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
 item_code text, item_name text not null, category text, unit text not null default 'Pcs',
 quantity_on_hand numeric not null default 0 check (quantity_on_hand >= 0), reorder_level numeric not null default 0 check (reorder_level >= 0),
 remarks text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(site_id,item_code)
);
create table if not exists public.tasks_projects (
 id uuid primary key default gen_random_uuid(), site_id uuid null references public.sites(id),
 title text not null, description text, assigned_to text, due_date date,
 priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
 status text not null default 'Open' check (status in ('Open','In Progress','On Hold','Completed','Cancelled')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.private_messages (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id),
 recipient_id uuid null references auth.users(id), message text not null check (length(trim(message)) > 0 and length(message) <= 4000),
 created_at timestamptz not null default now()
);
create table if not exists public.app_settings (
 setting_key text primary key, setting_value jsonb not null default '{}'::jsonb,
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
 action text not null, module text not null, record_id text, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.master_data (
 id uuid primary key default gen_random_uuid(), category text not null, code text not null, label text not null,
 is_active boolean not null default true, created_at timestamptz not null default now(), unique(category,code)
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 title text not null, message text not null, is_read boolean not null default false, created_at timestamptz not null default now()
);

create index if not exists breakdown_jobs_site_created_idx on public.breakdown_jobs(site_id,created_at desc);
create index if not exists preventive_maintenance_site_due_idx on public.preventive_maintenance(site_id,expected_due_date);
create index if not exists ptc_assets_site_idx on public.ptc_assets(site_id);
create index if not exists general_store_items_site_name_idx on public.general_store_items(site_id,item_name);
create index if not exists tasks_projects_site_due_idx on public.tasks_projects(site_id,due_date);
create index if not exists private_messages_created_idx on public.private_messages(created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

alter table public.breakdown_jobs enable row level security;
alter table public.preventive_maintenance enable row level security;
alter table public.ptc_assets enable row level security;
alter table public.general_store_items enable row level security;
alter table public.tasks_projects enable row level security;
alter table public.private_messages enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.master_data enable row level security;
alter table public.notifications enable row level security;

drop policy if exists breakdown_jobs_read on public.breakdown_jobs;
create policy breakdown_jobs_read on public.breakdown_jobs for select to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));
drop policy if exists breakdown_jobs_write on public.breakdown_jobs;
create policy breakdown_jobs_write on public.breakdown_jobs for all to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id())) with check (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));

drop policy if exists preventive_maintenance_read on public.preventive_maintenance;
create policy preventive_maintenance_read on public.preventive_maintenance for select to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));
drop policy if exists preventive_maintenance_write on public.preventive_maintenance;
create policy preventive_maintenance_write on public.preventive_maintenance for all to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id())) with check (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));

drop policy if exists ptc_assets_read on public.ptc_assets;
create policy ptc_assets_read on public.ptc_assets for select to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));
drop policy if exists ptc_assets_write on public.ptc_assets;
create policy ptc_assets_write on public.ptc_assets for all to authenticated using (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id())) with check (public.current_app_role()='admin' or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));

drop policy if exists general_store_items_read on public.general_store_items;
create policy general_store_items_read on public.general_store_items for select to authenticated using (public.current_app_role() in ('admin','storekeeper') or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));
drop policy if exists general_store_items_write on public.general_store_items;
create policy general_store_items_write on public.general_store_items for all to authenticated using (public.current_app_role() in ('admin','storekeeper') or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id())) with check (public.current_app_role() in ('admin','storekeeper') or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));

drop policy if exists tasks_projects_read on public.tasks_projects;
create policy tasks_projects_read on public.tasks_projects for select to authenticated using (public.current_app_role()='admin' or site_id is null or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));
drop policy if exists tasks_projects_write on public.tasks_projects;
create policy tasks_projects_write on public.tasks_projects for all to authenticated using (public.current_app_role()='admin' or created_by=auth.uid() or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id())) with check (public.current_app_role()='admin' or created_by=auth.uid() or (public.current_app_role()='supervisor' and site_id=public.current_app_site_id()));

drop policy if exists private_messages_read on public.private_messages;
create policy private_messages_read on public.private_messages for select to authenticated using (public.current_app_role()='admin' or sender_id=auth.uid() or recipient_id=auth.uid() or recipient_id is null);
drop policy if exists private_messages_insert on public.private_messages;
create policy private_messages_insert on public.private_messages for insert to authenticated with check (sender_id=auth.uid());
drop policy if exists private_messages_delete on public.private_messages;
create policy private_messages_delete on public.private_messages for delete to authenticated using (sender_id=auth.uid() or public.current_app_role()='admin');

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs for select to authenticated using (public.current_app_role()='admin');
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs for insert to authenticated with check (user_id=auth.uid());

drop policy if exists master_data_read on public.master_data;
create policy master_data_read on public.master_data for select to authenticated using (true);
drop policy if exists master_data_admin_write on public.master_data;
create policy master_data_admin_write on public.master_data for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using (user_id=auth.uid() or public.current_app_role()='admin');
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using (user_id=auth.uid() or public.current_app_role()='admin') with check (user_id=auth.uid() or public.current_app_role()='admin');

grant select,insert,update,delete on public.breakdown_jobs,public.preventive_maintenance,public.ptc_assets,public.general_store_items,public.tasks_projects,public.private_messages,public.app_settings,public.audit_logs,public.master_data,public.notifications to authenticated;
