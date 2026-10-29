import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loanAPI, documentAPI } from '../api/client';
import { openDocumentPreview, downloadDocumentFile } from '../utils/documentPreview';
import { FPO_AVAILABLE_SCHEMES } from './FarmerLoans';
import {
  Sprout,
  LogOut,
  FileText,
  CreditCard,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  ChevronDown,
  FolderOpen,
  Loader2,
  Info,
  Sun,
  Moon,
  Globe,
  Wheat,
  ShieldCheck,
  X,
  FileCheck,
  FilePlus,
} from 'lucide-react';
import './FarmerDocuments.css';

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — matches backend uploadMiddleware

const VALID_DOC_TYPES = [
  'ID_PROOF',
  'ADDRESS_PROOF',
  'LAND_RECORD',
  'FPO_MEMBERSHIP',
  'BANK_STATEMENT',
  'FINANCIAL_REPORT',
  'OTHER',
];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const validateFile = (file) => {
  const ext = '.' + (file.name || '').split('.').pop().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type "${file.type}". Only PDF, JPG, JPEG, PNG are allowed.`;
  }
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Invalid file extension "${ext}". Only .pdf, .jpg, .jpeg, .png are allowed.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File size ${formatBytes(file.size)} exceeds maximum allowed limit of 5 MB.`;
  }
  return null;
};

const DOC_TYPE_LABELS = {
  ID_PROOF: 'Identity Proof (Aadhaar / PAN)',
  ADDRESS_PROOF: 'Address Proof',
  LAND_RECORD: 'Land 7/12 Record',
  FPO_MEMBERSHIP: 'FPO Membership Certificate',
  BANK_STATEMENT: 'Bank Statement',
  FINANCIAL_REPORT: 'Financial Report',
  OTHER: 'Other Supporting Document',
};

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    label: 'Awaiting Verification',
    className: 'status-pending',
  },
  VERIFIED: {
    icon: CheckCircle2,
    label: 'Verified',
    className: 'status-verified',
  },
  REJECTED: {
    icon: XCircle,
    label: 'Rejected',
    className: 'status-rejected',
  },
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: Document Row
───────────────────────────────────────────────────────────── */
const DocumentRow = ({ doc, onPreview, onDownload, onReplace, uploading }) => {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const replaceInputRef = useRef(null);

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'ID_PROOF': return t('documents.idProof', 'Identity Proof (Aadhaar / PAN)');
      case 'ADDRESS_PROOF': return t('documents.addressProof', 'Address Proof');
      case 'LAND_RECORD': return t('documents.landRecord', 'Land 7/12 Record');
      case 'FPO_MEMBERSHIP': return t('documents.fpoMembership', 'FPO Membership Certificate');
      case 'BANK_STATEMENT': return t('documents.bankStatement', 'Bank Statement');
      case 'FINANCIAL_REPORT': return t('documents.otherDoc', 'Financial Report');
      case 'OTHER': return t('documents.otherDoc', 'Other Supporting Document');
      default: return DOC_TYPE_LABELS[type] || type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'VERIFIED': return t('farmerDocuments.verified', 'Verified');
      case 'REJECTED': return t('farmerDocuments.rejected', 'Rejected');
      case 'PENDING':
      default:
        return t('farmerDocuments.awaitingVerification', 'Awaiting Verification');
    }
  };

  return (
    <div className={`fd-doc-row ${cfg.className}`}>
      <div className="fd-doc-row-main">
        {/* Type badge */}
        <span className="fd-doc-type-badge">
          {getDocTypeLabel(doc.documentType)}
        </span>

        {/* Name */}
        <p className="fd-doc-name" title={doc.documentName}>
          <FileText size={13} />
          {doc.documentName}
        </p>

        {/* Upload date */}
        <p className="fd-doc-meta">
          {t('farmerLoanDetail.uploadedOn', 'Uploaded')}:{' '}
          {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        {/* Verified-by info */}
        {doc.status === 'VERIFIED' && doc.verifiedBy && (
          <p className="fd-doc-meta fd-doc-verified-by">
            <ShieldCheck size={12} />
            {t('farmerDocuments.verifiedBy', 'Verified by')} {doc.verifiedBy.name || 'Admin'}
          </p>
        )}

        {/* Rejection reason */}
        {doc.status === 'REJECTED' && doc.rejectionReason && (
          <div className="fd-rejection-reason">
            <AlertTriangle size={12} />
            <span>
              <strong>{t('farmerDocuments.rejectionReason', 'Rejection Reason')}:</strong> {doc.rejectionReason}
            </span>
          </div>
        )}
      </div>

      {/* Right: status + actions */}
      <div className="fd-doc-row-right">
        <span className={`fd-status-badge ${cfg.className}`}>
          <Icon size={12} />
          {getStatusLabel(doc.status)}
        </span>

        <div className="fd-doc-actions">
          {/* View */}
          <button
            type="button"
            className="fd-btn-icon"
            onClick={() => onPreview(doc)}
            title={t('farmerDocuments.viewBtn', 'View document')}
            disabled={uploading}
          >
            <Eye size={14} />
          </button>

          {/* Download */}
          <button
            type="button"
            className="fd-btn-icon"
            onClick={() => onDownload(doc)}
            title={t('common.download', 'Download document')}
            disabled={uploading}
          >
            <Download size={14} />
          </button>

          {/* Re-upload (only allowed when PENDING or REJECTED — not VERIFIED) */}
          {doc.status !== 'VERIFIED' && (
            <>
              <button
                type="button"
                className="fd-btn-icon"
                onClick={() => replaceInputRef.current?.click()}
                title={t('farmerDocuments.replaceBtn', 'Replace document')}
                disabled={uploading}
              >
                <RefreshCw size={14} />
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="fd-hidden-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onReplace(doc, file);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: Upload Slot (for required but not-yet-uploaded)
───────────────────────────────────────────────────────────── */
const UploadSlot = ({ docType, loanId, onUploadSuccess, uploading, setUploading }) => {
  const { t } = useTranslation();
  const [staged, setStaged] = useState(null);       // { file, validationError }
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const fileInputRef = useRef(null);

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'ID_PROOF': return t('documents.idProof', 'Identity Proof (Aadhaar / PAN)');
      case 'ADDRESS_PROOF': return t('documents.addressProof', 'Address Proof');
      case 'LAND_RECORD': return t('documents.landRecord', 'Land 7/12 Record');
      case 'FPO_MEMBERSHIP': return t('documents.fpoMembership', 'FPO Membership Certificate');
      case 'BANK_STATEMENT': return t('documents.bankStatement', 'Bank Statement');
      case 'FINANCIAL_REPORT': return t('documents.otherDoc', 'Financial Report');
      case 'OTHER': return t('documents.otherDoc', 'Other Supporting Document');
      default: return DOC_TYPE_LABELS[type] || type;
    }
  };

  const handleFileSelect = (file) => {
    const err = validateFile(file);
    setStaged({ file, validationError: err });
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!staged?.file || staged.validationError || uploading) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', staged.file);
      formData.append('loan', loanId);
      formData.append('documentType', docType.type);
      formData.append('documentName', staged.file.name);

      await documentAPI.uploadDocument(formData);

      setUploadSuccess(true);
      setStaged(null);
      setUploadNote('');
      onUploadSuccess(); // re-fetch loan documents
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
          'Upload failed. Please check your file and try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  if (uploadSuccess) {
    return (
      <div className="fd-upload-slot fd-upload-success-flash">
        <CheckCircle2 size={18} className="fd-success-icon" />
        <span>{t('farmerDocuments.uploadSuccess', 'Uploaded successfully. Awaiting admin verification.')}</span>
      </div>
    );
  }

  return (
    <div className="fd-upload-slot">
      {/* Required document info */}
      <div className="fd-slot-header">
        <span className="fd-slot-type-badge">{getDocTypeLabel(docType.type)}</span>
        {docType.required && <span className="fd-required-pill">{t('farmerDocuments.required', 'Required')}</span>}
      </div>
      {docType.description && (
        <p className="fd-slot-desc">{docType.description}</p>
      )}

      {/* Drop zone */}
      <div
        className={`fd-drop-zone ${staged?.file ? 'has-file' : ''} ${staged?.validationError ? 'has-error' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label={`Upload ${docType.title || docType.type}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="fd-hidden-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />

        {staged?.file ? (
          <div className="fd-staged-file">
            <FileCheck size={20} className="fd-staged-icon" />
            <div>
              <p className="fd-staged-name">{staged.file.name}</p>
              <p className="fd-staged-size">{formatBytes(staged.file.size)}</p>
            </div>
            <button
              type="button"
              className="fd-btn-remove"
              onClick={(e) => {
                e.stopPropagation();
                setStaged(null);
                setUploadError(null);
              }}
              title="Remove selected file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="fd-drop-prompt">
            <FilePlus size={24} className="fd-drop-icon" />
            <p className="fd-drop-text">
              {t('farmerDocuments.dropHere', 'Drop file here or')} <span className="fd-browse-link">{t('farmerDocuments.browse', 'browse')}</span>
            </p>
            <p className="fd-drop-hint">{t('farmerDocuments.dropHint', 'PDF, JPG, JPEG, PNG · Max 5 MB')}</p>
          </div>
        )}
      </div>

      {/* Validation error */}
      {staged?.validationError && (
        <p className="fd-field-error">
          <AlertCircle size={13} />
          {staged.validationError}
        </p>
      )}

      {/* API upload error */}
      {uploadError && (
        <p className="fd-field-error">
          <AlertCircle size={13} />
          {uploadError}
        </p>
      )}

      {/* Upload button */}
      {staged?.file && !staged.validationError && (
        <button
          type="button"
          className="fd-btn-upload"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="spinning" />
              <span>{t('farmerDocuments.uploading', 'Uploading…')}</span>
            </>
          ) : (
            <>
              <Upload size={15} />
              <span>{t('farmerDocuments.uploadBtn', 'Upload Document')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main Page Component: FarmerDocuments
───────────────────────────────────────────────────────────── */
const FarmerDocuments = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  /* ── State ────────────────────────────────────────────── */
  const [myLoans, setMyLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [loanDocuments, setLoanDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loansError, setLoansError] = useState(null);
  const [docsError, setDocsError] = useState(null);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [replaceError, setReplaceError] = useState(null);

  /* ── Derived: selected loan object ───────────────────── */
  const selectedLoan = myLoans.find((l) => l._id === selectedLoanId) || null;

  /* ── Derived: scheme required documents ──────────────── */
  const schemeRequiredDocs = React.useMemo(() => {
    if (!selectedLoan) return [];
    // Try matching scheme by loan purpose against known scheme purposes
    const scheme = FPO_AVAILABLE_SCHEMES.find(
      (s) =>
        s.purpose?.toLowerCase() === selectedLoan.purpose?.toLowerCase() ||
        s.name?.toLowerCase().includes((selectedLoan.purpose || '').split(' ')[0]?.toLowerCase())
    );
    if (scheme?.requiredDocuments?.length) return scheme.requiredDocuments;
    // Fall back: show all standard types as guidance
    return VALID_DOC_TYPES.slice(0, 5).map((type) => ({
      type,
      title: t(`farmerDocuments.docTypes.${type}`, DOC_TYPE_LABELS[type]),
      description: '',
      required: ['ID_PROOF', 'FPO_MEMBERSHIP'].includes(type),
    }));
  }, [selectedLoan]);

  /* ── Derived: which doc types already uploaded ────────── */
  const uploadedTypes = React.useMemo(
    () => new Set(loanDocuments.map((d) => d.documentType)),
    [loanDocuments]
  );

  /* ── Fetch farmer's loans ─────────────────────────────── */
  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true);
    setLoansError(null);
    try {
      const res = await loanAPI.getMyLoans();
      const loans = res.data?.data?.loans || [];
      setMyLoans(loans);
      if (loans.length > 0 && !selectedLoanId) {
        setSelectedLoanId(loans[0]._id);
      }
    } catch (err) {
      setLoansError(
        err.response?.data?.message ||
          'Failed to load your loan applications. Please try again.'
      );
    } finally {
      setLoadingLoans(false);
    }
  }, [selectedLoanId]);

  /* ── Fetch documents for selected loan ───────────────── */
  const fetchLoanDocuments = useCallback(async () => {
    if (!selectedLoanId) return;
    setLoadingDocs(true);
    setDocsError(null);
    try {
      const res = await documentAPI.getLoanDocuments(selectedLoanId);
      setLoanDocuments(res.data?.data?.documents || []);
    } catch (err) {
      setDocsError(
        err.response?.data?.message ||
          'Failed to load documents for this loan. Please try again.'
      );
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedLoanId]);

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    if (selectedLoanId) fetchLoanDocuments();
  }, [selectedLoanId]);

  /* ── Preview handler ─────────────────────────────────── */
  const handlePreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewError('');
    setPreviewLoading(true);
    try {
      await openDocumentPreview(doc);
    } catch (err) {
      setPreviewError(
        err.response?.data?.message ||
          'Unable to load document preview. You may need to allow pop-ups.'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ── Download handler ────────────────────────────────── */
  const handleDownload = async (doc) => {
    try {
      await downloadDocumentFile(doc);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download document file');
    }
  };

  /* ── Replace existing document ───────────────────────── */
  const handleReplace = async (doc, newFile) => {
    setReplaceError(null);
    const err = validateFile(newFile);
    if (err) {
      setReplaceError(`Replace "${doc.documentName}": ${err}`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('loan', doc.loan?._id || doc.loan || selectedLoanId);
      formData.append('documentType', doc.documentType);
      formData.append('documentName', newFile.name);
      await documentAPI.uploadDocument(formData);
      await fetchLoanDocuments();
    } catch (apiErr) {
      setReplaceError(
        apiErr.response?.data?.message ||
          'Failed to replace document. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  /* ── Status summary counts ───────────────────────────── */
  const statusCounts = React.useMemo(() => {
    const counts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
    loanDocuments.forEach((d) => {
      if (counts[d.status] !== undefined) counts[d.status]++;
    });
    return counts;
  }, [loanDocuments]);

  /* ── Logout ──────────────────────────────────────────── */
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="fd-layout" style={{ minHeight: 'auto', background: 'transparent' }}>
      {/* ─── Main content ─── */}
      <main className="fd-container" style={{ padding: '0 0 2rem 0', maxWidth: '100%' }}>
        {/* Page title row */}
        <div className="fd-page-title-row">
          <div>
            <h1 className="fd-page-title">
              <Upload size={20} />
              {t('farmerDocuments.pageTitle')}
            </h1>
            <p className="fd-page-sub">
              {t('farmerDocuments.pageSub')}
            </p>
          </div>
          <button
            type="button"
            className="fd-btn-refresh"
            onClick={() => {
              fetchLoans();
              fetchLoanDocuments();
            }}
            disabled={loadingLoans || loadingDocs}
            title={t('farmerDocuments.refreshBtn')}
          >
            <RefreshCw size={15} className={loadingLoans || loadingDocs ? 'spinning' : ''} />
            <span>{t('farmerDocuments.refreshBtn')}</span>
          </button>
        </div>

        {/* ─── Loan Selector ─── */}
        <section className="fd-section-card">
          <div className="fd-section-header">
            <div className="fd-section-num">1</div>
            <div>
              <h3 className="fd-section-title">{t('farmerDocuments.selectLoan')}</h3>
              <p className="fd-section-sub">
                {t('farmerDocuments.selectLoanSub')}
              </p>
            </div>
          </div>

          {loadingLoans ? (
            <div className="fd-loading-row">
              <Loader2 size={20} className="spinning" />
              <span>{t('common.loading')}…</span>
            </div>
          ) : loansError ? (
            <div className="fd-error-box">
              <AlertCircle size={16} />
              <span>{loansError}</span>
            </div>
          ) : myLoans.length === 0 ? (
            <div className="fd-empty-state">
              <FolderOpen size={36} className="fd-empty-icon" />
              <h4>{t('farmerDocuments.noLoans')}</h4>
              <p>
                {t('farmerDocuments.noLoansMsg')}
              </p>
              <button
                type="button"
                className="fd-btn-cta"
                onClick={() => navigate('/farmer/apply')}
              >
                {t('farmerDocuments.applyNow')}
              </button>
            </div>
          ) : (
            <div className="fd-loan-selector">
              <div className="fd-select-wrapper">
                <select
                  className="fd-select"
                  value={selectedLoanId}
                  onChange={(e) => {
                    setSelectedLoanId(e.target.value);
                    setLoanDocuments([]);
                    setDocsError(null);
                    setReplaceError(null);
                  }}
                >
                  {myLoans.map((loan) => (
                    <option key={loan._id} value={loan._id}>
                      {loan.purpose || t('farmerApply.loanApplication')} — ₹
                      {Number(loan.loanAmount || 0).toLocaleString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN')} ({t(`farmerApplications.status${loan.status?.charAt(0) + loan.status?.slice(1).toLowerCase()}`, loan.status)})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="fd-select-arrow" />
              </div>

              {/* Selected loan summary chip */}
              {selectedLoan && (
                <div className="fd-loan-summary-chip">
                  <div className="fd-loan-chip-row">
                    <span className="fd-chip-label">{t('farmerDashboard.thStatus')}</span>
                    <span className={`fd-loan-status-pill status-${selectedLoan.status?.toLowerCase()}`}>
                      {t(`farmerApplications.status${selectedLoan.status?.charAt(0) + selectedLoan.status?.slice(1).toLowerCase()}`, selectedLoan.status)}
                    </span>
                  </div>
                  <div className="fd-loan-chip-row">
                    <span className="fd-chip-label">{t('farmerDashboard.thAmount')}</span>
                    <span className="fd-chip-val">
                      ₹{Number(selectedLoan.loanAmount || 0).toLocaleString(i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                    </span>
                  </div>
                  <div className="fd-loan-chip-row">
                    <span className="fd-chip-label">{t('farmerLoans.tenure')}</span>
                    <span className="fd-chip-val">{selectedLoan.tenureMonths} {t('chatbot.messages.tenureMonths', 'months')}</span>
                  </div>
                  <div className="fd-loan-chip-row">
                    <span className="fd-chip-label">{t('farmerApply.fieldPurpose')}</span>
                    <span className="fd-chip-val">{selectedLoan.purpose || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── Uploaded Documents (tracking) ─── */}
        {selectedLoanId && (
          <section className="fd-section-card">
            <div className="fd-section-header">
              <div className="fd-section-num">2</div>
              <div>
                <h3 className="fd-section-title">{t('farmerDocuments.uploadedDocs')}</h3>
                <p className="fd-section-sub">
                  {t('farmerDocuments.uploadedDocsSub')}
                </p>
              </div>
            </div>

            {/* Status summary bar */}
            {loanDocuments.length > 0 && (
              <div className="fd-status-summary">
                <div className="fd-status-chip fd-chip-pending">
                  <Clock size={13} />
                  <span>{statusCounts.PENDING} {t('farmerDocuments.pending')}</span>
                </div>
                <div className="fd-status-chip fd-chip-verified">
                  <CheckCircle2 size={13} />
                  <span>{statusCounts.VERIFIED} {t('farmerDocuments.verified')}</span>
                </div>
                <div className="fd-status-chip fd-chip-rejected">
                  <XCircle size={13} />
                  <span>{statusCounts.REJECTED} {t('farmerDocuments.rejected')}</span>
                </div>
              </div>
            )}

            {/* Replace error banner */}
            {replaceError && (
              <div className="fd-error-box">
                <AlertCircle size={14} />
                <span>{replaceError}</span>
                <button
                  type="button"
                  className="fd-dismiss-btn"
                  onClick={() => setReplaceError(null)}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {loadingDocs ? (
              <div className="fd-loading-row">
                <Loader2 size={20} className="spinning" />
                <span>{t('common.loading')}…</span>
              </div>
            ) : docsError ? (
              <div className="fd-error-box">
                <AlertCircle size={16} />
                <span>{docsError}</span>
              </div>
            ) : loanDocuments.length === 0 ? (
              <div className="fd-empty-state fd-empty-small">
                <FileText size={28} className="fd-empty-icon" />
                <p>{t('farmerDocuments.noDocs')}</p>
              </div>
            ) : (
              <div className="fd-doc-list">
                {loanDocuments.map((doc) => (
                  <DocumentRow
                    key={doc._id}
                    doc={doc}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onReplace={handleReplace}
                    uploading={uploading}
                  />
                ))}
              </div>
            )}

            {/* Preview loading/error inline note */}
            {previewDoc && previewLoading && (
              <div className="fd-loading-row fd-preview-note">
                <Loader2 size={14} className="spinning" />
                <span>{t('farmerDocuments.openingPreview')}</span>
              </div>
            )}
            {previewError && (
              <div className="fd-error-box">
                <AlertCircle size={14} />
                <span>{previewError}</span>
                <button
                  type="button"
                  className="fd-dismiss-btn"
                  onClick={() => {
                    setPreviewError('');
                    setPreviewDoc(null);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
};

export default FarmerDocuments;
