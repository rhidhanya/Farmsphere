import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FarmerSidebar from '../components/FarmerSidebar';
import FarmerHeader from '../components/FarmerHeader';
import { ToastProvider } from '../components/ToastContext';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import Chatbot from '../components/Chatbot/Chatbot';

const FarmerLayout = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <ToastProvider>
      <div className={`admin-app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Farmer Sidebar */}
        <FarmerSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
        />

        {/* Main Content Body */}
        <div className="admin-main-wrapper">
          {/* Farmer Header with consistent Night Mode and Language Switcher */}
          <FarmerHeader onToggleSidebar={toggleMobileSidebar} />

          {/* Page Content Viewport */}
          <main className="admin-page-content" style={{ maxWidth: '100%', padding: '1.5rem' }}>
            <Outlet />
          </main>
        </div>

        {/* Chatbot floating button */}
        <Chatbot />
      </div>
    </ToastProvider>
  );
};

export default FarmerLayout;
