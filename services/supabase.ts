import { createClient } from '@supabase/supabase-js';

// Read from environment variables (set in .env.local for dev, Vercel dashboard for prod).
// VITE_ prefix means Vite intentionally includes these in the browser bundle —
// Supabase anon keys are designed to be public; security is enforced via RLS policies.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
