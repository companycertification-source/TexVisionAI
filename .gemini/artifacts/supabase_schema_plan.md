# Supabase Database Schema - Implementation Plan

## Overview
This document outlines the comprehensive Supabase database schema for TexVision AI, including all necessary tables for production use with proper history tracking, user management, and API quota monitoring.

---

## Tables to Add/Update

### 1. **user_roles** (Update existing)
Stores user roles and permissions.

```sql
create table if not exists user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null unique,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'inspector', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assigned_by uuid references auth.users(id)
);
```

### 2. **suppliers** (New)
Master data for suppliers/vendors.

```sql
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  code text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  is_active boolean default true,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);
```

### 3. **inspection_logs** (New)
Audit log for all inspection-related activities.

```sql
create table if not exists inspection_logs (
  id uuid default uuid_generate_v4() primary key,
  inspection_id uuid references inspections(id),
  user_id uuid references auth.users(id),
  user_email text,
  action text not null, -- 'created', 'updated', 'approved', 'rejected', 'deleted'
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 4. **api_usage** (Enhance existing usage_logs)
Track API usage for quota management.

```sql
create table if not exists api_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  user_email text,
  endpoint text not null, -- 'gemini/analyze', 'storage/upload', etc.
  model text, -- 'gemini-2.0-flash', etc.
  operation text, -- 'analyze_image', 'chat', etc.
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
```

### 5. **user_quotas** (New)
User-specific quotas and usage limits.

```sql
create table if not exists user_quotas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null unique references auth.users(id),
  monthly_api_calls_limit int default 1000,
  monthly_storage_bytes_limit bigint default 1073741824, -- 1GB
  current_month_api_calls int default 0,
  current_month_storage_bytes bigint default 0,
  last_reset_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 6. **system_settings** (New)
Global application settings.

```sql
create table if not exists system_settings (
  id uuid default uuid_generate_v4() primary key,
  key text not null unique,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);
```

### 7. **inspections** (Enhance existing)
Add user tracking and status fields.

```sql
-- Add columns to existing inspections table
alter table inspections add column if not exists user_id uuid references auth.users(id);
alter table inspections add column if not exists status text default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected'));
alter table inspections add column if not exists approved_by uuid references auth.users(id);
alter table inspections add column if not exists approved_at timestamp with time zone;
alter table inspections add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
```

---

## Indexes for Performance

```sql
-- API Usage queries
create index if not exists idx_api_usage_user_date on api_usage(user_id, created_at);
create index if not exists idx_api_usage_month on api_usage(date_trunc('month', created_at));

-- Inspection logs
create index if not exists idx_inspection_logs_inspection on inspection_logs(inspection_id);
create index if not exists idx_inspection_logs_user on inspection_logs(user_id, created_at);

-- Inspections
create index if not exists idx_inspections_user on inspections(user_id);
create index if not exists idx_inspections_status on inspections(status);
create index if not exists idx_inspections_date on inspections(created_at);

-- Suppliers
create index if not exists idx_suppliers_name on suppliers(name);
```

---

## Row Level Security (RLS) Policies

```sql
-- User Roles: Only admins can modify, everyone can read their own
create policy "Users can read own role" on user_roles
  for select using (auth.uid() = user_id);
create policy "Admins can manage all roles" on user_roles
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Suppliers: Managers+ can modify, all authenticated can read
create policy "Authenticated users can read suppliers" on suppliers
  for select using (auth.role() = 'authenticated');
create policy "Managers can manage suppliers" on suppliers
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin', 'manager'))
  );

-- API Usage: Users see only their own, admins see all
create policy "Users can read own api_usage" on api_usage
  for select using (user_id = auth.uid() or 
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- User Quotas: Users see only their own
create policy "Users can read own quota" on user_quotas
  for select using (user_id = auth.uid());
```

---

## Functions & Triggers

### Auto-update user quota on API usage
```sql
create or replace function update_user_quota()
returns trigger as $$
begin
  insert into user_quotas (user_id, current_month_api_calls, current_month_storage_bytes)
  values (NEW.user_id, 1, 0)
  on conflict (user_id) do update
  set current_month_api_calls = user_quotas.current_month_api_calls + 1,
      updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger on_api_usage_insert
  after insert on api_usage
  for each row execute function update_user_quota();
```

### Monthly quota reset
```sql
create or replace function reset_monthly_quotas()
returns void as $$
begin
  update user_quotas
  set current_month_api_calls = 0,
      current_month_storage_bytes = 0,
      last_reset_at = now()
  where date_trunc('month', last_reset_at) < date_trunc('month', now());
end;
$$ language plpgsql;
```

---

## Implementation Steps

1. [ ] Backup existing data
2. [ ] Run new table creation SQL
3. [ ] Run alter statements for existing tables
4. [ ] Create indexes
5. [ ] Enable RLS and create policies
6. [ ] Create functions and triggers
7. [ ] Test with sample data
8. [ ] Update application services to use new tables

---

## Migration Notes

- The `usage_logs` table can be migrated to `api_usage` for richer tracking
- Existing `inspections` data should have `status` defaulted to 'approved' for historical records
- `suppliers` can be populated from unique supplier names in existing inspections

