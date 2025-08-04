import { getSupabaseClient } from '../supabaseClient';

export class DeletedFilesService {
  constructor() {
    this.supabase = null;
  }

  getSupabase() {
    if (!this.supabase) {
      this.supabase = getSupabaseClient();
    }
    return this.supabase;
  }

  // Add file to deleted files (trash)
  async addToDeletedFiles(fileName, fileType, filePath = '', fileMetadata = {}) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('add_to_deleted_files', {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath,
        p_file_metadata: fileMetadata
      });

      if (error) throw error;
      return { success: true, id: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user's deleted files
  async getUserDeletedFiles() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', deletedFiles: [] };
      }

      const { data, error } = await supabase.rpc('get_user_deleted_files');
      
      if (error) throw error;
      return { success: true, deletedFiles: data || [] };
    } catch (error) {
      return { success: false, error: error.message, deletedFiles: [] };
    }
  }

  // Restore file from deleted files (remove from trash)
  async restoreFromDeletedFiles(fileName, fileType, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('restore_from_deleted_files', {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, restored: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Permanently delete file from deleted files
  async permanentlyDeleteFromTrash(fileName, fileType, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('permanently_delete_from_trash', {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, deleted: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if file is in trash
  async isFileInTrash(fileName, fileType, filePath = '') {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available', isInTrash: false };
      }

      const { data, error } = await supabase.rpc('is_file_in_trash', {
        p_file_name: fileName,
        p_file_type: fileType,
        p_file_path: filePath
      });

      if (error) throw error;
      return { success: true, isInTrash: data };
    } catch (error) {
      return { success: false, error: error.message, isInTrash: false };
    }
  }

  // Bulk delete multiple files from trash
  async bulkDeleteFromTrash(fileNames, fileTypes, filePaths = null) {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('bulk_delete_from_trash', {
        p_file_names: fileNames,
        p_file_types: fileTypes,
        p_file_paths: filePaths
      });

      if (error) throw error;
      return { success: true, deletedCount: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Clean up expired deleted files
  async cleanupExpiredDeletedFiles() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.rpc('cleanup_expired_deleted_files');
      
      if (error) throw error;
      return { success: true, cleanedCount: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Migrate from localStorage to database
  async migrateFromLocalStorage() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
      }

      // Get deleted files from localStorage
      const savedDeletedFiles = localStorage.getItem('fileManagerDeletedFiles');
      if (!savedDeletedFiles) {
        return { success: true, message: 'No deleted files to migrate' };
      }

      const deletedFiles = JSON.parse(savedDeletedFiles);
      let migratedCount = 0;

      // Migrate each deleted file
      for (const deletedFile of deletedFiles) {
        const result = await this.addToDeletedFiles(
          deletedFile.name,
          deletedFile._type || 'supabase',
          deletedFile.originalPath || '',
          {
            size: deletedFile.size,
            type: deletedFile.type,
            url: deletedFile.url,
            thumbnails: deletedFile.thumbnails,
            deletedAt: deletedFile.deletedAt,
            expiresAt: deletedFile.expiresAt
          }
        );

        if (result.success) {
          migratedCount++;
        }
      }

      // Remove from localStorage after successful migration
      if (migratedCount > 0) {
        localStorage.removeItem('fileManagerDeletedFiles');
      }

      return { 
        success: true, 
        message: `Migrated ${migratedCount} deleted files to database`,
        migratedCount 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert database format to app format
  convertToAppFormat(dbDeletedFile) {
    return {
      id: dbDeletedFile.id,
      name: dbDeletedFile.file_name,
      _type: dbDeletedFile.file_type,
      originalPath: dbDeletedFile.file_path,
      deletedAt: dbDeletedFile.deleted_at,
      expiresAt: dbDeletedFile.expires_at,
      ...dbDeletedFile.file_metadata
    };
  }
}

// Create a singleton instance
export const deletedFilesService = new DeletedFilesService(); 