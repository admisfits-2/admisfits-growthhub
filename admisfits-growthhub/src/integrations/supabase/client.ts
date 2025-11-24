import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lpuqcvnyzvnrsiyhwoxs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdXFjdm55enZucnNpeWh3b3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNjYwOTIsImV4cCI6MjA2OTg0MjA5Mn0.RAo-x8nCAIr6p7Tn_OodaO3Jc-b3rMbZYry_OtpxKd0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});