import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loanAPI, repaymentAPI, documentAPI } from '../api/client';
import { FPO_AVAILABLE_SCHEMES } from './FarmerLoans';
import { getSchemeForLoan } from './FarmerApplications';
import { openDocumentPreview } from '../utils/documentPreview';
import StatusBadge from '../components/StatusBadge';
import LoanIdDisplay from '../components/LoanIdDisplay';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Banknote,
  Lock,
  RefreshCw,
  Eye,
  FolderOpen,
  User,
  ShieldCheck,
  Building2,
  Info,
  CalendarClock,
  HelpCircle,
  Percent,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import './FarmerLoanDetail.css';

const FarmerLoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scheme slug detection: if :id is a known scheme slug (e.g. crop-production), redirect gracefully
  useEffect(() => {
    if (id) {
      const isSchemeSlug = FPO_AVAILABLE_SCHEMES.some((s) => s.id === id);
      if (isSchemeSlug) {
        navigate('/farmer/loans', { state: { selectedSchemeId: id }, replace: true });
      }
    }
  }, [id, navigate]);

  const fetchLoanData = useCallback(async () => {
    if (!id || FPO_AVAILABLE_SCHEMES.some((s) => s.id === id)) return;

    setLoading(true);
    setError(null);
    try {
      const [loanRes, repaymentsRes, docsRes] = await Promise.allSettled([
        loanAPI.getLoanById(id),
        repaymentAPI.getLoanRepayments(id),
        documentAPI.getLoanDocuments(id),
      ]);

      if (loanRes.status === 'fulfilled') {
        setLoan(loanRes.value.data?.data?.loan || null);
      } else {
        throw new Error(loanRes.reason?.response?.data?.message || 'Loan application not found');
      }

      if (repaymentsRes.status === 'fulfilled') {
        setRepayments(repaymentsRes.value.data?.data?.repayments || []);
      }

      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.data?.data?.documents || []);
      }
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchLoanData();
  }, [fetchLoanData]);

  // Financial Metric Computations (using actual backend data)
  const financialMetrics = useMemo(() => {
    if (!loan) return null;

    const sanctionedAmount = loan.loanAmount || 0;
    const disbursedAmount = loan.disbursedAmount || 0;
    const isDisbursed = ['DISBURSED', 'CLOSED'].includes(loan.status);
    const isClosed = loan.status === 'CLOSED';

    // Sum of amount paid across all scheduled installments
    const amountPaid = repayments.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

    // Sum of amount due across all scheduled installments
    const totalAmountDue = repayments.reduce((sum, r) => sum + (r.amountDue || 0), 0);

    // Outstanding balance:
    // When closed, balance is strictly 0.
    // When disbursed and repayments exist, exact balance = totalAmountDue - amountPaid.
    let outstandingBalance = null;
    if (isClosed) {
      outstandingBalance = 0;
    } else if (isDisbursed && repayments.length > 0) {
      outstandingBalance = Math.max(0, totalAmountDue - amountPaid);
    }

    // Pending installments (PENDING or PARTIAL)
    const pendingInstallments = repayments.filter(
      (r) => r.paymentStatus === 'PENDING' || r.paymentStatus === 'PARTIAL'
    ).length;

    // Overdue installments
    const overdueInstallments = repayments.filter(
      (r) => r.paymentStatus === 'OVERDUE'
    ).length;

    // Next installment due date
    const unpaidRepayments = repayments
      .filter((r) => r.paymentStatus !== 'PAID')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const nextInstallment = unpaidRepayments[0] || null;

    // Maturity Date: latest due date in the schedule
    const sortedByDueDesc = [...repayments].sort(
      (a, b) => new Date(b.dueDate) - new Date(a.dueDate)
    );
    const maturityDate = sortedByDueDesc[0]?.dueDate || null;

    return {
      sanctionedAmount,
      disbursedAmount,
      amountPaid,
      outstandingBalance,
      pendingInstallments,
      overdueInstallments,
      nextInstallment,
      maturityDate,
      isDisbursed,
      isClosed,
      totalInstallments: repayments.length,
    };
  }, [loan, repayments]);

  const scheme = useMemo(() => getSchemeForLoan(loan), [loan]);

  // Stepper timeline logic
  const timelineSteps = useMemo(() => {
    if (!loan) return [];

    const isRejected = loan.status === 'REJECTED';
    const isClosed = loan.status === 'CLOSED';
    const isDisbursed = ['DISBURSED', 'CLOSED'].includes(loan.status);
    const isApproved = ['APPROVED', 'DISBURSED', 'CLOSED'].includes(loan.status);
    const isUnderReview = ['UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'CLOSED'].includes(loan.status);

    return [
      {
        id: 'SUBMITTED',
        label: t('farmerLoanDetail.step1', 'Application Submitted'),
        sub: new Date(loan.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        status: 'completed',
        icon: FileText,
      },
      {
        id: 'UNDER_REVIEW',
        label: t('farmerLoanDetail.step2', 'FPO Review & Verification'),
        sub: isUnderReview
          ? t('farmerLoanDetail.step2Done', 'KYC & documents reviewed')
          : t('farmerLoanDetail.step2Wait', 'Pending queue review'),
        status: isUnderReview ? 'completed' : 'pending',
        icon: Clock,
      },
      {
        id: isRejected ? 'REJECTED' : 'APPROVED',
        label: isRejected
          ? t('farmerLoanDetail.step3Rejected', 'Application Rejected')
          : t('farmerLoanDetail.step3Approved', 'Committee Approval'),
        sub: isRejected
          ? loan.remarks || t('farmerLoanDetail.rejectedDesc', 'Credit criteria not met')
          : isApproved
          ? loan.approvedBy?.name
            ? `Approved by ${loan.approvedBy.name}`
            : t('farmerLoanDetail.approvedDesc', 'Formally approved')
          : t('farmerLoanDetail.awaitingApproval', 'Awaiting committee action'),
        status: isRejected ? 'rejected' : isApproved ? 'completed' : 'pending',
        icon: isRejected ? XCircle : CheckCircle2,
      },
      ...(!isRejected
        ? [
            {
              id: 'DISBURSED',
              label: t('farmerLoanDetail.step4', 'Capital Disbursed'),
              sub: isDisbursed
                ? loan.disbursedDate
                  ? t('farmerLoanDetail.disbursedOn', 'Disbursed on {{date}}', {
                      date: new Date(loan.disbursedDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }),
                    })
                  : t('farmerLoanDetail.disbursedAmountTag', '₹{{amount}} disbursed', {
                      amount: (loan.disbursedAmount || loan.loanAmount).toLocaleString('en-IN'),
                    })
                : t('farmerLoanDetail.awaitingDisbursement', 'Pending disbursement release'),
              status: isDisbursed ? 'completed' : 'pending',
              icon: Banknote,
            },
            {
              id: 'CLOSED',
              label: t('farmerLoanDetail.step5', 'Loan Maturity & Closure'),
              sub: isClosed
                ? t('farmerLoanDetail.closedDesc', 'Fully repaid & settled')
                : isDisbursed
                ? t('farmerLoanDetail.inRepayment', 'Active repayment schedule')
                : t('farmerLoanDetail.awaitingRepayment', 'Not yet active'),
              status: isClosed ? 'completed' : 'pending',
              icon: Lock,
            },
          ]
        : []),
    ];
  }, [loan, t]);

  if (loading) {
    return (
      <div className="fld-loading-container glass-panel">
        <RefreshCw size={32} className="spinning text-primary" />
        <p>{t('common.loading', 'Loading loan application details...')}</p>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="fld-error-container glass-panel">
        <AlertTriangle size={42} className="text-danger" />
        <h2>{t('farmerLoanDetail.notFoundTitle', 'Loan Application Not Found')}</h2>
        <p>{error || t('farmerLoanDetail.notFoundDesc', 'We could not locate this loan record or you do not have permission to view it.')}</p>
        <button
          type="button"
          className="btn-fld-back"
          onClick={() => navigate('/farmer/applications')}
        >
          <ArrowLeft size={16} />
          <span>{t('farmerLoanDetail.backToApps', 'Back to Applications')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="farmer-loan-detail-container">
      {/* Top Breadcrumb & Action Row */}
      <div className="fld-top-bar">
        <button
          type="button"
          className="btn-fld-back-link"
          onClick={() => navigate('/farmer/applications')}
        >
          <ArrowLeft size={16} />
          <span>{t('farmerLoanDetail.backToApps', 'Back to My Applications')}</span>
        </button>

        <div className="fld-top-actions">
          <button
            type="button"
            className="btn-fld-refresh"
            onClick={fetchLoanData}
            title={t('common.refresh')}
          >
            <RefreshCw size={14} />
            <span>{t('common.refresh')}</span>
          </button>

          {['DISBURSED', 'CLOSED'].includes(loan.status) && (
            <button
              type="button"
              className="btn-fld-repayments-nav"
              onClick={() => navigate('/farmer/repayments')}
            >
              <CalendarClock size={15} />
              <span>{t('farmerLoanDetail.viewAllRepayments', 'All Repayments')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Loan Title Banner */}
      <div className="fld-banner-card glass-panel">
        <div className="fld-banner-main">
          <div className="fld-banner-head">
            <span className="fld-app-tag">
              {t('farmerLoanDetail.applicationRef', 'Application Reference')}
            </span>
            <LoanIdDisplay id={loan._id} format="full" />
            <StatusBadge status={loan.status} size="medium" />
          </div>

          <h1 className="fld-scheme-title">
            {scheme ? t(`farmerLoans.schemes.${scheme.id}.name`, scheme.name) : loan.purpose}
          </h1>

          <p className="fld-purpose-desc">
            <strong>{t('loans.purpose', 'Purpose')}:</strong> {loan.purpose}
          </p>

          <div className="fld-meta-tags">
            <span className="fld-meta-pill">
              <Calendar size={13} />
              <span>{t('farmerApplications.appliedOn', 'Applied on')}: {new Date(loan.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}</span>
            </span>

            <span className="fld-meta-pill">
              <Percent size={13} />
              <span>{loan.interestRate || 4}% {t('farmerLoans.pa', 'p.a.')} {t('farmerLoanDetail.subsidized', 'Subsidized')}</span>
            </span>

            <span className="fld-meta-pill">
              <Clock size={13} />
              <span>{loan.tenureMonths} {t('farmerLoans.months', 'Months')}</span>
            </span>

            <span className="fld-meta-pill">
              <Building2 size={13} />
              <span>{t('farmerApply.repaymentFrequency', 'Frequency')}: {loan.repaymentFrequency || 'MONTHLY'}</span>
            </span>
          </div>
        </div>

        {/* Primary Sanctioned Amount Highlight */}
        <div className="fld-banner-stat">
          <span className="stat-caption">{t('farmerLoanDetail.sanctionedAmt', 'Sanctioned Loan Amount')}</span>
          <strong className="stat-number">
            ₹{loan.loanAmount.toLocaleString('en-IN')}
          </strong>
          <span className="stat-note">
            {loan.status === 'CLOSED'
              ? t('farmerLoanDetail.accountSettled', 'Account fully settled')
              : loan.status === 'DISBURSED'
              ? t('farmerLoanDetail.activeInstitutionalCredit', 'Active institutional credit')
              : t('farmerLoanDetail.awaitingCompletion', 'Awaiting completion')}
          </span>
        </div>
      </div>

      {/* Rejection Alert Banner if Rejected */}
      {loan.status === 'REJECTED' && (
        <div className="fld-rejection-banner glass-panel">
          <div className="rejection-icon-wrap">
            <XCircle size={24} />
          </div>
          <div className="rejection-content">
            <h3>{t('farmerLoanDetail.rejectedTitle', 'Application Not Approved')}</h3>
            <p className="rejection-reason-text">
              <strong>{t('farmerApplications.rejectionReason', 'Rejection Reason')}:</strong>{' '}
              {loan.remarks ||
                t(
                  'farmerLoanDetail.defaultRejection',
                  'Application did not fulfill institutional credit policy requirements.'
                )}
            </p>
            {loan.approvedBy && (
              <span className="rejection-meta">
                {t('farmerApplications.reviewedBy', 'Reviewed by')}: {loan.approvedBy.name} ({loan.approvedBy.email || 'FPO Reviewer'})
              </span>
            )}
            <p className="rejection-help-note">
              <Info size={14} />
              <span>
                {t(
                  'farmerLoanDetail.rejectionHelp',
                  'You may apply for alternative credit lines or speak to your FPO field representative for clarification.'
                )}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Status Timeline Stepper */}
      <div className="fld-timeline-card glass-panel">
        <div className="fld-section-header">
          <CheckCircle2 size={18} className="text-primary" />
          <h3>{t('farmerLoanDetail.timelineTitle', 'Application Status Timeline')}</h3>
        </div>

        <div className="fld-stepper">
          {timelineSteps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === timelineSteps.length - 1;

            return (
              <div key={step.id} className={`fld-step-item step-${step.status}`}>
                <div className="step-indicator">
                  <div className="step-circle">
                    <Icon size={16} />
                  </div>
                  {!isLast && <div className="step-line" />}
                </div>

                <div className="step-details">
                  <span className="step-title">{step.label}</span>
                  <span className="step-sub">{step.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Detailed Financial Information Grid */}
      <div className="fld-section-card glass-panel">
        <div className="fld-section-header">
          <Banknote size={18} className="text-primary" />
          <h3>{t('farmerLoanDetail.financialDetailsTitle', 'Financial & Account Information')}</h3>
        </div>

        <div className="fld-financial-grid">
          {/* 1. Sanctioned Amount */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.sanctionedAmt', 'Sanctioned Loan Amount')}</span>
            <strong className="fld-box-val highlight">
              ₹{financialMetrics.sanctionedAmount.toLocaleString('en-IN')}
            </strong>
            <span className="fld-box-hint">{t('farmerLoanDetail.limitApproved', 'Credit limit approved')}</span>
          </div>

          {/* 2. Disbursed Amount */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.disbursedAmt', 'Disbursed Amount')}</span>
            <strong className="fld-box-val">
              {financialMetrics.isDisbursed
                ? `₹${financialMetrics.disbursedAmount.toLocaleString('en-IN')}`
                : '—'}
            </strong>
            <span className="fld-box-hint">
              {financialMetrics.isDisbursed
                ? loan.disbursedDate
                  ? `${t('farmerLoanDetail.releasedOn', 'Released on')} ${new Date(loan.disbursedDate).toLocaleDateString('en-IN')}`
                  : t('farmerLoanDetail.releasedToBank', 'Released to bank')
                : t('farmerLoanDetail.pendingDisbursement', 'Pending disbursement')}
            </span>
          </div>

          {/* 3. Amount Paid */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.amountPaid', 'Amount Paid to Date')}</span>
            <strong className="fld-box-val text-success">
              ₹{financialMetrics.amountPaid.toLocaleString('en-IN')}
            </strong>
            <span className="fld-box-hint">
              {financialMetrics.totalInstallments > 0
                ? `${repayments.filter((r) => r.paymentStatus === 'PAID').length} / ${financialMetrics.totalInstallments} ${t('farmerLoanDetail.installmentsSettled', 'installments paid')}`
                : t('farmerLoanDetail.noInstallmentsGen', 'No installments generated')}
            </span>
          </div>

          {/* 4. Outstanding Balance */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.outstandingBalance', 'Outstanding Balance')}</span>
            <strong className={`fld-box-val ${financialMetrics.outstandingBalance > 0 ? 'text-amber' : ''}`}>
              {financialMetrics.outstandingBalance !== null
                ? `₹${financialMetrics.outstandingBalance.toLocaleString('en-IN')}`
                : '—'}
            </strong>
            <span className="fld-box-hint">
              {financialMetrics.isClosed
                ? t('farmerLoanDetail.zeroBalanceSettled', 'Zero balance — Fully settled')
                : financialMetrics.isDisbursed
                ? t('farmerLoanDetail.remainingPrincipalInterest', 'Remaining principal & interest')
                : t('farmerLoanDetail.pendingDisbursementRelease', 'Pending loan disbursement')}
            </span>
          </div>

          {/* 5. Pending Installments */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.pendingInstallments', 'Pending Installments')}</span>
            <strong className="fld-box-val">
              {financialMetrics.isDisbursed
                ? `${financialMetrics.pendingInstallments} / ${financialMetrics.totalInstallments}`
                : '—'}
            </strong>
            <span className="fld-box-hint">{t('farmerLoanDetail.awaitingPayment', 'Awaiting scheduled payment')}</span>
          </div>

          {/* 6. Overdue Installments */}
          <div className={`fld-metric-box ${financialMetrics.overdueInstallments > 0 ? 'box-alert' : ''}`}>
            <span className="fld-box-label">{t('farmerLoanDetail.overdueInstallments', 'Overdue Installments')}</span>
            <strong className={`fld-box-val ${financialMetrics.overdueInstallments > 0 ? 'text-danger' : ''}`}>
              {financialMetrics.isDisbursed ? financialMetrics.overdueInstallments : '—'}
            </strong>
            <span className="fld-box-hint">
              {financialMetrics.overdueInstallments > 0
                ? t('farmerLoanDetail.immediateAction', 'Immediate action required')
                : t('farmerLoanDetail.noOverdue', 'No overdue installments')}
            </span>
          </div>

          {/* 7. Next Due Date */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.nextDueDate', 'Next Installment Due Date')}</span>
            <strong className="fld-box-val">
              {financialMetrics.nextInstallment
                ? new Date(financialMetrics.nextInstallment.dueDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : financialMetrics.isClosed
                ? t('common.none', 'None')
                : '—'}
            </strong>
            <span className="fld-box-hint">
              {financialMetrics.nextInstallment
                ? `₹${financialMetrics.nextInstallment.amountDue.toLocaleString('en-IN')} ${t('farmerLoanDetail.due', 'due')}`
                : t('farmerLoanDetail.noUpcoming', 'No upcoming payments')}
            </span>
          </div>

          {/* 8. Loan Maturity Date */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.maturityDate', 'Loan Maturity Date')}</span>
            <strong className="fld-box-val">
              {financialMetrics.maturityDate
                ? new Date(financialMetrics.maturityDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </strong>
            <span className="fld-box-hint">{t('farmerLoanDetail.maturityHint', 'Final installment deadline')}</span>
          </div>

          {/* 9. Loan Closure Status */}
          <div className="fld-metric-box">
            <span className="fld-box-label">{t('farmerLoanDetail.closureStatus', 'Loan Closure Status')}</span>
            <div className="closure-status-badge-wrap">
              <StatusBadge status={loan.status} size="medium" />
            </div>
            <span className="fld-box-hint">
              {loan.status === 'CLOSED'
                ? t('farmerLoanDetail.accountFinalized', 'Account finalized & settled')
                : loan.status === 'DISBURSED'
                ? t('farmerLoanDetail.activeRunning', 'Active running facility')
                : t('farmerLoanDetail.preDisbursement', 'Pre-disbursement stage')}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Repayment Schedule Table */}
      <div className="fld-section-card glass-panel">
        <div className="fld-section-header">
          <CalendarClock size={18} className="text-primary" />
          <div className="header-titles">
            <h3>{t('farmerLoanDetail.repaymentScheduleTitle', 'Repayment Schedule')}</h3>
            <span className="header-subtitle">
              {repayments.length > 0
                ? `${repayments.length} ${t('farmerLoanDetail.scheduledInstallmentsCount', 'scheduled installment(s) generated for this loan')}`
                : t('farmerLoanDetail.scheduleStatus', 'Schedule status')}
            </span>
          </div>
        </div>

        {repayments.length === 0 ? (
          <div className="fld-empty-repayments">
            <Clock size={36} className="text-muted" />
            <h4>{t('farmerLoanDetail.noScheduleYet', 'Repayment Schedule Not Generated Yet')}</h4>
            <p>
              {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(loan.status)
                ? t(
                    'farmerLoanDetail.schedulePendingNote',
                    'The official installment repayment schedule is generated automatically once the FPO administration disburses the loan funds.'
                  )
                : loan.status === 'REJECTED'
                ? t(
                    'farmerLoanDetail.scheduleRejectedNote',
                    'This application was not approved, so no repayment obligations or schedule exist.'
                  )
                : t(
                    'farmerLoanDetail.scheduleEmptyNote',
                    'No repayment installments are recorded for this application.'
                  )}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="fld-repayments-table">
              <thead>
                <tr>
                  <th>{t('repayments.installment', 'Installment')} #</th>
                  <th>{t('repayments.dueDate', 'Due Date')}</th>
                  <th>{t('repayments.amountDue', 'Amount Due')}</th>
                  <th>{t('repayments.amountPaid', 'Amount Paid')}</th>
                  <th>{t('farmerRepayments.remainingAmount', 'Remaining')}</th>
                  <th>{t('repayments.paidDate', 'Payment Date')}</th>
                  <th>{t('loans.status', 'Status')}</th>
                  <th>{t('repayments.paymentMethod', 'Payment Details')}</th>
                </tr>
              </thead>
              <tbody>
                {repayments.map((repay) => {
                  const remaining = Math.max(0, (repay.amountDue || 0) - (repay.amountPaid || 0));
                  const isOverdue = repay.paymentStatus === 'OVERDUE';

                  return (
                    <tr key={repay._id} className={isOverdue ? 'row-overdue' : ''}>
                      <td className="font-semibold">
                        {t('repayments.installment', 'Installment')} #{repay.installmentNumber}
                      </td>
                      <td>
                        <div className="fld-date-cell">
                          <Calendar size={13} className="text-muted" />
                          <span>
                            {new Date(repay.dueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="font-semibold">
                        ₹{(repay.amountDue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="text-success font-semibold">
                        ₹{(repay.amountPaid || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={remaining > 0 ? 'text-amber font-semibold' : 'text-muted'}>
                          ₹{remaining.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        {repay.paidDate ? (
                          <div className="fld-date-cell">
                            <Check size={13} className="text-success" />
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
                          <span className="payment-method-pill">
                            {repay.paymentMethod}
                            {repay.transactionReference && ` · Ref: ${repay.transactionReference}`}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="fld-repayment-footer-notice">
          <Info size={14} className="text-primary" />
          <span>
            {t(
              'farmerLoanDetail.paymentAdminNotice',
              'EMI installment receipts and payments are verified and recorded by your FPO branch office. Repayment records update automatically upon administrative reconciliation.'
            )}
          </span>
        </div>
      </div>

      {/* Section 4: Supporting Documents */}
      <div className="fld-section-card glass-panel">
        <div className="fld-section-header">
          <FolderOpen size={18} className="text-primary" />
          <div className="header-titles">
            <h3>{t('loanDetail.uploadedDocs', 'Supporting Documents')}</h3>
            <span className="header-subtitle">
              {documents.length} {t('farmerLoanDetail.docsAttachedCount', 'document(s) attached to this application')}
            </span>
          </div>

          <button
            type="button"
            className="btn-fld-docs-nav"
            onClick={() => navigate('/farmer/documents')}
          >
            <span>{t('farmerLoanDetail.manageDocs', 'Manage Documents')}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="fld-empty-docs">
            <FolderOpen size={32} className="text-muted" />
            <p>{t('documents.noDocsUploaded', 'No documents uploaded yet for this application.')}</p>
            <button
              type="button"
              className="btn-fld-upload-link"
              onClick={() => navigate('/farmer/documents')}
            >
              {t('farmerLoanDetail.uploadDocsCTA', 'Upload Required Documents')}
            </button>
          </div>
        ) : (
          <div className="fld-docs-grid">
            {documents.map((doc) => (
              <div key={doc._id} className="fld-doc-item glass-panel">
                <div className="doc-item-top">
                  <span className="doc-type-badge">{doc.documentType}</span>
                  <StatusBadge status={doc.status} size="small" />
                </div>

                <div className="doc-item-middle">
                  <p className="doc-name" title={doc.documentName}>
                    <FileText size={14} />
                    <span>{doc.documentName}</span>
                  </p>
                  <span className="doc-date">
                    {t('farmerLoanDetail.uploadedOn', 'Uploaded')} {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {doc.status === 'REJECTED' && doc.rejectionReason && (
                  <div className="doc-rejection-note">
                    <AlertTriangle size={12} />
                    <span>{doc.rejectionReason}</span>
                  </div>
                )}

                <div className="doc-item-actions">
                  {doc.fileUrl && (
                    <button
                      type="button"
                      className="btn-doc-view"
                      onClick={() => openDocumentPreview(doc)}
                    >
                      <Eye size={13} />
                      <span>{t('common.view', 'View')}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerLoanDetail;
