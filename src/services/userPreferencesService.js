import { getSupabaseClient } from '../supabaseClient';

export class UserPreferencesService {
  constructor() {
    // Don't initialize supabase at construction time
    this.supabase = null;
  }

  // Get the current Supabase client dynamically
  getSupabase() {
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    return this.supabase;
  }

  // Favorites Management
  async addToFavorites(fileName, fileType, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Try RPC first
      const { data, error } = await supabase.rpc('add_to_favorites', {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath
      });

      if (error) {
        // Fallback: direct insert
        const { data: insertData, error: insertError } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            file_name: fileName,
            file_type: fileType,
            file_path: filePath
          })
          .select();

        if (insertError) {
          throw insertError;
        }
        
        return { success: true, id: insertData[0]?.id };
      }

      return { success: true, id: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removeFromFavorites(fileName, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('remove_from_favorites', {
        p_file_name: fileName,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, removed: data };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserFavorites() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', favorites: [] };
      }

      const { data, error } = await supabase.rpc('get_user_favorites');
      
      if (error) {
        throw error;
      }
      
      return { success: true, favorites: data || [] };
    } catch (error) {
      return { success: false, error: error.message, favorites: [] };
    }
  }

  async isFileFavorited(fileName, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', isFavorited: false };
      }

      const { data, error } = await supabase.rpc('is_file_favorited', {
        p_file_name: fileName,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, isFavorited: data };
    } catch (error) {
      console.error('Error checking if file is favorited:', error);
      return { success: false, error: error.message, isFavorited: false };
    }
  }

  // Tags Management
  async createTag(name, color = '#666666') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('create_tag', {
        p_name: name,
        p_color: color
      });

      if (error) throw error;
      return { success: true, id: data };
    } catch (error) {
      console.error('Error creating tag:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTag(name) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('delete_tag', {
        p_name: name
      });

      if (error) throw error;
      return { success: true, deleted: data };
    } catch (error) {
      console.error('Error deleting tag:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTags() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', tags: [] };
      }

      const { data, error } = await supabase.rpc('get_user_tags');
      
      if (error) {
        throw error;
      }
      
      return { success: true, tags: data || [] };
    } catch (error) {
      return { success: false, error: error.message, tags: [] };
    }
  }

  async addTagToFile(fileName, tagName, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('add_tag_to_file', {
        p_file_name: fileName,
        p_tag_name: tagName,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, id: data };
    } catch (error) {
      console.error('Error adding tag to file:', error);
      return { success: false, error: error.message };
    }
  }

  async removeTagFromFile(fileName, tagName, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('remove_tag_from_file', {
        p_file_name: fileName,
        p_tag_name: tagName,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, removed: data };
    } catch (error) {
      console.error('Error removing tag from file:', error);
      return { success: false, error: error.message };
    }
  }

  async getFileTags(fileName, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', tags: [] };
      }

      const { data, error } = await supabase.rpc('get_file_tags', {
        p_file_name: fileName,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, tags: data || [] };
    } catch (error) {
      console.error('Error getting file tags:', error);
      return { success: false, error: error.message, tags: [] };
    }
  }

  async getAllFileTags() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', fileTags: [] };
      }

      const { data, error } = await supabase.rpc('get_all_file_tags');
      
      if (error) {
        throw error;
      }
      
      return { success: true, fileTags: data || [] };
    } catch (error) {
      return { success: false, error: error.message, fileTags: [] };
    }
  }

  // Migration helpers - to move data from localStorage to database
  async migrateFromLocalStorage() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      // Migrate favorites
      const savedFavorites = localStorage.getItem('fileManagerFavorites');
      if (savedFavorites) {
        const favorites = JSON.parse(savedFavorites);
        for (const favorite of favorites) {
          await this.addToFavorites(
            favorite.name, 
            favorite._type || 'supabase', 
            favorite.originalPath || ''
          );
        }
        localStorage.removeItem('fileManagerFavorites');
      }

      // Migrate tags
      const savedTags = localStorage.getItem('fileManagerTags');
      if (savedTags) {
        const tags = JSON.parse(savedTags);
        for (const tag of tags) {
          await this.createTag(tag.name, tag.color);
        }
        localStorage.removeItem('fileManagerTags');
      }

      // Migrate file tags
      const savedFileTags = localStorage.getItem('fileManagerFileTags');
      if (savedFileTags) {
        const fileTags = JSON.parse(savedFileTags);
        for (const [fileName, tags] of Object.entries(fileTags)) {
          for (const tag of tags) {
            await this.addTagToFile(fileName, tag);
          }
        }
        localStorage.removeItem('fileManagerFileTags');
      }

      return { success: true, message: 'Migration completed successfully' };
    } catch (error) {
      console.error('Error during migration:', error);
      return { success: false, error: error.message };
    }
  }

  // Load all user preferences
  async loadUserPreferences() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const [favoritesResult, tagsResult, fileTagsResult] = await Promise.all([
        this.getUserFavorites(),
        this.getUserTags(),
        this.getAllFileTags()
      ]);

      return {
        success: true,
        favorites: favoritesResult.favorites || [],
        tags: tagsResult.tags || [],
        fileTags: this.convertFileTagsToObject(fileTagsResult.fileTags || [])
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper function to convert file tags array to object format
  convertFileTagsToObject(fileTagsArray) {
    const fileTagsObject = {};
    fileTagsArray.forEach(item => {
      const key = item.file_path ? `${item.file_path}/${item.file_name}` : item.file_name;
      if (!fileTagsObject[key]) {
        fileTagsObject[key] = [];
      }
      fileTagsObject[key].push(item.tag_name);
    });
    return fileTagsObject;
  }
}

// Create a singleton instance
export const userPreferencesService = new UserPreferencesService(); 