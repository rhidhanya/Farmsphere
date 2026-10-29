import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { loanAPI, repaymentAPI, documentAPI } from '../api/client';
import { openDocumentPreview } from '../utils/documentPreview';
import {
  Sprout,
  LogOut,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  User,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  CalendarClock,
  Receipt,
  ClipboardList,
} from 'lucide-react';
import './FarmerDashboard.css';

const FarmerDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFarmerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loansRes, repaymentsRes, docsRes] = await Promise.allSettled([
        loanAPI.getMyLoans(),
        repaymentAPI.getMyRepayments(),
        documentAPI.getMyDocuments(),
      ]);

      if (loansRes.status === 'fulfilled') {
        setLoans(loansRes.value.data?.data?.loans || []);
      }
      if (repaymentsRes.status === 'fulfilled') {
        setRepayments(repaymentsRes.value.data?.data?.repayments || []);
      }
      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.data?.data?.documents || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load farmer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'DISBURSED':
      case 'VERIFIED':
      case 'PAID':
        return 'badge-success';
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
      case 'PENDING':
      case 'PARTIAL':
        return 'badge-warning';
      case 'REJECTED':
      case 'OVERDUE':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  // Summary Metrics strictly based on actual backend data
  const totalApplications = loans.length;
  const totalLoanAmount = loans.reduce((acc, curr) => acc + (curr.loanAmount || 0), 0);
  const activeLoans = loans.filter((l) => l.status === 'DISBURSED').length;
  const pendingRepayments = repayments.filter(
    (r) => r.paymentStatus === 'PENDING' || r.paymentStatus === 'OVERDUE' || r.paymentStatus === 'PARTIAL'
  ).length;
  const overdueRepayments = repayments.filter((r) => r.paymentStatus === 'OVERDUE').length;

  return (
    <div className="farmer-dashboard-layout" style={{ minHeight: 'auto', background: 'transparent' }}>
      {/* Main Content Area */}
      <main className="farmer-main-container" style={{ padding: '0 0 2rem 0', maxWidth: '100%' }}>
        {/* Welcome & Stats Row */}
        <section className="farmer-stats-grid">
          {/* 1. Total Applications */}
          <div
            className="stat-card glass-panel"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/farmer/applications')}
            title="View My Applications"
          >
            <div className="stat-icon-wrap icon-loans">
              <ClipboardList size={24} />
            </div>
            <div className="stat-data">
              <span className="stat-label">{t('farmerDashboard.totalApplications', 'Total Applications')}</span>
              <span className="stat-value">{totalApplications}</span>
              <span className="stat-sub">
                {t('farmerDashboard.amountRequested', { amount: totalLoanAmount.toLocaleString('en-IN') })}
              </span>
            </div>
          </div>

          {/* 2. Active Loans */}
          <div
            className="stat-card glass-panel"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('loans')}
            title={t('farmerDashboard.activeLoans', 'View Active Loans')}
          >
            <div className="stat-icon-wrap icon-active">
              <CreditCard size={24} />
            </div>
            <div className="stat-data">
              <span className="stat-label">{t('farmerDashboard.activeLoans', 'Active Loans')}</span>
              <span className="stat-value">{activeLoans}</span>
              <span className="stat-sub">
                {t('farmerDashboard.pendingReviewCount', { count: loans.filter((l) => ['SUBMITTED', 'UNDER_REVIEW'].includes(l.status)).length })}
              </span>
            </div>
          </div>

          {/* 3. Pending Installments */}
          <div
            className="stat-card glass-panel"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/farmer/repayments')}
            title={t('farmerDashboard.pendingInstallments', 'View Repayments Schedule')}
          >
            <div className="stat-icon-wrap icon-repay">
              <CalendarClock size={24} />
            </div>
            <div className="stat-data">
              <span className="stat-label">{t('farmerDashboard.pendingInstallments', 'Pending Installments')}</span>
              <span className="stat-value">{pendingRepayments}</span>
              <span className="stat-sub">
                {overdueRepayments > 0 ? (
                  <strong className="text-danger">{t('farmerDashboard.overdueCount', { count: overdueRepayments })}</strong>
                ) : (
                  t('farmerDashboard.awaitingPayment', 'Awaiting payment')
                )}
              </span>
            </div>
          </div>

          {/* 4. KYC Status */}
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap icon-kyc">
              <ShieldCheck size={24} />
            </div>
            <div className="stat-data">
              <span className="stat-label">{t('farmerDashboard.kycStatus', 'KYC Status')}</span>
              <span className="stat-value">
                {user?.kycStatus === 'VERIFIED' || user?.kycVerified ? (
                  <span className="text-success">{t('farmers.kycVerified', 'VERIFIED')}</span>
                ) : user?.kycStatus === 'REJECTED' ? (
                  <span className="text-danger" style={{ color: '#ef4444' }}>{t('farmers.kycRejected', 'REJECTED')}</span>
                ) : (
                  <span className="text-warning">{t('farmers.kycPending', 'PENDING')}</span>
                )}
              </span>
              <span className="stat-sub">{user?.fpoName || t('nav.fpoMember', 'FPO Member')}</span>
            </div>
          </div>
        </section>

        {/* KYC Rejection Banner if applicable */}
        {user?.kycStatus === 'REJECTED' && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={20} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#ef4444', fontSize: '0.92rem', display: 'block' }}>
                  {t('farmerDashboard.kycActionRequired', 'KYC Verification Action Required')}
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  {t('farmerDashboard.reasonLabel', 'Reason:')} {user?.kycRejectionReason || t('farmerDashboard.kycBannerSub', 'Uploaded certificates require correction.')}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/farmer/kyc')}
            >
              {t('farmerDashboard.updateDocsBtn', 'Update Documents')}
            </button>
          </div>
        )}

        {/* Content Navigation Tabs */}
        <div className="tabs-header">
          <div className="tabs-list">
            <button
              className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`}
              onClick={() => setActiveTab('loans')}
            >
              <CreditCard size={18} />
              <span>{t('farmerDashboard.myLoans')} ({loans.length})</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'repayments' ? 'active' : ''}`}
              onClick={() => setActiveTab('repayments')}
            >
              <Clock size={18} />
              <span>{t('farmerDashboard.repayments')} ({repayments.length})</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FolderOpen size={18} />
              <span>{t('farmerDashboard.documents')} ({documents.length})</span>
            </button>
          </div>

          <button onClick={fetchFarmerData} className="btn-refresh" disabled={loading} title={t('common.refresh')}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            <span>{t('common.refresh')}</span>
          </button>
        </div>

        {/* Data Container */}
        <section className="farmer-data-section glass-panel">
          {error && (
            <div className="farmer-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="farmer-loading-state">
              <RefreshCw size={28} className="spinning" />
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {/* Tab 1: My Loans */}
              {activeTab === 'loans' && (
                <div className="table-responsive">
                  {loans.length === 0 ? (
                    <div className="farmer-empty-state">
                      <CreditCard size={42} />
                      <p>{t('farmerDashboard.noLoans')}</p>
                      <span>{t('farmerDashboard.noLoansDesc', 'Your submitted loan applications will appear here.')}</span>
                      <button
                        type="button"
                        className="btn-primary-action"
                        style={{
                          marginTop: '1.25rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.6rem 1.25rem',
                          background: 'var(--primary)',
                          color: '#042f2e',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 2px 8px var(--primary-glow)',
                        }}
                        onClick={() => navigate('/farmer/loans')}
                      >
                        <Sprout size={18} />
                        <span>{t('farmerLoans.browseSchemes')}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <button
                          type="button"
                          className="view-link"
                          onClick={() => navigate('/farmer/applications')}
                          style={{ fontWeight: 600 }}
                        >
                          <span>{t('nav.myApplications', 'View All Applications')}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <table className="farmer-table">
                        <thead>
                          <tr>
                            <th>{t('loans.purpose')}</th>
                            <th>{t('loans.amount')}</th>
                            <th>{t('loans.tenure')}</th>
                            <th>{t('disbursement.interestRate')}</th>
                            <th>{t('loans.status')}</th>
                            <th>{t('loans.appliedDate')}</th>
                            <th>{t('common.actions', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loans.map((loan) => (
                            <tr key={loan._id}>
                              <td className="font-medium text-main">{loan.purpose}</td>
                              <td className="font-semibold">₹{loan.loanAmount?.toLocaleString('en-IN')}</td>
                              <td>{loan.tenureMonths} {t('farmerLoans.months', 'Months')}</td>
                              <td>{loan.interestRate || 4}% {t('farmerLoans.pa', 'p.a.')}</td>
                              <td>
                                <span className={`status-pill ${getStatusBadgeClass(loan.status)}`}>
                                  {t(`status.${(loan.status || '').toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`, loan.status)}
                                </span>
                              </td>
                              <td>{new Date(loan.createdAt).toLocaleDateString()}</td>
                              <td>
                                <button
                                  type="button"
                                  className="view-link"
                                  onClick={() => navigate(`/farmer/loans/${loan._id}`)}
                                  title={t('common.details', 'Details')}
                                >
                                  <span>{t('common.details', 'Details')}</span>
                                  <ChevronRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}

              {/* Tab 2: Repayments */}
              {activeTab === 'repayments' && (
                <div className="table-responsive">
                  {repayments.length === 0 ? (
                    <div className="farmer-empty-state">
                      <Clock size={42} />
                      <p>{t('farmerDashboard.noRepayments')}</p>
                      <span>{t('farmerDashboard.noRepaymentsDesc', 'Repayment schedules are generated once an approved loan is disbursed.')}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                        <button
                          type="button"
                          className="view-link"
                          onClick={() => navigate('/farmer/repayments')}
                          style={{ fontWeight: 600 }}
                        >
                          <span>{t('farmerRepayments.title', 'Repayment Tracking')}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <table className="farmer-table">
                        <thead>
                          <tr>
                            <th>{t('repayments.installment')} #</th>
                            <th>{t('repayments.amountDue')}</th>
                            <th>{t('repayments.dueDate')}</th>
                            <th>{t('loans.status')}</th>
                            <th>{t('repayments.amountPaid')}</th>
                            <th>{t('farmerRepayments.remainingAmount', 'Remaining')}</th>
                            <th>{t('repayments.paidDate')}</th>
                            <th>{t('common.actions', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repayments.map((repay) => {
                            const remaining = Math.max(0, (repay.amountDue || 0) - (repay.amountPaid || 0));
                            const loanId = repay.loan?._id || repay.loan;
                            return (
                              <tr key={repay._id}>
                                <td className="font-medium">{t('repayments.installmentTag', { number: repay.installmentNumber })}</td>
                                <td className="font-semibold">₹{repay.amountDue?.toLocaleString('en-IN')}</td>
                                <td>{new Date(repay.dueDate).toLocaleDateString()}</td>
                                <td>
                                  <span className={`status-pill ${getStatusBadgeClass(repay.paymentStatus)}`}>
                                    {t(`status.${(repay.paymentStatus || '').toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`, repay.paymentStatus)}
                                  </span>
                                </td>
                                <td className="text-success font-semibold">₹{(repay.amountPaid || 0).toLocaleString('en-IN')}</td>
                                <td>₹{remaining.toLocaleString('en-IN')}</td>
                                <td>{repay.paidDate ? new Date(repay.paidDate).toLocaleDateString() : '—'}</td>
                                <td>
                                  {loanId ? (
                                    <button
                                      type="button"
                                      className="view-link"
                                      onClick={() => navigate(`/farmer/loans/${loanId}`)}
                                      title={t('common.details', 'Details')}
                                    >
                                      <span>{t('common.details', 'Details')}</span>
                                      <ChevronRight size={14} />
                                    </button>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}

              {/* Tab 3: Documents */}
              {activeTab === 'documents' && (
                <div className="table-responsive">
                  {documents.length === 0 ? (
                    <div className="farmer-empty-state">
                      <FolderOpen size={42} />
                      <p>{t('farmerDashboard.noDocs')}</p>
                      <span>{t('farmerDashboard.noDocsDesc', 'Land records and identity proofs uploaded for your loans will appear here.')}</span>
                    </div>
                  ) : (
                    <table className="farmer-table">
                      <thead>
                        <tr>
                          <th>{t('documents.docName')}</th>
                          <th>{t('documents.docType')}</th>
                          <th>{t('documents.status')}</th>
                          <th>{t('documents.uploadedAt')}</th>
                          <th>{t('documents.viewDocument')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc._id}>
                            <td className="font-medium text-main">{doc.documentName}</td>
                            <td>{doc.documentType}</td>
                            <td>
                              <span className={`status-pill ${getStatusBadgeClass(doc.status)}`}>
                                {doc.status}
                              </span>
                            </td>
                            <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                            <td>
                              {doc.fileUrl ? (
                                <button
                                  type="button"
                                  className="view-link"
                                  onClick={() => openDocumentPreview(doc)}
                                >
                                  <span>{t('common.view')}</span>
                                  <ExternalLink size={14} />
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default FarmerDashboard;
