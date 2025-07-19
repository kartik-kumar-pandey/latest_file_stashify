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

  if (!accessToken || type !== 'recovery') {
    return (
      <div className="login-card">
        <h2>Reset Password</h2>
        <p className="error">Invalid or missing password reset token.</p>
      </div>
    );
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