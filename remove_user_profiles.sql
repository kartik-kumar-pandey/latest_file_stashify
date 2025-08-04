-- Remove User Profiles Table and Dependencies
-- Run this SQL in your Supabase SQL Editor to clean up the user_profiles setup

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop the user profile functions
DROP FUNCTION IF EXISTS get_user_profile();
DROP FUNCTION IF EXISTS upsert_user_profile(TEXT, TEXT, TEXT, TEXT);

-- Drop the user_profiles table
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Clean up any remaining references
DROP INDEX IF EXISTS idx_user_profiles_user_id;

-- Verify cleanup
SELECT 'User profiles table and dependencies removed successfully' as status; 