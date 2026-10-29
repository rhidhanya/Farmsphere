import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sprout,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import './Login.css';

const Login = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    login,
    loginWithGoogle,
    loading,
    initializing,
    isAuthenticated,
    authState,
    error: authError,
    setError,
    user,
  } = useAuth();
  const navigate = useNavigate();

  const getRedirectPath = (userRole) => {
    if (userRole === 'FARMER') {
      if (
        location.state?.from?.pathname &&
        location.state.from.pathname.startsWith('/farmer') &&
        location.state.from.pathname !== '/login'
      ) {
        return location.state.from.pathname;
      }
      return '/farmer/dashboard';
    }
    if (userRole === 'FPO_ADMIN') {
      if (
        location.state?.from?.pathname &&
        location.state.from.pathname.startsWith('/admin') &&
        location.state.from.pathname !== '/login'
      ) {
        return location.state.from.pathname;
      }
      return '/admin/dashboard';
    }
    return '/login';
  };

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if ((isAuthenticated || authState === 'AUTHENTICATED') && user) {
      navigate(getRedirectPath(user.role), { replace: true });
    }
  }, [isAuthenticated, authState, user, navigate]);

  // Initialize Google Identity Services
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return;
    }

    const handleGoogleCredentialResponse = async (response) => {
      const googleToken = response?.credential || response?.idToken;
      if (googleToken) {
        setFormError('');
        if (setError) setError(null);
        const result = await loginWithGoogle(googleToken);
        if (result.success && result.user) {
          navigate(getRedirectPath(result.user.role), { replace: true });
        } else if (result.message) {
          setFormError(result.message);
        }
      } else {
        setFormError('Google sign-in was cancelled or no credential was returned. Please try again or use email sign-in.');
      }
    };

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });

          const btnElement = document.getElementById('google-signin-btn');
          if (btnElement) {
            window.google.accounts.id.renderButton(btnElement, {
              theme: 'outline',
              size: 'large',
              width: btnElement.offsetWidth || 360,
              text: 'continue_with',
              shape: 'rectangular',
            });
          }
        } catch (err) {
          console.warn('Google Identity initialization error:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [loginWithGoogle, navigate, location, setError]);

  const validateEmailForm = () => {
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address format.');
      return false;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return false;
    }
    return true;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (setError) setError(null);

    if (!validateEmailForm()) {
      return;
    }

    const result = await login(email.trim(), password);
    if (result.success && result.user) {
      navigate(getRedirectPath(result.user.role), { replace: true });
    } else if (result.message) {
      setFormError(result.message);
    }
  };

  const displayError = formError || authError;

  if (initializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
        }}
      >
        <Loader2
          size={36}
          className="spinner-icon"
          style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-color, #16a34a)' }}
        />
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      {/* Dynamic Agricultural Background & Ambient Glow */}
      <div className="auth-background-effects" aria-hidden="true">
        <div className="auth-gradient-mesh"></div>
        <div className="auth-aura aura-1"></div>
        <div className="auth-aura aura-2"></div>
        <div className="auth-aura aura-3"></div>
        <div className="auth-floating-decor decor-1">🌱</div>
        <div className="auth-floating-decor decor-2">🌾</div>
        <div className="auth-floating-decor decor-3">🚜</div>
        <div className="auth-floating-decor decor-4">🪙</div>
      </div>

      <div className="auth-container">
        {/* Left: Hero Showcase Column */}
        <div className="auth-showcase">
          <div className="auth-showcase-badge">
            <span className="badge-dot"></span>
            <span>{t('auth.portalBadge', 'Agricultural Credit & FPO Portal')}</span>
          </div>

          <h1 className="auth-showcase-heading">
            {t('auth.welcomeHeading', 'WELCOME TO FARMSPHERE')}
          </h1>

          <p className="auth-showcase-tagline">
            {t('auth.welcomeTagline', 'Empowering farmers with accessible, fair, and transparent agricultural credit.')}
          </p>

          <div className="auth-showcase-features">
            <div className="auth-feature-card">
              <div className="feature-icon-wrapper">
                <Sprout size={20} className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>{t('auth.feature1Title', 'Subsidized Crop & Equipment Credit')}</h3>
                <p>{t('auth.feature1Desc', 'Interest rates starting from 4.0% p.a. with flexible seasonal repayments.')}</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="feature-icon-wrapper">
                <CheckCircle2 size={20} className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>{t('auth.feature2Title', 'Instant Digital Applications')}</h3>
                <p>{t('auth.feature2Desc', 'Apply online with instant eligibility checks and zero paper bottlenecks.')}</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={20} className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>{t('auth.feature3Title', 'Direct Institutional Support')}</h3>
                <p>{t('auth.feature3Desc', 'Backed by registered FPOs with direct transparent bank disbursements.')}</p>
              </div>
            </div>
          </div>

          <div className="auth-showcase-footer">
            <div className="trust-pill">
              <span className="trust-stars">★★★★★</span>
              <span>{t('auth.farmerTrustStat', 'Trusted by farmer members across Tamil Nadu')}</span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Card */}
        <div className="auth-form-column">
          <div className="login-card glass-panel">
            <div className="login-header" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage(i18n.language === 'ta' ? 'en' : 'ta')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    color: 'var(--text-main, #0f172a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Switch Language / மொழியை மாற்றவும்"
                >
                  <span>{i18n.language === 'ta' ? 'தமிழ்' : 'English'}</span>
                </button>
              </div>
              <div className="login-brand-icon">
                <Building2 size={28} />
              </div>
              <h1>{t('auth.portalTitle')}</h1>
              <p>{t('auth.portalSub')}</p>
            </div>

            {displayError && (
              <div className="login-error-alert">
                <ShieldAlert size={18} className="alert-icon" />
                <div className="alert-content">
                  <span>{displayError}</span>
                </div>
              </div>
            )}

            {/* Email & Password Login Form */}
            <form onSubmit={handleEmailSubmit} className="login-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-email">
                  {t('auth.emailLabel')}
                </label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="admin-email"
                    type="email"
                    className="form-input with-icon"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formError) setFormError('');
                    }}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">
                  {t('auth.passwordLabel')}
                </label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input with-icon with-eye"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formError) setFormError('');
                    }}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.signInBtn')}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* OR Divider */}
            <div className="login-divider">
              <span>OR</span>
            </div>

            {/* Google Sign-In */}
            <div className="google-auth-container">
              <div id="google-signin-btn" className="google-btn-wrapper"></div>
            </div>

            {/* Create Account Link */}
            <div className="login-register-prompt">
              <span>{t('auth.noAccountPrompt', "Don't have an account?")}</span>{' '}
              <Link to="/register" className="register-link-btn">
                {t('auth.createAccount', 'Create account')}
              </Link>
            </div>

            <div className="login-footer">
              <p>{t('auth.authorizedOnly')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
