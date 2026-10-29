import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, ErrorBoundary } from './components';
import Loading from './components/Loading';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import FarmerLayout from './layouts/FarmerLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Repayments from './pages/Repayments';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import FarmerDashboard from './pages/FarmerDashboard';
import FarmerLoans from './pages/FarmerLoans';
import FarmerLoanDetail from './pages/FarmerLoanDetail';
import FarmerApplications from './pages/FarmerApplications';
import FarmerRepayments from './pages/FarmerRepayments';
import FarmerApply from './pages/FarmerApply';
import FarmerDocuments from './pages/FarmerDocuments';
import FarmerKycDocuments from './pages/FarmerKycDocuments';
import DocumentVerification from './pages/DocumentVerification';
import LoanDisbursement from './pages/LoanDisbursement';
import Overdue from './pages/Overdue';
import AuditLog from './pages/AuditLog';

// Dynamic Root Route strictly requiring authentication verification
function RootRoute() {
  const { authState, isAuthenticated, user, initializing } = useAuth();

  if (initializing || authState === 'INITIALIZING') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <Loading message="Verifying session..." />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'FPO_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'FARMER') {
      return <Navigate to="/farmer/dashboard" replace />;
    }
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Root Route: strictly authenticated or redirects to /login */}
                <Route path="/" element={<RootRoute />} />

                {/* Protected Farmer Routes with FarmerLayout Sidebar & Header */}
                <Route
                  path="/farmer"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<FarmerDashboard />} />
                  <Route path="applications" element={<FarmerApplications />} />
                  <Route path="loans" element={<FarmerLoans />} />
                  <Route path="loans/:id" element={<FarmerLoanDetail />} />
                  <Route path="apply" element={<FarmerApply />} />
                  <Route path="apply-loan" element={<FarmerApply />} />
                  <Route path="repayments" element={<FarmerRepayments />} />
                  <Route path="documents" element={<FarmerDocuments />} />
                  <Route path="kyc" element={<FarmerKycDocuments />} />
                </Route>

                {/* Protected Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="FPO_ADMIN">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="farmers" element={<Farmers />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="loans/:id" element={<LoanDetail />} />
                  <Route path="repayments" element={<Repayments />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="documents" element={<DocumentVerification />} />
                  <Route path="disbursements" element={<LoanDisbursement />} />
                  <Route path="overdue" element={<Overdue />} />
                  <Route path="audit-log" element={<AuditLog />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
