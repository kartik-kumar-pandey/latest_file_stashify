import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  return createClient(supabaseUrl, supabaseAnonKey);
} 