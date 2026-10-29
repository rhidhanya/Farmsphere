import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import './Register.css';

const Register = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register, loading, isAuthenticated, authState, user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // If already authenticated as farmer or admin, redirect to respective dashboard
  useEffect(() => {
    if ((isAuthenticated || authState === 'AUTHENTICATED') && user) {
      if (user.role === 'FPO_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/farmer/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, authState, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const validateForm = () => {
    const { name, age, email, phone, password, confirmPassword } = formData;

    if (!name.trim()) {
      setFormError(t('auth.nameRequired', 'Please enter your full name.'));
      return false;
    }
    if (name.trim().length < 2) {
      setFormError(t('auth.nameMinLength', 'Full name must be at least 2 characters long.'));
      return false;
    }

    if (!age || age.trim() === '') {
      setFormError(t('auth.ageRequired', 'Please enter your age.'));
      return false;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 120) {
      setFormError(t('auth.ageInvalid', 'Age must be a valid integer between 18 and 120.'));
      return false;
    }

    if (!email.trim()) {
      setFormError(t('auth.emailRequired', 'Please enter your email address.'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError(t('auth.emailInvalid', 'Please enter a valid email address format.'));
      return false;
    }

    if (!phone.trim()) {
      setFormError(t('auth.phoneRequired', 'Please enter your 10-digit mobile number.'));
      return false;
    }
    const cleanedPhone = phone.trim().replace(/[\s\-\(\)\+]/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setFormError(t('auth.phoneInvalid', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'));
      return false;
    }

    if (!password) {
      setFormError(t('auth.passwordRequired', 'Please enter a password.'));
      return false;
    }
    if (password.length < 8) {
      setFormError(t('auth.passwordMinLength', 'Password must be at least 8 characters long.'));
      return false;
    }

    if (!confirmPassword) {
      setFormError(t('auth.confirmPasswordRequired', 'Please confirm your password.'));
      return false;
    }
    if (password !== confirmPassword) {
      setFormError(t('auth.passwordMismatch', 'Passwords do not match. Please re-enter matching passwords.'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      age: parseInt(formData.age, 10),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim().replace(/[\s\-\(\)\+]/g, ''),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      role: 'FARMER',
    };

    const result = await register(payload);
    if (result.success && result.user) {
      setSuccessMessage(t('auth.registrationSuccess', 'Account created successfully! Redirecting to your dashboard...'));
      setTimeout(() => {
        navigate('/farmer/dashboard', { replace: true });
      }, 700);
    } else if (result.message) {
      setFormError(result.message);
    }
  };

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

        {/* Right: Registration Card */}
        <div className="auth-form-column">
          <div className="register-card glass-panel">
        {/* Header */}
        <div className="register-header" style={{ position: 'relative' }}>
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

          <div className="register-brand-icon">
            <Building2 size={28} />
          </div>
          <h1>{t('auth.registerTitle', 'Farmer Registration')}</h1>
          <p>{t('auth.registerSub', 'Create your FarmSphere farmer account to apply for agricultural credit')}</p>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="register-error-alert" role="alert">
            <ShieldAlert size={18} className="alert-icon" />
            <div className="alert-content">
              <span>{formError}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="register-success-alert" role="status">
            <CheckCircle2 size={18} className="alert-icon" />
            <div className="alert-content">
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="register-form" noValidate>
          {/* Full Name & Age row */}
          <div className="register-grid-row">
            <div className="form-group flex-2">
              <label className="form-label" htmlFor="register-name">
                {t('auth.fullNameLabel', 'Full Name')} <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  className="form-input with-icon"
                  placeholder={t('auth.fullNamePlaceholder', 'Enter your full name')}
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group flex-1">
              <label className="form-label" htmlFor="register-age">
                {t('auth.ageLabel', 'Age')} <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <Calendar size={18} className="input-icon" />
                <input
                  id="register-age"
                  name="age"
                  type="number"
                  min="18"
                  max="120"
                  className="form-input with-icon"
                  placeholder={t('auth.agePlaceholder', 'e.g. 35')}
                  value={formData.age}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              {t('auth.emailLabel', 'Email Address')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="register-email"
                name="email"
                type="email"
                className="form-input with-icon"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">
              {t('auth.mobileLabel', 'Mobile Number')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper phone-wrapper">
              <span className="phone-prefix">+91</span>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                maxLength="10"
                className="form-input with-prefix"
                placeholder={t('auth.mobilePlaceholder', '10-digit mobile number')}
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              {t('auth.passwordLabel', 'Password')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input with-icon with-eye"
                placeholder="•••••••• (min. 8 characters)"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              {t('auth.confirmPasswordLabel', 'Confirm Password')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input with-icon with-eye"
                placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter your password')}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary register-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>{t('auth.registering', 'Creating account...')}</span>
              </>
            ) : (
              <>
                <span>{t('auth.registerBtn', 'Create Farmer Account')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="register-footer-prompt">
          <span>{t('auth.alreadyHaveAccount', 'Already have an account?')}</span>{' '}
          <Link to="/login" className="login-link-btn">
            {t('auth.signInLink', 'Sign in')}
          </Link>
        </div>

        <div className="register-footer">
          <p>{t('auth.authorizedOnly', 'Authorized access for Farmer Members & FPO Administrators.')}</p>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
