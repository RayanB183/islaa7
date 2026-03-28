-- =========================================================
-- ISLAA7 REJECTION EMAIL WORKFLOW SETUP
-- =========================================================

-- 1. ADD REJECTION REASON COLUMN
-- We add a column to the profiles table to store why a technician was rejected.
-- This allows the admin to provide feedback which n8n can include in the email.
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. CREATE/UPDATE LOGS TABLE
-- This table acts as a queue for n8n. n8n should listen for INSERT events here.
CREATE TABLE IF NOT EXISTS public.technician_status_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id uuid REFERENCES public.profiles(id) NOT NULL,
  technician_email text,
  technician_name text,
  old_status text,
  new_status text,
  rejection_reason text, -- Capture the reason here
  email_triggered boolean DEFAULT false, -- n8n can update this to true after sending
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now())
);

-- 3. CREATE TRIGGER FUNCTION
-- This function automatically runs whenever a profile is updated.
-- If the status changes (e.g., PENDING -> REJECTED), it creates a log entry.
CREATE OR REPLACE FUNCTION public.log_technician_status_change()
RETURNS trigger AS $$
BEGIN
  -- Check if the verification_status has changed
  IF (old.verification_status IS DISTINCT FROM new.verification_status) THEN
    INSERT INTO public.technician_status_logs (
      technician_id, 
      technician_email,
      technician_name,
      old_status, 
      new_status,
      rejection_reason
    )
    VALUES (
      new.id, 
      new.email,
      new.full_name,
      old.verification_status, 
      new.verification_status,
      new.rejection_reason -- Include the reason from the profile update
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APPLY TRIGGER
DROP TRIGGER IF EXISTS on_technician_verification_update ON public.profiles;

CREATE TRIGGER on_technician_verification_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.log_technician_status_change();

-- =========================================================
-- HOW TO USE (FOR ADMIN DASHBOARD)
-- =========================================================

-- When an Admin clicks "Reject" in the dashboard, execute this SQL:
/*
UPDATE public.profiles
SET 
  verification_status = 'REJECTED',
  rejection_reason = 'Passport copy was illegible. Please re-upload.'
WHERE id = 'TARGET_USER_UUID';
*/

-- =========================================================
-- HOW TO USE (FOR N8N)
-- =========================================================

-- Scenario A: n8n listens to Database Webhook (Real-time)
-- Trigger: On INSERT to public.technician_status_logs
-- Condition: new_status == 'REJECTED'
-- Action: Send Email using 'technician_email' and 'rejection_reason' fields.

-- Scenario B: n8n Polls Database (Batch)
/*
SELECT * FROM public.technician_status_logs
WHERE new_status = 'REJECTED' 
  AND email_triggered = false;
*/

-- After sending email, n8n should update the log to prevent duplicates:
/*
UPDATE public.technician_status_logs
SET email_triggered = true
WHERE id = 'LOG_ENTRY_UUID';
*/