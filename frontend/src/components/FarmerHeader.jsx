import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, Globe, ChevronDown, Check, Sun, Moon, Sprout, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const FarmerHeader = ({ onToggleSidebar }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const langRef = useRef(null);
  const currentLang = i18n.language || 'en';

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    setShowLangMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="admin-header-root glass-panel">
      <div className="header-left-section">
        <button
          type="button"
          className="mobile-sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="farmer-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="farmer-brand-icon" style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#042f2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sprout size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.2 }}>{t('header.farmerPortalTitle', 'FarmSphere Farmer Portal')}</h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{t('header.farmerPortalSub', 'Agricultural Credit & Document Services')}</p>
          </div>
        </div>
      </div>

      <div className="header-right-section">
        {/* Language Switcher Dropdown */}
        <div className="lang-switcher-wrapper" ref={langRef}>
          <button
            type="button"
            className={`lang-switcher-btn ${showLangMenu ? 'active' : ''}`}
            onClick={() => setShowLangMenu(!showLangMenu)}
            aria-label="Change Language"
          >
            <Globe size={16} className="lang-globe-icon" />
            <span>{currentLang === 'ta' ? 'தமிழ்' : 'English'}</span>
            <ChevronDown size={14} />
          </button>

          {showLangMenu && (
            <div className="lang-dropdown-menu glass-panel">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`lang-option-btn ${currentLang === lang.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span>{lang.label}</span>
                  {currentLang === lang.code && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Switcher Toggle */}
        <button
          type="button"
          className="theme-switcher-btn"
          onClick={toggleTheme}
          aria-label="Toggle Dark / Light Theme"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Moon size={16} className="theme-icon moon-icon" />
              <span className="theme-label">{t('header.themeDark', 'Dark')}</span>
            </>
          ) : (
            <>
              <Sun size={16} className="theme-icon sun-icon" />
              <span className="theme-label">{t('header.themeLight', 'Light')}</span>
            </>
          )}
        </button>

        {/* Farmer Profile Badge */}
        <div className="farmer-profile-chip" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px 4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '100px' }}>
          <div className="farmer-avatar" style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#042f2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name || t('header.farmerDefault', 'Farmer')}
          </span>
          <span className="badge badge-success role-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{t('header.farmerRole', 'FARMER')}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="header-action-btn logout-quick-btn"
          title={t('header.signOut', 'Sign Out')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default FarmerHeader;

