import React, { useRef, useEffect, useState } from 'react';

function FileManager({ supabase, bucketName, onUserEmail, session, setSession }) {
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
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

  const [shareModalType, setShareModalType] = useState(null);

  React.useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFiles(session);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchFiles(session);
      } else {
        setFiles([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, folder, setSession]);

  React.useEffect(() => {
    if (!session && typeof onUserEmail === 'function') {
      onUserEmail('');
    } else if (session && session.user && onUserEmail) {
      onUserEmail(session.user.email);
    }
  }, [session, onUserEmail]);

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

  async function fetchFiles(session) {
    if (!supabase || !session) return;
    const path = folder ? (folder.endsWith('/') ? folder : folder + '/') : '';
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(bucketName).list(path, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
      if (error) {
        setError(error.message);
      } else {
        setFiles(data);
        
        if (data.length === 0 && folder) {
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
      setShareUrl(`${currentDomain}/share?url=${encodedUrl}&name=${encodedName}`);
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
      if (!error && data) setCloudyfyFiles(data);
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
  const unifiedList = [
    ...folders.sort((a, b) => a.name.localeCompare(b.name)),
    ...[...supabaseFiles, ...cloudFiles].sort((a, b) => a.name.localeCompare(b.name))
  ];







  return (
    <>
     
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
        {unifiedList.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: '1.1em', padding: '40px 0' }}>
            No files or folders yet.
          </div>
        )}
        {unifiedList.map((item, idx) => {
          if (item._type === 'folder') {
            return (
              <div
                key={item.name}
                className={"folder-card" + (dragOverFolder === item.name ? " drag-over" : "")}
                onClick={() => enterFolder(item.name)}
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
              >
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
                <span className="file-name">{item.name}</span>
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
                </div>
              </div>
            );
          } else if (item._type === 'cloudinary') {
            return (
              <div key={item.url + idx} className="file-card" tabIndex={0} title={item.type.charAt(0).toUpperCase() + item.type.slice(1)}>
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                ) : (
                  <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
                )}
                <span className="file-name">{item.name}</span>
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

                </div>
              </div>
            );
          }
          return null;
        })}
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
            
            <div style={{ 
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
            
            <div style={{ 
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
            <h3 style={{ marginTop: 0 }}>Delete File</h3>
            <div style={{ marginBottom: 16 }}>Are you sure you want to remove <b>{cloudModal.file?.name}</b> from your app? (File will remain in Cloudinary)</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setCloudModal({ type: null, file: null })}>Cancel</button>
              <button className="button" style={{ background: '#ff5858', color: '#fff' }} onClick={async () => {
                const { error } = await supabase
                  .from('cloudinary_files')
                  .delete()
                  .eq('id', cloudModal.file.id);
                if (!error) setCloudyfyFiles(prev => prev.filter(f => f.id !== cloudModal.file.id));
                else setError('Failed to delete metadata: ' + error.message);
                setCloudModal({ type: null, file: null });
              }}>Delete</button>
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
            <h3 style={{ marginTop: 0 }}>Delete File</h3>
            <div style={{ marginBottom: 16 }}>Are you sure you want to delete <b>{supabaseDeleteModal.file?.name}</b> from Supabase storage? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => setSupabaseDeleteModal({ open: false, file: null })}>Cancel</button>
              <button className="button" style={{ background: '#ff5858', color: '#fff' }} onClick={async () => {
                setSupabaseDeleteModal({ open: false, file: null });
                await deleteFile(supabaseDeleteModal.file.name);
              }}>Delete</button>
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
    </>
  );
}

export default FileManager; 
