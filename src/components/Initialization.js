import React, { useState } from 'react';
import { createSupabaseClient } from '../supabaseClient';

function Initialization({ onInitialize }) {
  const [supabaseUrl, setSupabaseUrl] = React.useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = React.useState(localStorage.getItem('supabaseAnonKey') || '');
  const [bucketName, setBucketName] = React.useState(localStorage.getItem('bucketName') || 'user-files');
  const [error, setError] = React.useState('');

  const [cloudyfyModalOpen, setCloudyfyModalOpen] = useState(false);
  const [cloudName, setCloudName] = useState(localStorage.getItem('cloudyfyCloudName') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('cloudyfyApiKey') || '');
  const [apiSecret, setApiSecret] = useState(localStorage.getItem('cloudyfyApiSecret') || '');
  const [uploadPreset, setUploadPreset] = useState(localStorage.getItem('cloudyfyUploadPreset') || '');
  const [cloudyfyMsg, setCloudyfyMsg] = useState('');

  const TEST_SUPABASE_URL = 'https://ihzkgmhwdjwvcagiexgs.supabase.co';
  const TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemtnbWh3ZGp3dmNhZ2lleGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzkxMDIsImV4cCI6MjA2ODMxNTEwMn0.HaO2OwONX9alvJak320RCbm_q7uxDX2gLAln3eRLSWE';
  const TEST_BUCKET_NAME = 'demo';

  async function initializeSupabase() {
    setError('');
    if (!supabaseUrl || !supabaseAnonKey || !bucketName) {
      setError('Please enter Supabase URL, anon key, and bucket name.');
      return;
    }
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    try {
      const { data: buckets, error: bucketError } = await client.storage.listBuckets();
      if (bucketError) {
        setError('Error checking buckets: ' + bucketError.message);
        return;
      }
      const normalizedInput = bucketName.trim().toLowerCase();
      const found = buckets && buckets.some(b => {
        const normalizedBucket = b.name.trim().toLowerCase();
        return normalizedBucket === normalizedInput;
      });
      if (!found) {
        setError(`Bucket "${bucketName}" does not exist on this Supabase project.`);
        return;
      }
    } catch (err) {
      setError('Error validating bucket: ' + (err.message || err.toString()));
      return;
    }
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
    localStorage.setItem('bucketName', bucketName);
    onInitialize(client, bucketName);
  }

  async function handleTestApp() {
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
    <>
      <h1 className="init-title">
        FileStashify
      </h1>
      <div className="init-card">
        <h2>Initialize Supabase</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Supabase URL"
          value={supabaseUrl}
          onChange={(e) => setSupabaseUrl(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Supabase Anon Key"
          value={supabaseAnonKey}
          onChange={(e) => setSupabaseAnonKey(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Storage Bucket Name"
          value={bucketName}
          onChange={(e) => setBucketName(e.target.value)}
          className="input-field"
        />
        <button onClick={initializeSupabase} className="button">
          Initialize Supabase
        </button>
        <button onClick={handleTestApp} className="button" style={{ marginTop: 16, background: '#7c3aed', color: '#fff' }}>
          Test the App
        </button>
      </div>
    </>
  );
}

export default Initialization; 