import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loanAPI } from '../api/client';
import { FPO_AVAILABLE_SCHEMES } from './FarmerLoans';
import StatusBadge from '../components/StatusBadge';
import LoanIdDisplay from '../components/LoanIdDisplay';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Lock,
  Calendar,
  Percent,
  Sprout,
  Wheat,
  Tractor,
  Droplets,
  Warehouse,
  IndianRupee,
  ChevronRight,
  Info,
} from 'lucide-react';
import './FarmerApplications.css';

export const getSchemeForLoan = (loan) => {
  if (!loan || !loan.purpose) return null;
  const p = loan.purpose.toLowerCase();
  return (
    FPO_AVAILABLE_SCHEMES.find(
      (s) =>
        s.purpose?.toLowerCase() === p ||
        s.name?.toLowerCase() === p ||
        p.includes(s.name?.toLowerCase()) ||
        p.includes(s.id?.toLowerCase())
    ) || null
  );
};

const renderSchemeIcon = (scheme) => {
  const icon = scheme?.icon;
  switch (icon) {
    case 'Wheat':
      return <Wheat size={20} />;
    case 'Droplets':
      return <Droplets size={20} />;
    case 'Tractor':
      return <Tractor size={20} />;
    case 'Warehouse':
      return <Warehouse size={20} />;
    default:
      return <Sprout size={20} />;
  }
};

const FarmerApplications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loanAPI.getMyLoans();
      setLoans(res.data?.data?.loans || []);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Derived counts for status filter pills
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: loans.length,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      DISBURSED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };
    loans.forEach((loan) => {
      if (counts[loan.status] !== undefined) {
        counts[loan.status]++;
      }
    });
    return counts;
  }, [loans]);

  // Filtered & Sorted Loans
  const filteredLoans = useMemo(() => {
    return loans
      .filter((loan) => {
        // Status filter
        if (statusFilter !== 'ALL' && loan.status !== statusFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const id = (loan._id || '').toLowerCase();
          const purpose = (loan.purpose || '').toLowerCase();
          const scheme = getSchemeForLoan(loan);
          const schemeName = (scheme?.name || '').toLowerCase();
          const remarks = (loan.remarks || '').toLowerCase();

          return (
            id.includes(q) ||
            purpose.includes(q) ||
            schemeName.includes(q) ||
            remarks.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortBy === 'AMOUNT_HIGH') {
          return (b.loanAmount || 0) - (a.loanAmount || 0);
        }
        if (sortBy === 'AMOUNT_LOW') {
          return (a.loanAmount || 0) - (b.loanAmount || 0);
        }
        return 0;
      });
  }, [loans, statusFilter, searchQuery, sortBy]);

  return (
    <div className="farmer-applications-container">
      {/* Page Title & Actions */}
      <div className="fa-header-row">
        <div>
          <h1 className="fa-page-title">
            <FileText size={22} className="text-primary" />
            <span>{t('farmerApplications.title', 'My Loan Applications')}</span>
          </h1>
          <p className="fa-page-sub">
            {t(
              'farmerApplications.subtitle',
              'Track the progress, administrative review, and status timeline of all your submitted credit applications'
            )}
          </p>
        </div>

        <div className="fa-actions-group">
          <button
            type="button"
            className="btn-fa-refresh"
            onClick={fetchApplications}
            disabled={loading}
            title={t('common.refresh')}
          >
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-fa-apply"
            onClick={() => navigate('/farmer/apply')}
          >
            <PlusCircle size={16} />
            <span>{t('farmerApplications.newApplication', 'Apply for a Loan')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="fa-metrics-grid">
        <div className="fa-metric-card glass-panel">
          <div className="metric-icon-box total">
            <FileText size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">{t('farmerApplications.totalApps', 'Total Applications')}</span>
            <span className="metric-val">{loans.length}</span>
            <span className="metric-hint">{t('farmerApplications.lifetimeSubmissions', 'Lifetime submissions')}</span>
          </div>
        </div>

        <div className="fa-metric-card glass-panel">
          <div className="metric-icon-box review">
            <Clock size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">{t('farmerApplications.inReview', 'In Review')}</span>
            <span className="metric-val">{statusCounts.SUBMITTED + statusCounts.UNDER_REVIEW}</span>
            <span className="metric-hint">{t('farmerApplications.awaitingFpoDecision', 'Awaiting FPO decision')}</span>
          </div>
        </div>

        <div className="fa-metric-card glass-panel">
          <div className="metric-icon-box approved">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">{t('farmerApplications.approvedDisbursed', 'Approved / Disbursed')}</span>
            <span className="metric-val">{statusCounts.APPROVED + statusCounts.DISBURSED}</span>
            <span className="metric-hint">{t('farmerApplications.activeInstCredit', 'Active institutional credit')}</span>
          </div>
        </div>

        <div className="fa-metric-card glass-panel">
          <div className="metric-icon-box rejected">
            <XCircle size={20} />
          </div>
          <div className="metric-info">
            <span className="metric-label">{t('farmerApplications.rejectedApps', 'Rejected')}</span>
            <span className="metric-val">{statusCounts.REJECTED}</span>
            <span className="metric-hint">{t('farmerApplications.clarificationNeeded', 'Requires attention or appeal')}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="fa-toolbar glass-panel">
        <div className="fa-search-wrapper">
          <Search size={16} className="fa-search-icon" />
          <input
            type="text"
            className="fa-search-input"
            placeholder={t(
              'farmerApplications.searchPlaceholder',
              'Search by scheme, application ID, or purpose...'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="fa-clear-search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="fa-sort-wrapper">
          <label className="fa-sort-label">{t('common.sort', 'Sort')}:</label>
          <select
            className="fa-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">{t('farmerApplications.sortNewest', 'Newest First')}</option>
            <option value="OLDEST">{t('farmerApplications.sortOldest', 'Oldest First')}</option>
            <option value="AMOUNT_HIGH">{t('farmerApplications.sortAmountHigh', 'Highest Amount')}</option>
            <option value="AMOUNT_LOW">{t('farmerApplications.sortAmountLow', 'Lowest Amount')}</option>
          </select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="fa-status-tabs">
        {[
          { key: 'ALL', label: t('common.all', 'All') },
          { key: 'SUBMITTED', label: t('status.submitted', 'Submitted') },
          { key: 'UNDER_REVIEW', label: t('status.underReview', 'Under Review') },
          { key: 'APPROVED', label: t('status.approved', 'Approved') },
          { key: 'DISBURSED', label: t('status.disbursed', 'Disbursed') },
          { key: 'REJECTED', label: t('status.rejected', 'Rejected') },
          { key: 'CLOSED', label: t('status.closed', 'Closed') },
        ].map((tab) => {
          const count = statusCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              className={`fa-status-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="fa-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="fa-error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={fetchApplications} className="btn-retry">
            {t('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Application Cards List */}
      {loading ? (
        <div className="fa-loading-card glass-panel">
          <RefreshCw size={28} className="spinning text-primary" />
          <p>{t('common.loading', 'Loading applications...')}</p>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="fa-empty-card glass-panel">
          <FileText size={44} className="fa-empty-icon" />
          <h3>{t('farmerApplications.noAppsFound', 'No Loan Applications Found')}</h3>
          <p>
            {searchQuery || statusFilter !== 'ALL'
              ? t(
                  'farmerApplications.noFilteredApps',
                  'No applications match your selected filter criteria. Try resetting the filters.'
                )
              : t(
                  'farmerApplications.noAppsYet',
                  'You have not submitted any loan applications yet. Explore available credit schemes and apply online.'
                )}
          </p>
          {searchQuery || statusFilter !== 'ALL' ? (
            <button
              type="button"
              className="btn-fa-reset"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            >
              {t('common.resetFilters', 'Reset Filters')}
            </button>
          ) : (
            <button
              type="button"
              className="btn-fa-apply-cta"
              onClick={() => navigate('/farmer/loans')}
            >
              <Sprout size={16} />
              <span>{t('farmerLoans.browseSchemes', 'Browse Available Schemes')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="fa-list-grid">
          {filteredLoans.map((loan) => {
            const scheme = getSchemeForLoan(loan);
            const isRejected = loan.status === 'REJECTED';
            const isDisbursed = loan.status === 'DISBURSED';
            const isApproved = loan.status === 'APPROVED';
            const isClosed = loan.status === 'CLOSED';

            return (
              <div
                key={loan._id}
                className={`fa-app-card glass-panel status-border-${loan.status.toLowerCase()}`}
              >
                {/* Card Top: ID and Status */}
                <div className="fa-card-header">
                  <div className="fa-id-group">
                    <span className="fa-app-label">{t('farmerApplications.appId', 'Application')}</span>
                    <LoanIdDisplay id={loan._id} format="short" />
                  </div>
                  <StatusBadge status={loan.status} size="medium" />
                </div>

                {/* Scheme & Purpose */}
                <div className="fa-card-body">
                  <div className="fa-scheme-title-row">
                    <div className="fa-scheme-icon-box">
                      {renderSchemeIcon(scheme)}
                    </div>
                    <div>
                      <h3 className="fa-scheme-name">
                        {scheme ? t(`farmerLoans.schemes.${scheme.id}.name`, scheme.name) : loan.purpose}
                      </h3>
                      {scheme && scheme.name !== loan.purpose && (
                        <p className="fa-purpose-text">{loan.purpose}</p>
                      )}
                    </div>
                  </div>

                  {/* Key Financial Parameters */}
                  <div className="fa-params-grid">
                    <div className="fa-param-item">
                      <span className="param-label">{t('loans.amount', 'Requested Amount')}</span>
                      <strong className="param-val highlight">
                        ₹{(loan.loanAmount || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="fa-param-item">
                      <span className="param-label">{t('loans.tenure', 'Tenure')}</span>
                      <strong className="param-val">
                        {loan.tenureMonths} {t('common.months', 'Months')}
                      </strong>
                    </div>

                    <div className="fa-param-item">
                      <span className="param-label">{t('disbursement.interestRate', 'Interest Rate')}</span>
                      <strong className="param-val">
                        {loan.interestRate || 4}% {t('farmerLoans.pa', 'p.a.')}
                      </strong>
                    </div>

                    <div className="fa-param-item">
                      <span className="param-label">{t('loans.appliedDate', 'Applied Date')}</span>
                      <strong className="param-val">
                        {new Date(loan.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* Disbursed Amount if disbursed */}
                  {isDisbursed && (
                    <div className="fa-disbursed-callout">
                      <Banknote size={15} />
                      <span>
                        <strong>{t('loans.disbursedAmount', 'Disbursed')}:</strong> ₹
                        {(loan.disbursedAmount || loan.loanAmount).toLocaleString('en-IN')}{' '}
                        {t('common.on', 'on')}{' '}
                        {loan.disbursedDate
                          ? new Date(loan.disbursedDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  )}

                  {/* Rejection Reason Notice */}
                  {isRejected && (
                    <div className="fa-rejection-callout">
                      <div className="callout-head">
                        <XCircle size={15} />
                        <strong>{t('farmerApplications.rejectionReason', 'Rejection Reason')}:</strong>
                      </div>
                      <p className="rejection-text">
                        {loan.remarks ||
                          t(
                            'farmerApplications.defaultRejection',
                            'Application did not fulfill institutional credit policy requirements. Contact FPO office for review.'
                          )}
                      </p>
                      {loan.approvedBy && (
                        <span className="rejection-reviewer">
                          {t('farmerApplications.reviewedBy', 'Reviewed by')}: {loan.approvedBy.name || 'FPO Reviewer'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Closed Status Callout */}
                  {isClosed && (
                    <div className="fa-closed-callout">
                      <Lock size={15} />
                      <span>{t('farmerApplications.closedNotice', 'Loan account is fully settled and formally closed.')}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Timeline link & details */}
                <div className="fa-card-footer">
                  <span className="fa-status-hint">
                    {loan.status === 'SUBMITTED' && t('farmerApplications.stepSubmitted', 'Awaiting administrative queue')}
                    {loan.status === 'UNDER_REVIEW' && t('farmerApplications.stepReview', 'Credit committee review in progress')}
                    {loan.status === 'APPROVED' && t('farmerApplications.stepApproved', 'Approved — awaiting fund disbursement')}
                    {loan.status === 'DISBURSED' && t('farmerApplications.stepDisbursed', 'Disbursed — active repayment schedule')}
                    {loan.status === 'REJECTED' && t('farmerApplications.stepRejected', 'Application decision finalized')}
                    {loan.status === 'CLOSED' && t('farmerApplications.stepClosed', 'Maturity achieved — zero outstanding')}
                  </span>

                  <button
                    type="button"
                    className="btn-fa-details"
                    onClick={() => navigate(`/farmer/loans/${loan._id}`)}
                  >
                    <span>{t('farmerApplications.viewDetails', 'View Details & Timeline')}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FarmerApplications;
