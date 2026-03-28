-- ============================================================
-- MANUAL TEST FLOW FOR N8N EMAIL TRIGGER
-- ============================================================

-- STEP 1: Create a Dummy Technician (Simulates Signup)
-- This will automatically create a profile with verification_status = 'PENDING'
-- via the 'handle_new_user' trigger.

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'n8n_test_tech@islaa7.ae',           -- <--- CHANGE EMAIL IF RUNNING MULTIPLE TIMES
    crypt('password123', gen_salt('bf')),
    now(),
    jsonb_build_object(
      'role', 'TECHNICIAN',
      'full_name', 'N8N Test Technician',
      'specialty', 'ELECTRONICS',
      'experience', 5,
      'emirates_id', '784-1234-1234567-1'
    ),
    now(),
    now()
  );
END $$;

-- ============================================================
-- PAUSE HERE IF YOU WANT TO SEE THEM AS "PENDING" FIRST
-- ============================================================

-- STEP 2: Approve the Technician (Simulates Admin Button)
-- This UPDATE action will fire the 'log_technician_status_change' trigger
-- and insert a row into 'technician_status_logs' for n8n to pick up.

UPDATE public.profiles
SET verification_status = 'VERIFIED'
WHERE email = 'n8n_test_tech@islaa7.ae'; -- Ensure this matches email above

-- ============================================================
-- STEP 3: Verify the Log
-- Run this query to see if the row was created for n8n
-- ============================================================

SELECT * FROM public.technician_status_logs 
ORDER BY created_at DESC 
LIMIT 5;