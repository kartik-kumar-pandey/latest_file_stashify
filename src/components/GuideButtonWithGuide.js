import React from 'react';

function GuideButtonWithGuide() {
  const [showGuide, setShowGuide] = React.useState(false);
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0 0 0' }}>
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="button guide-toggle-btn"
        style={{
          marginTop: 0,
          marginBottom: showGuide ? 18 : 0,
        }}
        title="Show/Hide Supabase Setup Guide"
      >
        {showGuide ? 'Hide Setup Guide' : 'Show Setup Guide'}
      </button>
      {showGuide && (
        <div
          className="setup-guide"
          style={{
            marginTop: 0,
            marginBottom: 24,
            textAlign: 'left',
            width: '100%',
            maxWidth: 600,
          }}
        >
          <h3 style={{ marginTop: 0, fontWeight: 700 }}>Supabase Setup Guide</h3>
          <ol style={{ paddingLeft: 22, marginBottom: 0 }}>
            <li>Create a Supabase account at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">https://supabase.com</a> and log in.</li>
            <li>Create a new Supabase project with a name and database password.</li>
            <li>Enable authentication in the Supabase dashboard:
              <ul>
                <li>Go to "Authentication" and enable email/password or OAuth providers.</li>
              </ul>
            </li>
            <li>Create a storage bucket:
              <ul>
                <li>Go to "Storage" and create a bucket (e.g., "user-files").</li>
                <li>Set bucket privacy as needed.</li>
              </ul>
            </li>
            <li>Set bucket access policies:
              <ul>
                <li>Go to the <b>Policies</b> tab under your storage objects table.</li>
                <li>Add a policy to allow authenticated users to upload files:</li>
                <ul>
                  <li><b>Policy Name:</b> Allow authenticated upload</li>
                  <li><b>Action:</b> <b>ALL</b></li>
                  <li><b>Target roles:</b> authenticated</li>
                  <li><b>Conditional expression:</b> <code>(auth.role() = 'authenticated')</code></li>
                </ul>
                <li>Add policies to allow users to read/download and delete their own files based on metadata or naming conventions.</li>
              </ul>
            </li>
            <li>Set bucket listing policy:
              <ul>
                <li>Go to the <b>Policies</b> tab under your storage buckets table.</li>
                <li>Add a policy to allow users to list buckets. Example for <b>public</b> access:</li>
                <ul>
                  <li><b>Policy Name:</b> Allow public list buckets</li>
                  <li><b>Action:</b> SELECT</li>
                  <li><b>Target roles:</b> public</li>
                  <li><b>Conditional expression:</b> <i>true</i></li>
                </ul>
                <li>Or for <b>authenticated users only</b>:</li>
                <ul>
                  <li><b>Policy Name:</b> Allow list buckets</li>
                  <li><b>Action:</b> SELECT</li>
                  <li><b>Target roles:</b> authenticated</li>
                  <li><b>Conditional expression:</b> <code>true</code></li>
                </ul>
              </ul>
            </li>
            <li>Get API credentials:
              <ul>
                <li>Go to "Settings" {'>'} "API" in the Supabase dashboard.</li>
                <li>Copy the "URL" and "anon public" API key.</li>
              </ul>
            </li>
            <li>Configure the app:
              <ul>
                <li>Enter the Supabase URL, anon key, and storage bucket name in the app's initialization screen.</li>
                <li>Click "Initialize Supabase" to connect the app to your Supabase project.</li>
              </ul>
            </li>
            <li>Use the app:
              <ul>
                <li>Sign up or sign in using your email and password.</li>
                <li>Create folders, upload files, navigate folders, download files, and delete files or folders.</li>
              </ul>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default GuideButtonWithGuide; 