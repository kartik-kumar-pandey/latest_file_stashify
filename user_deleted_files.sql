-- User Deleted Files Table
-- This table stores files that have been "deleted" (moved to trash) by users

CREATE TABLE IF NOT EXISTS user_deleted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'supabase', 'cloudinary', 'folder'
  file_path TEXT DEFAULT '',
  file_metadata JSONB DEFAULT '{}',
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_deleted_files_user_id ON user_deleted_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deleted_files_expires_at ON user_deleted_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_deleted_files_file_type ON user_deleted_files(file_type);

-- Enable Row Level Security
ALTER TABLE user_deleted_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own deleted files" ON user_deleted_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deleted files" ON user_deleted_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deleted files" ON user_deleted_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deleted files" ON user_deleted_files
  FOR DELETE USING (auth.uid() = user_id);

-- RPC Functions for managing deleted files

-- Add file to deleted files (trash)
CREATE OR REPLACE FUNCTION add_to_deleted_files(
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_path TEXT DEFAULT '',
  p_file_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_file_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert the deleted file
  INSERT INTO user_deleted_files (
    user_id,
    file_name,
    file_type,
    file_path,
    file_metadata
  ) VALUES (
    v_user_id,
    p_file_name,
    p_file_type,
    p_file_path,
    p_file_metadata
  ) RETURNING id INTO v_deleted_file_id;

  RETURN v_deleted_file_id;
END;
$$;

-- Get user's deleted files
CREATE OR REPLACE FUNCTION get_user_deleted_files()
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_path TEXT,
  file_metadata JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Return user's deleted files
  RETURN QUERY
  SELECT 
    uf.id,
    uf.file_name,
    uf.file_type,
    uf.file_path,
    uf.file_metadata,
    uf.deleted_at,
    uf.expires_at
  FROM user_deleted_files uf
  WHERE uf.user_id = v_user_id
  AND uf.expires_at > NOW()
  ORDER BY uf.deleted_at DESC;
END;
$$;

-- Restore file from deleted files (remove from trash)
CREATE OR REPLACE FUNCTION restore_from_deleted_files(
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Delete the file from deleted files
  DELETE FROM user_deleted_files
  WHERE user_id = v_user_id
  AND file_name = p_file_name
  AND file_type = p_file_type
  AND (file_path = p_file_path OR (file_path IS NULL AND p_file_path = ''));

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Permanently delete file from deleted files
CREATE OR REPLACE FUNCTION permanently_delete_from_trash(
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Delete the file from deleted files
  DELETE FROM user_deleted_files
  WHERE user_id = v_user_id
  AND file_name = p_file_name
  AND file_type = p_file_type
  AND (file_path = p_file_path OR (file_path IS NULL AND p_file_path = ''));

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Clean up expired deleted files
CREATE OR REPLACE FUNCTION cleanup_expired_deleted_files()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete expired files
  DELETE FROM user_deleted_files
  WHERE expires_at <= NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Check if file is in trash
CREATE OR REPLACE FUNCTION is_file_in_trash(
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if file exists in deleted files
  SELECT EXISTS(
    SELECT 1 FROM user_deleted_files
    WHERE user_id = v_user_id
    AND file_name = p_file_name
    AND file_type = p_file_type
    AND (file_path = p_file_path OR (file_path IS NULL AND p_file_path = ''))
    AND expires_at > NOW()
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Bulk delete multiple files from trash
CREATE OR REPLACE FUNCTION bulk_delete_from_trash(
  p_file_names TEXT[],
  p_file_types TEXT[],
  p_file_paths TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
  v_paths TEXT[];
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Use provided paths or default to empty strings
  IF p_file_paths IS NULL THEN
    v_paths := array_fill('', ARRAY[array_length(p_file_names, 1)]);
  ELSE
    v_paths := p_file_paths;
  END IF;

  -- Delete multiple files from deleted files
  DELETE FROM user_deleted_files
  WHERE user_id = v_user_id
  AND (
    SELECT EXISTS(
      SELECT 1 FROM unnest(p_file_names, p_file_types, v_paths) AS t(name, type, path)
      WHERE user_deleted_files.file_name = t.name
      AND user_deleted_files.file_type = t.type
      AND (user_deleted_files.file_path = t.path OR (user_deleted_files.file_path IS NULL AND t.path = ''))
    )
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_deleted_files TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 