import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { createSupabaseClient } from './supabaseClient';
import './App.css';
import Initialization from './components/Initialization';
import GuideButtonWithGuide from './components/GuideButtonWithGuide';
import FileManager from './components/FileManager';
import ResetPasswordPage from './components/ResetPasswordPage';
import SharePage from './components/SharePage';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AppContent({ darkMode, setDarkMode }) {
  const [supabase, setSupabase] = useState(null);
  const [bucketName, setBucketName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [session, setSession] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      const supabaseUrl = localStorage.getItem('supabaseUrl');
      const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');
      const storedBucketName = localStorage.getItem('bucketName');
      if (supabaseUrl && supabaseAnonKey && storedBucketName) {
        const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
        setSupabase(client);
        setBucketName(storedBucketName);
      }
    }
  }, [supabase]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    if (
      window.location.pathname === '/' &&
      window.location.hash.includes('access_token') &&
      window.location.hash.includes('type=recovery')
    ) {
      navigate('/reset-password' + window.location.hash, { replace: true });
    }
  }, [navigate]);

  if (window.location.pathname === '/reset-password') {
    return null;
  }

  function getSupabaseParams() {
    let params = new URLSearchParams(window.location.search);
    let accessToken = params.get('access_token');
    let type = params.get('type');
    if (!accessToken || !type) {
      if (window.location.hash && window.location.hash.startsWith('#')) {
        let hash = window.location.hash.substring(1);
        if (hash.startsWith('/')) hash = hash.substring(1);
        params = new URLSearchParams(hash);
        accessToken = params.get('access_token');
        type = params.get('type');
      }
    }
    return { accessToken, type };
  }
  const { accessToken, type } = getSupabaseParams();

  function handleInitialize(client, bucket) {
    setSupabase(client);
    setBucketName(bucket);
  }

  function handleUserEmail(email) {
    setUserEmail(email);
  }

  async function signIn() {
    setError('');
    if (!supabase) {
      setError('Supabase client not initialized.');
      toast.error('Supabase client not initialized.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      toast.error(error.message);
    }
  }

  async function signUp() {
    setError('');
    if (!supabase) {
      setError('Supabase client not initialized.');
      toast.error('❌ Supabase client not initialized.');
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      toast.error('❌ ' + error.message);
    } else {
      toast.success('✅ Check your email for the confirmation link!');
    }
  }

  async function handleForgotPassword() {
    setError('');
    if (!email) {
      setError('Please enter your email to reset password.');
      toast.error('⚠️ Please enter your email to reset password.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
      toast.error('❌ ' + error.message);
    } else {
      toast.info('📧 Password reset email sent! Check your inbox.');
    }
  }



  if (type === 'recovery' && accessToken) {
    let tempSupabase = null;
    try {
      const supabaseUrl = localStorage.getItem('supabaseUrl');
      const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');
      if (supabaseUrl && supabaseAnonKey) {
        tempSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
      }
    } catch {}
    return (
      <>
        <div className="topbar" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100 }}>
          <div className="topbar-content" style={{ justifyContent: 'center' }}>
            <span className="app-title">FileStashify</span>
          </div>
        </div>
        <div style={{ height: 72 }} />
        <ResetPasswordPage supabase={tempSupabase} accessToken={accessToken} type={type} />
      </>
    );
  }

  if (!supabase) {
    return (
      <>
        <Initialization onInitialize={handleInitialize} />
        <GuideButtonWithGuide />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <div className="topbar" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100 }}>
          <div className="topbar-content" style={{ justifyContent: 'center' }}>
            <span className="app-title">FileStashify</span>
          </div>
        </div>
        <div style={{ height: 72 }} />
        <div className="login-card">
          <h2>{showSignUp ? 'Sign Up' : 'Sign In'}</h2>
          {error && <p className="error">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          {/* Google Sign-In Button */}
          <button
            className="button"
            style={{ marginTop: 12, background: '#fff', color: '#333', border: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
            onClick={async () => {
              setError('');
              if (!supabase) {
                setError('Supabase client not initialized.');
                return;
              }
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
              if (error) setError(error.message);
            }}
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: 20, height: 20 }} />
            Sign in with Google
          </button>
          <div className="login-actions-row">
            {showSignUp ? (
              <button onClick={signUp} className="button">
                Sign Up
              </button>
            ) : (
              <button onClick={signIn} className="button">
                Sign In
              </button>
            )}
          </div>
          {!showSignUp && (
            <button onClick={handleForgotPassword} className="button" style={{ marginTop: 12, background: 'none', color: '#4f8cff', boxShadow: 'none', textDecoration: 'underline', fontWeight: 500, fontSize: 15 }}>
              Forgot Password?
            </button>
          )}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            {showSignUp ? (
              <span style={{ fontSize: 15 }}>
                Already have an account?{' '}
                <button type="button" style={{ background: 'none', border: 'none', color: '#4f8cff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500, fontSize: 15 }} onClick={() => { setShowSignUp(false); setError(''); }}>
                  Sign In
                </button>
              </span>
            ) : (
              <span style={{ fontSize: 15 }}>
                New user?{' '}
                <button type="button" style={{ background: 'none', border: 'none', color: '#4f8cff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500, fontSize: 15 }} onClick={() => { setShowSignUp(true); setError(''); }}>
                  Create an account
                </button>
              </span>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-content">
          <span className="app-title">FileStashify</span>
          <div className="user-info">
            <button
              className="button"
              style={{ marginRight: 18, background: darkMode ? '#23272f' : '#e0e4ea', color: darkMode ? '#fff' : '#23272f', border: '1.5px solid #bbb', fontWeight: 600 }}
              onClick={() => setDarkMode(dm => !dm)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '🌙 Dark' : '☀️ Light'}
            </button>
            {userEmail && <span style={{ color: '#4f8cff', fontWeight: 600, marginRight: 18 }}>{userEmail}</span>}
            {session && (
              <button onClick={() => supabase.auth.signOut()} className="button logout-button">Logout</button>
            )}
          </div>
        </div>
      </div>
      <div className="main-content">
        <FileManager
          supabase={supabase}
          bucketName={bucketName}
          onUserEmail={handleUserEmail}
          session={session}
          setSession={setSession}
          darkMode={darkMode}
        />
      </div>
      <footer className="app-footer">
        © 2025 FileStashify. All rights reserved.
      </footer>
    </>
  );
}

function ResetPasswordPageWrapper() {
  let params = new URLSearchParams(window.location.search);
  let accessToken = params.get('access_token');
  let type = params.get('type');
  if (!accessToken || !type) {
    if (window.location.hash && window.location.hash.startsWith('#')) {
      let hash = window.location.hash.substring(1);
      if (hash.startsWith('/')) hash = hash.substring(1);
      params = new URLSearchParams(hash);
      accessToken = params.get('access_token');
      type = params.get('type');
    }
  }
  console.log("Rendering ResetPasswordPageWrapper", { accessToken, type });

  let tempSupabase = null;
  try {
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');
    if (supabaseUrl && supabaseAnonKey) {
      tempSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    }
  } catch {}
  return (
    <>
      <div className="topbar" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100 }}>
        <div className="topbar-content" style={{ justifyContent: 'center' }}>
          <span className="app-title">FileStashify</span>
        </div>
      </div>
      <div style={{ height: 72 }} />
      <ResetPasswordPage supabase={tempSupabase} accessToken={accessToken} type={type} />
    </>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = React.useState(false);
  useEffect(() => {
  }, []);
  console.log("AppContent rendered, path:", window.location.pathname);
  return (
    <Router>
      <ToastContainer position="top-center" autoClose={4000} theme={darkMode ? 'dark' : 'light'} />
      <Routes>
        <Route path="/share" element={<SharePage />} />
        <Route path="/reset-password" element={<ResetPasswordPageWrapper />} />
        <Route path="*" element={<AppContent darkMode={darkMode} setDarkMode={setDarkMode} />} />
      </Routes>
    </Router>
  );
} 