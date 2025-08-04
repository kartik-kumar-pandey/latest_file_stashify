-- User Preferences Database Setup for FileStashify
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_favorites table for storing favorite files
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'supabase', 'cloudinary', 'folder'
  file_path TEXT DEFAULT '', -- folder path for the file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_name, file_path)
);

-- Create user_tags table for storing tag definitions
CREATE TABLE IF NOT EXISTS user_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#666666',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create file_tags table for storing file-tag relationships
CREATE TABLE IF NOT EXISTS file_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT DEFAULT '', -- folder path for the file
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_name, file_path, tag_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_file_name ON user_favorites(file_name);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_name ON user_tags(name);
CREATE INDEX IF NOT EXISTS idx_file_tags_user_id ON file_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_name ON file_tags(file_name);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_name ON file_tags(tag_name);

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for user_favorites table
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_tags table
CREATE POLICY "Users can view own tags" ON user_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON user_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON user_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON user_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for file_tags table
CREATE POLICY "Users can view own file tags" ON file_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own file tags" ON file_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own file tags" ON file_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_favorites TO authenticated;
GRANT ALL ON user_tags TO authenticated;
GRANT ALL ON file_tags TO authenticated;

-- Create functions for managing favorites and tags

-- Function to add a file to favorites
CREATE OR REPLACE FUNCTION add_to_favorites(
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  favorite_id UUID;
BEGIN
  INSERT INTO user_favorites (user_id, file_name, file_type, file_path)
  VALUES (auth.uid(), p_file_name, p_file_type, p_file_path)
  ON CONFLICT (user_id, file_name, file_path) DO NOTHING
  RETURNING id INTO favorite_id;
  
  RETURN favorite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a file from favorites
CREATE OR REPLACE FUNCTION remove_from_favorites(
  p_file_name TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_favorites 
  WHERE user_id = auth.uid() 
    AND file_name = p_file_name 
    AND file_path = p_file_path;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorite files
CREATE OR REPLACE FUNCTION get_user_favorites()
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uf.id,
    uf.file_name,
    uf.file_type,
    uf.file_path,
    uf.created_at
  FROM user_favorites uf
  WHERE uf.user_id = auth.uid()
  ORDER BY uf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a file is favorited
CREATE OR REPLACE FUNCTION is_file_favorited(
  p_file_name TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
  favorite_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO favorite_count
  FROM user_favorites
  WHERE user_id = auth.uid() 
    AND file_name = p_file_name 
    AND file_path = p_file_path;
  
  RETURN favorite_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new tag
CREATE OR REPLACE FUNCTION create_tag(
  p_name TEXT,
  p_color TEXT DEFAULT '#666666'
)
RETURNS UUID AS $$
DECLARE
  tag_id UUID;
BEGIN
  INSERT INTO user_tags (user_id, name, color)
  VALUES (auth.uid(), p_name, p_color)
  ON CONFLICT (user_id, name) DO UPDATE SET
    color = EXCLUDED.color
  RETURNING id INTO tag_id;
  
  RETURN tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a tag
CREATE OR REPLACE FUNCTION delete_tag(p_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First delete all file associations with this tag
  DELETE FROM file_tags 
  WHERE user_id = auth.uid() AND tag_name = p_name;
  
  -- Then delete the tag itself
  DELETE FROM user_tags 
  WHERE user_id = auth.uid() AND name = p_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's tags
CREATE OR REPLACE FUNCTION get_user_tags()
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ut.id,
    ut.name,
    ut.color,
    ut.created_at
  FROM user_tags ut
  WHERE ut.user_id = auth.uid()
  ORDER BY ut.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a tag to a file
CREATE OR REPLACE FUNCTION add_tag_to_file(
  p_file_name TEXT,
  p_tag_name TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  file_tag_id UUID;
BEGIN
  INSERT INTO file_tags (user_id, file_name, file_path, tag_name)
  VALUES (auth.uid(), p_file_name, p_file_path, p_tag_name)
  ON CONFLICT (user_id, file_name, file_path, tag_name) DO NOTHING
  RETURNING id INTO file_tag_id;
  
  RETURN file_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a tag from a file
CREATE OR REPLACE FUNCTION remove_tag_from_file(
  p_file_name TEXT,
  p_tag_name TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM file_tags 
  WHERE user_id = auth.uid() 
    AND file_name = p_file_name 
    AND file_path = p_file_path
    AND tag_name = p_tag_name;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tags for a specific file
CREATE OR REPLACE FUNCTION get_file_tags(
  p_file_name TEXT,
  p_file_path TEXT DEFAULT ''
)
RETURNS TABLE (
  tag_name TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.tag_name,
    ut.color
  FROM file_tags ft
  JOIN user_tags ut ON ft.user_id = ut.user_id AND ft.tag_name = ut.name
  WHERE ft.user_id = auth.uid() 
    AND ft.file_name = p_file_name 
    AND ft.file_path = p_file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all file tags for a user
CREATE OR REPLACE FUNCTION get_all_file_tags()
RETURNS TABLE (
  file_name TEXT,
  file_path TEXT,
  tag_name TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.file_name,
    ft.file_path,
    ft.tag_name,
    ut.color
  FROM file_tags ft
  JOIN user_tags ut ON ft.user_id = ut.user_id AND ft.tag_name = ut.name
  WHERE ft.user_id = auth.uid()
  ORDER BY ft.file_name, ft.tag_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for all functions
GRANT EXECUTE ON FUNCTION add_to_favorites(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_from_favorites(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites() TO authenticated;
GRANT EXECUTE ON FUNCTION is_file_favorited(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tag(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tag(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tags() TO authenticated;
GRANT EXECUTE ON FUNCTION add_tag_to_file(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_tag_from_file(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_file_tags(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_file_tags() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE user_favorites IS 'Stores user favorite files for persistence across sessions';
COMMENT ON TABLE user_tags IS 'Stores user-defined tags for organizing files';
COMMENT ON TABLE file_tags IS 'Stores relationships between files and tags';
COMMENT ON FUNCTION add_to_favorites(TEXT, TEXT, TEXT) IS 'Adds a file to user favorites';
COMMENT ON FUNCTION get_user_favorites() IS 'Returns all favorite files for the current user';
COMMENT ON FUNCTION create_tag(TEXT, TEXT) IS 'Creates a new tag for the current user';
COMMENT ON FUNCTION get_file_tags(TEXT, TEXT) IS 'Returns all tags for a specific file'; 