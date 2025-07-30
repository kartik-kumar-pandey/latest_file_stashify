import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createSupabaseClient } from '../supabaseClient';

function ResetPasswordPage({ supabase: initialSupabase, accessToken, type }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [supabase, setSupabase] = useState(initialSupabase);
  const [showCredsForm, setShowCredsForm] = useState(!initialSupabase);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('supabaseAnonKey') || '');
  const navigate = useNavigate();

  useEffect(() => {
  if (!accessToken || type !== 'recovery') {
      setError('Invalid reset link. Please try again.');
    }
  }, [accessToken, type]);

  const handleCredsSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Please enter both Supabase URL and anon key.');
      return;
    }
    
    try {
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    setSupabase(client);
    setShowCredsForm(false);
    } catch (err) {
      setError('Invalid Supabase credentials. Please check your URL and anon key.');
  }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setError('Supabase client not initialized.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

    if (error) {
      setError(error.message);
        toast.error('❌ ' + error.message);
    } else {
        setIsSuccess(true);
        toast.success('✅ Password updated successfully!');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      toast.error('❌ An unexpected error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  // Show credentials form if Supabase client is not available
  if (showCredsForm) {
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

          {/* Credentials Card */}
          <div className="auth-card">
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Supabase Credentials Required</h2>
              <p className="card-description">
                Please enter your Supabase project details to complete the password reset
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

            <form onSubmit={handleCredsSubmit} className="reset-form">
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
                  required
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
                  required
                />
              </div>

              <div className="button-group">
                <button type="submit" className="auth-button primary">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Continue</span>
          </button>
              </div>
        </form>

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
                                 <p>You can find your Supabase URL and anon key in your Supabase project dashboard under Settings &gt; API.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>Built with ❤️ for secure file management</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
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
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="auth-title">
                FileStashify
              </h1>
            </div>
            <p className="auth-subtitle">
              Secure cloud file management with Supabase
            </p>
          </div>

          {/* Success Card */}
          <div className="auth-card">
            <div className="card-header">
              <div className="card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12A10 10 0 1 1 5.68 3.57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Password Updated!</h2>
              <p className="card-description">
                Your password has been successfully updated. You'll be redirected to the login page.
              </p>
            </div>

            <div className="success-message">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12A10 10 0 1 1 5.68 3.57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Password updated successfully!</span>
            </div>
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>Built with ❤️ for secure file management</p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Reset Password Card */}
        <div className="auth-card">
          <div className="card-header">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 7H18C19.1046 7 20 7.89543 20 9V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V9C4 7.89543 4.89543 7 6 7H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 11L12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Reset Your Password</h2>
            <p className="card-description">
              Enter your new password below to complete the reset process
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

          <form onSubmit={handleSubmit} className="reset-form">
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 11H5M12 19V12M12 12L16 16M12 12L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 11H5M12 19V12M12 12L16 16M12 12L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                Confirm Password
              </label>
        <input
          type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
                required
              />
            </div>

            <div className="button-group">
              <button 
                type="submit" 
                className={`auth-button primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.08V12A10 10 0 1 1 5.68 3.57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Update Password</span>
                  </>
                )}
        </button>
            </div>
      </form>

          <div className="help-section">
            <div className="help-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9.09 9A3 3 0 0 1 12 6A3 3 0 0 1 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="help-content">
              <h4>Password Requirements</h4>
              <p>Your password must be at least 6 characters long and should be secure.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <p>Built with ❤️ for secure file management</p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage; 