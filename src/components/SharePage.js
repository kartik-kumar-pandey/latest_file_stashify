import React, { useState, useEffect, useRef } from 'react';

function SharePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  const [fileName, setFileName] = useState('');
  const prevBlobUrl = useRef('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const signedUrl = urlParams.get('url');
    const name = urlParams.get('name');
    
    if (!signedUrl) {
      setError('Invalid share link - missing file URL');
      setLoading(false);
      return;
    }

    setFileUrl(signedUrl);
    setFileName(name || 'Shared File');
    
    let ext = '';
    if (name && name.includes('.')) {
      ext = name.split('.').pop().toLowerCase();
    } else {
      ext = signedUrl.split('.').pop().split('?')[0].toLowerCase();
      
      if (signedUrl.includes('cloudinary.com')) {
        const urlParts = signedUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          ext = lastPart.split('.').pop().toLowerCase();
        }
      }
    }
    
    setFileExtension(ext);
    setFileType(getFileType(ext));
    

    setLoading(false);
    
    return () => {
      if (prevBlobUrl.current && prevBlobUrl.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, []);

  function getFileType(ext) {
    if (["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext)) return "image";
    if (["pdf"].includes(ext)) return "pdf";
    if (["mp4","webm","mov","avi","mkv","m4v"].includes(ext)) return "video";
    if (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(ext)) return "text";
    return "other";
  }

  if (fileUrl) {
    if (fileType === "image") {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <h2 style={{ marginBottom: 24, color: '#333' }}>{fileName}</h2>
          <img src={fileUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <a href={fileUrl} download={fileName} className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Download</a>
            <button className="button" style={{ background: '#eee', color: '#333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      );
    }
    if (fileType === "pdf") {
      return (
        <div style={{ width: '100%', height: '80vh', padding: 32 }}>
          <h2 style={{ marginBottom: 24, color: '#333' }}>{fileName}</h2>
          <div style={{ width: '100%', height: 'calc(100% - 60px)', border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden', background: '#f8f9fa' }}>
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Preview"
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href={fileUrl} download={fileName} className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Download</a>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#4f8cff', color: 'white' }}>Open in New Tab</a>
            <button className="button" style={{ background: '#eee', color: '#333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.history.back()}>Go Back</button>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: '14px', color: '#666' }}>
            💡 If the PDF doesn't display, try the "Open in New Tab" button
          </div>
        </div>
      );
    }
    if (fileType === "video") {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <h2 style={{ marginBottom: 24, color: '#333' }}>{fileName}</h2>
          <video controls style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, background: '#000' }}>
            <source src={fileUrl} type={`video/${fileExtension === 'm4v' ? 'mp4' : fileExtension}`}/>
            Your browser does not support the video tag.
          </video>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <a href={fileUrl} download={fileName} className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Download</a>
            <button className="button" style={{ background: '#eee', color: '#333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      );
    }
    if (fileType === "text") {
      useEffect(() => {
        fetch(fileUrl)
          .then(res => res.text())
          .then(setTextContent)
          .catch(() => setTextContent('Error loading file.'));
      }, [fileUrl]);
      
      return (
        <div style={{ padding: 24, maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: 24, color: '#333' }}>{fileName}</h2>
          <div style={{ background: '#f7f8fa', borderRadius: 8, minHeight: 400, fontFamily: 'monospace', fontSize: 15, color: '#23272f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 16, border: '1px solid #e9ecef' }}>
            {textContent || 'Loading...'}
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            <a href={fileUrl} download={fileName} className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Download</a>
            <button className="button" style={{ background: '#eee', color: '#333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.history.back()}>Go Back</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <h2 style={{ marginBottom: 24, color: '#333' }}>{fileName}</h2>
        <p style={{ marginBottom: 24, color: '#666' }}>Preview not supported for this file type.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <a href={fileUrl} download={fileName} className="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Download File</a>
          <button className="button" style={{ background: '#eee', color: '#333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#4f8cff', marginBottom: '16px' }}>Loading shared file...</div>
          <div style={{ width: '40px', height: '4px', background: '#e0e4ea', borderRadius: '2px', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', background: '#4f8cff', borderRadius: '2px', animation: 'loading 1.2s linear infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ color: '#333', marginBottom: '16px' }}>Error</h1>
          <p style={{ color: '#666', lineHeight: '1.5' }}>{error}</p>
          <button className="button" style={{ marginTop: 24, background: '#eee', color: '#333' }} onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  return null;
}

export default SharePage; 