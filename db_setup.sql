-- =========================================================
-- ISLAA7 FULL DATABASE SCHEMA SETUP
-- =========================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto;

-- 2. CLEANUP (For development: reset tables if they exist)
-- CAUTION: This deletes data. Remove these DROP commands in production.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop trigger if exists on_points_added on public.points_ledger;
drop function if exists public.update_profile_points();
drop view if exists public.technicians;
drop trigger if exists on_technician_verification_update on public.profiles;
drop function if exists public.log_technician_status_change();
drop table if exists public.technician_status_logs;

-- We alter tables to add columns instead of dropping to preserve data if possible,
-- but for a clean setup, we define the schemas below.

-- =========================================================
-- 3. PROFILES TABLE (Users & Technicians)
-- =========================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  emirates_id text,
  emirate text,
  phone text,
  residential_address text,
  role text default 'CITIZEN', -- CITIZEN, TECHNICIAN, ADMIN
  
  -- Citizen Specific
  points_balance integer default 0,
  repairs_count integer default 0,
  
  -- Technician Specific
  specialty text, -- JSON array or comma separated string
  experience_years integer default 0,
  rating numeric(3, 2) default 0.00,
  active_jobs integer default 0,
  completed_jobs integer default 0,
  
  -- Status
  status text default 'ACTIVE', -- ACTIVE, SUSPENDED
  verification_status text default 'PENDING', -- PENDING, VERIFIED, REJECTED
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS: Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile. Technicians/Admins might need broader access in real apps.
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- =========================================================
-- 4. REPAIR REQUESTS TABLE (Jobs)
-- =========================================================
create table if not exists public.repair_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  
  -- Item Details
  item_name text not null,
  category text not null, -- APPLIANCE, FURNITURE, etc.
  description text,
  photo_url text,
  
  -- Logistics
  scheduled_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Assignment & Status
  status text default 'PENDING', -- PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, REJECTED
  technician_id uuid references public.profiles(id),
  technician_name text,
  outcome_notes text,
  
  -- Constraints
  constraint status_check check (status in ('PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED'))
);

-- RLS
alter table public.repair_requests enable row level security;

create policy "Users can view own repairs" 
on public.repair_requests for select using (auth.uid() = user_id);

create policy "Technicians can view assigned repairs" 
on public.repair_requests for select using (auth.uid() = technician_id);

create policy "Users can insert repairs" 
on public.repair_requests for insert with check (auth.uid() = user_id);

create policy "Technicians can update assigned repairs" 
on public.repair_requests for update using (auth.uid() = technician_id);

-- =========================================================
-- 5. POINTS LEDGER TABLE (History & Calculation)
-- =========================================================
create table if not exists public.points_ledger (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount integer not null, -- Positive for earning, Negative for spending
  transaction_type text not null, -- REPAIR_REWARD, REDEMPTION, BONUS
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Trigger Function: Automatically update profile balance when ledger entry is added
create or replace function public.update_profile_points()
returns trigger as $$
begin
  update public.profiles
  set points_balance = points_balance + new.amount
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_points_added
  after insert on public.points_ledger
  for each row execute procedure public.update_profile_points();

-- =========================================================
-- 6. DISPOSAL REQUESTS TABLE
-- =========================================================
create table if not exists public.disposal_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  item_description text not null,
  reason text,
  status text default 'PENDING', -- PENDING, APPROVED_PERMISSION_SLIP, REJECTED
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =========================================================
-- 7. VIOLATIONS TABLE
-- =========================================================
create table if not exists public.violations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  violation_type text not null,
  fine_amount numeric(10, 2) not null,
  status text default 'UNPAID', -- UNPAID, PAID
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =========================================================
-- 8. N8N EMAIL LOGS (NEW)
-- =========================================================
create table if not exists public.technician_status_logs (
  id uuid default gen_random_uuid() primary key,
  technician_id uuid references public.profiles(id) not null,
  technician_email text,
  technician_name text,
  old_status text,
  new_status text,
  email_triggered boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Trigger to log changes whenever verification_status updates
create or replace function public.log_technician_status_change()
returns trigger as $$
begin
  if (old.verification_status is distinct from new.verification_status) then
    insert into public.technician_status_logs (
      technician_id, 
      technician_email,
      technician_name,
      old_status, 
      new_status
    )
    values (
      new.id, 
      new.email,
      new.full_name,
      old.verification_status, 
      new.verification_status
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_technician_verification_update
  after update on public.profiles
  for each row execute procedure public.log_technician_status_change();

-- =========================================================
-- 9. VIEWS (Helper Tables)
-- =========================================================
create or replace view public.technicians as
select * from public.profiles 
where role = 'TECHNICIAN';

-- =========================================================
-- 10. AUTH HOOK (Handle New User Signups)
-- =========================================================
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  v_role text;
  v_verification_status text;
begin
  -- Extract role from metadata, default to CITIZEN
  v_role := coalesce(new.raw_user_meta_data->>'role', 'CITIZEN');
  
  -- Determine Verification Status
  if (v_role = 'TECHNICIAN') then
    v_verification_status := 'PENDING';
  else
    v_verification_status := 'VERIFIED';
  end if;

  insert into public.profiles (
    id, 
    email, 
    full_name, 
    emirates_id, 
    emirate, 
    phone, 
    residential_address,
    role, 
    specialty,
    experience_years,
    verification_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'emirates_id', ''),
    coalesce(new.raw_user_meta_data->>'emirate', 'Dubai'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'residential_address', ''),
    v_role,
    coalesce(new.raw_user_meta_data->>'specialty', ''),
    cast(coalesce(new.raw_user_meta_data->>'experience', '0') as integer),
    v_verification_status
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();