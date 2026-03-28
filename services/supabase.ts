import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tvlrbjvcpfsncsmuzpee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bHJianZjcGZzbmNzbXV6cGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTc0NTEsImV4cCI6MjA4NDY3MzQ1MX0.K02nhmnAvhfwq0skWaVCFCF0Ik5lylneTIz-29oM8A8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
