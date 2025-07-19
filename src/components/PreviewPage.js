import React, { useState } from 'react';

function getFileType(url) {
  // Extract extension from the path before the query string
  const path = url.split('?')[0];
  const ext = path.split('.').pop().toLowerCase();
  if ([
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'
  ].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if ([
    'txt', 'md', 'csv', 'json', 'js', 'ts', 'css', 'html', 'xml', 'log'
  ].includes(ext)) return 'text';
  if ([
    'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'
  ].includes(ext)) return 'video';
  return 'other';
}

export default function PreviewPage() {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url');
  const passwordRequired = params.get('pw') === '1';
  const [passwordModalOpen, setPasswordModalOpen] = useState(passwordRequired);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordOk, setPasswordOk] = useState(!passwordRequired);
  if (!url) return <div style={{ padding: 32 }}>No file URL provided.</div>;

  const fileType = getFileType(url);

  // Password modal logic
  if (passwordModalOpen && !passwordOk) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 32px rgba(60,72,88,0.18)', padding: 32, minWidth: 320, maxWidth: 400, position: 'relative' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18 }}>Password Required</h3>
          <input
            type="password"
            className="input-field"
            style={{ marginBottom: 16 }}
            placeholder="Enter password to view file"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
          />
          {passwordError && <div className="error" style={{ marginBottom: 10 }}>{passwordError}</div>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="button" style={{ background: '#eee', color: '#333' }} onClick={() => window.location.href = '/'}>Cancel</button>
            <button className="button" onClick={() => {
              if (!passwordInput.trim()) {
                setPasswordError('Password required.');
                return;
              }
              // TODO: Validate password with Supabase backend
              setPasswordOk(true);
              setPasswordModalOpen(false);
            }}>Unlock</button>
          </div>
        </div>
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <img src={url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
      </div>
    );
  }
  if (fileType === 'pdf') {
    return (
      <div style={{ width: '100%', height: '80vh', padding: 32 }}>
        <embed
          src={url}
          type="application/pdf"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
        />
      </div>
    );
  }
  if (fileType === 'video') {
    return (
      <div style={{ textAlign: 'center', padding: 32 }}>
        <video controls style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, background: '#000' }}>
          <source src={url} type={`video/${url.split('.').pop().split('?')[0] === 'm4v' ? 'mp4' : url.split('.').pop().split('?')[0]}`}/>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  if (fileType === 'text') {
    return (
      <iframe
        src={url}
        title="Text Preview"
        style={{ width: '100%', height: '80vh', border: 'none', background: '#f7f8fa', borderRadius: 8, margin: 32 }}
      />
    );
  }
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <p>Preview not supported for this file type.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="button" style={{ marginTop: 18, display: 'inline-block' }}>Download File</a>
    </div>
  );
} 