// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://oimqzyfmglyhljjuboek.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXF6eWZtZ2x5aGxqanVib2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwODY2ODMsImV4cCI6MjA2MTY2MjY4M30.xGFPrZDffG_oqfAzbGkIihoQPXoarIWHFF5h-rX_VSQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);