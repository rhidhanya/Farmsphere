import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repaymentAPI, loanAPI } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoanIdDisplay from '../components/LoanIdDisplay';
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Banknote,
  Lock,
  Building2,
  Info,
  CalendarClock,
  Check,
  Percent,
  Sprout,
  Receipt,
  FileText,
} from 'lucide-react';
import './FarmerRepayments.css';

const FarmerRepayments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [repayments, setRepayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [selectedLoanId, setSelectedLoanId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('DUE_ASC');

  const fetchRepaymentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repayRes, loansRes] = await Promise.allSettled([
        repaymentAPI.getMyRepayments(),
        loanAPI.getMyLoans(),
      ]);

      if (repayRes.status === 'fulfilled') {
        setRepayments(repayRes.value.data?.data?.repayments || []);
      } else {
        throw new Error(repayRes.reason?.response?.data?.message || 'Failed to load repayments');
      }

      if (loansRes.status === 'fulfilled') {
        setLoans(loansRes.value.data?.data?.loans || []);
      }
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRepaymentData();
  }, [fetchRepaymentData]);

  // Overall Financial Aggregates using real backend data
  const summaryMetrics = useMemo(() => {
    const totalAmountPaid = repayments.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
    const totalAmountDue = repayments.reduce((sum, r) => sum + (r.amountDue || 0), 0);
    const totalOutstanding = Math.max(0, totalAmountDue - totalAmountPaid);

    const pendingCount = repayments.filter(
      (r) => r.paymentStatus === 'PENDING' || r.paymentStatus === 'PARTIAL'
    ).length;

    const overdueCount = repayments.filter((r) => r.paymentStatus === 'OVERDUE').length;

    const paidCount = repayments.filter((r) => r.paymentStatus === 'PAID').length;

    // Next upcoming payment
    const unpaidList = repayments
      .filter((r) => r.paymentStatus !== 'PAID')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const nextUpcoming = unpaidList[0] || null;

    // Disbursed active loans count
    const activeLoansCount = loans.filter((l) => l.status === 'DISBURSED').length;

    return {
      totalAmountPaid,
      totalAmountDue,
      totalOutstanding,
      pendingCount,
      overdueCount,
      paidCount,
      nextUpcoming,
      activeLoansCount,
      totalCount: repayments.length,
    };
  }, [repayments, loans]);

  // Filtered & Sorted Repayment Installments
  const filteredRepayments = useMemo(() => {
    return repayments
      .filter((repay) => {
        // Loan filter
        if (selectedLoanId !== 'ALL') {
          const loanId = repay.loan?._id || repay.loan;
          if (loanId !== selectedLoanId) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && repay.paymentStatus !== statusFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const purpose = (repay.loan?.purpose || '').toLowerCase();
          const ref = (repay.transactionReference || '').toLowerCase();
          const method = (repay.paymentMethod || '').toLowerCase();
          const loanId = String(repay.loan?._id || repay.loan || '').toLowerCase();

          return (
            purpose.includes(q) ||
            ref.includes(q) ||
            method.includes(q) ||
            loanId.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DUE_ASC') {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (sortBy === 'DUE_DESC') {
          return new Date(b.dueDate) - new Date(a.dueDate);
        }
        if (sortBy === 'AMOUNT_HIGH') {
          return (b.amountDue || 0) - (a.amountDue || 0);
        }
        if (sortBy === 'AMOUNT_LOW') {
          return (a.amountDue || 0) - (b.amountDue || 0);
        }
        return 0;
      });
  }, [repayments, selectedLoanId, statusFilter, searchQuery, sortBy]);

  return (
    <div className="farmer-repayments-container">
      {/* Header & Actions */}
      <div className="fr-header-row">
        <div>
          <h1 className="fr-page-title">
            <CalendarClock size={22} className="text-primary" />
            <span>{t('farmerRepayments.title', 'Repayment Tracking')}</span>
          </h1>
          <p className="fr-page-sub">
            {t(
              'farmerRepayments.subtitle',
              'Track scheduled monthly installments, payment records, overdue balances, and loan repayment timelines'
            )}
          </p>
        </div>

        <button
          type="button"
          className="btn-fr-refresh"
          onClick={fetchRepaymentData}
          disabled={loading}
          title={t('common.refresh')}
        >
          <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          <span>{t('common.refresh')}</span>
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="fr-metrics-grid">
        <div className="fr-metric-card glass-panel">
          <div className="fr-metric-icon-wrap paid">
            <CheckCircle2 size={22} />
          </div>
          <div className="fr-metric-data">
            <span className="fr-metric-label">{t('farmerRepayments.totalPaid', 'Total Repaid')}</span>
            <strong className="fr-metric-val text-success">
              ₹{summaryMetrics.totalAmountPaid.toLocaleString('en-IN')}
            </strong>
            <span className="fr-metric-sub">
              {t('farmerRepayments.installmentsSettled', '{{paid}} of {{total}} installments settled', {
                paid: summaryMetrics.paidCount,
                total: summaryMetrics.totalCount,
              })}
            </span>
          </div>
        </div>

        <div className="fr-metric-card glass-panel">
          <div className="fr-metric-icon-wrap outstanding">
            <Banknote size={22} />
          </div>
          <div className="fr-metric-data">
            <span className="fr-metric-label">{t('farmerRepayments.outstanding', 'Outstanding Balance')}</span>
            <strong className="fr-metric-val highlight">
              ₹{summaryMetrics.totalOutstanding.toLocaleString('en-IN')}
            </strong>
            <span className="fr-metric-sub">
              {t('farmerRepayments.pendingInstallmentsCount', '{{count}} pending installments', {
                count: summaryMetrics.pendingCount,
              })}
            </span>
          </div>
        </div>

        <div className={`fr-metric-card glass-panel ${summaryMetrics.overdueCount > 0 ? 'card-alert' : ''}`}>
          <div className="fr-metric-icon-wrap overdue">
            <AlertTriangle size={22} />
          </div>
          <div className="fr-metric-data">
            <span className="fr-metric-label">{t('farmerRepayments.overdue', 'Overdue Installments')}</span>
            <strong className={`fr-metric-val ${summaryMetrics.overdueCount > 0 ? 'text-danger' : ''}`}>
              {summaryMetrics.overdueCount}
            </strong>
            <span className="fr-metric-sub">
              {summaryMetrics.overdueCount > 0
                ? t('farmerRepayments.pastDueDate', 'Payment past due date')
                : t('farmerRepayments.allCurrent', 'All installments current')}
            </span>
          </div>
        </div>

        <div className="fr-metric-card glass-panel">
          <div className="fr-metric-icon-wrap upcoming">
            <Clock size={22} />
          </div>
          <div className="fr-metric-data">
            <span className="fr-metric-label">{t('farmerRepayments.nextDue', 'Next Due Payment')}</span>
            <strong className="fr-metric-val">
              {summaryMetrics.nextUpcoming
                ? `₹${summaryMetrics.nextUpcoming.amountDue.toLocaleString('en-IN')}`
                : t('farmerRepayments.none', 'None')}
            </strong>
            <span className="fr-metric-sub">
              {summaryMetrics.nextUpcoming
                ? t('farmerRepayments.dueOn', 'Due on {{date}}', {
                    date: new Date(summaryMetrics.nextUpcoming.dueDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }),
                  })
                : t('farmerRepayments.zeroPending', 'Zero pending installments')}
            </span>
          </div>
        </div>
      </div>

      {/* Disbursed Loans Quick Overview Bar */}
      {loans.length > 0 && (
        <div className="fr-loans-summary-bar glass-panel">
          <div className="summary-bar-head">
            <Sprout size={16} className="text-primary" />
            <span className="summary-bar-title">{t('farmerRepayments.yourAccounts', 'Your Credit Facilities')}</span>
          </div>

          <div className="summary-chips-row">
            {loans.map((l) => (
              <button
                key={l._id}
                type="button"
                className={`fr-loan-chip ${selectedLoanId === l._id ? 'selected' : ''}`}
                onClick={() => setSelectedLoanId(selectedLoanId === l._id ? 'ALL' : l._id)}
              >
                <span className="chip-purpose">{l.purpose}</span>
                <span className="chip-amount">₹{(l.loanAmount || 0).toLocaleString('en-IN')}</span>
                <StatusBadge status={l.status} size="small" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar: Loan select, Status tabs, Search, Sort */}
      <div className="fr-toolbar glass-panel">
        <div className="fr-toolbar-top">
          {/* Loan Filter Dropdown */}
          <div className="fr-select-group">
            <label className="fr-filter-label">
              <Filter size={14} />
              <span>{t('farmerRepayments.filterLoan', 'Filter by Loan')}:</span>
            </label>
            <select
              className="fr-loan-select"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
            >
              <option value="ALL">{t('farmerRepayments.allLoans', 'All Loan Accounts')}</option>
              {loans.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.purpose} — ₹{(l.loanAmount || 0).toLocaleString('en-IN')} ({l.status})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="fr-search-wrapper">
            <Search size={15} className="fr-search-icon" />
            <input
              type="text"
              className="fr-search-input"
              placeholder={t('farmerRepayments.searchPlaceholder', 'Search by purpose or reference...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="fr-clear-search"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="fr-sort-group">
            <label className="fr-filter-label">{t('common.sort', 'Sort')}:</label>
            <select
              className="fr-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="DUE_ASC">{t('farmerRepayments.dueSoonest', 'Due Date: Earliest')}</option>
              <option value="DUE_DESC">{t('farmerRepayments.dueLatest', 'Due Date: Latest')}</option>
              <option value="AMOUNT_HIGH">{t('farmerRepayments.amountHigh', 'Amount: High to Low')}</option>
              <option value="AMOUNT_LOW">{t('farmerRepayments.amountLow', 'Amount: Low to High')}</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="fr-status-pills">
          {[
            { key: 'ALL', label: t('common.all', 'All') },
            { key: 'PENDING', label: t('status.pending', 'Pending') },
            { key: 'OVERDUE', label: t('status.overdue', 'Overdue') },
            { key: 'PAID', label: t('status.paid', 'Paid') },
            { key: 'PARTIAL', label: t('status.partial', 'Partial') },
          ].map((tab) => {
            const count =
              tab.key === 'ALL'
                ? repayments.length
                : repayments.filter((r) => r.paymentStatus === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                className={`fr-status-pill-btn ${statusFilter === tab.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="fr-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="fr-error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={fetchRepaymentData} className="btn-retry">
            {t('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Repayment Table / List */}
      <div className="fr-table-card glass-panel">
        {loading ? (
          <div className="fr-loading-state">
            <RefreshCw size={28} className="spinning text-primary" />
            <p>{t('common.loading', 'Loading repayment records...')}</p>
          </div>
        ) : filteredRepayments.length === 0 ? (
          <div className="fr-empty-state">
            <Receipt size={42} className="fr-empty-icon" />
            <h3>{t('farmerRepayments.noRecordsFound', 'No Repayment Records Found')}</h3>
            <p>
              {repayments.length === 0
                ? t(
                    'farmerRepayments.noRepaymentsEver',
                    'Repayment schedules are generated automatically by the FPO administration when your loan application is formally approved and disbursed.'
                  )
                : t(
                    'farmerRepayments.noFilterMatch',
                    'No repayment installments match the selected search or status filters.'
                  )}
            </p>
            {repayments.length > 0 && (
              <button
                type="button"
                className="btn-fr-reset"
                onClick={() => {
                  setSelectedLoanId('ALL');
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
              >
                {t('common.resetFilters', 'Reset Filters')}
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="fr-table">
              <thead>
                <tr>
                  <th>{t('repayments.installment', 'Installment')} #</th>
                  <th>{t('loans.purpose', 'Credit Scheme / Loan')}</th>
                  <th>{t('repayments.dueDate', 'Due Date')}</th>
                  <th>{t('repayments.amountDue', 'Amount Due')}</th>
                  <th>{t('repayments.amountPaid', 'Amount Paid')}</th>
                  <th>{t('farmerRepayments.remainingAmount', 'Remaining')}</th>
                  <th>{t('repayments.paidDate', 'Payment Date')}</th>
                  <th>{t('loans.status', 'Status')}</th>
                  <th>{t('repayments.paymentMethod', 'Payment Details')}</th>
                  <th>{t('common.actions', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepayments.map((repay) => {
                  const remaining = Math.max(0, (repay.amountDue || 0) - (repay.amountPaid || 0));
                  const isOverdue = repay.paymentStatus === 'OVERDUE';
                  const isPaid = repay.paymentStatus === 'PAID';
                  const loanObj = repay.loan;
                  const loanId = loanObj?._id || repay.loan;

                  return (
                    <tr key={repay._id} className={isOverdue ? 'row-overdue' : ''}>
                      <td>
                        <span className="installment-tag font-semibold">
                          #{repay.installmentNumber}
                        </span>
                      </td>

                      <td>
                        <div className="loan-purpose-cell">
                          <span className="purpose-title">
                            {loanObj?.purpose || t('farmerLoans.categories.crop', 'Agricultural Loan')}
                          </span>
                          {loanId && (
                            <span className="purpose-id">
                              <LoanIdDisplay id={loanId} format="short" showCopy={false} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className={`date-badge-cell ${isOverdue ? 'date-overdue' : ''}`}>
                          <Calendar size={13} />
                          <span>
                            {new Date(repay.dueDate).toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="font-semibold">
                        ₹{(repay.amountDue || 0).toLocaleString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                      </td>

                      <td className="text-success font-semibold">
                        ₹{(repay.amountPaid || 0).toLocaleString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                      </td>

                      <td>
                        <strong className={remaining > 0 ? 'text-amber font-semibold' : 'text-muted'}>
                          ₹{remaining.toLocaleString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                        </strong>
                      </td>

                      <td>
                        {repay.paidDate ? (
                          <div className="paid-date-cell text-success">
                            <Check size={13} />
                            <span>
                              {new Date(repay.paidDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={repay.paymentStatus} size="small" />
                      </td>

                      <td>
                        {repay.paymentMethod ? (
                          <span className="method-pill">
                            {repay.paymentMethod}
                            {repay.transactionReference && ` · Ref: ${repay.transactionReference}`}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td>
                        {loanId && (
                          <button
                            type="button"
                            className="btn-view-loan"
                            onClick={() => navigate(`/farmer/loans/${loanId}`)}
                            title="View Loan Details & Schedule"
                          >
                            <span>{t('common.details', 'Details')}</span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official FPO Repayment Policy Notice */}
      <div className="fr-policy-notice glass-panel">
        <div className="policy-icon-wrap">
          <Building2 size={22} />
        </div>
        <div className="policy-content">
          <h4>{t('farmerRepayments.policyNoticeTitle', 'Institutional Repayment Policy & Payment Collection')}</h4>
          <p>
            {t(
              'farmerRepayments.policyNoticeBody',
              'All agricultural installment payments are collected and authenticated directly by your FPO branch office, banking correspondents, or authorized field agricultural extension officers. Please obtain an official stamped physical receipt for cash deposits. Online record updates appear in your portal once reconciled by the administrative credit committee.'
            )}
          </p>
          <div className="policy-tags">
            <span className="policy-tag">
              <Check size={12} /> {t('farmerRepayments.fpoReceiptAuth', 'FPO Receipt Authentication')}
            </span>
            <span className="policy-tag">
              <Check size={12} /> {t('farmerRepayments.realtimeDb', 'Real-Time Database Grounding')}
            </span>
            <span className="policy-tag">
              <Check size={12} /> {t('farmerRepayments.zeroDeductions', 'Zero Unauthorized Third-Party Deductions')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerRepayments;
