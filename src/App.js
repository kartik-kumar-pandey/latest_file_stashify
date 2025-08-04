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
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) {
          // Load user profile info when user signs in
          await loadUserInfo();
        } else {
          setUserInfo(null);
        }
      });
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        setSession(session);
        if (session) {
          await loadUserInfo();
        }
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [supabase]);

  // Function to load user profile information
  async function loadUserInfo() {
    try {
      // For now, create basic user info from session
      if (session?.user) {
        const user = session.user;
        const userData = user.user_metadata || {};
        
        setUserInfo({
          id: user.id,
          email: user.email,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          displayName: userData.display_name || null,
          avatarUrl: userData.avatar_url || null,
          initials: userData.first_name && userData.last_name 
            ? `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`.toUpperCase()
            : user.email?.charAt(0).toUpperCase() || 'U',
          fullName: userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : userData.first_name || userData.last_name || user.email || 'User'
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      // Fallback: create basic user info from session
      if (session?.user) {
        setUserInfo({
          id: session.user.id,
          email: session.user.email,
          firstName: null,
          lastName: null,
          displayName: null,
          avatarUrl: null,
          initials: session.user.email?.charAt(0).toUpperCase() || 'U',
          fullName: session.user.email || 'User'
        });
      }
    }
  }

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

  function searchFiles(query) {
    setSearchQuery(query);
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

    // Validate required fields
    if (!firstName.trim()) {
      setError('First name is required.');
      toast.error('⚠️ First name is required.');
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required.');
      toast.error('⚠️ Last name is required.');
      return;
    }

    try {
      // Sign up with user metadata and disable email confirmation for testing
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: `${firstName.trim()} ${lastName.trim()}`
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setError(error.message);
        toast.error('❌ ' + error.message);
      } else {
        // Check if email confirmation is required
        if (data.user && !data.user.email_confirmed_at) {
          toast.success('✅ Check your email for the confirmation link!');
        } else {
          toast.success('✅ Account created successfully! You can now sign in.');
        }
        
        // Clear form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setShowSignUp(false); // Switch back to sign in
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
      toast.error('❌ An unexpected error occurred. Please try again.');
    }
  }

  async function handleForgotPassword() {
    console.log('Forgot password button clicked!');
    setShowForgotPasswordModal(true);
    setForgotPasswordEmail('');
    setError('');
  }

  async function handleForgotPasswordSubmit() {
    setIsForgotPasswordLoading(true);
    setError('');
    
    if (!forgotPasswordEmail) {
      setError('Please enter your email to reset password.');
      toast.error('⚠️ Please enter your email to reset password.');
      setIsForgotPasswordLoading(false);
      return;
    }
    
    if (!supabase) {
      setError('Supabase client not initialized.');
      toast.error('Supabase client not initialized.');
      setIsForgotPasswordLoading(false);
      return;
    }
    
    // Check if we have the required Supabase configuration
    const supabaseUrl = localStorage.getItem('supabaseUrl');
    const supabaseAnonKey = localStorage.getItem('supabaseAnonKey');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase configuration is missing. Please check your setup.');
      toast.error('❌ Supabase configuration is missing. Please check your setup.');
      setIsForgotPasswordLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
    if (error) {
      setError(error.message);
      toast.error('❌ ' + error.message);
    } else {
        toast.success('📧 Password reset email sent! Check your inbox and spam folder.');
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail('');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      toast.error('❌ An unexpected error occurred. Please try again.');
    }
    
    setIsForgotPasswordLoading(false);
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
      <div className="auth-container">
        {/* Animated Background */}
        <div className="auth-background">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
            <div className="shape shape-5"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="auth-content">
          {/* Header */}
          <div className="auth-header">
            <div className="logo-container">
              <div className="logo-icon">
                <img src="/logo.png" alt="FileStashify Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h1 className="auth-title">
                FileStashify
              </h1>
            </div>
            <p className="auth-subtitle">
              Secure cloud file management with Supabase
            </p>
          </div>

          {/* Auth Card */}
          <div className="auth-card">
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11L12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>{showSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="card-description">
                {showSignUp ? 'Sign up to start managing your files securely' : 'Sign in to access your files'}
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

            {showSignUp && (
              <>
                <div className="input-group">
                  <label className="input-label">
                    <span className="label-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <span className="label-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            )}

            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Email Address
              </label>
          <input
            type="email"
                placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
            </div>

            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8H20C20.5523 8 21 8.44772 21 9V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V9C3 8.44772 3.44772 8 4 8H6V7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7V8ZM5 10V20H19V10H5ZM11 14H13V16H11V14ZM7 14H9V16H7V14ZM15 14H17V16H15V14ZM16 8V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V8H16Z"></path>
                  </svg>
                </span>
                Password
              </label>
          <input
            type="password"
                placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
            </div>

          {/* Google Sign-In Button */}
          <button
              className="google-auth-button"
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
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
              <span>Continue with Google</span>
          </button>

            <div className="button-group">
            {showSignUp ? (
                <button onClick={signUp} className="auth-button primary">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19A4 4 0 0 0 12 15H8A4 4 0 0 0 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Create Account</span>
              </button>
            ) : (
                <button onClick={signIn} className="auth-button primary">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Sign In</span>
              </button>
            )}
          </div>

          {!showSignUp && (
              <button onClick={handleForgotPassword} className="forgot-password-button">
              Forgot Password?
            </button>
          )}

            <div className="auth-switch">
            {showSignUp ? (
                <span className="switch-text">
                Already have an account?{' '}
                  <button type="button" className="switch-link" onClick={() => { 
                    setShowSignUp(false); 
                    setError(''); 
                    setFirstName('');
                    setLastName('');
                    setEmail('');
                    setPassword('');
                  }}>
                  Sign In
                </button>
              </span>
            ) : (
                <span className="switch-text">
                New user?{' '}
                  <button type="button" className="switch-link" onClick={() => { 
                    setShowSignUp(true); 
                    setError(''); 
                    setFirstName('');
                    setLastName('');
                    setEmail('');
                    setPassword('');
                  }}>
                  Create an account
                </button>
              </span>
            )}
          </div>
        </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>Built with ❤️ for secure file management</p>
          </div>

          {/* Forgot Password Modal */}
          {showForgotPasswordModal && (
            <div className="modal-overlay" onClick={() => setShowForgotPasswordModal(false)}>
              <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2>Reset Password</h2>
                  <p className="modal-description">
                    Enter your email address and we'll send you a link to reset your password. 
                    Make sure to check your spam folder if you don't see the email.
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
                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="input-field"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleForgotPasswordSubmit();
                      }
                    }}
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={handleForgotPasswordSubmit} 
                    className={`modal-button primary ${isForgotPasswordLoading ? 'loading' : ''}`}
                    disabled={isForgotPasswordLoading}
                  >
                    {isForgotPasswordLoading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setShowForgotPasswordModal(false)} 
                    className="modal-button secondary"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="FileStashify Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <span className="app-title">FileStashify</span>
          </div>
          <div className="user-info">
            {userInfo && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                marginRight: '18px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.25)';
              }}
              title={`${userInfo.fullName} (${userInfo.email})`}
            >
              <span style={{
                fontSize: '16px',
                color: '#ffffff',
                fontWeight: '500',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                letterSpacing: '0.3px'
              }}>
                👤
              </span>
              <span style={{
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                letterSpacing: '0.3px',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userInfo.fullName}
              </span>
            </div>
            )}
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search files across all folders..."
                    value={searchQuery}
                    onChange={(e) => searchFiles(e.target.value)}
                    style={{
                      padding: '12px 16px 12px 44px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '25px',
                      fontSize: '15px',
                      width: '320px',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: '#ffffff',
                      color: '#2d3748',
                      fontWeight: '400',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4f8cff';
                      e.target.style.boxShadow = '0 4px 20px rgba(79, 140, 255, 0.15), 0 0 0 3px rgba(79, 140, 255, 0.1)';
                      e.target.style.transform = 'scale(1.02)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e1e5e9';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      e.target.style.transform = 'scale(1)';
                    }}
                    onMouseEnter={(e) => {
                      if (document.activeElement !== e.target) {
                        e.target.style.borderColor = '#cbd5e0';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (document.activeElement !== e.target) {
                        e.target.style.borderColor = '#e1e5e9';
                        e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      }
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#718096',
                    fontSize: '18px',
                    pointerEvents: 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    🔍
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => searchFiles('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#a0aec0',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        width: '24px',
                        height: '24px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f7fafc';
                        e.target.style.color = '#4a5568';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#a0aec0';
                      }}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="main-content">
                    <FileManager 
              supabase={supabase} 
              bucketName={bucketName} 
              onUserEmail={handleUserEmail} 
              userInfo={userInfo}
              session={session} 
              setSession={setSession} 
              darkMode={darkMode} 
              setDarkMode={setDarkMode} 
              searchQuery={searchQuery} 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="FileStashify Logo" style={{ width: '25px', height: '25px', objectFit: 'contain' }} />
            <span className="app-title">FileStashify</span>
          </div>
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