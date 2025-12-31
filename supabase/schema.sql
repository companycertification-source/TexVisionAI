-- TexVision AI - Supabase Schema Migration
-- Safe to run on existing databases - drops existing policies before recreating
-- Version 2.0

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. USER ROLES TABLE
-- ============================================================
create table if not exists user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null unique,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'inspector', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assigned_by uuid
);

alter table user_roles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can read own role" on user_roles;
drop policy if exists "Admins can manage all roles" on user_roles;
drop policy if exists "Enable insert for authenticated" on user_roles;

create policy "Users can read own role" on user_roles
  for select using (auth.uid() = user_id);

create policy "Admins can manage all roles" on user_roles
  for all using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "Enable insert for authenticated" on user_roles
  for insert with check (auth.role() = 'authenticated');


-- ============================================================
-- 2. SUPPLIERS TABLE
-- ============================================================
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  is_active boolean default true,
  total_inspections int default 0,
  pass_rate numeric(5,2) default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid
);

alter table suppliers enable row level security;

-- Drop existing policies
drop policy if exists "Authenticated users can read suppliers" on suppliers;
drop policy if exists "Managers can insert suppliers" on suppliers;
drop policy if exists "Managers can update suppliers" on suppliers;
drop policy if exists "Enable all access for suppliers" on suppliers;

create policy "Authenticated users can read suppliers" on suppliers
  for select using (auth.role() = 'authenticated');

create policy "Managers can insert suppliers" on suppliers
  for insert with check (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'manager'))
  );

create policy "Managers can update suppliers" on suppliers
  for update using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'manager'))
  );

create index if not exists idx_suppliers_name on suppliers(name);
create index if not exists idx_suppliers_code on suppliers(code);


-- ============================================================
-- 3. INSPECTIONS TABLE (Enhanced)
-- ============================================================
create table if not exists inspections (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  supplier_name text,
  po_number text,
  inspector_name text,
  report_data jsonb not null
);

-- Add new columns to existing table if they don't exist
alter table inspections add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table inspections add column if not exists supplier_id uuid;
alter table inspections add column if not exists user_id uuid;
alter table inspections add column if not exists status text default 'completed';
alter table inspections add column if not exists approved_by uuid;
alter table inspections add column if not exists approved_at timestamp with time zone;

-- Add constraint if not exists (wrap in DO block to handle existing constraint)
do $$ begin
  alter table inspections add constraint inspections_status_check 
    check (status in ('draft', 'pending_review', 'completed', 'approved', 'rejected'));
exception when duplicate_object then null;
end $$;

-- Add foreign key if not exists
do $$ begin
  alter table inspections add constraint inspections_supplier_id_fkey 
    foreign key (supplier_id) references suppliers(id);
exception when duplicate_object then null;
end $$;

alter table inspections enable row level security;

-- Drop existing policies
drop policy if exists "Enable all access for authenticated users" on inspections;
drop policy if exists "Enable insert for anon users" on inspections;
drop policy if exists "Enable select for anon users" on inspections;

create policy "Enable all access for authenticated users" on inspections
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Enable select for anon users" on inspections
  for select using (true);

create index if not exists idx_inspections_user on inspections(user_id);
create index if not exists idx_inspections_status on inspections(status);
create index if not exists idx_inspections_date on inspections(created_at);
create index if not exists idx_inspections_supplier on inspections(supplier_id);


-- ============================================================
-- 4. ITEMS TABLE (Item Master)
-- ============================================================
create table if not exists items (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  code text,
  category text,
  uom text,
  description text,
  specifications text,
  quality_checkpoints jsonb,
  reference_image_url text,
  aql_config jsonb
);

-- Add new columns to existing table if they don't exist
alter table items add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table items add column if not exists item_type text default 'sell';
alter table items add column if not exists preferred_supplier text;
alter table items add column if not exists supplier_id uuid;
alter table items add column if not exists reference_image_front_url text;
alter table items add column if not exists reference_image_back_url text;
alter table items add column if not exists standard_images jsonb;
alter table items add column if not exists dimensions text;
alter table items add column if not exists is_active boolean default true;
alter table items add column if not exists created_by uuid;

-- Add constraint if not exists
do $$ begin
  alter table items add constraint items_item_type_check 
    check (item_type in ('buy', 'sell'));
exception when duplicate_object then null;
end $$;

-- Add foreign key if not exists
do $$ begin
  alter table items add constraint items_supplier_id_fkey 
    foreign key (supplier_id) references suppliers(id);
exception when duplicate_object then null;
end $$;

alter table items enable row level security;

drop policy if exists "Enable all access for items" on items;

create policy "Enable all access for items" on items
  for all using (true) with check (true);

create index if not exists idx_items_code on items(code);
create index if not exists idx_items_category on items(category);


-- ============================================================
-- 5. INSPECTION LOGS (Audit Trail)
-- ============================================================
create table if not exists inspection_logs (
  id uuid default uuid_generate_v4() primary key,
  inspection_id uuid references inspections(id) on delete cascade,
  user_id uuid,
  user_email text,
  action text not null check (action in ('created', 'updated', 'approved', 'rejected', 'deleted', 'viewed')),
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table inspection_logs enable row level security;

drop policy if exists "Admins can read all logs" on inspection_logs;
drop policy if exists "Users can read own logs" on inspection_logs;
drop policy if exists "Enable insert for authenticated" on inspection_logs;

create policy "Admins can read all logs" on inspection_logs
  for select using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "Users can read own logs" on inspection_logs
  for select using (user_id = auth.uid());

create policy "Enable insert for authenticated" on inspection_logs
  for insert with check (auth.role() = 'authenticated');

create index if not exists idx_inspection_logs_inspection on inspection_logs(inspection_id);
create index if not exists idx_inspection_logs_user on inspection_logs(user_id, created_at);
create index if not exists idx_inspection_logs_action on inspection_logs(action);


-- ============================================================
-- 6. API USAGE TRACKING
-- ============================================================
create table if not exists api_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  user_email text,
  endpoint text not null,
  model text,
  operation text,
  input_tokens int default 0,
  output_tokens int default 0,
  total_tokens int default 0,
  estimated_cost numeric(10, 6) default 0,
  request_size_bytes int default 0,
  response_time_ms int,
  status text check (status in ('success', 'error', 'rate_limited')),
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table api_usage enable row level security;

drop policy if exists "Users can read own api_usage" on api_usage;
drop policy if exists "Enable insert for all" on api_usage;

create policy "Users can read own api_usage" on api_usage
  for select using (user_id = auth.uid() or 
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "Enable insert for all" on api_usage
  for insert with check (true);

create index if not exists idx_api_usage_user_date on api_usage(user_id, created_at);
create index if not exists idx_api_usage_date on api_usage(created_at);


-- ============================================================
-- 7. USER QUOTAS
-- ============================================================
create table if not exists user_quotas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null unique,
  monthly_api_calls_limit int default 1000,
  monthly_storage_bytes_limit bigint default 1073741824,
  current_month_api_calls int default 0,
  current_month_storage_bytes bigint default 0,
  last_reset_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_quotas enable row level security;

drop policy if exists "Users can read own quota" on user_quotas;
drop policy if exists "Admins can manage quotas" on user_quotas;
drop policy if exists "Enable insert for authenticated" on user_quotas;

create policy "Users can read own quota" on user_quotas
  for select using (user_id = auth.uid());

create policy "Admins can manage quotas" on user_quotas
  for all using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "Enable insert for authenticated" on user_quotas
  for insert with check (auth.role() = 'authenticated');


-- ============================================================
-- 8. SYSTEM SETTINGS
-- ============================================================
create table if not exists system_settings (
  id uuid default uuid_generate_v4() primary key,
  key text not null unique,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid
);

alter table system_settings enable row level security;

drop policy if exists "Anyone can read settings" on system_settings;
drop policy if exists "Admins can manage settings" on system_settings;

create policy "Anyone can read settings" on system_settings
  for select using (true);

create policy "Admins can manage settings" on system_settings
  for all using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

-- Insert default settings
insert into system_settings (key, value, description) values
  ('app_name', '"TexVision AI"', 'Application display name'),
  ('default_aql_level', '"II"', 'Default AQL inspection level'),
  ('time_zone', '"UTC"', 'Default time zone'),
  ('date_format', '"YYYY-MM-DD"', 'Default date format'),
  ('currency', '"USD"', 'Default currency')
on conflict (key) do nothing;


-- ============================================================
-- 9. WORK STATIONS (Production Lines)
-- ============================================================
create table if not exists work_stations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text not null unique,
  description text,
  type text default 'workstation' check (type in ('production_line', 'workstation')),
  location text,
  frequency text default '1h' check (frequency in ('30m', '1h', '2h', '4h', 'shift')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table work_stations enable row level security;

drop policy if exists "Enable all access for work_stations" on work_stations;

create policy "Enable all access for work_stations" on work_stations
  for all using (true) with check (true);

create index if not exists idx_work_stations_code on work_stations(code);


-- ============================================================
-- 10. INSPECTION SCHEDULES
-- ============================================================
create table if not exists inspection_schedules (
  id uuid default uuid_generate_v4() primary key,
  work_station_id uuid references work_stations(id) on delete cascade,
  shift text not null check (shift in ('morning', 'afternoon', 'night')),
  frequency_per_hour numeric default 1,
  interval_minutes integer default 60,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(work_station_id, shift)
);

alter table inspection_schedules enable row level security;

drop policy if exists "Enable all access for inspection_schedules" on inspection_schedules;

create policy "Enable all access for inspection_schedules" on inspection_schedules
  for all using (true) with check (true);


-- ============================================================
-- 11. SCHEDULED INSPECTIONS (Daily Tracking)
-- ============================================================
create table if not exists scheduled_inspections (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references inspection_schedules(id) on delete cascade,
  shift_date date not null,
  expected_time timestamp with time zone not null,
  status text default 'pending' check (status in ('pending', 'completed', 'missed')),
  completed_at timestamp with time zone,
  completed_by text,
  inspection_id uuid references inspections(id),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table scheduled_inspections enable row level security;

drop policy if exists "Enable all access for scheduled_inspections" on scheduled_inspections;

create policy "Enable all access for scheduled_inspections" on scheduled_inspections
  for all using (true) with check (true);

create index if not exists idx_scheduled_inspections_date on scheduled_inspections(shift_date, status);
create index if not exists idx_scheduled_inspections_schedule on scheduled_inspections(schedule_id);


-- ============================================================
-- 12. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update quota on API usage
create or replace function update_user_quota_on_api_call()
returns trigger as $$
begin
  insert into user_quotas (user_id, current_month_api_calls)
  values (NEW.user_id, 1)
  on conflict (user_id) do update
  set current_month_api_calls = user_quotas.current_month_api_calls + 1,
      updated_at = now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_api_usage_insert on api_usage;
create trigger on_api_usage_insert
  after insert on api_usage
  for each row 
  when (NEW.user_id is not null)
  execute function update_user_quota_on_api_call();

-- Auto-update supplier stats on inspection
create or replace function update_supplier_stats()
returns trigger as $$
begin
  update suppliers
  set total_inspections = total_inspections + 1,
      updated_at = now()
  where id = NEW.supplier_id;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists on_inspection_insert on inspections;
create trigger on_inspection_insert
  after insert on inspections
  for each row 
  when (NEW.supplier_id is not null)
  execute function update_supplier_stats();

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

-- Apply updated_at trigger to relevant tables
drop trigger if exists set_updated_at on suppliers;
create trigger set_updated_at before update on suppliers
  for each row execute function update_updated_at_column();

drop trigger if exists set_updated_at on items;
create trigger set_updated_at before update on items
  for each row execute function update_updated_at_column();

drop trigger if exists set_updated_at on inspections;
create trigger set_updated_at before update on inspections
  for each row execute function update_updated_at_column();

drop trigger if exists set_updated_at on work_stations;
create trigger set_updated_at before update on work_stations
  for each row execute function update_updated_at_column();


-- ============================================================
-- LEGACY SUPPORT: Keep usage_logs for backward compatibility
-- ============================================================
create table if not exists usage_logs (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  model text,
  operation text,
  token_count int,
  status text
);

alter table usage_logs enable row level security;

drop policy if exists "Enable insert for usage_logs" on usage_logs;
drop policy if exists "Enable select for usage_logs" on usage_logs;

create policy "Enable insert for usage_logs" on usage_logs for insert with check (true);
create policy "Enable select for usage_logs" on usage_logs for select using (true);


-- ============================================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- ============================================================
-- Note: Create bucket 'inspection-images' in Storage dashboard and make it public
-- insert into storage.buckets (id, name, public) values ('inspection-images', 'inspection-images', true) on conflict do nothing;

