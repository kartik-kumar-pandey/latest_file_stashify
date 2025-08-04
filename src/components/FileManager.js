import React, { useRef, useEffect, useState } from 'react';
import { userPreferencesService } from '../services/userPreferencesService';
import { deletedFilesService } from '../services/deletedFilesService';

function FileManager({ supabase, bucketName, onUserEmail, userInfo, session, setSession, darkMode, setDarkMode, searchQuery }) {
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [currentView, setCurrentView] = React.useState('all-files');
  const [favorites, setFavorites] = React.useState([]);
  const [enhancedFavorites, setEnhancedFavorites] = React.useState([]);
  const [sharedFiles, setSharedFiles] = React.useState(() => {
    // Load shared files from localStorage on component mount
    const savedSharedFiles = localStorage.getItem('fileManagerSharedFiles');
    return savedSharedFiles ? JSON.parse(savedSharedFiles) : [];
  });
  const [deletedFiles, setDeletedFiles] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [fileTags, setFileTags] = React.useState({});
  const [tagModal, setTagModal] = React.useState({ open: false, file: null, mode: 'add' });
  const [newTagName, setNewTagName] = React.useState('');
  const [newTagColor, setNewTagColor] = React.useState('#666666');
  const [tagSearch, setTagSearch] = React.useState('');
  const [tagSortBy, setTagSortBy] = React.useState('name'); // 'name', 'count', 'date'
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [selectedDeletedFiles, setSelectedDeletedFiles] = React.useState([]);
  const [bulkTagModal, setBulkTagModal] = React.useState({ open: false, tag: null });
  const [tagTemplateModal, setTagTemplateModal] = React.useState({ open: false });
  const [viewingTag, setViewingTag] = React.useState(null);
  const [userSectionOpen, setUserSectionOpen] = React.useState(false);
  const [allFilesForSearch, setAllFilesForSearch] = React.useState([]);
  const [folder, setFolder] = React.useState('');
  const [newFolderName, setNewFolderName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewFileUrl, setViewFileUrl] = useState('');
  const [viewFileName, setViewFileName] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const fileInputRef = useRef();
  const [renameFileMode, setRenameFileMode] = useState(false);
  const [renameFileOldName, setRenameFileOldName] = useState('');
  const [renameFileNewName, setRenameFileNewName] = useState('');
  const [renameFolderMode, setRenameFolderMode] = useState(false);
  const [renameFolderOldName, setRenameFolderOldName] = useState('');
  const [renameFolderNewName, setRenameFolderNewName] = useState('');
  const renameInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [moveItem, setMoveItem] = useState(null);
  const [moveDest, setMoveDest] = useState('');
  const [allFolders, setAllFolders] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [dragOverGrid, setDragOverGrid] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [goBackDragOver, setGoBackDragOver] = useState(false);
  const [cloudyfyFiles, setCloudyfyFiles] = useState([]);
  const [cloudyfyModalOpen, setCloudyfyModalOpen] = useState(false);
  const [cloudName, setCloudName] = useState(localStorage.getItem('cloudyfyCloudName') || '');
  const [uploadPreset, setUploadPreset] = useState(localStorage.getItem('cloudyfyUploadPreset') || '');
  const [cloudyfyMsg, setCloudyfyMsg] = useState('');
  const [cloudModal, setCloudModal] = useState({ type: null, file: null });
  const [cloudModalValue, setCloudModalValue] = useState('');
  const [shareModalUrl, setShareModalUrl] = useState('');
  const [shareModalCopied, setShareModalCopied] = useState(false);
  const [cloudPreviewOpen, setCloudPreviewOpen] = useState(false);
  const [cloudPreviewUrl, setCloudPreviewUrl] = useState('');
  const [cloudPreviewType, setCloudPreviewType] = useState('');
  const [cloudPreviewName, setCloudPreviewName] = useState('');
  const [supabaseDeleteModal, setSupabaseDeleteModal] = useState({ open: false, file: null });
  const [folderInfoModal, setFolderInfoModal] = useState({ open: false, folder: null });

  const [shareModalType, setShareModalType] = useState(null);

  React.useEffect(() => {
    if (!supabase) return;

    // Clean up expired files on component mount
    cleanupExpiredFiles();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFiles(session);
        loadUserPreferences();
        loadDeletedFiles();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchFiles(session);
        loadUserPreferences();
        loadDeletedFiles();
      } else {
        setFiles([]);
        setFavorites([]);
        setTags([]);
        setFileTags({});
        setEnhancedFavorites([]);
        setDeletedFiles([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, folder, setSession]);

  // Load user preferences from database
  async function loadUserPreferences() {
    try {
      const result = await userPreferencesService.loadUserPreferences();
      
      if (result.success) {
        setFavorites(result.favorites);
        setTags(result.tags);
        setFileTags(result.fileTags);
        
        // Migrate from localStorage if needed (only once)
        const hasMigrated = localStorage.getItem('userPreferencesMigrated');
        if (!hasMigrated) {
          await userPreferencesService.migrateFromLocalStorage();
          localStorage.setItem('userPreferencesMigrated', 'true');
        }

        // Load enhanced favorites with file details
        await loadEnhancedFavorites(result.favorites);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  // Load deleted files from database
  async function loadDeletedFiles() {
    try {
      const result = await deletedFilesService.getUserDeletedFiles();
      
      if (result.success) {
        const convertedFiles = result.deletedFiles.map(dbFile => 
          deletedFilesService.convertToAppFormat(dbFile)
        );
        setDeletedFiles(convertedFiles);
        
        // Migrate from localStorage if needed (only once)
        const hasMigrated = localStorage.getItem('deletedFilesMigrated');
        if (!hasMigrated) {
          const migrationResult = await deletedFilesService.migrateFromLocalStorage();
          if (migrationResult.success && migrationResult.migratedCount > 0) {
            // Reload deleted files after migration
            const reloadResult = await deletedFilesService.getUserDeletedFiles();
            if (reloadResult.success) {
              const reloadedFiles = reloadResult.deletedFiles.map(dbFile => 
                deletedFilesService.convertToAppFormat(dbFile)
              );
              setDeletedFiles(reloadedFiles);
            }
          }
          localStorage.setItem('deletedFilesMigrated', 'true');
        }
      }
    } catch (error) {
      console.error('Error loading deleted files:', error);
    }
  }

  // Function to load enhanced favorites with file details
  async function loadEnhancedFavorites(favoritesList) {
    try {
      const enhanced = await Promise.all(
        favoritesList.map(async (favorite) => {
          return await getFileDetailsForFavorite(favorite);
        })
      );
      setEnhancedFavorites(enhanced);
    } catch (error) {
      console.error('Error loading enhanced favorites:', error);
      // Fallback to basic favorites
      setEnhancedFavorites(favoritesList.map(f => ({
        name: f.file_name,
        _type: f.file_type,
        originalPath: f.file_path,
        id: f.id
      })));
    }
  }

  // Function to get file details for favorites display
  async function getFileDetailsForFavorite(favoriteItem) {
    try {
      if (favoriteItem.file_type === 'supabase') {
        // Get file from Supabase storage
        const { data, error } = await supabase.storage
          .from(bucketName)
          .list(favoriteItem.file_path, {
            search: favoriteItem.file_name
          });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const file = data[0];
          return {
            name: file.name,
            _type: 'supabase',
            originalPath: favoriteItem.file_path,
            size: file.metadata?.size,
            updated_at: file.updated_at,
            created_at: file.created_at,
            id: favoriteItem.id
          };
        }
      } else if (favoriteItem.file_type === 'cloudinary') {
        // Get file from Cloudinary table
        const { data, error } = await supabase
          .from('cloudinary_files')
          .select('*')
          .eq('name', favoriteItem.file_name)
          .single();
        
        if (error) throw error;
        
        if (data) {
          return {
            name: data.name,
            _type: 'cloudinary',
            url: data.url,
            type: data.type,
            originalPath: favoriteItem.file_path,
            id: favoriteItem.id
          };
        }
      }
      
      // Fallback to basic info
      return {
        name: favoriteItem.file_name,
        _type: favoriteItem.file_type,
        originalPath: favoriteItem.file_path,
        id: favoriteItem.id
      };
    } catch (error) {
      console.error('Error getting file details for favorite:', error);
      // Return basic info as fallback
      return {
        name: favoriteItem.file_name,
        _type: favoriteItem.file_type,
        originalPath: favoriteItem.file_path,
        id: favoriteItem.id
      };
    }
  }

  React.useEffect(() => {
    if (!session && typeof onUserEmail === 'function') {
      onUserEmail('');
    } else if (session && session.user && onUserEmail) {
      onUserEmail(session.user.email);
    }
  }, [session, onUserEmail]);

  // Populate all files for search when files change
  React.useEffect(() => {
    if (files.length > 0 || cloudyfyFiles.length > 0) {
      populateSearchFiles();
    }
  }, [files, cloudyfyFiles]);

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
    setSession(null);
    setFiles([]);
    if (typeof onUserEmail === 'function') onUserEmail('');
  }

  // Navigation functions
  function navigateToView(view) {
    setCurrentView(view);
    // Clear tag filter when navigating to other views
    if (view !== 'all-files') {
      setViewingTag(null);
    }
  }

  function getRecentFiles() {
    // Get files sorted by last modified date (most recent first)
    const allFiles = [...files, ...cloudyfyFiles];
    return allFiles
      .sort((a, b) => {
        const dateA = a.updated_at || a.created_at || new Date(0);
        const dateB = b.updated_at || b.created_at || new Date(0);
        return new Date(dateB) - new Date(dateA);
      })
      .slice(0, 20); // Show last 20 files
  }

  async function toggleFavorite(file) {
    try {
      const fileType = file._type || 'supabase';
      const filePath = file.originalPath || folder;
      
      const isCurrentlyFavorited = favorites.some(f => 
        f.file_name === file.name && f.file_path === filePath
      );

      if (isCurrentlyFavorited) {
        // Remove from favorites
        const result = await userPreferencesService.removeFromFavorites(file.name, filePath);
        if (result.success) {
          setFavorites(prev => prev.filter(f => 
            !(f.file_name === file.name && f.file_path === filePath)
          ));
          // Also remove from enhanced favorites
          setEnhancedFavorites(prev => prev.filter(f => 
            !(f.name === file.name && f.originalPath === filePath)
          ));
        }
      } else {
        // Add to favorites
        const result = await userPreferencesService.addToFavorites(file.name, fileType, filePath);
        if (result.success) {
          const newFavorite = {
            id: result.id,
            file_name: file.name,
            file_type: fileType,
            file_path: filePath,
            created_at: new Date().toISOString()
          };
          setFavorites(prev => [...prev, newFavorite]);
          
          // Also add to enhanced favorites
          const enhancedItem = {
            name: file.name,
            _type: fileType,
            originalPath: filePath,
            id: result.id,
            ...file // Include all file properties for proper display
          };
          setEnhancedFavorites(prev => [...prev, enhancedItem]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  function getSharedFiles() {
    // Return files that have been shared (have share links)
    return sharedFiles;
  }

  function addToSharedFiles(file, shareUrl, expirySeconds) {
    const sharedFile = {
      ...file,
      shareUrl: shareUrl,
      sharedAt: new Date().toISOString(),
      expiresAt: expirySeconds === 'lifetime' ? null : new Date(Date.now() + expirySeconds * 1000).toISOString(),
      expirySeconds: expirySeconds
    };
    
    setSharedFiles(prev => {
      const newSharedFiles = [...prev, sharedFile];
      localStorage.setItem('fileManagerSharedFiles', JSON.stringify(newSharedFiles));
      return newSharedFiles;
    });
  }

  function removeFromSharedFiles(fileName) {
    setSharedFiles(prev => {
      const newSharedFiles = prev.filter(f => f.name !== fileName);
      localStorage.setItem('fileManagerSharedFiles', JSON.stringify(newSharedFiles));
      return newSharedFiles;
    });
  }

  function isFileShared(fileName) {
    return sharedFiles.some(f => f.name === fileName);
  }

  function getDeletedFiles() {
    // Return files that have been "deleted" (moved to trash)
    return deletedFiles;
  }

  async function moveToTrash(file) {
    try {
      const fileMetadata = {
        size: file.size,
        type: file.type,
        url: file.url,
        thumbnails: file.thumbnails,
        id: file.id
      };

      const result = await deletedFilesService.addToDeletedFiles(
        file.name,
        file._type || 'supabase',
        folder || '',
        fileMetadata
      );

      if (result.success) {
        const deletedFile = {
          ...file,
          id: result.id,
          deletedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          originalPath: folder || ''
        };
        
        setDeletedFiles(prev => [...prev, deletedFile]);
        
        // Remove the file/folder from the current view
        if (file._type === 'supabase' || (!file._type && !file.name.endsWith('/'))) {
          setFiles(prev => prev.filter(f => f.name !== file.name));
        } else if (file._type === 'cloudinary') {
          setCloudyfyFiles(prev => prev.filter(f => f.name !== file.name));
        } else if (file._type === 'folder' || file.name.endsWith('/')) {
          // Remove folder from files array (folders have id === null)
          setFiles(prev => prev.filter(f => f.name !== file.name));
        }
      }
    } catch (error) {
      console.error('Error moving file to trash:', error);
    }
  }

  async function restoreFromTrash(deletedFile) {
    try {
      const result = await deletedFilesService.restoreFromDeletedFiles(
        deletedFile.name,
        deletedFile._type || 'supabase',
        deletedFile.originalPath || ''
      );

      if (result.success) {
        setDeletedFiles(prev => {
          return prev.filter(f => 
            (f._type === 'cloudinary' ? f.url : f.name) !== (deletedFile._type === 'cloudinary' ? deletedFile.url : deletedFile.name)
          );
        });
        
        // Add the file/folder back to the appropriate array
        if (deletedFile._type === 'supabase' || (!deletedFile._type && !deletedFile.name.endsWith('/'))) {
          setFiles(prev => [...prev, { ...deletedFile, _type: 'supabase' }]);
        } else if (deletedFile._type === 'cloudinary') {
          setCloudyfyFiles(prev => [...prev, { ...deletedFile, _type: 'cloudinary' }]);
        } else if (deletedFile._type === 'folder' || deletedFile.name.endsWith('/')) {
          // Add folder back to files array (folders have id === null)
          setFiles(prev => [...prev, { ...deletedFile, id: null }]);
        }
        
        // Refresh the file lists to ensure everything is in sync
        if (session) {
          fetchFiles(session);
        }
      }
    } catch (error) {
      console.error('Error restoring file from trash:', error);
    }
  }

  async function permanentlyDelete(deletedFile) {
    try {
      const result = await deletedFilesService.permanentlyDeleteFromTrash(
        deletedFile.name,
        deletedFile._type || 'supabase',
        deletedFile.originalPath || ''
      );

      if (result.success) {
        setDeletedFiles(prev => {
          return prev.filter(f => 
            (f._type === 'cloudinary' ? f.url : f.name) !== (deletedFile._type === 'cloudinary' ? deletedFile.url : deletedFile.name)
          );
        });
        
        // Actually delete the file/folder from storage
        if (deletedFile._type === 'supabase') {
          // For Supabase files, we need to actually delete from storage
          const filePath = (deletedFile.originalPath ? deletedFile.originalPath + '/' : '') + deletedFile.name;
          supabase.storage.from(bucketName).remove([filePath]);
        } else if (deletedFile._type === 'cloudinary') {
          // Delete from Cloudinary metadata
          if (deletedFile.id) {
            supabase
              .from('cloudinary_files')
              .delete()
              .eq('id', deletedFile.id);
          }
        } else if (deletedFile._type === 'folder' || deletedFile.name.endsWith('/')) {
          // For folders, we need to delete all contents and the folder itself
          const folderPath = (deletedFile.originalPath ? deletedFile.originalPath + '/' : '') + deletedFile.name;
          const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/';
          
          // List all files in the folder and delete them
          supabase.storage.from(bucketName).list(prefix, { limit: 1000 }).then(({ data: filesToDelete, error: listError }) => {
            if (!listError && filesToDelete) {
              const pathsToDelete = filesToDelete.map(f => prefix + f.name);
              if (pathsToDelete.length > 0) {
                supabase.storage.from(bucketName).remove(pathsToDelete);
              }
            }
          });
          
          // Also delete any Cloudinary files that were in this folder
          supabase
            .from('cloudinary_files')
            .delete()
            .eq('folder', folderPath);
        }
        
        // Refresh the file lists to ensure everything is in sync
        if (session) {
          fetchFiles(session);
        }
      }
    } catch (error) {
      console.error('Error permanently deleting file:', error);
    }
  }

  async function cleanupExpiredFiles() {
    try {
      const result = await deletedFilesService.cleanupExpiredDeletedFiles();
      if (result.success && result.cleanedCount > 0) {
        // Reload deleted files after cleanup
        const reloadResult = await deletedFilesService.getUserDeletedFiles();
        if (reloadResult.success) {
          const reloadedFiles = reloadResult.deletedFiles.map(dbFile => 
            deletedFilesService.convertToAppFormat(dbFile)
          );
          setDeletedFiles(reloadedFiles);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired files:', error);
    }
  }

  function isFileInTrash(fileName, fileType = 'supabase') {
    return deletedFiles.some(deletedFile => {
      if (fileType === 'cloudinary') {
        return deletedFile.name === fileName && deletedFile._type === 'cloudinary';
      } else if (fileType === 'folder' || fileName.endsWith('/')) {
        return deletedFile.name === fileName && (deletedFile._type === 'folder' || deletedFile.name.endsWith('/'));
      }
      return deletedFile.name === fileName && (deletedFile._type === 'supabase' || !deletedFile._type);
    });
  }

  function getFilesByTag(tag) {
    // Return files that have the specified tag
    const filesWithTag = [];
    
    // Check Supabase files
    files.forEach(file => {
      if (fileTags[file.name] && fileTags[file.name].includes(tag)) {
        filesWithTag.push({ ...file, _type: 'supabase' });
      }
    });
    
    // Check Cloudinary files
    cloudyfyFiles.forEach(file => {
      if (fileTags[file.name] && fileTags[file.name].includes(tag)) {
        filesWithTag.push({ ...file, _type: 'cloudinary' });
      }
    });
    
    return filesWithTag;
  }

  async function addTag(tagName, tagColor = '#666666') {
    try {
      const result = await userPreferencesService.createTag(tagName, tagColor);
      if (result.success) {
        const newTag = { 
          id: result.id, 
          name: tagName, 
          color: tagColor, 
          created_at: new Date().toISOString() 
        };
        setTags(prev => [...prev, newTag]);
        return newTag;
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  }

  async function removeTag(tagName) {
    try {
      const result = await userPreferencesService.deleteTag(tagName);
      if (result.success) {
        setTags(prev => prev.filter(tag => tag.name !== tagName));
        
        // Remove tag from all files in state
        setFileTags(prev => {
          const newFileTags = { ...prev };
          Object.keys(newFileTags).forEach(fileName => {
            newFileTags[fileName] = newFileTags[fileName].filter(tag => tag !== tagName);
            if (newFileTags[fileName].length === 0) {
              delete newFileTags[fileName];
            }
          });
          return newFileTags;
        });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  }

  async function addTagToFile(fileName, tagName) {
    try {
      const filePath = folder;
      const result = await userPreferencesService.addTagToFile(fileName, tagName, filePath);
      if (result.success) {
        setFileTags(prev => {
          const newFileTags = { ...prev };
          const key = filePath ? `${filePath}/${fileName}` : fileName;
          if (!newFileTags[key]) {
            newFileTags[key] = [];
          }
          if (!newFileTags[key].includes(tagName)) {
            newFileTags[key] = [...newFileTags[key], tagName];
          }
          return newFileTags;
        });
      }
    } catch (error) {
      console.error('Error adding tag to file:', error);
    }
  }

  async function removeTagFromFile(fileName, tagName) {
    try {
      const filePath = folder;
      const result = await userPreferencesService.removeTagFromFile(fileName, tagName, filePath);
      if (result.success) {
        setFileTags(prev => {
          const newFileTags = { ...prev };
          const key = filePath ? `${filePath}/${fileName}` : fileName;
          if (newFileTags[key]) {
            newFileTags[key] = newFileTags[key].filter(tag => tag !== tagName);
            if (newFileTags[key].length === 0) {
              delete newFileTags[key];
            }
          }
          return newFileTags;
        });
      }
    } catch (error) {
      console.error('Error removing tag from file:', error);
    }
  }

  function getFileTags(fileName) {
    const filePath = folder;
    const key = filePath ? `${filePath}/${fileName}` : fileName;
    return fileTags[key] || [];
  }

  function openTagModal(file, mode = 'add') {
    setTagModal({ open: true, file, mode });
    setNewTagName('');
    setNewTagColor('#666666');
  }

  function closeTagModal() {
    setTagModal({ open: false, file: null, mode: 'add' });
    setNewTagName('');
    setNewTagColor('#666666');
  }

  // Tag templates for quick setup
  const tagTemplates = {
    'Project Management': [
      { name: 'In Progress', color: '#ffc107' },
      { name: 'Completed', color: '#28a745' },
      { name: 'Review', color: '#17a2b8' },
      { name: 'Blocked', color: '#dc3545' },
      { name: 'Urgent', color: '#fd7e14' }
    ],
    'File Organization': [
      { name: 'Important', color: '#dc3545' },
      { name: 'Archive', color: '#6c757d' },
      { name: 'Draft', color: '#ffc107' },
      { name: 'Final', color: '#28a745' },
      { name: 'Reference', color: '#17a2b8' }
    ],
    'Content Types': [
      { name: 'Document', color: '#007bff' },
      { name: 'Image', color: '#e83e8c' },
      { name: 'Video', color: '#6f42c1' },
      { name: 'Audio', color: '#fd7e14' },
      { name: 'Code', color: '#20c997' }
    ]
  };

  function applyTagTemplate(templateName) {
    const template = tagTemplates[templateName];
    if (template) {
      template.forEach(tag => {
        if (!tags.find(t => t.name === tag.name)) {
          addTag(tag.name, tag.color);
        }
      });
      setTagTemplateModal({ open: false });
    }
  }

  function bulkAddTag(tagName) {
    selectedFiles.forEach(file => {
      if (!getFileTags(file.name).includes(tagName)) {
        addTagToFile(file.name, tagName);
      }
    });
    setSelectedFiles([]);
    setBulkTagModal({ open: false, tag: null });
  }

  function bulkRemoveTag(tagName) {
    selectedFiles.forEach(file => {
      if (getFileTags(file.name).includes(tagName)) {
        removeTagFromFile(file.name, tagName);
      }
    });
    setSelectedFiles([]);
    setBulkTagModal({ open: false, tag: null });
  }

  function toggleFileSelection(file) {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.name === file.name && f._type === file._type);
      if (isSelected) {
        return prev.filter(f => !(f.name === file.name && f._type === file._type));
      } else {
        return [...prev, file];
      }
    });
  }

  function clearFileSelection() {
    setSelectedFiles([]);
  }

  function toggleDeletedFileSelection(deletedFile) {
    setSelectedDeletedFiles(prev => {
      const fileKey = deletedFile._type === 'cloudinary' ? deletedFile.url : deletedFile.name;
      const isSelected = prev.some(f => 
        (f._type === 'cloudinary' ? f.url : f.name) === fileKey
      );
      
      if (isSelected) {
        return prev.filter(f => 
          (f._type === 'cloudinary' ? f.url : f.name) !== fileKey
        );
      } else {
        return [...prev, deletedFile];
      }
    });
  }

  function selectAllDeletedFiles() {
    setSelectedDeletedFiles(getDeletedFiles());
  }

  function clearDeletedFileSelection() {
    setSelectedDeletedFiles([]);
  }

  async function bulkDeleteFromTrash() {
    if (selectedDeletedFiles.length === 0) return;
    
    try {
      const fileNames = selectedDeletedFiles.map(f => f.name);
      const fileTypes = selectedDeletedFiles.map(f => f._type || 'supabase');
      const filePaths = selectedDeletedFiles.map(f => f.originalPath || '');
      
      const result = await deletedFilesService.bulkDeleteFromTrash(fileNames, fileTypes, filePaths);
      
      if (result.success) {
        // Remove from local state
        setDeletedFiles(prev => {
          return prev.filter(f => 
            !selectedDeletedFiles.some(selected => 
              (selected._type === 'cloudinary' ? selected.url : selected.name) === (f._type === 'cloudinary' ? f.url : f.name)
            )
          );
        });
        
        // Actually delete files from storage
        selectedDeletedFiles.forEach(deletedFile => {
          if (deletedFile._type === 'supabase') {
            const filePath = (deletedFile.originalPath ? deletedFile.originalPath + '/' : '') + deletedFile.name;
            supabase.storage.from(bucketName).remove([filePath]);
          } else if (deletedFile._type === 'cloudinary' && deletedFile.id) {
            supabase.from('cloudinary_files').delete().eq('id', deletedFile.id);
          }
        });
        
        setSelectedDeletedFiles([]);
      }
    } catch (error) {
      console.error('Error bulk deleting from trash:', error);
    }
  }

  // Get all folders from all locations for global search
  function getAllFolders() {
    return files.filter(f => f.id === null).map(f => ({ ...f, _type: 'folder' }));
  }

  // Recursively get all files from all folders for global search
  async function getAllFilesRecursively() {
    const allFiles = [];
    
    // Get all files from the current folder structure (root level)
    const currentFiles = files.filter(f => f.id !== null).map(f => ({ ...f, _type: 'supabase' }));
    const currentCloudFiles = cloudyfyFiles.map(f => ({ ...f, _type: 'cloudinary' }));
    
    allFiles.push(...currentFiles, ...currentCloudFiles);
    
    // Get all folders and recursively search them
    const allFolders = files.filter(f => f.id === null);
    
    // Recursive function to search folders
    async function searchFolderRecursively(folderPath) {
      try {
        const { data: folderContents, error } = await supabase.storage
          .from(bucketName)
          .list(folderPath);
        
        if (!error && folderContents) {
          for (const item of folderContents) {
            // Skip .placeholder files
            if (item.name === '.placeholder') continue;
            
            if (item.name.endsWith('/')) {
              // This is a subfolder, search it recursively
              const subfolderPath = folderPath + '/' + item.name.slice(0, -1);
              await searchFolderRecursively(subfolderPath);
            } else {
              // This is a file, add it to results
              allFiles.push({
                ...item,
                name: item.name,
                folder: folderPath,
                _type: 'supabase'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error searching folder ${folderPath}:`, error);
      }
    }
    
    // Search each top-level folder recursively
    for (const folder of allFolders) {
      await searchFolderRecursively(folder.name);
    }
    
    // Fetch ALL Cloudinary files for search (not just current folder)
    try {
      const { data: allCloudinaryFiles, error } = await supabase
        .from('cloudinary_files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && allCloudinaryFiles) {
        // Filter out files that are in trash
        const filteredCloudinaryFiles = allCloudinaryFiles.filter(file => !isFileInTrash(file.name, 'cloudinary'));
        
        // Add all Cloudinary files to search results
        const cloudinaryFilesForSearch = filteredCloudinaryFiles.map(file => ({
          ...file,
          _type: 'cloudinary',
          folder: file.folder || ''
        }));
        
        allFiles.push(...cloudinaryFilesForSearch);
      }
    } catch (error) {
      console.error('Error fetching all Cloudinary files for search:', error);
    }
    
    return allFiles;
  }

  // Populate search files state
  async function populateSearchFiles() {
    try {
      const allFiles = await getAllFilesRecursively();
      setAllFilesForSearch(allFiles);
    } catch (error) {
      console.error('Error populating search files:', error);
    }
  }

  // Get folder path for a file (for search results)
  function getFileFolderPath(file) {
    if (file._type === 'supabase') {
      // For Supabase files, the folder path is stored in the file object
      return file.folder || '';
    } else if (file._type === 'cloudinary') {
      // For Cloudinary files, the folder is stored in the folder property
      return file.folder || '';
    }
    return '';
  }

  // Get display name for file (includes folder path if in subfolder)
  function getFileDisplayName(file) {
    if (file._type === 'supabase' && file.folder && file.folder !== '') {
      // Show folder path in the filename for files in subfolders
      return `${file.name} (in ${file.folder})`;
    } else if (file._type === 'cloudinary' && file.folder && file.folder !== '') {
      // Show folder path in the filename for Cloudinary files in subfolders
      return `${file.name} (in ${file.folder})`;
    }
    return file.name;
  }

  // Navigate to file's folder when clicked in search results
  function navigateToFileFolder(file) {
    const folderPath = getFileFolderPath(file);
    if (folderPath) {
      setFolder(folderPath);
    }
  }

  // Handle click on search result item
  function handleSearchResultClick(item) {
    if (item._type === 'folder') {
      // Navigate to folder
      enterFolder(item.name);
    } else if (item.folder) {
      // Navigate to file's folder first, then open the file
      setFolder(item.folder);
      // Small delay to ensure folder navigation completes
      setTimeout(() => {
        if (item._type === 'supabase') {
          viewFile(item.name);
        } else if (item._type === 'cloudinary') {
          setCloudPreviewUrl(item.url);
          setCloudPreviewType(item.type);
          setCloudPreviewName(item.name);
          setCloudPreviewOpen(true);
        }
      }, 100);
    } else {
      // File is in root, just open it
      if (item._type === 'supabase') {
        viewFile(item.name);
      } else if (item._type === 'cloudinary') {
        setCloudPreviewUrl(item.url);
        setCloudPreviewType(item.type);
        setCloudPreviewName(item.name);
        setCloudPreviewOpen(true);
      }
    }
  }

    function isFileFavorited(file) {
    const filePath = file.originalPath || folder;
    return favorites.some(f =>
      f.file_name === file.name && f.file_path === filePath
    );
  }

  function handleFavoriteItemClick(item) {
    if (item._type === 'folder') {
      // Navigate to folder
      enterFolder(item.name);
    } else if (item._type === 'supabase') {
      // View Supabase file
      viewFile(item.name);
    } else if (item._type === 'cloudinary') {
      // Preview Cloudinary file
      setCloudPreviewUrl(item.url);
      setCloudPreviewType(item.type);
      setCloudPreviewName(item.name);
      setCloudPreviewOpen(true);
    }
  }

  function handleDeletedFileClick(item) {
    if (item._type === 'folder') {
      // For folders, we can't navigate since they're deleted, but we can show info
      setFolderInfoModal({ open: true, folder: item });
    } else if (item._type === 'supabase') {
      // For Supabase files, we can still view them if they exist in storage
      viewFile(item.name);
    } else if (item._type === 'cloudinary') {
      // For Cloudinary files, we can still preview them
      setCloudPreviewUrl(item.url);
      setCloudPreviewType(item.type);
      setCloudPreviewName(item.name);
      setCloudPreviewOpen(true);
    }
  }

  function handleSharedFileClick(item) {
    if (item._type === 'folder') {
      // For folders, we can navigate to them
      enterFolder(item.name);
    } else if (item._type === 'supabase') {
      // For Supabase files, we can view them
      viewFile(item.name);
    } else if (item._type === 'cloudinary') {
      // For Cloudinary files, we can preview them
      setCloudPreviewUrl(item.url);
      setCloudPreviewType(item.type);
      setCloudPreviewName(item.name);
      setCloudPreviewOpen(true);
    }
  }

  async function fetchFiles(session) {
    if (!supabase || !session) return;
    const path = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(bucketName).list(path, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
      if (error) {
        setError(error.message);
      } else {
        // Filter out files that are in trash
        const filteredData = data.filter(file => !isFileInTrash(file.name, 'supabase'));
        setFiles(filteredData);
        
        if (filteredData.length === 0 && folder) {
          const parts = folder.split('/').filter(Boolean);
          parts.pop();
          const parentFolder = parts.length > 0 ? parts.join('/') + '/' : '';
          setFolder(parentFolder);
        }
      }
    } catch (err) {
      setError('Error fetching files');
    }
    setLoading(false);
  }

  async function uploadFiles(filesToUpload) {
    setError('');
    setErrorModalOpen(false);
    if (!supabase || !session) {
      setError('Please sign in first.');
      setErrorModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    const folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    let duplicateFound = false;
    const newCloudyfyFiles = [];
    for (const file of filesToUpload) {
      const ext = file.name.split('.').pop().toLowerCase();
      const isImage = ["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext);
      const isVideo = ["mp4","webm","mov","avi","mkv","m4v"].includes(ext);
      if (isImage || isVideo) {
        // Cloudinary upload
        const cloudName = localStorage.getItem('cloudyfyCloudName');
        const uploadPreset = localStorage.getItem('cloudyfyUploadPreset');
        if (!cloudName || !uploadPreset) {
          setError('Cloudyfy (Cloudinary) not initialized.');
          setErrorModalOpen(true);
          setCloudyfyModalOpen(true);
          continue;
        }
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${isImage ? 'image' : 'video'}/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        try {
          const res = await fetch(url, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.secure_url) {
            // Save metadata to Supabase
            const { data: insertData, error: insertError } = await supabase
              .from('cloudinary_files')
              .insert([{
                user_id: session?.user?.id || null,
                name: file.name,
                url: data.secure_url,
                folder,
                type: isImage ? 'image' : 'video'
              }])
              .select();
            if (insertError) {
              setError('Cloudyfy upload failed: ' + insertError.message);
              setErrorModalOpen(true);
              continue;
            }
            if (insertData && insertData.length > 0) {
              newCloudyfyFiles.push({ ...insertData[0] });
            } else {
              newCloudyfyFiles.push({ name: file.name, url: data.secure_url, type: isImage ? 'image' : 'video', folder });
            }
          } else {
            setError('Cloudyfy upload failed: ' + (data.error?.message || 'Unknown error'));
            setErrorModalOpen(true);
          }
        } catch (err) {
          setError('Cloudyfy upload error: ' + err.message);
          setErrorModalOpen(true);
        }
        continue;
      }
      const filePath = folderPath + file.name;
      const newName = file.name.trim().toLowerCase();
      const duplicate = files.some(f => f.name && f.name.trim().toLowerCase() === newName);
      if (duplicate) {
        setError(`A file named "${file.name}" already exists in this folder. Please rename or delete the existing file.`);
        setErrorModalOpen(true);
        duplicateFound = true;
        continue;
      }
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file);
      if (error) {
        setError(error.message);
        setErrorModalOpen(true);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!duplicateFound) await fetchFiles(session);
    if (newCloudyfyFiles.length > 0) setCloudyfyFiles(prev => [...prev, ...newCloudyfyFiles]);
  }

  function handleFileInputChange(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      uploadFiles(files);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setDragActive(false);
  }

  async function downloadFile(fileName) {
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      return;
    }
    const folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    const filePath = folderPath + fileName;
    const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60);
    if (error) {
      setError(error.message);
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function createFolder() {
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      return;
    }
    if (!newFolderName) {
      setError('Please enter a folder name.');
      return;
    }
    const newName = newFolderName.trim().toLowerCase();
    const duplicateFolder = files.some(f => f.name && f.name.trim().toLowerCase() === newName && (!f.id || f.id === null));
    if (duplicateFolder) {
      setError('A folder with this name already exists in this folder. Please choose a different name.');
      setErrorModalOpen(true);
      return;
    }
    let folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    folderPath += newFolderName + '/';
    if (folderPath.startsWith('/')) {
      folderPath = folderPath.substring(1);
    }
    const { error } = await supabase.storage.from(bucketName).upload(folderPath + '.placeholder', new Blob(['']), {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/octet-stream',
    });
    if (error) {
      setError(error.message);
    } else {
      setNewFolderName('');
      await fetchFiles(session);
    }
  }

  async function deleteFile(fileName) {
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      return;
    }
    
    // Check if it's a folder first (fileName ends with '/')
    if (fileName.endsWith('/')) {
      // Remove the trailing slash to get the folder name
      const folderName = fileName.slice(0, -1);
      // Find the folder in the files array (folders have id === null)
      const folderToDelete = files.find(f => f.name === folderName && f.id === null);
      
      if (folderToDelete) {
        // Move folder to trash
        moveToTrash({ ...folderToDelete, _type: 'folder' });
        return;
      } else {
        // Folder not found, try to delete it directly
        const folderToDelete = { name: fileName, _type: 'folder' };
        moveToTrash(folderToDelete);
        return;
      }
    }
    
    // Find the file to move to trash - check both Supabase files and Cloudinary files
    const fileToDelete = files.find(f => f.name === fileName);
    const cloudyfyFileToDelete = cloudyfyFiles.find(f => f.name === fileName);
    
    if (fileToDelete) {
      // Move Supabase file to trash
      moveToTrash({ ...fileToDelete, _type: 'supabase' });
      return;
    }
    
    if (cloudyfyFileToDelete) {
      // Move Cloudinary file to trash
      moveToTrash({ ...cloudyfyFileToDelete, _type: 'cloudinary' });
      return;
    }
    
    // Fallback to permanent deletion for edge cases
    let filePath = (folder ? folder + '/' : '') + fileName;
    if (fileName.endsWith('/')) {
      const prefix = filePath.endsWith('/') ? filePath : filePath + '/';
      const { data: filesToDelete, error: listError } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
      if (listError) {
        setError(listError.message);
        return;
      }
      const pathsToDelete = filesToDelete.map(f => prefix + f.name);
      if (pathsToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage.from(bucketName).remove(pathsToDelete);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
      }
      const placeholderPath = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      const { data: placeholderData, error: placeholderError } = await supabase.storage.from(bucketName).list(placeholderPath, { limit: 1 });
      if (placeholderError) {
        setError(placeholderError.message);
        return;
      }
      if (placeholderData && placeholderData.length > 0) {
        const placeholderFilePath = placeholderPath + '/' + placeholderData[0].name;
        const { error: placeholderDeleteError } = await supabase.storage.from(bucketName).remove([placeholderFilePath]);
        if (placeholderDeleteError) {
          setError(placeholderDeleteError.message);
          return;
        }
      }
    } else {
      const { error } = await supabase.storage.from(bucketName).remove([filePath]);
      if (error) {
        setError(error.message);
        return;
      }
    }
    await fetchFiles(session);
  }

  function enterFolder(folderName) {
    let newPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    newPath += folderName;
    setFolder(newPath);
  }

  function goBackFolder() {
    if (!folder) return;
    const parts = folder.split('/').filter(Boolean);
    parts.pop();
    setFolder(parts.length > 0 ? parts.join('/') + '/' : '');
  }

  async function handleShare(fileName, expirySeconds) {
    setShareLoading(true);
    setShareUrl('');
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      setShareLoading(false);
      return;
    }
    const filePath = (folder ? folder + '/' : '') + fileName;
    let expiresIn = expirySeconds;
    if (expirySeconds === 'lifetime') expiresIn = 60 * 60 * 24 * 365 * 10;
    try {
      const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, expiresIn);
      if (error) {
        setError(error.message);
        setShareUrl('');
        setShareLoading(false);
        return;
      }
      const currentDomain = window.location.origin;
      const encodedUrl = encodeURIComponent(data.signedUrl);
      const encodedName = encodeURIComponent(fileName);
      const shareUrl = `${currentDomain}/share?url=${encodedUrl}&name=${encodedName}`;
      setShareUrl(shareUrl);
      
      // Add to shared files tracking
      const fileToShare = files.find(f => f.name === fileName);
      if (fileToShare) {
        addToSharedFiles(fileToShare, shareUrl, expirySeconds);
      }
      
      setShareLoading(false);
    } catch (err) {
      setError('Error generating share link');
      setShareUrl('');
      setShareLoading(false);
    }
  }

  function openShareMenu(fileName) {
    setShareUrl('');
    setShareModalOpen(true);
    setError('');
    setViewFileName(fileName);
    setShareModalType('supabase');
  }

  function closeShareModal() {
    setShareModalOpen(false);
    setShareModalType(null);
    setShareUrl('');
    setShareLoading(false);
    setError('');
  }

  async function viewFile(fileName) {
    setViewLoading(true);
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      setViewLoading(false);
      return;
    }
    const filePath = (folder ? folder + '/' : '') + fileName;
    try {
      const { data, error } = await supabase.storage.from(bucketName).download(filePath);
      if (error) {
        setError(error.message);
      } else {
        const fileExtension = fileName.split('.').pop().toLowerCase();
        let mimeType = 'application/octet-stream';
        
        if (fileExtension === 'pdf') {
          mimeType = 'application/pdf';
        } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension)) {
          mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
        } else if (['txt', 'md', 'csv', 'json', 'js', 'ts', 'css', 'html', 'xml', 'log'].includes(fileExtension)) {
          mimeType = 'text/plain';
        }
        
        const blob = new Blob([await data.arrayBuffer()], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setViewFileUrl(blobUrl);
        setViewFileName(fileName);
        setViewModalOpen(true);
      }
    } catch (err) {
      setError('Error generating view link');
    }
    setViewLoading(false);
  }

  function closeViewModal() {
    setViewModalOpen(false);
    if (viewFileUrl && viewFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(viewFileUrl);
    }
    setViewFileUrl('');
    setViewFileName('');
  }

  function closeErrorModal() {
    setError('');
    setErrorModalOpen(false);
  }

  async function listAllFolders(prefix = '', accum = []) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
    if (error) return accum;
    for (const f of data) {
      if (f.id === null) {
        const folderPath = (prefix ? prefix + '/' : '') + f.name;
        accum.push(folderPath);
        await listAllFolders(folderPath, accum);
      }
    }
    return accum;
  }

  React.useEffect(() => {
    if (moveMode && supabase && session) {
      listAllFolders('', []).then(folders => setAllFolders(folders));
    }
  }, [moveMode, supabase, session]);

  useEffect(() => {
    async function fetchThumbnails() {
      if (!supabase || !session || !files) return;
      const newThumbs = {};
      for (const file of files) {
        if (!file.id && !file.name) continue;
        const ext = file.name.split('.').pop().toLowerCase();
        if (["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext)) {
          const folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
          const filePath = folderPath + file.name;
          const { data, error } = await supabase.storage.from(bucketName).download(filePath);
          if (!error && data) {
            const blob = new Blob([await data.arrayBuffer()]);
            newThumbs[file.name] = URL.createObjectURL(blob);
          }
        }
      }
      setThumbnails(newThumbs);
    }
    fetchThumbnails();
    return () => {
      Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    };
  }, [files, supabase, session, folder, bucketName]);

  useEffect(() => {
    async function fetchCloudyfyFiles() {
      if (!supabase || !session) return;
      const { data, error } = await supabase
        .from('cloudinary_files')
        .select('*')
        .eq('folder', folder)
        .order('created_at', { ascending: false });
      if (!error && data) {
        // Filter out files that are in trash
        const filteredData = data.filter(file => !isFileInTrash(file.name, 'cloudinary'));
        setCloudyfyFiles(filteredData);
      }
    }
    fetchCloudyfyFiles();
  }, [supabase, session, folder]);

  async function handleDropOnFolder(folderName, event) {
    event.preventDefault();
    setDragOverFolder(null);
    setDragOverGrid(false);
    if (draggedItem) {
      if (draggedItem.type === 'file' || draggedItem.type === 'folder') {
        if (draggedItem.type === 'folder' && folder + draggedItem.name === folder + folderName) return;
        setMoveMode(true);
        setMoveItem(draggedItem);
        setMoveDest(folder ? (folder.endsWith('/') ? folder : folder + '/') + folderName : folderName);
        setDraggedItem(null);
        return;
      }
    }
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(event.dataTransfer.files);
      const targetFolder = folder ? (folder.endsWith('/') ? folder : folder + '/') + folderName : folderName;
      await uploadFilesToTarget(filesToUpload, targetFolder);
    }
  }
  async function handleDropOnGrid(event) {
    event.preventDefault();
    setDragOverGrid(false);
    setDragOverFolder(null);
    if (draggedItem) {
      if (draggedItem.type === 'file' || draggedItem.type === 'folder') {
        setMoveMode(true);
        setMoveItem(draggedItem);
        setMoveDest(folder || '');
        setDraggedItem(null);
        return;
      }
    }
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(event.dataTransfer.files);
      await uploadFilesToTarget(filesToUpload, folder);
    }
  }
  async function uploadFilesToTarget(filesToUpload, targetFolder) {
    setError('');
    setErrorModalOpen(false);
    if (!supabase || !session) {
      setError('Please sign in first.');
      setErrorModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    const folderPath = targetFolder ? (targetFolder.endsWith('/') ? targetFolder : targetFolder + '/') : '';
    let duplicateFound = false;
    const newCloudyfyFiles = [];
    for (const file of filesToUpload) {
      const ext = file.name.split('.').pop().toLowerCase();
      const isImage = ["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext);
      const isVideo = ["mp4","webm","mov","avi","mkv","m4v"].includes(ext);
      if (isImage || isVideo) {
        // Cloudinary upload
        const cloudName = localStorage.getItem('cloudyfyCloudName');
        const uploadPreset = localStorage.getItem('cloudyfyUploadPreset');
        if (!cloudName || !uploadPreset) {
          setError('Cloudyfy (Cloudinary) not initialized.');
          setErrorModalOpen(true);
          setCloudyfyModalOpen(true);
          continue;
        }
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${isImage ? 'image' : 'video'}/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        try {
          const res = await fetch(url, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.secure_url) {
            // Save metadata to Supabase
            const { data: insertData, error: insertError } = await supabase
              .from('cloudinary_files')
              .insert([{
                user_id: session?.user?.id || null,
                name: file.name,
                url: data.secure_url,
                folder: targetFolder,
                type: isImage ? 'image' : 'video'
              }])
              .select();
            if (insertError) {
              setError('Cloudyfy upload failed: ' + insertError.message);
              setErrorModalOpen(true);
              continue;
            }
            if (insertData && insertData.length > 0) {
              newCloudyfyFiles.push({ ...insertData[0] });
            } else {
              newCloudyfyFiles.push({ name: file.name, url: data.secure_url, type: isImage ? 'image' : 'video', folder: targetFolder });
            }
          } else {
            setError('Cloudyfy upload failed: ' + (data.error?.message || 'Unknown error'));
            setErrorModalOpen(true);
          }
        } catch (err) {
          setError('Cloudyfy upload error: ' + err.message);
          setErrorModalOpen(true);
        }
        continue;
      }
      const filePath = folderPath + file.name;
      const newName = file.name.trim().toLowerCase();
      const duplicate = files.some(f => f.name && f.name.trim().toLowerCase() === newName);
      if (duplicate) {
        setError(`A file named "${file.name}" already exists in this folder. Please rename or delete the existing file.`);
        setErrorModalOpen(true);
        duplicateFound = true;
        continue;
      }
      const { error } = await supabase.storage.from(bucketName).upload(filePath, file);
      if (error) {
        setError(error.message);
        setErrorModalOpen(true);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!duplicateFound) await fetchFiles(session);
    if (newCloudyfyFiles.length > 0) setCloudyfyFiles(prev => [...prev, ...newCloudyfyFiles]);
  }

  async function handleDropOnGoBack(event) {
    event.preventDefault();
    setGoBackDragOver(false);
    setDraggedItem(null);
    if (!draggedItem) return;
    if (!folder) return;
    const parts = folder.split('/').filter(Boolean);
    const parentFolder = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
    setMoveMode(true);
    setMoveItem(draggedItem);
    setMoveDest(parentFolder);
  }

  const folders = files.filter(f => f.id === null).map(f => ({ ...f, _type: 'folder' }));
  const supabaseFiles = files.filter(f => f.id !== null).map(f => ({ ...f, _type: 'supabase' }));
  const cloudFiles = cloudyfyFiles.filter(file => file.folder === folder).map(f => ({ ...f, _type: 'cloudinary' }));
  
  // Create unified list with tag filtering support
  let unifiedList = [
    ...folders.sort((a, b) => a.name.localeCompare(b.name)),
    ...[...supabaseFiles, ...cloudFiles].sort((a, b) => a.name.localeCompare(b.name))
  ];
  
  // Filter by tag if viewing a specific tag
  if (viewingTag && currentView === 'all-files') {
    const taggedFiles = getFilesByTag(viewingTag);
    // Only show files that are in the current folder context
    unifiedList = taggedFiles.filter(file => {
      if (file._type === 'folder') {
        return true; // Show all folders
      }
      // For files, check if they're in the current folder context
      return true; // For now, show all tagged files regardless of folder
    });
  }

  // Filter by search query if search is active - search globally across all files
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    
    // Get all folders for search results
    const allFolders = getAllFolders();
    
    // Create a global list of all files and folders including files from subfolders
    const globalFileList = [
      ...allFolders,
      ...allFilesForSearch
    ];
    
    // Filter by search query
    const searchResults = globalFileList.filter(item => {
      // Skip .placeholder files
      if (item.name === '.placeholder') return false;
      
      const fileName = item.name.toLowerCase();
      const displayName = getFileDisplayName(item).toLowerCase();
      return fileName.includes(query) || displayName.includes(query);
    });
    
    // Replace the current folder view with search results
    unifiedList = searchResults.sort((a, b) => a.name.localeCompare(b.name));
  }







    return (
    <>
      {/* Navigation Button Strip */}
      <div className="navigation-strip">
        <button
          className={`nav-btn ${currentView === 'all-files' ? 'active' : ''}`}
          title="All Files"
          onClick={() => navigateToView('all-files')}
        >
                      <span>📁</span>
                      <span>All Files</span>
        </button>
        
        <button
          className={`nav-btn ${currentView === 'recent' ? 'active' : ''}`}
          title="Recent"
          onClick={() => navigateToView('recent')}
        >
                      <span>🕐</span>
                      <span>Recent</span>
        </button>
        
        <button
          className={`nav-btn ${currentView === 'favorites' ? 'active' : ''}`}
          title="Favorites"
          onClick={() => navigateToView('favorites')}
        >
                      <span>❤️</span>
                      <span>Favorites</span>
        </button>
        
        <button
          className={`nav-btn ${currentView === 'shared' ? 'active' : ''}`}
          title="Shared"
          onClick={() => navigateToView('shared')}
        >
                      <span>🔗</span>
                      <span>Shared</span>
        </button>
        
        <button
          className={`nav-btn ${currentView === 'tags' ? 'active' : ''}`}
          title="Tags"
          onClick={() => navigateToView('tags')}
        >
                      <span>🏷️</span>
                      <span>Tags</span>
        </button>
        
        <div style={{ flex: 1, minHeight: '20px' }}></div>
        
        <button
          className="nav-btn"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={() => setDarkMode(dm => !dm)}
        >
                      <span>{darkMode ? '☀️' : '🌙'}</span>
                      <span>
              {darkMode ? 'Light' : 'Dark'}
            </span>
        </button>
        
        <button
          className="nav-btn"
          title="Settings"
          onClick={() => setCloudyfyModalOpen(true)}
        >
                      <span>⚙️</span>
                      <span>Cloudyfy Settings</span>
        </button>
        
        <button
          className={`nav-btn ${currentView === 'deleted' ? 'active' : ''}`}
          title="Deleted Files"
          onClick={() => navigateToView('deleted')}
        >
                      <span>🗑️</span>
                      <span>Deleted Files</span>
        </button>
      </div>
      
      <div className="actions-row" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={goBackFolder}
          className={"go-back-icon-btn" + (goBackDragOver ? " drag-over" : "")}
          title="Go back to parent folder"
          style={{ 
            marginRight: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 'fit-content',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
          onDragOver={e => { e.preventDefault(); setGoBackDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); setGoBackDragOver(false); }}
          onDrop={handleDropOnGoBack}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'left 0.5s ease'
          }} className="shimmer-effect" />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
            <path d="M19 12H5M12 19L5 12L12 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ 
            color: 'white', 
            fontWeight: '600', 
            fontSize: '14px', 
            letterSpacing: '0.3px',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 1
          }}>Go Back</span>
        </button>
        <input
          ref={fileInputRef}
          type="text"
          placeholder="New Folder Name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          className="input-field"
          style={{ flex: 1, minWidth: 0, maxWidth: 320 }}
          title="Enter new folder name"
        />
        <button
          onClick={createFolder}
          className="button"
          style={{ marginLeft: 10, minWidth: 120 }}
          title="Create a new folder"
        >
          Create Folder
        </button>
        <div style={{ flex: 1 }} />
        
        {/* Bulk Selection Controls */}
        {selectedFiles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {selectedFiles.length} selected
            </span>
            <button
              onClick={() => setBulkTagModal({ open: true, tag: null })}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🏷️ Add Tags
            </button>
            <button
              onClick={clearFileSelection}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕ Clear
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="button"
            style={{ marginLeft: 10, display: 'flex', alignItems: 'center', gap: 6 }}
            title="Cloudyfy Settings"
            onClick={() => setCloudyfyModalOpen(true)}
          >
            <span role="img" aria-label="Settings">⚙️</span> Cloudyfy Settings
          </button>
        </div>
      </div>

      <div
        className={"file-grid" + (dragOverGrid ? " drag-over" : "")}
        onDragOver={e => { if (e.target === e.currentTarget) { e.preventDefault(); setDragOverGrid(true); } }}
        onDragLeave={e => { if (e.target === e.currentTarget) { e.preventDefault(); setDragOverGrid(false); } }}
        onDrop={e => { if (e.target === e.currentTarget) handleDropOnGrid(e); }}
      >
        {/* Global Search Results Header - shown across all views when search is active */}
        {searchQuery && searchQuery.trim() && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px', padding: '16px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <span style={{ fontSize: '16px', fontWeight: '500', color: '#1976d2' }}>
                Global search results for "{searchQuery}"
              </span>
              <span style={{ fontSize: '14px', color: '#666' }}>
                ({unifiedList.length} item{unifiedList.length !== 1 ? 's' : ''} found across all folders)
              </span>
            </div>
          </div>
        )}

        {/* View-specific content */}
        {currentView === 'all-files' && !searchQuery.trim() && (
          <>
            {/* Tag Filter Header */}
            {viewingTag && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>🏷️</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                    Viewing files tagged with "{viewingTag}"
                  </span>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    ({unifiedList.length} file{unifiedList.length !== 1 ? 's' : ''})
                  </span>
                  <button
                    onClick={() => {
                      setViewingTag(null);
                      navigateToView('all-files');
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginLeft: '8px'
                    }}
                  >
                    ✕ Clear Filter
                  </button>
                </div>
              </div>
            )}
          </>
        )}
            
        {/* Empty state - shown across all views */}
        {unifiedList.length === 0 && currentView === 'all-files' && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: '1.1em', padding: '40px 0' }}>
            {searchQuery && searchQuery.trim() 
              ? `No files found matching "${searchQuery}"` 
              : viewingTag 
                ? `No files tagged with "${viewingTag}"` 
                : 'No files or folders yet.'
            }
          </div>
        )}

        {/* File/Folder rendering - only shown for all-files view */}
        {currentView === 'all-files' && unifiedList.map((item, idx) => {
          if (item._type === 'folder') {
            return (
              <div
                key={item.name}
                className={"folder-card" + (dragOverFolder === item.name ? " drag-over" : "")}
                onClick={() => searchQuery.trim() ? handleSearchResultClick(item) : enterFolder(item.name)}
                tabIndex={0}
                title="Open folder"
                draggable
                onDragStart={e => {
                  setDraggedItem({ type: 'folder', name: item.name });
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDraggedItem(null)}
                onDragOver={e => { e.preventDefault(); setDragOverFolder(item.name); }}
                onDragLeave={e => { e.preventDefault(); setDragOverFolder(null); }}
                onDrop={e => handleDropOnFolder(item.name, e)}
                style={{
                  position: 'relative',
                  border: selectedFiles.some(f => f.name === item.name && f._type === 'folder') ? '2px solid #007bff' : undefined
                }}
              >
                {selectedFiles.some(f => f.name === item.name && f._type === 'folder') && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: '#007bff',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    zIndex: 10
                  }}>
                    ✓
                  </div>
                )}
                <span className="folder-icon" role="img" aria-label="Folder">📁</span>
                <span className="folder-name">{item.name}</span>
                <div className="card-actions">
                  <button
                    className="card-action-btn"
                    title="Delete folder"
                    onClick={e => { e.stopPropagation(); deleteFile(item.name + '/'); }}
                  >
                    <span role="img" aria-label="Delete">🗑️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Rename folder"
                    onClick={e => {
                      e.stopPropagation();
                      setRenameFolderMode(true);
                      setRenameFolderOldName(item.name);
                      setRenameFolderNewName(item.name);
                    }}
                  >
                    <span role="img" aria-label="Rename">✏️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Move folder"
                    onClick={e => {
                      e.stopPropagation();
                      setMoveMode(true);
                      setMoveItem({ type: 'folder', name: item.name });
                      setMoveDest('');
                    }}
                  >
                    <span role="img" aria-label="Move">📂</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title={isFileFavorited(item) ? "Remove from favorites" : "Add to favorites"}
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavorite(item);
                    }}
                  >
                    <span role="img" aria-label="Favorite" style={{ color: isFileFavorited(item) ? '#ff6b6b' : '#ccc' }}>
                      {isFileFavorited(item) ? '❤️' : '🤍'}
                    </span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Manage tags"
                    onClick={e => {
                      e.stopPropagation();
                      openTagModal(item, 'manage');
                    }}
                  >
                    <span role="img" aria-label="Tags">🏷️</span>
                  </button>
                </div>
              </div>
            );
          } else if (item._type === 'supabase') {
            const ext = item.name.split('.').pop().toLowerCase();
            return (
              <div
                key={item.name}
                className="file-card"
                tabIndex={0}
                title="File"
                draggable
                onClick={() => searchQuery.trim() ? handleSearchResultClick(item) : null}
                onDragStart={e => {
                  setDraggedItem({ type: 'file', name: item.name });
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDraggedItem(null)}
              >
                {/* Thumbnail logic */}
                {(["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext) && thumbnails[item.name]) ? (
                  <img src={thumbnails[item.name]} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                ) : (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) ? (
                  <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                ) : (ext === 'pdf') ? (
                  <span className="file-icon" role="img" aria-label="PDF" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                ) : (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) ? (
                  <span className="file-icon" role="img" aria-label="Text" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                ) : (
                  <span className="file-icon" role="img" aria-label="File" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                )}
                <span className="file-name">{getFileDisplayName(item)}</span>
                {/* Show folder path in search results */}
                {searchQuery.trim() && getFileFolderPath(item) && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    📁 {getFileFolderPath(item)}
                  </div>
                )}
                <div className="card-actions">
                  {/* Supabase file action buttons as before */}
                  <button
                    className="card-action-btn"
                    title="View file"
                    onClick={async e => {
                      e.stopPropagation();
                      await viewFile(item.name);
                    }}
                  >
                    <span role="img" aria-label="View">👁️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Download file"
                    onClick={async e => {
                      e.stopPropagation();
                      await downloadFile(item.name);
                    }}
                  >
                    <span role="img" aria-label="Download">⬇️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Share file"
                    onClick={() => {
                      setViewFileName(item.name);
                      setShareModalType('supabase');
                      openShareMenu(item.name);
                    }}
                  >
                    <span role="img" aria-label="Share">🔗</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Delete file"
                    onClick={e => {
                      e.stopPropagation();
                      setSupabaseDeleteModal({ open: true, file: item });
                    }}
                  >
                    <span role="img" aria-label="Delete">🗑️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Rename file"
                    onClick={e => {
                      e.stopPropagation();
                      setRenameFileMode(true);
                      setRenameFileOldName(item.name);
                      setRenameFileNewName(item.name);
                    }}
                  >
                    <span role="img" aria-label="Rename">✏️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Move file"
                    onClick={e => {
                      e.stopPropagation();
                      setMoveMode(true);
                      setMoveItem({ type: 'file', name: item.name });
                      setMoveDest('');
                    }}
                  >
                    <span role="img" aria-label="Move">📂</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title={isFileFavorited(item) ? "Remove from favorites" : "Add to favorites"}
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavorite(item);
                    }}
                  >
                    <span role="img" aria-label="Favorite" style={{ color: isFileFavorited(item) ? '#ff6b6b' : '#ccc' }}>
                      {isFileFavorited(item) ? '❤️' : '🤍'}
                    </span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Manage tags"
                    onClick={e => {
                      e.stopPropagation();
                      openTagModal(item, 'manage');
                    }}
                  >
                    <span role="img" aria-label="Tags">🏷️</span>
                  </button>
                </div>
              </div>
            );
          } else if (item._type === 'cloudinary') {
            return (
              <div key={item.url + idx} className="file-card" tabIndex={0} title={item.type.charAt(0).toUpperCase() + item.type.slice(1)} onClick={() => searchQuery.trim() ? handleSearchResultClick(item) : null}>
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                ) : (
                  <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                )}
                <span className="file-name">{getFileDisplayName(item)}</span>
                {/* Show folder path in search results */}
                {searchQuery.trim() && getFileFolderPath(item) && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    📁 {getFileFolderPath(item)}
                  </div>
                )}
                <div className="card-actions" style={{ fontSize: 15, gap: 2, padding: '2px 0' }}>
                  {/* Cloudinary file action buttons as before */}
                  <a
                    href="#"
                    className="card-action-btn"
                    title="View file"
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                    onClick={e => {
                      e.preventDefault();
                      setCloudPreviewUrl(item.url);
                      setCloudPreviewType(item.type);
                      setCloudPreviewName(item.name);
                      setCloudPreviewOpen(true);
                    }}
                  >
                    <span role="img" aria-label="View">👁️</span>
                  </a>
                  <a
                    href={item.url}
                    download={item.name}
                    className="card-action-btn"
                    title="Download file"
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                  >
                    <span role="img" aria-label="Download">⬇️</span>
                  </a>
                  <button
                    className="card-action-btn"
                    title="Share file"
                    onClick={() => {
                      const currentDomain = window.location.origin;
                      const encodedUrl = encodeURIComponent(item.url);
                      const encodedName = encodeURIComponent(item.name);
                      const shareLink = `${currentDomain}/share?url=${encodedUrl}&name=${encodedName}`;
                      setShareModalUrl(shareLink);
                      setShareModalType('cloudinary');
                      setShareModalOpen(true);
                      
                      // Add to shared files tracking (lifetime expiry for Cloudinary files)
                      addToSharedFiles(item, shareLink, 'lifetime');
                    }}
                  >
                    <span role="img" aria-label="Share">🔗</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Delete file (metadata only)"
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                    onClick={() => setCloudModal({ type: 'delete', file: item })}
                  >
                    <span role="img" aria-label="Delete">🗑️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Rename file (metadata only)"
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                    onClick={() => {
                      setCloudModal({ type: 'rename', file: item });
                      setCloudModalValue(item.name);
                    }}
                  >
                    <span role="img" aria-label="Rename">✏️</span>
                  </button>
                  <button
                    className="card-action-btn"
                    title={isFileFavorited(item) ? "Remove from favorites" : "Add to favorites"}
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                    onClick={e => {
                      e.stopPropagation();
                      toggleFavorite(item);
                    }}
                  >
                    <span role="img" aria-label="Favorite" style={{ color: isFileFavorited(item) ? '#ff6b6b' : '#ccc' }}>
                      {isFileFavorited(item) ? '❤️' : '🤍'}
                    </span>
                  </button>
                  <button
                    className="card-action-btn"
                    title="Manage tags"
                    style={{ fontSize: 16, padding: '2px 4px', margin: '0 1px' }}
                    onClick={e => {
                      e.stopPropagation();
                      openTagModal(item, 'manage');
                    }}
                  >
                    <span role="img" aria-label="Tags">🏷️</span>
                  </button>

                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Recent Files View */}
        {currentView === 'recent' && (
          <>
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px' }} className="view-header">
              <h2>🕐 Recent Files</h2>
              <p>Recently accessed files</p>
            </div>
            {getRecentFiles().length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center' }} className="view-empty-state">
                No recent files found.
              </div>
            ) : (
              getRecentFiles().map((item, idx) => {
                if (item._type === 'folder') {
                  return (
                    <div
                      key={item.name}
                      className={"folder-card"}
                      onClick={() => handleFavoriteItemClick(item)}
                      tabIndex={0}
                      title="Open folder"
                      style={{
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      <span className="folder-icon" role="img" aria-label="Folder">📁</span>
                      <span className="folder-name">{getFileDisplayName(item)}</span>
                    </div>
                  );
                } else if (item._type === 'supabase') {
                  const ext = item.name.split('.').pop().toLowerCase();
                  return (
                    <div
                      key={item.name}
                      className="file-card"
                      tabIndex={0}
                      title="File"
                      onClick={() => handleFavoriteItemClick(item)}
                    >
                      {/* Thumbnail logic */}
                      {(["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext) && thumbnails[item.name]) ? (
                        <img src={thumbnails[item.name]} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                      ) : (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) ? (
                        <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                      ) : (ext === 'pdf') ? (
                        <span className="file-icon" role="img" aria-label="PDF" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      ) : (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) ? (
                        <span className="file-icon" role="img" aria-label="Text" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      ) : (
                        <span className="file-icon" role="img" aria-label="File" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      )}
                      <span className="file-name">{getFileDisplayName(item)}</span>
                    </div>
                  );
                } else if (item._type === 'cloudinary') {
                  return (
                    <div key={item.url + idx} className="file-card" tabIndex={0} title={item.type.charAt(0).toUpperCase() + item.type.slice(1)} onClick={() => handleFavoriteItemClick(item)}>
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                      ) : (
                        <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                      )}
                      <span className="file-name">{getFileDisplayName(item)}</span>
                    </div>
                  );
                }
                return null;
              })
            )}
          </>
        )}

        {/* Favorites View */}
        {currentView === 'favorites' && (
          <>
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px' }} className="view-header">
              <h2>❤️ Favorites</h2>
              <p>Your favorite files and folders</p>
            </div>
            {enhancedFavorites.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center' }} className="view-empty-state">
                No favorites yet. Click the heart icon on any file to add it to favorites.
              </div>
            ) : (
              enhancedFavorites.map((item, idx) => {
                if (item._type === 'folder') {
                  return (
                    <div
                      key={item.id}
                      className={"folder-card"}
                      onClick={() => handleFavoriteItemClick(item)}
                      tabIndex={0}
                      title="Open folder"
                      style={{
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                    >
                      <span className="folder-icon" role="img" aria-label="Folder">📁</span>
                      <span className="folder-name">{getFileDisplayName(item)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '16px', 
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        ❤️
                      </button>
                    </div>
                  );
                } else if (item._type === 'supabase') {
                  const ext = item.name.split('.').pop().toLowerCase();
                  return (
                    <div
                      key={item.id}
                      className="file-card"
                      tabIndex={0}
                      title="File"
                      onClick={() => handleFavoriteItemClick(item)}
                    >
                      {/* Thumbnail logic */}
                      {(["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext) && thumbnails[item.name]) ? (
                        <img src={thumbnails[item.name]} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                      ) : (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) ? (
                        <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                      ) : (ext === 'pdf') ? (
                        <span className="file-icon" role="img" aria-label="PDF" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      ) : (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) ? (
                        <span className="file-icon" role="img" aria-label="Text" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      ) : (
                        <span className="file-icon" role="img" aria-label="File" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      )}
                      <span className="file-name">{getFileDisplayName(item)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '16px', 
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        ❤️
                      </button>
                    </div>
                  );
                } else if (item._type === 'cloudinary') {
                  return (
                    <div key={item.id} className="file-card" tabIndex={0} title={item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Cloudinary File"} onClick={() => handleFavoriteItemClick(item)}>
                      {item.type === 'image' && item.url ? (
                        <img src={item.url} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                      ) : (
                        <span className="file-icon" role="img" aria-label="File" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
                      )}
                      <span className="file-name">{getFileDisplayName(item)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '16px', 
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        ❤️
                      </button>
                    </div>
                  );
                }
                return null;
              })
            )}
          </>
        )}

        {/* Shared Files View */}
        {currentView === 'shared' && (
          <>
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px' }} className="view-header">
              <h2>🔗 Shared Files</h2>
              <p>Files you've shared with others</p>
            </div>
            {getSharedFiles().length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center' }} className="view-empty-state">
                No shared files found. Use the share button on any file to create a shareable link.
              </div>
            ) : (
              getSharedFiles().map((item, idx) => (
                <div 
                  key={idx} 
                  className="file-card shared-file-card" 
                  onClick={() => handleSharedFileClick(item)}
                  title={`Click to ${item._type === 'folder' ? 'view folder info' : 'open file'}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', marginRight: '8px' }}>
                      {item._type === 'folder' ? '📁' : '📄'}
                    </span>
                    <span className="file-name shared-file-name" style={{ flex: 1 }}>{getFileDisplayName(item)}</span>
                  </div>
                  <div className="shared-file-info">
                    Shared: {new Date(item.sharedAt).toLocaleDateString()}
                    {item.expiresAt && (
                      <span style={{ marginLeft: '8px' }}>
                        • Expires: {new Date(item.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {!item.expiresAt && (
                      <span style={{ marginLeft: '8px' }} className="shared-file-expires">
                        • Never expires
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(item.shareUrl);
                        alert('Share link copied to clipboard!');
                      }}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="Copy share link"
                    >
                      📋 Copy Link
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSharedFiles(item.name);
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="Revoke share"
                    >
                      🚫 Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Tags View */}
        {currentView === 'tags' && (
          <>
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px' }} className="view-header">
              <h2>🏷️ Tags</h2>
              <p>Organize files with tags</p>
              
              {/* Search and Filter Controls */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minWidth: '200px'
                  }}
                />
                <select
                  value={tagSortBy}
                  onChange={(e) => setTagSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="name">Sort by Name</option>
                  <option value="count">Sort by File Count</option>
                  <option value="date">Sort by Date Created</option>
                </select>
                <button
                  onClick={() => setTagTemplateModal({ open: true })}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Use Template
                </button>
                <button
                  onClick={() => openTagModal(null, 'create')}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Create Tag
                </button>
              </div>
            </div>
            {tags.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center' }} className="view-empty-state">
                No tags created yet. Click "Create New Tag" to get started!
              </div>
            ) : (
              (() => {
                // Filter and sort tags
                const filteredTags = tags
                  .filter(tag => tag.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(tag => ({
                    ...tag,
                    fileCount: getFilesByTag(tag.name).length
                  }))
                  .sort((a, b) => {
                    if (tagSortBy === 'count') {
                      return b.fileCount - a.fileCount;
                    } else if (tagSortBy === 'date') {
                      return b.id - a.id; // Assuming id is timestamp-based
                    }
                    return a.name.localeCompare(b.name);
                  });

                return filteredTags.map((tag, idx) => (
                <div 
                  key={idx} 
                  className="file-card tag-card" 
                  onClick={() => navigateToView('all-files')}
                  title={`Click to view files tagged with "${tag.name}"`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', marginRight: '8px' }}>🏷️</span>
                    <span className="file-name tag-name" style={{ flex: 1 }}>
                      {tag.name}
                    </span>
                    <span 
                      className="tag-color-indicator"
                      style={{ backgroundColor: tag.color }}
                    />
                  </div>
                  <div className="tag-count">
                    {getFilesByTag(tag.name).length} file{getFilesByTag(tag.name).length !== 1 ? 's' : ''} tagged
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingTag(tag.name);
                        navigateToView('all-files');
                      }}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="View tagged files"
                    >
                      👁️ View Files
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all files.`)) {
                          removeTag(tag.name);
                        }
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="Delete tag"
                    >
                      🗑️ Delete Tag
                    </button>
                  </div>
                </div>
              ));
              })()
            )}
          </>
        )}

        {/* Deleted Files View */}
        {currentView === 'deleted' && (
          <>
            <div style={{ gridColumn: '1/-1', textAlign: 'center', marginBottom: '20px' }} className="view-header">
              <h2>🗑️ Deleted Files</h2>
              <p>Files moved to trash</p>
              
              {/* Selection Controls */}
              {getDeletedFiles().length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  marginTop: '16px', 
                  flexWrap: 'wrap' 
                }}>
                  <button
                    onClick={selectAllDeletedFiles}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    ☑️ Select All
                  </button>
                  <button
                    onClick={clearDeletedFileSelection}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Clear Selection
                  </button>
                  {selectedDeletedFiles.length > 0 && (
                    <button
                      onClick={bulkDeleteFromTrash}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Delete Selected ({selectedDeletedFiles.length})
                    </button>
                  )}
                </div>
              )}
            </div>
            {getDeletedFiles().length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center' }} className="view-empty-state">
                No deleted files found. Deleted files will appear here.
              </div>
            ) : (
              getDeletedFiles().map((item, idx) => {
                const isSelected = selectedDeletedFiles.some(f => 
                  (f._type === 'cloudinary' ? f.url : f.name) === (item._type === 'cloudinary' ? item.url : item.name)
                );
                
                return (
                <div 
                  key={idx} 
                  className={`file-card deleted-file-card ${isSelected ? 'deleted-file-selected' : ''}`}
                  onClick={() => handleDeletedFileClick(item)}
                  title={`Click to ${item._type === 'folder' ? 'view folder info' : 'open file'}`}
                >
                  {/* Selection Checkbox */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: isSelected ? '#007bff' : 'white',
                      color: isSelected ? 'white' : '#666',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      zIndex: 10,
                      border: '1px solid #ddd',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeletedFileSelection(item);
                    }}
                  >
                    {isSelected ? '✓' : ''}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', marginLeft: '28px' }}>
                    <span style={{ fontSize: '24px', marginRight: '8px' }}>
                      {item._type === 'folder' ? '📁' : '📄'}
                    </span>
                    <span className="file-name deleted-file-name" style={{ flex: 1 }}>{getFileDisplayName(item)}</span>
                  </div>
                  <div className="deleted-file-info">
                    Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                    {item.expiresAt && (
                      <span style={{ marginLeft: '8px' }}>
                        • Expires: {new Date(item.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreFromTrash(item);
                      }}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="Restore file"
                    >
                      🔄 Restore
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        permanentlyDelete(item);
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      title="Permanently delete"
                    >
                      🗑️ Delete Forever
                    </button>
                  </div>
                </div>
              );
              })
            )}
          </>
        )}
      </div>

      {/* Drag & Drop Upload Area */}
      <div
        className={"drag-drop-area" + (dragActive ? " drag-active" : "")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px solid #4f8cff' : '2px dashed #bbb',
          borderRadius: 10,
          padding: 24,
          margin: '18px 0',
          background: dragActive ? '#eaf3ff' : '#fafbfc',
          textAlign: 'center',
          color: '#666',
          fontWeight: 500,
          fontSize: 16,
          transition: 'background 0.2s, border 0.2s, opacity 0.2s',
          cursor: 'pointer',
          outline: 'none',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dragActive ? 1 : 0.35,
          boxShadow: dragActive ? '0 2px 12px rgba(79,140,255,0.10)' : 'none',
        }}
      >
        {dragActive ? 'Drop files here to upload' : 'Drag & drop files here or use the Choose File button'}
      </div>
      <input
        ref={fileInputRef}
        id="fab-upload-input"
        type="file"
        onChange={handleFileInputChange}
        disabled={uploading}
        className="file-input-hidden"
        title="Upload file to current folder"
        multiple
      />
      <div className="fab-upload-row">
        <label
          htmlFor="fab-upload-input"
          className="upload-file-label fab-label"
          title="Upload File"
        >
          <span className="upload-file-icon">&#8682;</span>
          <span>Choose File</span>
        </label>
      </div>

      {uploading && !error && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 32, minWidth: 320, maxWidth: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#4f8cff', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Uploading file...</span>
            <div className="upload-progress-bar" style={{ width: '100%', height: 8, background: '#e0e4ea', borderRadius: 6, overflow: 'hidden' }}>
              <div className="upload-progress-bar-inner" style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, #4f8cff 0%, #38b6ff 100%)', borderRadius: 6, animation: 'upload-bar-move 1.2s linear infinite' }}></div>
            </div>
          </div>
        </div>
      )}

      {shareModalOpen && shareModalType === 'supabase' && (
        <div className="modal" onClick={() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Share File</h3>
            
            <div className="share-modal-text" style={{ 
              fontSize: '14px', 
              color: '#666', 
              marginBottom: 16, 
              padding: '12px', 
              background: '#f8f9fa', 
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              📎 Generate a shareable link for this file
            </div>
            
            {/* Generate Link and Cancel Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: shareUrl ? 16 : 0 }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={closeShareModal}>Cancel</button>
              <button className="button" onClick={async () => {
                setShareLoading(true);
                await handleShare(viewFileName, 3600);
                setShareLoading(false);
              }}>Generate Link</button>
            </div>
            
            {/* Show link only after generation */}
            {shareUrl && (
              <div style={{ marginTop: 16 }}>
                <input
                  id="supabase-share-input"
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="input-field"
                  style={{ width: '100%', marginBottom: 8 }}
                  onFocus={e => e.target.select()}
                />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="button" onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(shareUrl);
                        setShareModalCopied(true);
                        setTimeout(() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }, 900);
                        return;
                      }
                    } catch (err) {
                      console.log('Modern clipboard API failed, trying fallback');
                    }
                    
                    try {
                      const input = document.getElementById('supabase-share-input');
                      if (input) {
                        input.select();
                        input.setSelectionRange(0, 99999);
                        const successful = document.execCommand('copy');
                        if (successful) {
                          setShareModalCopied(true);
                          setTimeout(() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }, 900);
                          return;
                        }
                      }
                    } catch (err) {
                      console.log('execCommand fallback failed');
                    }
                    
                    const input = document.getElementById('supabase-share-input');
                    if (input) {
                      input.select();
                      input.setSelectionRange(0, 99999);
                    }
                    setShareModalCopied('manual');
                  }}>Copy Link</button>
                </div>
                {shareModalCopied === true && <div style={{ color: '#22c55e', marginBottom: 10, textAlign: 'center' }}>✅ Copied to clipboard!</div>}
                {shareModalCopied === 'manual' && <div style={{ color: '#eab308', marginBottom: 10, textAlign: 'center' }}>📋 Press Ctrl+C to copy</div>}
              </div>
            )}
          </div>
        </div>
      )}
      {shareModalOpen && shareModalType === 'cloudinary' && (
        <div className="modal" onClick={() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Share File</h3>
            
            <div className="share-modal-text" style={{ 
              fontSize: '14px', 
              color: '#666', 
              marginBottom: 16, 
              padding: '12px', 
              background: '#f8f9fa', 
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              📎 Share this link with others
            </div>
            
            <input
              id="share-modal-input"
              type="text"
              value={shareModalUrl}
              readOnly
              className="input-field"
              style={{ width: '100%', marginBottom: 16 }}
              onFocus={e => e.target.select()}
            />
            
            {shareModalCopied === true && <div style={{ color: '#22c55e', marginBottom: 10, textAlign: 'center' }}>✅ Copied to clipboard!</div>}
            {shareModalCopied === 'manual' && <div style={{ color: '#eab308', marginBottom: 10, textAlign: 'center' }}>📋 Press Ctrl+C to copy</div>}
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }}>Close</button>
              <button className="button" onClick={async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(shareModalUrl);
                    setShareModalCopied(true);
                    setTimeout(() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }, 900);
                    return;
                  }
                } catch (err) {
                  console.log('Modern clipboard API failed, trying fallback');
                }
                
                try {
                  const input = document.getElementById('share-modal-input');
                  if (input) {
                    input.select();
                    input.setSelectionRange(0, 99999);
                    const successful = document.execCommand('copy');
                    if (successful) {
                      setShareModalCopied(true);
                      setTimeout(() => { setShareModalOpen(false); setShareModalCopied(false); setShareModalType(null); }, 900);
                      return;
                    }
                  }
                } catch (err) {
                  console.log('execCommand fallback failed');
                }
                
                const input = document.getElementById('share-modal-input');
                if (input) {
                  input.select();
                  input.setSelectionRange(0, 99999);
                }
                setShareModalCopied('manual');
              }}>Copy Link</button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={closeViewModal}>
          <div className="modal-content" style={{ borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 18, minWidth: 320, maxWidth: 600, minHeight: 200, maxHeight: '80vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <button onClick={closeViewModal} style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }} title="Close">✖</button>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, textAlign: 'center', width: '100%' }}>Preview: {viewFileName}</h3>
            {viewFileUrl && (() => {
              const ext = viewFileName.split('.').pop().toLowerCase();
              if (["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext)) {
                return (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <img src={viewFileUrl} alt={viewFileName} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </div>
                );
              } else if (["pdf"].includes(ext)) {
                return (
                  <div style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 8, overflow: 'hidden' }}>
                    <embed 
                      src={viewFileUrl}
                      type="application/pdf"
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    />
                  </div>
                );
              } else if (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) {
                return (
                  <video controls style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, background: '#000' }}>
                    <source src={viewFileUrl} type={`video/${ext === 'm4v' ? 'mp4' : ext}`}/>
                    Your browser does not support the video tag.
                  </video>
                );
              } else if (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) {
                return <iframe src={viewFileUrl} title="Text Preview" style={{ width: '100%', height: '60vh', border: 'none', borderRadius: 8, background: '#f7f8fa' }} />;
              } else {
                return <div style={{ margin: '24px 0', textAlign: 'center' }}>
                  <span style={{ color: '#888' }}>Preview not supported for this file type.</span><br />
                  <span style={{ color: '#666', fontSize: '14px' }}>This file is protected from download for security.</span>
                </div>;
              }
            })()}
          </div>
        </div>
      )}

      {errorModalOpen && error && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{ borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 32, minWidth: 320, maxWidth: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button onClick={() => { setErrorModalOpen(false); setError(''); }} style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }} title="Close">✖</button>
            <span style={{ color: '#ff5858', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Error</span>
            <div className="error" style={{ marginBottom: 10, textAlign: 'center' }}>{error}</div>
          </div>
        </div>
      )}
      {/* Rename Modal for File */}
      {renameFileMode && (
        <div className="modal" onClick={() => { setRenameFileMode(false); setRenameFileOldName(''); setRenameFileNewName(''); setError(''); }}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Rename File</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameFileNewName}
              onChange={e => setRenameFileNewName(e.target.value)}
              className="input-field"
              style={{ width: '100%', marginBottom: 16 }}
              autoFocus
            />
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => { setRenameFileMode(false); setRenameFileOldName(''); setRenameFileNewName(''); setError(''); }}>Cancel</button>
              <button className="button" onClick={async () => {
                const oldName = renameFileOldName.trim();
                let newName = renameFileNewName.trim();
                if (!newName) {
                  setError('File name cannot be empty.');
                  return;
                }
                const oldExt = oldName.includes('.') ? oldName.split('.').pop() : '';
                const baseNew = newName.includes('.') ? newName.split('.').slice(0, -1).join('.') : newName;
                const newExt = newName.includes('.') ? newName.split('.').pop() : oldExt;
                if (!newExt) {
                  setError('File extension is required.');
                  return;
                }
                if (newExt !== oldExt) {
                  setError('Changing file extension is not allowed.');
                  return;
                }
                newName = baseNew + (newExt ? '.' + newExt : '');
                if (newName.toLowerCase() === oldName.toLowerCase()) {
                  setRenameFileMode(false);
                  setRenameFileOldName('');
                  setRenameFileNewName('');
                  setError('');
                  return;
                }
                const duplicate = files.some(f => f.name && f.name.trim().toLowerCase() === newName.toLowerCase());
                if (duplicate) {
                  setError('A file with this name already exists.');
                  return;
                }
                setLoading(true);
                try {
                  const folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
                  const oldPath = folderPath + oldName;
                  const newPath = folderPath + newName;
                  const { data: downloadData, error: downloadError } = await supabase.storage.from(bucketName).download(oldPath);
                  if (downloadError) {
                    setError(downloadError.message);
                    setLoading(false);
                    return;
                  }
                  const fileBlob = new Blob([await downloadData.arrayBuffer()]);
                  const { error: uploadError } = await supabase.storage.from(bucketName).upload(newPath, fileBlob, { upsert: true });
                  if (uploadError) {
                    setError(uploadError.message);
                    setLoading(false);
                    return;
                  }
                  const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldPath]);
                  if (deleteError) {
                    setError(deleteError.message);
                    setLoading(false);
                    return;
                  }
                  setRenameFileMode(false);
                  setRenameFileOldName('');
                  setRenameFileNewName('');
                  setError('');
                  await fetchFiles(session);
                } catch (err) {
                  setError('Error renaming file: ' + (err.message || err.toString()));
                }
                setLoading(false);
              }}>Rename</button>
            </div>
          </div>
        </div>
      )}
      {/* Rename Modal for Folder */}
      {renameFolderMode && (
        <div className="modal" onClick={() => { setRenameFolderMode(false); setRenameFolderOldName(''); setRenameFolderNewName(''); setError(''); }}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Rename Folder</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameFolderNewName}
              onChange={e => setRenameFolderNewName(e.target.value)}
              className="input-field"
              style={{ width: '100%', marginBottom: 16 }}
              autoFocus
            />
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button cancel-btn" onClick={() => { setRenameFolderMode(false); setRenameFolderOldName(''); setRenameFolderNewName(''); setError(''); }}>Cancel</button>
              <button className="button" onClick={async () => {
                if (!renameFolderNewName.trim()) {
                  setError('Folder name cannot be empty.');
                  return;
                }
                if (renameFolderNewName.trim().toLowerCase() === renameFolderOldName.trim().toLowerCase()) {
                  setRenameFolderMode(false);
                  setRenameFolderOldName('');
                  setRenameFolderNewName('');
                  return;
                }
                const duplicate = files.some(f => f.name && f.name.trim().toLowerCase() === renameFolderNewName.trim().toLowerCase());
                if (duplicate) {
                  setError('A folder with this name already exists.');
                  return;
                }
                setLoading(true);
                try {
                  const prefix = renameFolderOldName.endsWith('/') ? renameFolderOldName : renameFolderOldName + '/';
                  const { data: filesToMove, error: listError } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
                  if (listError) {
                    setError(listError.message);
                    setLoading(false);
                    return;
                  }
                  for (const fileToMove of filesToMove) {
                    const oldPath = prefix + fileToMove.name;
                    const newPath = renameFolderNewName + '/' + fileToMove.name;
                    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucketName).download(oldPath);
                    if (downloadError) {
                      setError(downloadError.message);
                      setLoading(false);
                      return;
                    }
                    const fileBlob = new Blob([await downloadData.arrayBuffer()]);
                    const { error: uploadError } = await supabase.storage.from(bucketName).upload(newPath, fileBlob, { upsert: true });
                    if (uploadError) {
                      setError(uploadError.message);
                      setLoading(false);
                      return;
                    }
                  }
                  const oldPaths = filesToMove.map(f => prefix + f.name);
                  if (oldPaths.length > 0) {
                    const { error: deleteError } = await supabase.storage.from(bucketName).remove(oldPaths);
                    if (deleteError) {
                      setError(deleteError.message);
                      setLoading(false);
                      return;
                    }
                  }
                  setRenameFolderMode(false);
                  setRenameFolderOldName('');
                  setRenameFolderNewName('');
                  await fetchFiles(session);
                } catch (err) {
                  setError('Error renaming folder: ' + (err.message || err.toString()));
                }
                setLoading(false);
              }}>Rename</button>
            </div>
          </div>
        </div>
      )}
      {/* Move Modal */}
      {moveMode && (
        <div className="modal" onClick={() => { setMoveMode(false); setMoveItem(null); setMoveDest(''); setError(''); }}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Move {moveItem?.type === 'folder' ? 'Folder' : 'File'}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Destination Folder:</label>
              <select
                className="input-field"
                style={{ width: '100%', marginTop: 8 }}
                value={moveDest}
                onChange={e => setMoveDest(e.target.value)}
              >
                <option value="">/ (root)</option>
                {allFolders.filter(f => {
                  if (!moveItem) return true;
                  if (moveItem.type === 'file') return true;
                  if (moveItem.type === 'folder') {
                    const selfPath = (folder ? folder : '') + moveItem.name;
                    return !f.startsWith(selfPath);
                  }
                  return true;
                }).map(f => (
                  <option key={f} value={f}>{'/' + f}</option>
                ))}
              </select>
      </div>
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => { setMoveMode(false); setMoveItem(null); setMoveDest(''); setError(''); }}>Cancel</button>
              <button className="button" onClick={async () => {
                if (!moveItem) return;
                if (moveDest === (folder || '')) {
                  setError('Already in this folder.');
                  return;
                }
                setLoading(true);
                try {
                  const folderPath = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
                  if (moveItem.type === 'file') {
                    const oldPath = folderPath + moveItem.name;
                    const newPath = (moveDest ? moveDest + '/' : '') + moveItem.name;
                    const { data: downloadData, error: downloadError } = await supabase.storage.from(bucketName).download(oldPath);
                    if (downloadError) {
                      setError(downloadError.message);
                      setLoading(false);
                      return;
                    }
                    const fileBlob = new Blob([await downloadData.arrayBuffer()]);
                    const { error: uploadError } = await supabase.storage.from(bucketName).upload(newPath, fileBlob, { upsert: true });
                    if (uploadError) {
                      setError(uploadError.message);
                      setLoading(false);
                      return;
                    }
                    const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldPath]);
                    if (deleteError) {
                      setError(deleteError.message);
                      setLoading(false);
                      return;
                    }
                  } else if (moveItem.type === 'folder') {
                    const prefix = folderPath + moveItem.name + '/';
                    const { data: filesToMove, error: listError } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
                    if (listError) {
                      setError(listError.message);
                      setLoading(false);
                      return;
                    }
                    for (const fileToMove of filesToMove) {
                      const oldPath = prefix + fileToMove.name;
                      const newPath = (moveDest ? moveDest + '/' : '') + moveItem.name + '/' + fileToMove.name;
                      const { data: downloadData, error: downloadError } = await supabase.storage.from(bucketName).download(oldPath);
                      if (downloadError) {
                        setError(downloadError.message);
                        setLoading(false);
                        return;
                      }
                      const fileBlob = new Blob([await downloadData.arrayBuffer()]);
                      const { error: uploadError } = await supabase.storage.from(bucketName).upload(newPath, fileBlob, { upsert: true });
                      if (uploadError) {
                        setError(uploadError.message);
                        setLoading(false);
                        return;
                      }
                    }
                    const oldPaths = filesToMove.map(f => prefix + f.name);
                    if (oldPaths.length > 0) {
                      const { error: deleteError } = await supabase.storage.from(bucketName).remove(oldPaths);
                      if (deleteError) {
                        setError(deleteError.message);
                        setLoading(false);
                        return;
                      }
                    }
                  }
                  setMoveMode(false);
                  setMoveItem(null);
                  setMoveDest('');
                  setError('');
                  await fetchFiles(session);
                } catch (err) {
                  setError('Error moving item: ' + (err.message || err.toString()));
                }
                setLoading(false);
              }}>Move</button>
            </div>
          </div>
        </div>
      )}
      {cloudyfyModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCloudyfyModalOpen(false)}>
          <div className="modal-content" style={{ borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 28, minWidth: 320, maxWidth: '90vw', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Cloudyfy Settings</h2>
            <div className="cloudyfy-note" style={{ marginBottom: 20 }}>
              <b>Note:</b> Only <b>unsigned upload presets</b> are supported for browser uploads. Set your upload preset to <b>unsigned</b> in your Cloudinary dashboard.
            </div>
            {cloudyfyMsg && <p style={{ color: '#22c55e', textAlign: 'center', marginBottom: 18 }}>{cloudyfyMsg}</p>}
            <input
              type="text"
              placeholder="Cloud Name"
              value={cloudName}
              onChange={e => setCloudName(e.target.value)}
              className="input-field"
              style={{ marginBottom: 12 }}
            />
            <input
              type="text"
              placeholder="Upload Preset (must be unsigned)"
              value={uploadPreset}
              onChange={e => setUploadPreset(e.target.value)}
              className="input-field"
              style={{ marginBottom: 18 }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 10 }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setCloudyfyModalOpen(false)}>Cancel</button>
              <button className="button" onClick={() => {
                localStorage.setItem('cloudyfyCloudName', cloudName);
                localStorage.setItem('cloudyfyUploadPreset', uploadPreset);
                setCloudyfyMsg('Cloudyfy credentials saved!');
                setTimeout(() => { setCloudyfyModalOpen(false); setCloudyfyMsg(''); }, 1200);
              }}>Save</button>
              <button className="button" style={{ background: '#7c3aed', color: '#fff' }} onClick={() => {
                setCloudName('dwfqdrdhp');
                setUploadPreset('unsigned_images');
              }}>Test Cloudyfy</button>

            </div>
          </div>
        </div>
      )}
      {/* Cloudinary modals */}
      {cloudModal.type === 'delete' && (
        <div className="modal" onClick={() => setCloudModal({ type: null, file: null })}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Move to Trash</h3>
            <div style={{ marginBottom: 16 }}>Are you sure you want to move <b>{cloudModal.file?.name}</b> to trash? You can restore it later from the Deleted Files section.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setCloudModal({ type: null, file: null })}>Cancel</button>
              <button className="button" style={{ background: '#ff5858', color: '#fff' }} onClick={async () => {
                setCloudModal({ type: null, file: null });
                await deleteFile(cloudModal.file.name);
              }}>Move to Trash</button>
            </div>
          </div>
        </div>
      )}
      {cloudModal.type === 'rename' && (
        <div className="modal" onClick={() => setCloudModal({ type: null, file: null })}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Rename File</h3>
            <input
              type="text"
              value={cloudModalValue}
              onChange={e => setCloudModalValue(e.target.value)}
              className="input-field"
              style={{ width: '100%', marginBottom: 16 }}
              autoFocus
            />
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setCloudModal({ type: null, file: null })}>Cancel</button>
              <button className="button" onClick={async () => {
                const newName = cloudModalValue.trim();
                if (!newName) {
                  setError('File name cannot be empty.');
                  return;
                }
                if (newName === cloudModal.file.name) {
                  setCloudModal({ type: null, file: null });
                  return;
                }
                const { error } = await supabase
                  .from('cloudinary_files')
                  .update({ name: newName })
                  .eq('id', cloudModal.file.id);
                if (!error) setCloudyfyFiles(prev => prev.map(f => f.id === cloudModal.file.id ? { ...f, name: newName } : f));
                else setError('Failed to rename: ' + error.message);
                setCloudModal({ type: null, file: null });
              }}>Rename</button>
            </div>
          </div>
        </div>
      )}

      {supabaseDeleteModal.open && (
        <div className="modal" onClick={() => setSupabaseDeleteModal({ open: false, file: null })}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Move to Trash</h3>
            <div style={{ marginBottom: 16 }}>Are you sure you want to move <b>{supabaseDeleteModal.file?.name}</b> to trash? You can restore it later from the Deleted Files section.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setSupabaseDeleteModal({ open: false, file: null })}>Cancel</button>
              <button className="button" style={{ background: '#ff5858', color: '#fff' }} onClick={async () => {
                setSupabaseDeleteModal({ open: false, file: null });
                await deleteFile(supabaseDeleteModal.file.name);
              }}>Move to Trash</button>
            </div>
          </div>
        </div>
      )}
      {cloudPreviewOpen && (
        <div className="modal" onClick={() => setCloudPreviewOpen(false)}>
          <div className="modal-content" style={{ borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 18, minWidth: 320, maxWidth: 600, minHeight: 200, maxHeight: '80vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setCloudPreviewOpen(false)} style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }} title="Close">✖</button>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, textAlign: 'center', width: '100%' }}>Preview: {cloudPreviewName}</h3>
            {cloudPreviewType === 'image' ? (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <img src={cloudPreviewUrl} alt={cloudPreviewName} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              </div>
            ) : cloudPreviewType === 'video' ? (
              <video controls style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, background: '#000' }}>
                <source src={cloudPreviewUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div style={{ margin: '24px 0', textAlign: 'center' }}>
                <span style={{ color: '#888' }}>Preview not supported for this file type.</span><br />
                <span style={{ color: '#666', fontSize: '14px' }}>This file is protected from download for security.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {folderInfoModal.open && (
        <div className="modal" onClick={() => setFolderInfoModal({ open: false, folder: null })}>
          <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📁 Deleted Folder Information</h3>
            <div style={{ marginBottom: 16 }}>
              <p><strong>Folder Name:</strong> {folderInfoModal.folder?.name}</p>
              <p><strong>Deleted:</strong> {folderInfoModal.folder?.deletedAt ? new Date(folderInfoModal.folder.deletedAt).toLocaleString() : 'Unknown'}</p>
              <p><strong>Original Path:</strong> {folderInfoModal.folder?.originalPath || 'Root'}</p>
              <p><strong>Expires:</strong> {folderInfoModal.folder?.expiresAt ? new Date(folderInfoModal.folder.expiresAt).toLocaleString() : 'Never'}</p>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '12px' }}>
                This folder was moved to trash. You can restore it or permanently delete it using the buttons in the Deleted Files view.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setFolderInfoModal({ open: false, folder: null })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Template Modal */}
      {tagTemplateModal.open && (
        <div className="modal" onClick={() => setTagTemplateModal({ open: false })}>
          <div className="modal-content" style={{ minWidth: 400, maxWidth: 600, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📋 Tag Templates</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>Choose a predefined set of tags to quickly set up your tagging system:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(tagTemplates).map(([templateName, templateTags]) => (
                <div key={templateName} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>{templateName}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {templateTags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: tag.color,
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => applyTagTemplate(templateName)}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Use This Template
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setTagTemplateModal({ open: false })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {bulkTagModal.open && (
        <div className="modal" onClick={() => setBulkTagModal({ open: false, tag: null })}>
          <div className="modal-content" style={{ minWidth: 400, maxWidth: 500, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>🏷️ Bulk Tag Operations</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>Add Tag:</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                >
                  <option value="">Select a tag to add...</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.name}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  className="button"
                  style={{ background: '#28a745', color: '#fff' }}
                  onClick={() => {
                    if (newTagName) {
                      bulkAddTag(newTagName);
                      setNewTagName('');
                    }
                  }}
                  disabled={!newTagName}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>Remove Tag:</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                >
                  <option value="">Select a tag to remove...</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.name}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  className="button"
                  style={{ background: '#dc3545', color: '#fff' }}
                  onClick={() => {
                    if (newTagName) {
                      bulkRemoveTag(newTagName);
                      setNewTagName('');
                    }
                  }}
                  disabled={!newTagName}
                >
                  Remove
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setBulkTagModal({ open: false, tag: null })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {tagModal.open && (
        <div className="modal" onClick={closeTagModal}>
          <div className="modal-content" style={{ minWidth: 400, maxWidth: 600, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {tagModal.mode === 'create' ? '🏷️ Create New Tag' : 
               tagModal.mode === 'manage' ? `🏷️ Manage Tags for "${tagModal.file?.name}"` : '🏷️ Tag Management'}
            </h3>
            
            {tagModal.mode === 'create' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: '500' }}>Tag Name:</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="Enter tag name..."
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: '500' }}>Tag Color:</label>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    style={{ width: '50px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="button" style={{ background: '#eee', color: '#333' }} onClick={closeTagModal}>Cancel</button>
                  <button 
                    className="button" 
                    style={{ background: '#007bff', color: '#fff' }}
                    onClick={() => {
                      if (newTagName.trim()) {
                        addTag(newTagName.trim(), newTagColor);
                        closeTagModal();
                      }
                    }}
                  >
                    Create Tag
                  </button>
                </div>
              </div>
            )}

            {tagModal.mode === 'manage' && tagModal.file && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Current Tags:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {getFileTags(tagModal.file.name).length === 0 ? (
                      <span style={{ color: '#888', fontStyle: 'italic' }}>No tags assigned</span>
                    ) : (
                      getFileTags(tagModal.file.name).map((tagName, idx) => {
                        const tag = tags.find(t => t.name === tagName);
                        return (
                          <span
                            key={idx}
                            style={{
                              background: tag?.color || '#666666',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {tagName}
                            <button
                              onClick={() => removeTagFromFile(tagModal.file.name, tagName)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '0',
                                marginLeft: '4px'
                              }}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Add Tag:</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      className="input-field"
                      style={{ flex: 1 }}
                    >
                      <option value="">Select a tag...</option>
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.name}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button"
                      style={{ background: '#28a745', color: '#fff' }}
                      onClick={() => {
                        if (newTagName && !getFileTags(tagModal.file.name).includes(newTagName)) {
                          addTagToFile(tagModal.file.name, newTagName);
                          setNewTagName('');
                        }
                      }}
                      disabled={!newTagName || getFileTags(tagModal.file.name).includes(newTagName)}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="button" style={{ background: '#eee', color: '#333' }} onClick={closeTagModal}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



            {/* Circular User Button - Left Side Above Footer */}
      <div style={{
        position: 'fixed',
        left: '20px',
        bottom: '80px',
        zIndex: 1000
      }}>
        {/* Circular Button */}
        <button
          onClick={() => setUserSectionOpen(!userSectionOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: '3px solid #ffffff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
          }}
          title="Click to view user information"
        >
          {userInfo?.initials || (onUserEmail && typeof onUserEmail === 'string' ? onUserEmail.charAt(0).toUpperCase() : 'U')}
        </button>

        {/* User Information Popup */}
        {userSectionOpen && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            left: '0',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid #e9ecef',
            padding: '16px',
            minWidth: '240px',
            maxWidth: '320px',
            zIndex: 1001,
            animation: 'slideIn 0.3s ease'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setUserSectionOpen(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              ✕
            </button>

            {/* User Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingRight: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}>
                {userInfo?.initials || (onUserEmail && typeof onUserEmail === 'string' ? onUserEmail.charAt(0).toUpperCase() : 'U')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#333',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '2px'
                }}>
                  {userInfo?.fullName || (onUserEmail && typeof onUserEmail === 'string' ? onUserEmail : 'Guest User')}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: session ? '#28a745' : '#dc3545',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: session ? '#28a745' : '#dc3545'
                  }}></span>
                  {session ? 'Signed In' : 'Not Signed In'}
                </div>
              </div>
            </div>

            {/* Login Details */}
            {session && (
              <div style={{ 
                background: '#f8f9fa', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '16px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                  📋 Login Details
                </div>
                <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>User ID:</strong> {session.user?.id?.substring(0, 8)}...
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Provider:</strong> {session.user?.app_metadata?.provider || 'email'}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Last Sign In:</strong> {session.user?.last_sign_in_at ? 
                      new Date(session.user.last_sign_in_at).toLocaleDateString() : 'Unknown'}
                  </div>
                  <div>
                    <strong>Session Expires:</strong> {session.expires_at ? 
                      new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'}
                  </div>
                </div>
              </div>
            )}



            {/* Logout Section */}
            <div style={{ 
              borderTop: '1px solid #e9ecef', 
              paddingTop: '12px'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#666', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🚪</span>
                Account Actions
              </div>
              
              <button
                onClick={() => {
                  signOut();
                  setUserSectionOpen(false);
                }}
                style={{
                  background: '#fff5f5',
                  border: '1px solid #fed7d7',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#e53e3e',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.target.style.background = '#fed7d7'}
                onMouseLeave={(e) => e.target.style.background = '#fff5f5'}
                title="Sign out of your account"
              >
                <span>🚪</span>
                Sign Out
              </button>
              
              {!session && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  textAlign: 'center', 
                  marginTop: '8px',
                  padding: '8px',
                  background: '#f8f9fa',
                  borderRadius: '4px'
                }}>
                  Sign in to access all features
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default FileManager; 