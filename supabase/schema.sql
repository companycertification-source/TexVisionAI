-- TexVision AI - Supabase Schema Setup

-- 1. Create 'inspections' table
create table if not exists inspections (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  supplier_name text,
  po_number text,
  inspector_name text,
  report_data jsonb not null
);

-- Enable RLS
alter table inspections enable row level security;

-- Create policy to allow all actions for now (Modify as needed for stricter security)
create policy "Enable all access for authenticated users" on inspections
  for all using (true) with check (true);

create policy "Enable insert for anon users" on inspections
  for insert with check (true);

create policy "Enable select for anon users" on inspections
  for select using (true);


-- 2. Create 'items' table for Item Master
create table if not exists items (
  id text primary key, -- Using text ID to match app's UUID generation
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  code text,
  category text,
  item_type text check (item_type in ('buy', 'sell')),
  uom text,
  preferred_supplier text,
  description text,
  specifications text,
  quality_checkpoints jsonb, -- Array of strings
  reference_image_url text,
  reference_image_front_url text,
  reference_image_back_url text,
  standard_images jsonb, -- { accepted: [], rejected: [], accepted_front: "", ... }
  aql_config jsonb,      -- { level: "II", major: 2.5, minor: 4.0 }
  dimensions text
);

-- Enable RLS
alter table items enable row level security;

-- Create policy
create policy "Enable all access for items" on items
  for all using (true) with check (true);


-- 3. Create 'usage_logs' table for API tracking
create table if not exists usage_logs (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  model text,
  operation text, -- 'analyze_image', 'chat', etc.
  token_count int, -- Estimated
  status text -- 'success', 'error'
);

alter table usage_logs enable row level security;
create policy "Enable insert for usage_logs" on usage_logs for insert with check (true);
create policy "Enable select for usage_logs" on usage_logs for select using (true);


-- 4. Storage Bucket Setup
-- Note: Buckets are usually created via the Storage UI, but this SQL sets up the policy if the bucket exists.

-- Policy for 'inspection-images' bucket
-- You must create the bucket 'inspection-images' in the Storage dashboard first!
-- make it Public.

-- (Conceptual Policy - run this in SQL Editor if you want to enforce via SQL)
-- insert into storage.buckets (id, name, public) values ('inspection-images', 'inspection-images', true) on conflict do nothing;

-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'inspection-images' );
-- create policy "Authenticated Upload" on storage.objects for insert with check ( bucket_id = 'inspection-images' );
-- create policy "Authenticated Delete" on storage.objects for delete using ( bucket_id = 'inspection-images' );


-- 5. Work Stations / Production Lines
create table if not exists work_stations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table work_stations enable row level security;
create policy "Enable all access for work_stations" on work_stations
  for all using (true) with check (true);


-- 6. Inspection Schedules (frequency per work station/shift)
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
create policy "Enable all access for inspection_schedules" on inspection_schedules
  for all using (true) with check (true);


-- 7. Scheduled Inspection Tracking
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
create policy "Enable all access for scheduled_inspections" on scheduled_inspections
  for all using (true) with check (true);

-- Index for efficient date-based queries
create index if not exists idx_scheduled_inspections_date on scheduled_inspections(shift_date, status);

