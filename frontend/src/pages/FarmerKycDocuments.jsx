import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { documentAPI, authAPI } from '../api/client';
import apiClient from '../api/client';
import { openDocumentPreview, downloadDocumentFile } from '../utils/documentPreview';
import {
  ShieldCheck,
  User,
  Calendar,
  Phone,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileText,
  FileCheck,
  X,
  FilePlus,
  Save,
  Check,
} from 'lucide-react';
import './FarmerKycDocuments.css';

// ─── File validation constants ───────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${['B', 'KB', 'MB'][i]}`;
};

const validateFile = (file) => {
  if (!file) return null;
  const ext = '.' + (file.name || '').split('.').pop().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Invalid type. Only PDF, JPG, PNG allowed.';
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Invalid file extension.';
  if (file.size > MAX_FILE_BYTES) return 'File too large. Maximum allowed size is 5 MB.';
  return null;
};

// ─── KYC document upload ──────────────────────────────────────────────────────
const uploadKycDoc = async (file, docLabel) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', 'ID_PROOF');
  formData.append('documentName', `${docLabel} - ${file.name}`);
  return apiClient.post('/documents/kyc-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ─── Calculate age from DOB ───────────────────────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

const formatDate = (dateStr, lang) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ─── UploadSlot Sub-component ─────────────────────────────────────────────────
const UploadSlot = ({
  docKey,
  label,
  hint,
  existingDoc,
  onUploadSuccess,
  disabled,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [stagedFile, setStagedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setStagedFile(null);
      return;
    }
    setFileError(null);
    setUploadError(null);
    setUploadSuccess(false);
    setStagedFile(file);
  };

  const handleInputChange = (e) => handleFileSelect(e.target.files?.[0] || null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] || null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);

  const handleRemoveFile = () => {
    setStagedFile(null);
    setFileError(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!stagedFile || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadKycDoc(stagedFile, label);
      setUploadSuccess(true);
      setStagedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const dropZoneClass = [
    'fkd-drop-zone',
    stagedFile ? 'has-file' : '',
    fileError ? 'has-error' : '',
    dragging ? 'dragging' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`fkd-upload-slot${disabled ? ' fkd-slot-disabled' : ''}`}>
      {/* Slot header */}
      <div className="fkd-slot-header">
        <FileText size={16} className="fkd-slot-icon" />
        <span className="fkd-slot-label">{label}</span>
        <span className="fkd-required-pill">{t('farmerKyc.required', 'Required')}</span>
      </div>

      {hint && (
        <p className="fkd-slot-desc">
          <AlertCircle size={13} />
          {hint}
        </p>
      )}

      {/* Existing uploaded file info if available */}
      {existingDoc && (
        <div className="fkd-existing-doc-chip">
          <div className="fkd-existing-doc-info">
            <CheckCircle2 size={13} className="text-emerald" />
            <span className="fkd-existing-label">
              {t('farmerKyc.currentUploaded', 'Currently submitted file:')}
            </span>
            <strong className="fkd-existing-name" title={existingDoc.documentName}>
              {existingDoc.documentName}
            </strong>
          </div>
          <button
            type="button"
            className="fkd-action-btn-mini"
            onClick={() => openDocumentPreview(existingDoc)}
            title={t('farmerKyc.previewBtn', 'Preview document')}
          >
            <Eye size={12} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={dropZoneClass}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && fileInputRef.current?.click()}
        aria-label={`Upload ${label}`}
      >
        {stagedFile ? (
          <div className="fkd-staged-file">
            <FileCheck size={16} className="fkd-staged-icon" />
            <div className="fkd-staged-meta">
              <p className="fkd-staged-name" title={stagedFile.name}>{stagedFile.name}</p>
              <p className="fkd-staged-size">{formatBytes(stagedFile.size)}</p>
            </div>
            <button
              type="button"
              className="fkd-btn-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              aria-label={t('farmerKyc.removeFile', 'Remove file')}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="fkd-drop-prompt">
            <Upload size={20} className="fkd-drop-icon" />
            <p className="fkd-drop-text">
              {t('farmerKyc.dropPrompt', 'Drag & drop or')}{' '}
              <span className="fkd-browse-link">{t('farmerKyc.browse', 'browse')}</span>
            </p>
            <p className="fkd-drop-hint">{t('farmerKyc.dropHint', 'PDF, JPG, PNG · max 5 MB')}</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="fkd-hidden-input"
        onChange={handleInputChange}
        disabled={disabled || uploading}
      />

      {/* Validation error */}
      {fileError && (
        <p className="fkd-field-error">
          <AlertCircle size={13} />
          {fileError}
        </p>
      )}

      {/* Upload API error */}
      {uploadError && (
        <div className="fkd-error-box fkd-error-inline">
          <AlertCircle size={14} />
          <span>{uploadError}</span>
          <button type="button" className="fkd-dismiss-btn" onClick={() => setUploadError(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Upload success notification */}
      {uploadSuccess && (
        <div className="fkd-success-box fkd-success-inline">
          <CheckCircle2 size={14} />
          <span>{t('farmerKyc.uploadedSuccess', { label, defaultValue: `${label} uploaded successfully!` })}</span>
        </div>
      )}

      {/* Upload action button */}
      <button
        type="button"
        className="fkd-btn-upload"
        onClick={handleUpload}
        disabled={!stagedFile || uploading || disabled}
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="fkd-spin" />
            <span>{t('farmerKyc.uploading', 'Uploading…')}</span>
          </>
        ) : (
          <>
            <Upload size={14} />
            <span>{t('farmerKyc.uploadBtn', { label, defaultValue: `Upload ${label}` })}</span>
          </>
        )}
      </button>
    </div>
  );
};

// ─── DocumentRow Sub-component ────────────────────────────────────────────────
const DocumentRow = ({ doc }) => {
  const { t, i18n } = useTranslation();
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handlePreview = async () => {
    setPreviewing(true);
    setActionError(null);
    try {
      await openDocumentPreview(doc);
    } catch (err) {
      setActionError(err.message || 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setActionError(null);
    try {
      await downloadDocumentFile(doc);
    } catch (err) {
      setActionError(err.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const statusClass = (doc.status || 'pending').toLowerCase();
  const StatusIcon =
    statusClass === 'verified'
      ? CheckCircle2
      : statusClass === 'rejected'
      ? XCircle
      : Clock;

  const statusLabel =
    statusClass === 'verified'
      ? t('farmerKyc.statusVerified', 'Verified')
      : statusClass === 'rejected'
      ? t('farmerKyc.statusRejected', 'Rejected')
      : t('farmerKyc.statusPending', 'Pending Review');

  return (
    <div className={`fkd-doc-row status-${statusClass}`}>
      <div className="fkd-doc-row-main">
        <span className="fkd-doc-type-badge">{t('farmerKyc.idProof', 'ID PROOF')}</span>
        <p className="fkd-doc-name">
          <FileText size={14} />
          {doc.documentName || 'Unnamed Document'}
        </p>
        <p className="fkd-doc-meta">
          {t('farmerKyc.uploadedOn', {
            date: formatDate(doc.createdAt, i18n.language),
            defaultValue: `Uploaded: ${formatDate(doc.createdAt, i18n.language)}`,
          })}
          {doc.fileSize ? <> · {formatBytes(doc.fileSize)}</> : null}
        </p>
        {statusClass === 'rejected' && doc.rejectionReason && (
          <p className="fkd-rejection-reason">
            <AlertTriangle size={13} />
            <span>{doc.rejectionReason}</span>
          </p>
        )}
        {actionError && (
          <p className="fkd-field-error">
            <AlertCircle size={13} />
            {actionError}
          </p>
        )}
      </div>

      <div className="fkd-doc-row-right">
        <span className={`fkd-status-badge status-${statusClass}`}>
          <StatusIcon size={12} />
          <span>{statusLabel}</span>
        </span>
        <div className="fkd-doc-actions">
          <button
            type="button"
            className="fkd-btn-icon"
            onClick={handlePreview}
            disabled={previewing || downloading}
            title={t('farmerKyc.previewBtn', 'Preview document')}
          >
            {previewing ? <Loader2 size={13} className="fkd-spin" /> : <Eye size={13} />}
          </button>
          <button
            type="button"
            className="fkd-btn-icon"
            onClick={handleDownload}
            disabled={downloading || previewing}
            title={t('farmerKyc.downloadBtn', 'Download document')}
          >
            {downloading ? <Loader2 size={13} className="fkd-spin" /> : <Download size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main FarmerKycDocuments Page Component ───────────────────────────────────
const FarmerKycDocuments = () => {
  const { t, i18n } = useTranslation();
  const { user: authUser, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [docsError, setDocsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Editable personal details form state
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    age: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // ── Fetch fresh profile ───────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const freshUser = res.data?.data?.user || res.data?.user || null;
      if (freshUser) {
        setProfile(freshUser);
        updateUser?.(freshUser);
        setFormData({
          name: freshUser.name || '',
          dob: freshUser.dob ? freshUser.dob.substring(0, 10) : '',
          age: freshUser.age !== undefined && freshUser.age !== null ? String(freshUser.age) : '',
          phone: freshUser.phone || '',
        });
      }
      setProfileError(null);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to load profile.');
    }
  }, [updateUser]);

  // ── Fetch KYC documents (ID_PROOF only) ───────────────────────────────────
  const fetchDocs = useCallback(async () => {
    try {
      const res = await documentAPI.getMyDocuments();
      const all = res.data?.data?.documents || res.data?.documents || [];
      setKycDocs(all.filter((d) => d.documentType === 'ID_PROOF'));
      setDocsError(null);
    } catch (err) {
      setDocsError(err.response?.data?.message || 'Failed to load documents.');
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingProfile(true);
      setLoadingDocs(true);
      await Promise.allSettled([fetchProfile(), fetchDocs()]);
      if (mounted) {
        setLoadingProfile(false);
        setLoadingDocs(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [fetchProfile, fetchDocs]);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setProfileError(null);
    setDocsError(null);
    setSaveSuccessMsg(false);
    await Promise.allSettled([fetchProfile(), fetchDocs()]);
    setRefreshing(false);
  }, [fetchProfile, fetchDocs]);

  // ── Re-fetch docs after successful upload ─────────────────────────────────
  const handleUploadSuccess = useCallback(async () => {
    setLoadingDocs(true);
    await Promise.allSettled([fetchDocs(), fetchProfile()]);
    setLoadingDocs(false);
  }, [fetchDocs, fetchProfile]);

  // ── Handle DOB change & auto-calculate Age ────────────────────────────────
  const handleDobChange = (e) => {
    const newDob = e.target.value;
    const calculatedAge = calcAge(newDob);
    setFormData((prev) => ({
      ...prev,
      dob: newDob,
      age: calculatedAge !== null ? String(calculatedAge) : '',
    }));
    if (formErrors.dob || formErrors.age) {
      setFormErrors((prev) => ({ ...prev, dob: null, age: null }));
    }
  };

  // ── Handle form submit to save personal details ───────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = t('farmerKyc.errorNameRequired', 'Full legal name is required');
    }

    if (!formData.dob) {
      errors.dob = t('farmerKyc.errorDobRequired', 'Date of birth is required');
    } else {
      const calculatedAge = calcAge(formData.dob);
      if (calculatedAge === null || calculatedAge < 18) {
        errors.age = t('farmerKyc.errorAgeMin', 'Farmer must be at least 18 years of age');
      }
    }

    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      errors.phone = t('farmerKyc.errorMobileRequired', '10-digit mobile number is required');
    } else if (!/^(?:\+91|0091|0)?[6-9]\d{9}$/.test(cleanPhone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = t(
        'farmerKyc.errorMobileInvalid',
        'Please enter a valid 10-digit Indian mobile number (+91)'
      );
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSavingProfile(true);
    setSaveSuccessMsg(false);
    setProfileError(null);

    try {
      const calculatedAge = calcAge(formData.dob);
      const res = await authAPI.updateProfile({
        name: formData.name.trim(),
        dob: formData.dob,
        age: calculatedAge,
        phone: cleanPhone,
      });

      const updatedUser = res.data?.data?.user || res.data?.user;
      if (updatedUser) {
        setProfile(updatedUser);
        updateUser?.(updatedUser);
        setSaveSuccessMsg(true);
      }
      await fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile details.';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Derived state & status config ─────────────────────────────────────────
  const displayUser = profile || authUser;
  const kycStatus = displayUser?.kycStatus || 'PENDING';
  const canUpload = kycStatus !== 'VERIFIED';

  const statusConfig = {
    PENDING: {
      icon: Clock,
      label: t('farmerKyc.statusPending', 'Pending Review'),
      colorClass: 'fkd-status-pending',
      description: t(
        'farmerKyc.statusPendingDesc',
        'Your KYC documents are under review. This may take 1–3 business days.'
      ),
    },
    VERIFIED: {
      icon: CheckCircle2,
      label: t('farmerKyc.statusVerified', 'Verified'),
      colorClass: 'fkd-status-verified',
      description: t(
        'farmerKyc.statusVerifiedDesc',
        'Your KYC is approved. You are eligible to apply for loans.'
      ),
    },
    REJECTED: {
      icon: XCircle,
      label: t('farmerKyc.statusRejected', 'Rejected'),
      colorClass: 'fkd-status-rejected',
      description: t(
        'farmerKyc.statusRejectedDesc',
        'Your KYC was not approved. Please review the reason and re-submit.'
      ),
    },
  };

  const statusCfg = statusConfig[kycStatus] || statusConfig.PENDING;
  const StatusIcon = statusCfg.icon;

  // Identify already uploaded Aadhaar and PAN documents
  const existingAadhaarDoc = kycDocs.find(
    (d) =>
      d.documentType === 'ID_PROOF' &&
      /aadhaar|aadhar/i.test(d.documentName || '')
  ) || kycDocs.find((d) => /aadhaar|aadhar/i.test(d.documentName || '')) || null;

  const existingPanDoc = kycDocs.find(
    (d) =>
      d.documentType === 'ID_PROOF' &&
      /pan/i.test(d.documentName || '')
  ) || kycDocs.find((d) => /pan/i.test(d.documentName || '')) || null;

  return (
    <div className="fkd-layout">
      <div className="fkd-container">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="fkd-page-title-row">
          <div>
            <h1 className="fkd-page-title">
              <ShieldCheck size={22} />
              {t('farmerKyc.pageTitle', 'KYC Documents')}
            </h1>
            <p className="fkd-page-sub">
              {t(
                'farmerKyc.pageSub',
                'Manage your identity verification documents. Upload Aadhaar and PAN to complete KYC.'
              )}
            </p>
          </div>
          <button
            type="button"
            className="fkd-btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing || loadingProfile || loadingDocs}
            title={t('farmerKyc.refresh', 'Refresh')}
          >
            <RefreshCw size={14} className={refreshing ? 'fkd-spin' : ''} />
            <span>{refreshing ? t('farmerKyc.refreshing', 'Refreshing…') : t('farmerKyc.refresh', 'Refresh')}</span>
          </button>
        </div>

        {/* ── KYC Status Banner ────────────────────────────────────────────── */}
        {loadingProfile ? (
          <div className="fkd-section-card">
            <div className="fkd-loading-row">
              <Loader2 size={16} className="fkd-spin" />
              <span>{t('farmerKyc.loadingKyc', 'Loading KYC status…')}</span>
            </div>
          </div>
        ) : profileError ? (
          <div className="fkd-error-box">
            <AlertCircle size={15} />
            <span>{profileError}</span>
            <button
              type="button"
              className="fkd-dismiss-btn"
              onClick={() => setProfileError(null)}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className={`fkd-section-card fkd-status-banner ${statusCfg.colorClass}`}>
            <div className="fkd-status-banner-inner">
              <div className="fkd-status-icon-wrap">
                <StatusIcon size={26} />
              </div>
              <div className="fkd-status-text">
                <p className="fkd-status-label">
                  {t('farmerKyc.statusBannerTitle', 'KYC Status:')} <strong>{statusCfg.label}</strong>
                </p>
                <p className="fkd-status-desc">{statusCfg.description}</p>

                {kycStatus === 'REJECTED' && displayUser?.kycRejectionReason && (
                  <div className="fkd-rejection-banner">
                    <AlertTriangle size={14} />
                    <span>
                      <strong>{t('farmerKyc.rejectionReasonLabel', 'Reason:')}</strong> {displayUser.kycRejectionReason}
                    </span>
                  </div>
                )}

                {kycStatus === 'VERIFIED' && displayUser?.kycReviewedAt && (
                  <p className="fkd-verified-date">
                    <CheckCircle2 size={13} />
                    {t('farmerKyc.approvedOn', {
                      date: formatDate(displayUser.kycReviewedAt, i18n.language),
                      defaultValue: `Approved on ${formatDate(displayUser.kycReviewedAt, i18n.language)}`,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Personal Details Functional Form ─────────────────────────────── */}
        <div className="fkd-section-card">
          <div className="fkd-section-header">
            <div className="fkd-section-num">
              <User size={14} />
            </div>
            <div>
              <h2 className="fkd-section-title">
                {t('farmerKyc.personalDetailsTitle', 'Personal Details & Identity Information')}
              </h2>
              <p className="fkd-section-sub">
                {t(
                  'farmerKyc.personalDetailsSub',
                  'Review and update your profile details for KYC verification'
                )}
              </p>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="fkd-success-box mb-4">
              <CheckCircle2 size={15} />
              <span>{t('farmerKyc.saveSuccess', 'Personal details saved and updated successfully!')}</span>
              <button
                type="button"
                className="fkd-dismiss-btn"
                onClick={() => setSaveSuccessMsg(false)}
              >
                <X size={13} />
              </button>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="fkd-profile-form">
            <div className="fkd-form-grid">
              {/* Full Legal Name */}
              <div className="fkd-form-group">
                <label className="fkd-form-label">
                  <User size={13} />
                  <span>{t('farmerKyc.fullName', 'Full Legal Name')}</span>
                  <span className="text-rose text-xs">*</span>
                </label>
                <input
                  type="text"
                  className={`fkd-form-input ${formErrors.name ? 'has-error' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder={t('farmerKyc.fullNamePlaceholder', 'Enter your full name as per Aadhaar')}
                  disabled={savingProfile}
                />
                {formErrors.name && (
                  <p className="fkd-field-error">
                    <AlertCircle size={12} />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="fkd-form-group">
                <label className="fkd-form-label">
                  <Calendar size={13} />
                  <span>{t('farmerKyc.dob', 'Date of Birth')}</span>
                  <span className="text-rose text-xs">*</span>
                </label>
                <input
                  type="date"
                  className={`fkd-form-input ${formErrors.dob ? 'has-error' : ''}`}
                  value={formData.dob}
                  onChange={handleDobChange}
                  disabled={savingProfile}
                />
                {formErrors.dob && (
                  <p className="fkd-field-error">
                    <AlertCircle size={12} />
                    {formErrors.dob}
                  </p>
                )}
              </div>

              {/* Automatically Calculated Age */}
              <div className="fkd-form-group">
                <label className="fkd-form-label">
                  <Clock size={13} />
                  <span>{t('farmerKyc.age', 'Age')}</span>
                </label>
                <div className="fkd-calculated-age-wrapper">
                  <input
                    type="text"
                    className="fkd-form-input fkd-readonly-input"
                    value={
                      formData.age
                        ? t('farmerKyc.ageYears', {
                            age: formData.age,
                            defaultValue: `${formData.age} yrs`,
                          })
                        : '—'
                    }
                    readOnly
                    disabled
                  />
                  <span className="fkd-field-hint">
                    {t('farmerKyc.ageCalculatedHint', 'Automatically calculated from date of birth')}
                  </span>
                </div>
                {formErrors.age && (
                  <p className="fkd-field-error">
                    <AlertCircle size={12} />
                    {formErrors.age}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="fkd-form-group">
                <label className="fkd-form-label">
                  <Phone size={13} />
                  <span>{t('farmerKyc.mobile', 'Mobile Number')}</span>
                  <span className="text-rose text-xs">*</span>
                </label>
                <input
                  type="tel"
                  className={`fkd-form-input ${formErrors.phone ? 'has-error' : ''}`}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder={t('farmerKyc.mobilePlaceholder', 'Enter 10-digit mobile number')}
                  disabled={savingProfile}
                />
                {formErrors.phone && (
                  <p className="fkd-field-error">
                    <AlertCircle size={12} />
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="fkd-form-footer">
              <div className="fkd-status-indicator-chip">
                <span className="fkd-chip-title">{t('farmerKyc.kycVerified', 'KYC Verified')}:</span>
                {displayUser?.kycVerified ? (
                  <span className="fkd-pill-verified">
                    <CheckCircle2 size={13} />
                    {t('farmerKyc.yes', 'Yes (Verified)')}
                  </span>
                ) : (
                  <span className="fkd-pill-pending">
                    <Clock size={13} />
                    {t('farmerKyc.no', 'No (Pending)')}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="fkd-btn-submit"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={15} className="fkd-spin" />
                    <span>{t('farmerKyc.saving', 'Saving…')}</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>{t('farmerKyc.saveDetails', 'Save Profile Details')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Document Upload Section ──────────────────────────────────────── */}
        {canUpload && (
          <div className="fkd-section-card">
            <div className="fkd-section-header">
              <div className="fkd-section-num">
                <Upload size={14} />
              </div>
              <div>
                <h2 className="fkd-section-title">
                  {t('farmerKyc.uploadKycTitle', 'Upload KYC Documents')}
                </h2>
                <p className="fkd-section-sub">
                  {kycStatus === 'REJECTED'
                    ? t(
                        'farmerKyc.uploadKycSubRejected',
                        'Your KYC was rejected. Upload corrected documents for re-review.'
                      )
                    : t(
                        'farmerKyc.uploadKycSub',
                        'Upload your Aadhaar Card and PAN Card to initiate KYC verification.'
                      )}
                </p>
              </div>
            </div>

            {kycStatus === 'REJECTED' && (
              <div className="fkd-info-box fkd-info-warning">
                <AlertTriangle size={15} />
                <span>
                  {t(
                    'farmerKyc.rejectionAlertText',
                    'Re-uploading will submit your documents for fresh review. Ensure the documents are clear, valid, and match your registered details.'
                  )}
                </span>
              </div>
            )}

            <div className="fkd-upload-grid">
              <UploadSlot
                docKey="aadhaar"
                label={t('farmerKyc.aadhaarCard', 'Aadhaar Card')}
                hint={t(
                  'farmerKyc.aadhaarHint',
                  'Upload front and back of your Aadhaar Card as a single PDF or image.'
                )}
                existingDoc={existingAadhaarDoc}
                onUploadSuccess={handleUploadSuccess}
                disabled={false}
              />
              <UploadSlot
                docKey="pan"
                label={t('farmerKyc.panCard', 'PAN Card')}
                hint={t(
                  'farmerKyc.panHint',
                  'Upload a clear scan or photo of your PAN Card.'
                )}
                existingDoc={existingPanDoc}
                onUploadSuccess={handleUploadSuccess}
                disabled={false}
              />
            </div>

            <div className="fkd-constraints-note">
              <span className="fkd-constraint-item">
                <FileText size={12} /> {t('farmerKyc.acceptedFormat', 'Accepted: PDF, JPG, PNG')}
              </span>
              <span className="fkd-constraint-item">
                <AlertCircle size={12} /> {t('farmerKyc.maxFileSize', 'Max size: 5 MB per file')}
              </span>
              <span className="fkd-constraint-item">
                <ShieldCheck size={12} />{' '}
                {t('farmerKyc.dataEncrypted', 'Data encrypted in transit and securely stored')}
              </span>
            </div>
          </div>
        )}

        {/* ── Submitted KYC Documents List ─────────────────────────────────── */}
        <div className="fkd-section-card">
          <div className="fkd-section-header">
            <div className="fkd-section-num">
              <FilePlus size={14} />
            </div>
            <div>
              <h2 className="fkd-section-title">
                {t('farmerKyc.submittedDocsTitle', 'Submitted KYC Documents')}
              </h2>
              <p className="fkd-section-sub">
                {t(
                  'farmerKyc.submittedDocsSub',
                  'All identity proof documents submitted for your account'
                )}
              </p>
            </div>
          </div>

          {loadingDocs ? (
            <div className="fkd-loading-row">
              <Loader2 size={16} className="fkd-spin" />
              <span>{t('farmerKyc.loadingDocs', 'Loading documents…')}</span>
            </div>
          ) : docsError ? (
            <div className="fkd-error-box">
              <AlertCircle size={15} />
              <span>{docsError}</span>
              <button
                type="button"
                className="fkd-dismiss-btn"
                onClick={() => setDocsError(null)}
              >
                <X size={13} />
              </button>
            </div>
          ) : kycDocs.length === 0 ? (
            <div className="fkd-empty-state fkd-empty-small">
              <FileText size={36} className="fkd-empty-icon" />
              <h4>{t('farmerKyc.noDocsYet', 'No KYC documents uploaded yet')}</h4>
              <p>
                {canUpload
                  ? t(
                      'farmerKyc.noDocsYetUpload',
                      'Use the upload section above to submit your Aadhaar and PAN card.'
                    )
                  : t(
                      'farmerKyc.noDocsYetVerified',
                      'No identity proof documents found on your account.'
                    )}
              </p>
            </div>
          ) : (
            <div className="fkd-doc-list">
              {kycDocs.map((doc) => (
                <DocumentRow key={doc._id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerKycDocuments;
