import React from 'react';
import { createSupabaseClient } from '../supabaseClient';

function Initialization({ onInitialize }) {
  const [supabaseUrl, setSupabaseUrl] = React.useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = React.useState(localStorage.getItem('supabaseAnonKey') || '');
  const [bucketName, setBucketName] = React.useState(localStorage.getItem('bucketName') || 'user-files');
  const [error, setError] = React.useState('');

  async function initializeSupabase() {
    setError('');
    if (!supabaseUrl || !supabaseAnonKey || !bucketName) {
      setError('Please enter Supabase URL, anon key, and bucket name.');
      return;
    }
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    // Validate bucket existence
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
      </div>
    </>
  );
}

export default Initialization; 