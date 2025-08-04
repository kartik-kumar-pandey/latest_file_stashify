import React, { useState } from 'react';
import { createSupabaseClient } from '../supabaseClient';

function Initialization({ onInitialize }) {
  const [supabaseUrl, setSupabaseUrl] = React.useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = React.useState(localStorage.getItem('supabaseAnonKey') || '');
  const [bucketName, setBucketName] = React.useState(localStorage.getItem('bucketName') || 'user-files');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const [cloudyfyModalOpen, setCloudyfyModalOpen] = useState(false);
  const [cloudName, setCloudName] = useState(localStorage.getItem('cloudyfyCloudName') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('cloudyfyApiKey') || '');
  const [apiSecret, setApiSecret] = useState(localStorage.getItem('cloudyfyApiSecret') || '');
  const [uploadPreset, setUploadPreset] = useState(localStorage.getItem('cloudyfyUploadPreset') || '');
  const [cloudyfyMsg, setCloudyfyMsg] = useState('');

  const TEST_SUPABASE_URL = 'https://zskxwiemdonhqtafortc.supabase.co';
  const TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpza3h3aWVtZG9uaHF0YWZvcnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODM2MjcsImV4cCI6MjA2OTg1OTYyN30.LG1h6D1R7-P-DL-YbHDIN4py05Pr9zPyvADXojqNv68';
  const TEST_BUCKET_NAME = 'demo';

  async function initializeSupabase() {
    setError('');
    setIsLoading(true);
    
    if (!supabaseUrl || !supabaseAnonKey || !bucketName) {
      setError('Please enter Supabase URL, anon key, and bucket name.');
      setIsLoading(false);
      return;
    }
    
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    try {
      const { data: buckets, error: bucketError } = await client.storage.listBuckets();
      if (bucketError) {
        setError('Error checking buckets: ' + bucketError.message);
        setIsLoading(false);
        return;
      }
      const normalizedInput = bucketName.trim().toLowerCase();
      const found = buckets && buckets.some(b => {
        const normalizedBucket = b.name.trim().toLowerCase();
        return normalizedBucket === normalizedInput;
      });
      if (!found) {
        setError(`Bucket "${bucketName}" does not exist on this Supabase project.`);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      setError('Error validating bucket: ' + (err.message || err.toString()));
      setIsLoading(false);
      return;
    }
    
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
    localStorage.setItem('bucketName', bucketName);
    onInitialize(client, bucketName);
  }

  async function handleTestApp() {
    setIsTestLoading(true);
    setSupabaseUrl(TEST_SUPABASE_URL);
    setSupabaseAnonKey(TEST_SUPABASE_ANON_KEY);
    setBucketName(TEST_BUCKET_NAME);
    localStorage.setItem('supabaseUrl', TEST_SUPABASE_URL);
    localStorage.setItem('supabaseAnonKey', TEST_SUPABASE_ANON_KEY);
    localStorage.setItem('bucketName', TEST_BUCKET_NAME);
    const client = createSupabaseClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);
    onInitialize(client, TEST_BUCKET_NAME);
  }

  return (
    <div className="init-container">
      {/* Animated Background */}
      <div className="init-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="init-content">
        {/* Header */}
        <div className="init-header">
          <div className="logo-container">
            <div className="logo-icon">
              <img src="/logo.png" alt="FileStashify Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 className="init-title">
              FileStashify
            </h1>
          </div>
          <p className="init-subtitle">
            Secure cloud file management with Supabase
          </p>
        </div>

        {/* Setup Card */}
        <div className="init-card">
          <div className="card-header">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Initialize Supabase</h2>
            <p className="card-description">
              Connect your Supabase project to start managing files securely
            </p>
          </div>

          {error && (
            <div className="error-message">
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 13A5 5 0 0 0 20 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17A5 5 0 0 0 6 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 21A9 9 0 0 0 12 3A9 9 0 0 0 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Supabase URL
            </label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11L12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Anonymous Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7V5A2 2 0 0 1 5 3H19A2 2 0 0 1 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 7V19A2 2 0 0 0 5 21H19A2 2 0 0 0 21 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Storage Bucket Name
            </label>
            <input
              type="text"
              placeholder="user-files"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="button-group">
            <button 
              onClick={initializeSupabase} 
              className={`init-button primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Initialize Supabase</span>
                </>
              )}
            </button>

            <button 
              onClick={handleTestApp} 
              className={`init-button secondary ${isTestLoading ? 'loading' : ''}`}
              disabled={isTestLoading}
            >
              {isTestLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Loading Demo...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.7 6.3A1 1 0 0 0 14 7V17A1 1 0 0 0 15 18H19A1 1 0 0 0 20 17V7A1 1 0 0 0 19 6H15A1 1 0 0 0 14.7 6.3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 6H5A1 1 0 0 0 4 7V17A1 1 0 0 0 5 18H9A1 1 0 0 0 10 17V7A1 1 0 0 0 9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Try Demo</span>
                </>
              )}
            </button>
          </div>

          <div className="help-section">
            <div className="help-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9.09 9A3 3 0 0 1 12 8A3 3 0 0 1 12 14A3 3 0 0 0 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="20" x2="12.01" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="help-content">
              <h4>Need Help?</h4>
              <p>Get your Supabase credentials from your project dashboard and create a storage bucket to get started.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="init-footer">
          <p>Built with ❤️ for secure file management</p>
        </div>
      </div>
    </div>
  );
}

export default Initialization; 