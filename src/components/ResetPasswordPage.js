import React, { useState } from 'react';
import { createSupabaseClient } from '../supabaseClient';

function ResetPasswordPage({ supabase: initialSupabase, accessToken, type }) {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [supabase, setSupabase] = useState(initialSupabase);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('supabaseAnonKey') || '');
  const [showCredsForm, setShowCredsForm] = useState(!initialSupabase);

  // Fallback: allow user to paste the full link manually if token is missing
  if (!accessToken || type !== 'recovery') {
    const [manualLink, setManualLink] = useState('');
    const [manualError, setManualError] = useState('');

    function handleManualSubmit(e) {
      e.preventDefault();
      setManualError('');
      try {
        const url = new URL(manualLink);
        let params = new URLSearchParams(url.hash ? url.hash.substring(1) : url.search);
        const pastedToken = params.get('access_token');
        const pastedType = params.get('type');
        if (!pastedToken || pastedType !== 'recovery') {
          setManualError('Invalid link: missing token or type.');
          return;
        }
        // Reload page with correct hash
        window.location.hash = `access_token=${pastedToken}&type=${pastedType}`;
        window.location.reload();
      } catch {
        setManualError('Please paste a valid reset password link.');
      }
    }

    return (
      <div className="login-card">
        <h2>Reset Password</h2>
        <p className="error">Invalid or missing password reset token.</p>
        <div style={{ margin: '18px 0', color: '#555', fontSize: 15 }}>
          If you do not see the password reset form, please paste the full reset link from your email below:
        </div>
        <form onSubmit={handleManualSubmit}>
          <input
            type="text"
            placeholder="Paste your reset password link here"
            value={manualLink}
            onChange={e => setManualLink(e.target.value)}
            className="input-field"
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit" className="button" style={{ marginTop: 0, width: '100%' }}>
            Use This Link
          </button>
        </form>
        {manualError && <p className="error" style={{ marginTop: 8 }}>{manualError}</p>}
      </div>
    );
  }

  function handleCredsSubmit(e) {
    e.preventDefault();
    setError('');
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Please enter both Supabase URL and anon key.');
      return;
    }
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    setSupabase(client);
    setShowCredsForm(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (!accessToken || type !== 'recovery') {
      setError('Invalid or missing password reset token.');
      return;
    }
    if (!supabase) {
      setError('Supabase client not initialized.');
      return;
    }
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: accessToken });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated! You can now sign in with your new password.');
    }
  }

  if (showCredsForm) {
    return (
      <div className="login-card">
        <h2>Enter Supabase Credentials</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleCredsSubmit}>
          <input
            type="text"
            placeholder="Supabase URL"
            value={supabaseUrl}
            onChange={e => setSupabaseUrl(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Supabase Anon Key"
            value={supabaseAnonKey}
            onChange={e => setSupabaseAnonKey(e.target.value)}
            className="input-field"
          />
          <button type="submit" className="button" style={{ marginTop: 10 }}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2>Reset Password</h2>
      {error && <p className="error">{error}</p>}
      {message && <p style={{ color: '#22c55e', textAlign: 'center', marginBottom: 18 }}>{message}</p>}
      <form onSubmit={handleResetPassword}>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="input-field"
        />
        <button type="submit" className="button" style={{ marginTop: 10 }}>
          Set New Password
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage; 