import { createClient } from '@supabase/supabase-js';

// Default Supabase configuration (can be overridden by user input)
const DEFAULT_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const DEFAULT_SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Create a default client instance (will be null if no env vars)
export const supabase = DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY 
  ? createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY)
  : null;

// Function to create a custom client with user-provided credentials
export function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    storage: {
      retryAttempts: 3
    }
  });
}

// Function to get client from localStorage or create default
export function getSupabaseClient() {
  const supabaseUrl = localStorage.getItem('supabaseUrl');
  const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');

  if (supabaseUrl && supabaseAnonKey) {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }

  return supabase;
} 