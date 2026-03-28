-- =========================================================
-- N8N TRIGGER TABLE & LOGIC
-- Run this script in Supabase SQL Editor to enable the n8n workflow
-- =========================================================

-- 1. Create the Logs Table
-- n8n should be configured to listen to "INSERT" events on this table.
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

-- 2. Create the Trigger Function
-- This function captures the state change and inserts it into the logs table.
create or replace function public.log_technician_status_change()
returns trigger as $$
begin
  -- Only log if the verification status actually changed
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

-- 3. Attach the Trigger to the Profiles Table
drop trigger if exists on_technician_verification_update on public.profiles;

create trigger on_technician_verification_update
  after update on public.profiles
  for each row execute procedure public.log_technician_status_change();
