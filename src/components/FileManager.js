import React, { useRef, useEffect, useState } from 'react';

function FileManager({ supabase, bucketName, onUserEmail, session, setSession }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [folder, setFolder] = React.useState('');
  const [newFolderName, setNewFolderName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFileName, setShareFileName] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewFileUrl, setViewFileUrl] = useState('');
  const [viewFileName, setViewFileName] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const fileInputRef = useRef();
  const [showSignUp, setShowSignUp] = React.useState(false);
  // Add state for folder rename
  const [renameFileMode, setRenameFileMode] = useState(false);
  const [renameFileOldName, setRenameFileOldName] = useState('');
  const [renameFileNewName, setRenameFileNewName] = useState('');
  const [renameFolderMode, setRenameFolderMode] = useState(false);
  const [renameFolderOldName, setRenameFolderOldName] = useState('');
  const [renameFolderNewName, setRenameFolderNewName] = useState('');
  const renameInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [moveItem, setMoveItem] = useState(null); // { type: 'file'|'folder', name: string }
  const [moveDest, setMoveDest] = useState('');
  const [allFolders, setAllFolders] = useState([]);
  const [sharePassword, setSharePassword] = useState('');
  const [thumbnails, setThumbnails] = useState({}); // { fileName: blobUrl }

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
    for (const file of filesToUpload) {
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
    setShareFileName(fileName);
    setShareUrl('');
    setShareModalOpen(true);
    setError('');
    if (!supabase || !session) {
      setError('Please sign in first.');
      setShareLoading(false);
      return;
    }
    const filePath = (folder ? folder + '/' : '') + fileName;
    let expiresIn = expirySeconds;
    if (expirySeconds === 'lifetime') expiresIn = 60 * 60 * 24 * 365 * 10; // 10 years
    try {
      // Generate a signed URL for the file
      const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, expiresIn);
      if (error) {
        setError(error.message);
        setShareUrl('');
      } else {
        // Determine file extension
        const ext = fileName.split('.').pop().toLowerCase();
        const videoExts = ["mp4","webm","mov","avi","mkv","m4v"];
        if (videoExts.includes(ext)) {
          // For video, use direct signed URL
        setShareUrl(data.signedUrl);
        } else {
          // For others, use preview page
          const currentDomain = window.location.origin;
          let previewUrl = `${currentDomain}/preview?url=${encodeURIComponent(data.signedUrl)}`;
          if (sharePassword) {
            previewUrl += `&pw=1`;
            // TODO: Store password hash and link info in Supabase table
          }
          setShareUrl(previewUrl);
        }
      }
    } catch (err) {
      setError('Error generating share link');
      setShareUrl('');
    }
    setShareLoading(false);
  }

  function openShareMenu(fileName) {
    setShareFileName(fileName);
    setShareModalOpen(true);
    setShareUrl('');
    setError('');
  }

  function closeShareModal() {
    setShareModalOpen(false);
    setShareUrl('');
    setShareFileName('');
    setShareLoading(false);
    setError('');
    setSharePassword('');
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
      // Fetch file content to prevent downloads
      const { data, error } = await supabase.storage.from(bucketName).download(filePath);
      if (error) {
        setError(error.message);
      } else {
        // Create blob URL for secure viewing with proper MIME type
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
    // Clean up blob URL to prevent memory leaks
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

  // Helper to recursively list all folders
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

  // In useEffect, update allFolders when moveMode opens
  React.useEffect(() => {
    if (moveMode && supabase && session) {
      listAllFolders('', []).then(folders => setAllFolders(folders));
    }
  }, [moveMode, supabase, session]);

  // Fetch thumbnails for images in the current folder
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
    // Cleanup old blob URLs
    return () => {
      Object.values(thumbnails).forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line
  }, [files, supabase, session, folder, bucketName]);

  // JSX and other code remain unchanged...

  return (
    <>
      <div className="actions-row">
        {folder && (
          <button
            onClick={goBackFolder}
            className="go-back-icon-btn"
            title="Go back to parent folder"
            style={{ marginRight: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="11" />
              <path d="M13.5 7L9.5 11L13.5 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px' }}>Go Back</span>
          </button>
        )}
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
      </div>

      <div className="file-grid">
        {files.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontSize: '1.1em', padding: '40px 0' }}>
            No files or folders yet.
          </div>
        )}
        {files.map((file) => {
          const isFolder = file.id === null;
          const ext = file.name.split('.').pop().toLowerCase();
          return isFolder ? (
          <div
            key={file.name}
              className="folder-card"
            onClick={() => enterFolder(file.name)}
            tabIndex={0}
            title="Open folder"
          >
              <span className="folder-icon" role="img" aria-label="Folder">📁</span>
              <span className="folder-name">{file.name}</span>
              <div className="card-actions">
            <button
              className="card-action-btn"
              title="Delete folder"
              onClick={e => { e.stopPropagation(); deleteFile(file.name + '/'); }}
            >
              <span role="img" aria-label="Delete">🗑️</span>
            </button>
              <button
                className="card-action-btn"
                title="Rename folder"
                onClick={e => {
                  e.stopPropagation();
                    setRenameFolderMode(true);
                  setRenameFolderOldName(file.name);
                  setRenameFolderNewName(file.name);
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
                    setMoveItem({ type: 'folder', name: file.name });
                    setMoveDest('');
                  }}
                >
                  <span role="img" aria-label="Move">📂</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              key={file.name}
              className="file-card"
              tabIndex={0}
              title="File"
            >
              {/* Thumbnail logic */}
              {(["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext) && thumbnails[file.name]) ? (
                <img src={thumbnails[file.name]} alt={file.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
              ) : (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) ? (
                <span className="file-icon" role="img" aria-label="Video" style={{ fontSize: 40, marginBottom: 8 }}>🎬</span>
              ) : (ext === 'pdf') ? (
                <span className="file-icon" role="img" aria-label="PDF" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
              ) : (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) ? (
                <span className="file-icon" role="img" aria-label="Text" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
              ) : (
                <span className="file-icon" role="img" aria-label="File" style={{ fontSize: 40, marginBottom: 8 }}>📄</span>
              )}
              <span className="file-name">{file.name}</span>
              <div className="card-actions">
                <button
                  className="card-action-btn"
                  title="View file"
                  onClick={async e => {
                    e.stopPropagation();
                    await viewFile(file.name);
                  }}
                >
                  <span role="img" aria-label="View">👁️</span>
                </button>
                <button
                  className="card-action-btn"
                  title="Download file"
                  onClick={async e => {
                    e.stopPropagation();
                    await downloadFile(file.name);
                  }}
                >
                  <span role="img" aria-label="Download">⬇️</span>
                </button>
                <button
                  className="card-action-btn"
                  title="Share file"
                  onClick={async e => {
                    e.stopPropagation();
                    setShareModalOpen(true);
                    setShareFileName(file.name);
                    setShareUrl('');
                  }}
                >
                  <span role="img" aria-label="Share">🔗</span>
                </button>
                <button
                  className="card-action-btn"
                  title="Delete file"
                  onClick={e => { e.stopPropagation(); deleteFile(file.name); }}
                >
                  <span role="img" aria-label="Delete">🗑️</span>
                </button>
                <button
                  className="card-action-btn"
                  title="Rename file"
                  onClick={e => {
                    e.stopPropagation();
                    setRenameFileMode(true);
                    setRenameFileOldName(file.name);
                    setRenameFileNewName(file.name);
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
                    setMoveItem({ type: 'file', name: file.name });
                    setMoveDest('');
                  }}
                >
                  <span role="img" aria-label="Move">📂</span>
                </button>
              </div>
            </div>
          );
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

      {shareModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={closeShareModal}>
          <div className="modal-content" style={{ borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 28, minWidth: 320, maxWidth: '90vw', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 18 }}>Share "{shareFileName}"</h3>
            <div style={{ marginBottom: 18 }}>
              <span style={{ fontWeight: 600 }}>Choose link expiry:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60)}>1 hr</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60*5)}>5 hr</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60*12)}>12 hr</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60*24*7)}>1 week</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60*24*30)}>1 month</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 60*60*24*365)}>1 year</button>
                <button className="button" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => handleShare(shareFileName, 'lifetime')}>Lifetime</button>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 600 }}>Password (optional):</label>
              <input
                type="password"
                className="input-field"
                style={{ width: '100%', marginTop: 8 }}
                placeholder="Set a password for this share (optional)"
                value={sharePassword}
                onChange={e => setSharePassword(e.target.value)}
              />
            </div>
            {shareLoading && <div style={{ color: '#4f8cff', marginBottom: 10 }}>Generating link...</div>}
            {shareUrl && (
              <div style={{ marginBottom: 10 }}>
                <input type="text" value={shareUrl} readOnly style={{ width: '100%', padding: 8, borderRadius: 6, border: '1.5px solid #e0e4ea', fontSize: 14 }} onFocus={e => e.target.select()} />
                <button className="button" style={{ marginTop: 8, width: '100%' }} onClick={() => {navigator.clipboard.writeText(shareUrl)}}>Copy Link</button>
              </div>
            )}
            {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
            <button className="button" style={{ background: '#eee', color: '#333', marginTop: 8 }} onClick={closeShareModal}>Close</button>
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
                // Preserve extension
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
                  // For folders, exclude self and subfolders
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
    </>
  );
}

export default FileManager; 
