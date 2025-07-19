import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

function SharePage() {
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [noCredentials, setNoCredentials] = useState(false);
  const prevBlobUrl = useRef('');
  const navigate = useNavigate ? useNavigate() : () => {};

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filePath = decodeURIComponent(urlParams.get('file') || '');
    const bucketName = urlParams.get('bucket');
    const expiresParam = urlParams.get('expires');
    const createdParam = urlParams.get('created');
    
    // Check for Supabase credentials in localStorage
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseKey = localStorage.getItem('supabaseAnonKey');
    if (!supabaseUrl || !supabaseKey) {
      setNoCredentials(true);
      setLoading(false);
      return;
    }

    if (!filePath || !bucketName) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    // Check if link has expired
    if (expiresParam && expiresParam !== 'lifetime' && createdParam) {
      const createdAt = parseInt(createdParam);
      const expiresIn = parseInt(expiresParam);
      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = createdAt + expiresIn;
      if (currentTime > expiresAt) {
        setExpired(true);
        setLoading(false);
        return;
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
    
    async function loadFile() {
      try {
        setLoading(true);
        setError('');
        setTextContent('');
        setFileUrl('');
        const { data, error } = await supabase.storage.from(bucketName).download(filePath);
        if (error) {
          setError(`File not found or access denied: ${error.message}`);
          setLoading(false);
          return;
        }
        const fileExtension = filePath.split('/').pop().split('.').pop().toLowerCase();
        setFileName(filePath.split('/').pop());
        const blob = new Blob([await data.arrayBuffer()], {
          type:
            fileExtension === 'pdf' ? 'application/pdf' :
            ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension) ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` :
            ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(fileExtension) ? `video/${fileExtension === 'm4v' ? 'mp4' : fileExtension}` :
            ['txt', 'md', 'csv', 'json', 'js', 'ts', 'css', 'html', 'xml', 'log'].includes(fileExtension) ? 'text/plain' :
            'application/octet-stream'
        });
        if (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(fileExtension)) {
          // Text: use FileReader
          const reader = new FileReader();
          reader.onload = (e) => setTextContent(e.target.result);
          reader.readAsText(blob, 'UTF-8');
        } else {
          // PDF, images, video, etc: use blob URL
          const blobUrl = URL.createObjectURL(blob);
          if (prevBlobUrl.current) {
            URL.revokeObjectURL(prevBlobUrl.current);
          }
          prevBlobUrl.current = blobUrl;
          setFileUrl(blobUrl);
        }
      } catch (err) {
        setError('Error loading file');
      }
      setLoading(false);
    }

    loadFile();
    // Clean up blob URL on unmount
    return () => {
      if (prevBlobUrl.current && prevBlobUrl.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, []);

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

  if (noCredentials) {
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: '#333', marginBottom: '16px' }}>Private File</h1>
          <p style={{ color: '#666', lineHeight: '1.5' }}>
            To view this file inline, please initialize the app with the correct Supabase credentials.<br />
            <button className="button" style={{ marginTop: 18 }} onClick={() => window.location.href = '/'}>Go to Initialization</button>
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
          <h1 style={{ color: '#333', marginBottom: '16px' }}>Link Expired</h1>
          <p style={{ color: '#666', lineHeight: '1.5' }}>
            This shared link has expired. Please contact the file owner for a new link.
          </p>
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
        </div>
      </div>
    );
  }

  const fileExtension = fileName.split('.').pop().toLowerCase();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Shared File</h1>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>{fileName}</p>
          </div>
          <div style={{
            background: '#f8f9fa',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666',
            border: '1px solid #e0e4ea'
          }}>
            🔒 Secure View Only
          </div>
        </div>

        {/* File Preview */}
        <div style={{ padding: '24px', minHeight: '400px' }}>
          {(() => {
            if (["png","jpg","jpeg","gif","bmp","webp","svg"].includes(fileExtension)) {
              return (
                <div style={{ textAlign: 'center' }}>
                  <img 
                    src={fileUrl} 
                    alt={fileName} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '70vh', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              );
            }
            if (fileExtension === 'pdf') {
              return (
                <div style={{ width: '100%', height: '80vh' }}>
                  <embed
                    src={fileUrl}
                    type="application/pdf"
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                  />
                </div>
              );
            }
            if (["mp4","webm","mov","avi","mkv","m4v"].includes(fileExtension)) {
              return (
                <div style={{ textAlign: 'center' }}>
                  <video controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, background: '#000' }}>
                    <source src={fileUrl} type={`video/${fileExtension === 'm4v' ? 'mp4' : fileExtension}`}/>
                    Your browser does not support the video tag.
                  </video>
                </div>
              );
            }
            if (["txt","md","csv","json","js","ts","css","html","xml","log"].includes(fileExtension)) {
              return (
                <div style={{ padding: 24, background: '#f7f8fa', borderRadius: 8, minHeight: 200, fontFamily: 'monospace', fontSize: 15, color: '#23272f', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {textContent}
                </div>
              );
            }
            return (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <p>Preview not supported for this file type.</p>
                <a href={fileUrl} download={fileName} className="button" style={{ marginTop: 18, display: 'inline-block' }}>Download File</a>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default SharePage; 