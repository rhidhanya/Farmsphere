import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Wheat,
  FileText,
  FolderOpen,
  LogOut,
  Sprout,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  CheckCircle2,
  XCircle,
  CalendarClock,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const FarmerSidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { labelKey: 'nav.myLoans', path: '/farmer/dashboard', icon: CreditCard, end: true },
    { labelKey: 'nav.myApplications', path: '/farmer/applications', icon: ClipboardList },
    { labelKey: 'nav.availableSchemes', path: '/farmer/loans', icon: Wheat, end: true },
    { labelKey: 'nav.applyNow', path: '/farmer/apply', icon: FileText },
    { labelKey: 'nav.repayments', path: '/farmer/repayments', icon: CalendarClock },
    { labelKey: 'nav.myDocuments', path: '/farmer/documents', icon: FolderOpen },
    { labelKey: 'nav.kycDocuments', path: '/farmer/kyc', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar-root ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <Sprout size={24} />
          </div>
          {!isCollapsed && (
            <div className="brand-titles">
              <h2 className="brand-name">{t('nav.brandName')}</h2>
              <span className="brand-sub">{t('nav.farmerPortal', 'Farmer Portal')}</span>
            </div>
          )}
          <button
            type="button"
            className="mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Farmer Info / FPO Card */}
        {!isCollapsed && (
          <div className="sidebar-fpo-card">
            <div className="farmer-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <User size={18} />
            </div>
            <div className="fpo-card-info">
              <span className="fpo-card-name">{user?.name || t('nav.farmerMember', 'Farmer Member')}</span>
              <span className="fpo-card-reg" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user?.kycStatus === 'VERIFIED' || user?.kycVerified ? (
                  <>
                    <CheckCircle2 size={12} style={{ color: 'var(--status-success, #16a34a)' }} />
                    <span style={{ color: 'var(--status-success, #16a34a)', fontWeight: 600 }}>{t('farmers.kycVerified', 'KYC VERIFIED')}</span>
                  </>
                ) : user?.kycStatus === 'REJECTED' ? (
                  <>
                    <XCircle size={12} style={{ color: 'var(--status-error, #ef4444)' }} />
                    <span style={{ color: 'var(--status-error, #ef4444)', fontWeight: 600 }}>{t('farmers.kycRejected', 'KYC REJECTED')}</span>
                  </>
                ) : (
                  <span>{user?.fpoName || t('nav.fpoMember', 'FPO Member')}</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Main Nav Items */}
        <nav className="sidebar-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const translatedLabel = t(item.labelKey);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                title={isCollapsed ? translatedLabel : undefined}
              >
                <Icon size={20} className="nav-item-icon" />
                {!isCollapsed && <span className="nav-item-label">{translatedLabel}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Collapse Toggle & Logout Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span>{t('nav.collapseMenu')}</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title={isCollapsed ? t('nav.signOut') : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default FarmerSidebar;
