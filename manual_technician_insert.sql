-- =========================================================
-- SCRIPT TO MANUALLY ADD A TECHNICIAN
-- Run this in your Supabase SQL Editor
-- =========================================================

-- 1. Ensure password encryption extension is enabled
create extension if not exists pgcrypto;

-- 2. Insert the user directly into auth.users
--    The existing trigger 'on_auth_user_created' will automatically 
--    create the corresponding entry in the 'public.profiles' (and 'technicians' view)
--    with verification_status = 'PENDING'.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'manual_tech@uae.ae',                -- <--- EMAIL
  crypt('password123', gen_salt('bf')), -- <--- PASSWORD
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object(
    'role', 'TECHNICIAN',              -- <--- ROLE
    'full_name', 'Manual Tech User',   -- <--- NAME
    'specialty', 'APPLIANCE',          -- <--- SPECIALTY
    'experience', 5,
    'emirates_id', '784-0000-0000000-1'
  ),
  now(),
  now(),
  '',
  '',
  '',
  ''
);