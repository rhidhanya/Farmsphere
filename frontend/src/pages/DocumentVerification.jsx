import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCheck,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  XCircle,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Download,
  Eye,
  Calendar,
  X,
  Loader2,
  Building2,
  MapPin,
  Phone,
} from 'lucide-react';
import { adminAPI, documentAPI } from '../api/client';
import {
  PageHeader,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
  DocumentReview,
  useToast,
} from '../components';
import { openDocumentPreview, downloadDocumentFile } from '../utils/documentPreview';
import './DocumentVerification.css';

const DocumentVerification = () => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  // Active top-level view: 'kyc' (Farmer KYC Review) or 'documents' (All Uploaded Docs)
  const [activeView, setActiveView] = useState('kyc');

  // ── KYC Verification State ──
  const [kycFarmers, setKycFarmers] = useState([]);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState(null);
  const [kycStatusFilter, setKycStatusFilter] = useState('ALL');
  const [kycSearch, setKycSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Modal State
  const [rejectingFarmer, setRejectingFarmer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // In-Page Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // ── General Documents State ──
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);
  const [docStatusFilter, setDocStatusFilter] = useState('ALL');
  const [docSearch, setDocSearch] = useState('');

  // ── Fetch KYC Farmers ──
  const fetchKycFarmers = useCallback(async () => {
    setKycLoading(true);
    setKycError(null);
    try {
      const res = await adminAPI.getKycFarmers({ status: kycStatusFilter });
      if (res.data?.status === 'success') {
        const farmers = res.data.data?.farmers || [];
        setKycFarmers(farmers);

        // If a farmer is currently selected in the review panel, update their data
        if (selectedFarmer) {
          const updated = farmers.find((f) => f._id === selectedFarmer._id);
          if (updated) setSelectedFarmer(updated);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load farmers for KYC review';
      setKycError(msg);
      showError(msg);
    } finally {
      setKycLoading(false);
    }
  }, [kycStatusFilter, selectedFarmer, showError]);

  // ── Fetch General Documents ──
  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const params = {};
      if (docStatusFilter !== 'ALL') params.status = docStatusFilter;
      const res = await documentAPI.getAllDocuments(params);
      if (res.data?.status === 'success') {
        setDocuments(res.data.data?.documents || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load documents';
      setDocsError(msg);
      showError(msg);
    } finally {
      setDocsLoading(false);
    }
  }, [docStatusFilter, showError]);

  useEffect(() => {
    fetchKycFarmers();
  }, [kycStatusFilter]);

  useEffect(() => {
    if (activeView === 'documents') {
      fetchDocuments();
    }
  }, [activeView, docStatusFilter]);

  // Filtered KYC Farmers
  const filteredKycFarmers = useMemo(() => {
    if (!kycSearch.trim()) return kycFarmers;
    const q = kycSearch.toLowerCase();
    return kycFarmers.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.phone?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f._id?.toLowerCase().includes(q) ||
        f.maskedAadhaar?.toLowerCase().includes(q)
    );
  }, [kycFarmers, kycSearch]);

  // Filtered General Documents
  const filteredDocuments = useMemo(() => {
    if (!docSearch.trim()) return documents;
    const q = docSearch.toLowerCase();
    return documents.filter(
      (d) =>
        d.user?.name?.toLowerCase().includes(q) ||
        d.user?.email?.toLowerCase().includes(q) ||
        d.documentName?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q)
    );
  }, [documents, docSearch]);

  // Summary Metrics for KYC
  const kycMetrics = useMemo(() => {
    return {
      total: kycFarmers.length,
      pending: kycFarmers.filter((f) => f.kycStatus === 'PENDING').length,
      verified: kycFarmers.filter((f) => f.kycStatus === 'VERIFIED').length,
      rejected: kycFarmers.filter((f) => f.kycStatus === 'REJECTED').length,
    };
  }, [kycFarmers]);

  // ── Handle KYC Approve ──
  const handleApproveKyc = async (farmer) => {
    if (!farmer) return;
    if (!farmer.aadhaarDoc || !farmer.panDoc) {
      showError('Cannot approve KYC: Both Aadhaar and PAN documents must be submitted.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminAPI.approveFarmerKyc(farmer._id);
      showSuccess(res.data?.message || `KYC approved for ${farmer.name}`);
      await fetchKycFarmers();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to approve KYC');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Handle KYC Reject ──
  const handleRejectPrompt = (farmer) => {
    setRejectingFarmer(farmer);
    setRejectionReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingFarmer) return;
    if (!rejectionReason.trim()) {
      showError('Please provide a specific rejection reason so the farmer knows what to correct.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminAPI.rejectFarmerKyc(rejectingFarmer._id, {
        rejectionReason: rejectionReason.trim(),
      });
      showSuccess(res.data?.message || `KYC rejected for ${rejectingFarmer.name}`);
      setRejectingFarmer(null);
      setRejectionReason('');
      await fetchKycFarmers();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to reject KYC');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Handle Document Preview in Modal ──
  const handleOpenDocPreview = async (doc) => {
    if (!doc?._id) return;
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);

    try {
      const response = await documentAPI.getDocumentFile(doc._id);
      const mime =
        response.headers?.['content-type'] ||
        doc.fileType ||
        (doc.documentName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const blob = new Blob([response.data], { type: mime });
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Failed to load document file for preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCloseDocPreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewDoc(null);
    setPreviewBlobUrl(null);
    setPreviewError(null);
  };

  return (
    <div className="docver-page-container">
      <PageHeader
        title={t('documents.title', 'Verification & KYC Center')}
        icon={<FileCheck size={24} />}
      />

      {/* Top View Selector Tabs: KYC Review vs General Docs */}
      <div className="docver-view-tabs glass-panel">
        <button
          className={`view-tab-btn ${activeView === 'kyc' ? 'active' : ''}`}
          onClick={() => setActiveView('kyc')}
        >
          <ShieldCheck size={16} />
          <span>Farmer KYC Verification ({kycMetrics.pending} Pending)</span>
        </button>
        <button
          className={`view-tab-btn ${activeView === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveView('documents')}
        >
          <FileText size={16} />
          <span>All Uploaded Documents ({documents.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: FARMER KYC VERIFICATION WORKFLOW
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'kyc' && (
        <div className="kyc-workflow-section">
          {/* Summary Metric Cards */}
          <div className="metrics-overview-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">Total Farmers</span>
                <div className="metric-icon-box blue"><User size={18} /></div>
              </div>
              <div className="metric-main-value">{kycMetrics.total}</div>
              <div className="metric-footer-text">Registered agricultural borrowers</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">KYC Pending Review</span>
                <div className="metric-icon-box amber"><Clock size={18} /></div>
              </div>
              <div className="metric-main-value text-amber">{kycMetrics.pending}</div>
              <div className="metric-footer-text">Awaiting administrative decision</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">KYC Verified</span>
                <div className="metric-icon-box emerald"><ShieldCheck size={18} /></div>
              </div>
              <div className="metric-main-value text-emerald">{kycMetrics.verified}</div>
              <div className="metric-footer-text">Qualified for loan disbursement</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">KYC Rejected</span>
                <div className="metric-icon-box rose"><XCircle size={18} /></div>
              </div>
              <div className="metric-main-value text-rose">{kycMetrics.rejected}</div>
              <div className="metric-footer-text">Action required by farmer</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="docver-filter-bar">
            <div className="docver-tabs">
              {[
                { key: 'ALL', label: 'All Farmers', count: kycMetrics.total },
                { key: 'PENDING', label: 'Pending Review', count: kycMetrics.pending },
                { key: 'VERIFIED', label: 'Verified', count: kycMetrics.verified },
                { key: 'REJECTED', label: 'Rejected', count: kycMetrics.rejected },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  className={`docver-tab-btn ${kycStatusFilter === key ? 'active' : ''}`}
                  onClick={() => setKycStatusFilter(key)}
                >
                  <span>{label}</span>
                  <span className="tab-count">{count}</span>
                </button>
              ))}
            </div>

            <div className="docver-filter-right">
              <div className="search-input-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search farmer name, phone, ID..."
                  value={kycSearch}
                  onChange={(e) => setKycSearch(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary refresh-btn"
                onClick={fetchKycFarmers}
                disabled={kycLoading}
                title="Refresh"
              >
                <RefreshCw size={15} className={kycLoading ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* KYC Farmer Table */}
          {kycLoading ? (
            <div className="docver-loader-wrap">
              <LoadingSpinner message="Loading farmer KYC submissions..." />
            </div>
          ) : kycError ? (
            <ErrorState message={kycError} onRetry={fetchKycFarmers} />
          ) : filteredKycFarmers.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={40} />}
              title="No Farmers Found"
              message="No farmer records match the selected status or search filter."
            />
          ) : (
            <div className="glass-panel docver-content-panel table-responsive">
              <table className="kyc-table">
                <thead>
                  <tr>
                    <th>Farmer Name & ID</th>
                    <th>Age & DOB</th>
                    <th>Aadhaar Document</th>
                    <th>PAN Document</th>
                    <th>KYC Status</th>
                    <th>Submission Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKycFarmers.map((farmer) => {
                    const hasAadhaar = Boolean(farmer.aadhaarDoc);
                    const hasPan = Boolean(farmer.panDoc);
                    const isVerified = farmer.kycStatus === 'VERIFIED';
                    const isRejected = farmer.kycStatus === 'REJECTED';

                    return (
                      <tr key={farmer._id} className={selectedFarmer?._id === farmer._id ? 'row-selected' : ''}>
                        {/* Name & ID */}
                        <td>
                          <div className="farmer-name-cell">
                            <div className="farmer-avatar-icon">
                              <User size={16} />
                            </div>
                            <div>
                              <strong className="farmer-name-text">{farmer.name}</strong>
                              <span className="farmer-id-sub">#{farmer._id.slice(-8)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Age & DOB */}
                        <td>
                          <div className="age-dob-cell">
                            <span>{farmer.age ? `${farmer.age} yrs` : 'Age N/A'}</span>
                            <span className="text-muted text-xs">
                              {farmer.dob ? new Date(farmer.dob).toLocaleDateString('en-IN') : 'DOB N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Aadhaar Doc */}
                        <td>
                          {hasAadhaar ? (
                            <span className={`doc-status-chip ${farmer.aadhaarDoc.status.toLowerCase()}`}>
                              <CheckCircle2 size={12} />
                              <span>{farmer.aadhaarDoc.documentName || 'Aadhaar Card'}</span>
                            </span>
                          ) : (
                            <span className="doc-status-chip missing">
                              <AlertTriangle size={12} />
                              <span>Missing</span>
                            </span>
                          )}
                        </td>

                        {/* PAN Doc */}
                        <td>
                          {hasPan ? (
                            <span className={`doc-status-chip ${farmer.panDoc.status.toLowerCase()}`}>
                              <CheckCircle2 size={12} />
                              <span>{farmer.panDoc.documentName || 'PAN Card'}</span>
                            </span>
                          ) : (
                            <span className="doc-status-chip missing">
                              <AlertTriangle size={12} />
                              <span>Missing</span>
                            </span>
                          )}
                        </td>

                        {/* KYC Status */}
                        <td>
                          <StatusBadge status={farmer.kycStatus} size="small" />
                          {isRejected && farmer.kycRejectionReason && (
                            <div className="table-rejection-hint" title={farmer.kycRejectionReason}>
                              {farmer.kycRejectionReason}
                            </div>
                          )}
                        </td>

                        {/* Submission Date */}
                        <td className="text-muted text-xs">
                          {new Date(farmer.createdAt).toLocaleDateString('en-IN')}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm review-kyc-btn"
                            onClick={() => setSelectedFarmer(farmer)}
                          >
                            <Eye size={13} />
                            <span>Review KYC</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: ALL UPLOADED SUPPORTING DOCUMENTS
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'documents' && (
        <div className="general-docs-section">
          <div className="docver-filter-bar">
            <div className="docver-tabs">
              {[
                { key: 'ALL', label: 'All Documents', count: documents.length },
                { key: 'PENDING', label: 'Pending', count: documents.filter((d) => d.status === 'PENDING').length },
                { key: 'VERIFIED', label: 'Verified', count: documents.filter((d) => d.status === 'VERIFIED').length },
                { key: 'REJECTED', label: 'Rejected', count: documents.filter((d) => d.status === 'REJECTED').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  className={`docver-tab-btn ${docStatusFilter === key ? 'active' : ''}`}
                  onClick={() => setDocStatusFilter(key)}
                >
                  <span>{label}</span>
                  <span className="tab-count">{count}</span>
                </button>
              ))}
            </div>

            <div className="docver-filter-right">
              <div className="search-input-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search file name, type, farmer..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary refresh-btn"
                onClick={fetchDocuments}
                disabled={docsLoading}
                title="Refresh"
              >
                <RefreshCw size={15} className={docsLoading ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {docsLoading ? (
            <div className="docver-loader-wrap">
              <LoadingSpinner message="Loading all uploaded documents..." />
            </div>
          ) : docsError ? (
            <ErrorState message={docsError} onRetry={fetchDocuments} />
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              icon={<FileCheck size={40} />}
              title="No Documents Found"
              message="No uploaded documents match the current filter."
            />
          ) : (
            <div className="glass-panel docver-content-panel p-4">
              <DocumentReview documents={filteredDocuments} onRefresh={fetchDocuments} />
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL / DRAWER: DETAILED FARMER KYC REVIEW PANEL
          ───────────────────────────────────────────────────────────── */}
      {selectedFarmer && (
        <div className="modal-backdrop" onClick={() => setSelectedFarmer(null)}>
          <div className="modal-card kyc-review-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="modal-avatar-lg">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="modal-title font-bold text-lg flex items-center gap-2">
                    <span>{selectedFarmer.name}</span>
                    <StatusBadge status={selectedFarmer.kycStatus} size="small" />
                  </h3>
                  <span className="modal-subtitle">
                    Farmer ID: #{selectedFarmer._id} | Registered:{' '}
                    {new Date(selectedFarmer.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedFarmer(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body kyc-modal-body">
              {/* Farmer Profile Comparison Section */}
              <div className="kyc-section-box">
                <h4 className="kyc-section-title">
                  <User size={15} />
                  <span>1. Farmer Profile Details (Compare with Certificates)</span>
                </h4>

                <div className="kyc-detail-grid">
                  <div className="kyc-field">
                    <span className="kyc-label">Full Legal Name:</span>
                    <strong className="kyc-val">{selectedFarmer.name}</strong>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Age &amp; Date of Birth:</span>
                    <strong className="kyc-val">
                      {selectedFarmer.age ? `${selectedFarmer.age} years` : 'Age N/A'} (
                      {selectedFarmer.dob ? new Date(selectedFarmer.dob).toLocaleDateString('en-IN') : 'DOB N/A'})
                    </strong>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Aadhaar Number (Masked):</span>
                    <strong className="kyc-val text-emerald font-mono">
                      {selectedFarmer.maskedAadhaar || 'XXXX-XXXX-****'}
                    </strong>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Mobile Contact:</span>
                    <strong className="kyc-val">
                      {selectedFarmer.phone || 'N/A'}{' '}
                      {selectedFarmer.phoneVerified && <span className="verified-pill">✓ Phone Verified</span>}
                    </strong>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">FPO Producer Co.:</span>
                    <strong className="kyc-val">{selectedFarmer.fpoName || 'Green Valley Farmers Producer Co.'}</strong>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">FPO Registration #:</span>
                    <strong className="kyc-val">{selectedFarmer.fpoRegistrationNo || 'FPO-MH-2024-001'}</strong>
                  </div>
                  <div className="kyc-field col-span-2">
                    <span className="kyc-label">Address:</span>
                    <strong className="kyc-val">
                      {selectedFarmer.address
                        ? [
                            selectedFarmer.address.street,
                            selectedFarmer.address.village,
                            selectedFarmer.address.district,
                            selectedFarmer.address.state,
                            selectedFarmer.address.pincode,
                          ]
                            .filter(Boolean)
                            .join(', ')
                        : 'Not specified'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* KYC Certificates Review Section (Aadhaar & PAN) */}
              <div className="kyc-section-box">
                <h4 className="kyc-section-title">
                  <FileCheck size={15} />
                  <span>2. Uploaded Identification Certificates (Aadhaar &amp; PAN)</span>
                </h4>

                <div className="kyc-certs-grid">
                  {/* Card 1: Aadhaar Document */}
                  <div className={`kyc-cert-card ${selectedFarmer.aadhaarDoc ? 'present' : 'missing'}`}>
                    <div className="cert-card-header">
                      <span className="cert-type-pill">Aadhaar Card</span>
                      {selectedFarmer.aadhaarDoc ? (
                        <StatusBadge status={selectedFarmer.aadhaarDoc.status} size="small" />
                      ) : (
                        <span className="badge badge-danger">Not Uploaded</span>
                      )}
                    </div>

                    {selectedFarmer.aadhaarDoc ? (
                      <div className="cert-card-body">
                        <strong className="cert-filename" title={selectedFarmer.aadhaarDoc.documentName}>
                          {selectedFarmer.aadhaarDoc.documentName}
                        </strong>
                        <span className="cert-meta">
                          Uploaded: {new Date(selectedFarmer.aadhaarDoc.uploadedAt || selectedFarmer.aadhaarDoc.createdAt).toLocaleDateString('en-IN')}
                        </span>

                        <div className="cert-actions mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenDocPreview(selectedFarmer.aadhaarDoc)}
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => downloadDocumentFile(selectedFarmer.aadhaarDoc)}
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openDocumentPreview(selectedFarmer.aadhaarDoc)}
                            title="Open in new window"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="cert-missing-alert">
                        <AlertTriangle size={18} className="text-amber" />
                        <p>Aadhaar card certificate has not been uploaded. Required before approval.</p>
                      </div>
                    )}
                  </div>

                  {/* Card 2: PAN Document */}
                  <div className={`kyc-cert-card ${selectedFarmer.panDoc ? 'present' : 'missing'}`}>
                    <div className="cert-card-header">
                      <span className="cert-type-pill">PAN Card</span>
                      {selectedFarmer.panDoc ? (
                        <StatusBadge status={selectedFarmer.panDoc.status} size="small" />
                      ) : (
                        <span className="badge badge-danger">Not Uploaded</span>
                      )}
                    </div>

                    {selectedFarmer.panDoc ? (
                      <div className="cert-card-body">
                        <strong className="cert-filename" title={selectedFarmer.panDoc.documentName}>
                          {selectedFarmer.panDoc.documentName}
                        </strong>
                        <span className="cert-meta">
                          Uploaded: {new Date(selectedFarmer.panDoc.uploadedAt || selectedFarmer.panDoc.createdAt).toLocaleDateString('en-IN')}
                        </span>

                        <div className="cert-actions mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenDocPreview(selectedFarmer.panDoc)}
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => downloadDocumentFile(selectedFarmer.panDoc)}
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openDocumentPreview(selectedFarmer.panDoc)}
                            title="Open in new window"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="cert-missing-alert">
                        <AlertTriangle size={18} className="text-amber" />
                        <p>PAN card certificate has not been uploaded. Required before approval.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Notice */}
                {selectedFarmer.kycStatus === 'REJECTED' && selectedFarmer.kycRejectionReason && (
                  <div className="kyc-rejected-notice mt-3">
                    <AlertCircle size={16} />
                    <div>
                      <strong>Current Rejection Reason:</strong>
                      <p className="m-0">{selectedFarmer.kycRejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="modal-footer kyc-modal-footer">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedFarmer(null)}
                  disabled={actionLoading}
                >
                  Close
                </button>

                {/* Reject KYC Action */}
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRejectPrompt(selectedFarmer)}
                  disabled={actionLoading}
                >
                  <XCircle size={15} />
                  <span>Reject KYC</span>
                </button>

                {/* Approve KYC Action */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleApproveKyc(selectedFarmer)}
                  disabled={
                    actionLoading ||
                    !selectedFarmer.aadhaarDoc ||
                    !selectedFarmer.panDoc ||
                    selectedFarmer.kycStatus === 'VERIFIED'
                  }
                  title={
                    !selectedFarmer.aadhaarDoc || !selectedFarmer.panDoc
                      ? 'Both Aadhaar and PAN documents must be submitted to approve KYC'
                      : 'Approve farmer KYC verification'
                  }
                >
                  {actionLoading ? (
                    <Loader2 size={15} className="spinning" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  <span>
                    {selectedFarmer.kycStatus === 'VERIFIED' ? 'KYC Already Approved' : 'Approve KYC'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REJECT KYC REASON FORM
          ───────────────────────────────────────────────────────────── */}
      {rejectingFarmer && (
        <div className="modal-backdrop" onClick={() => !actionLoading && setRejectingFarmer(null)}>
          <div className="modal-card reject-reason-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose" />
                <h3 className="modal-title font-bold">Reject KYC Verification</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRejectingFarmer(null)}
                disabled={actionLoading}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="modal-body">
                <p className="text-sm text-muted mb-3">
                  Please provide a clear and actionable reason for rejecting{' '}
                  <strong>{rejectingFarmer.name}</strong>'s KYC application. This reason will be displayed on the farmer's portal so they can correct their documents.
                </p>

                <div className="form-group">
                  <label htmlFor="rejection-reason" className="form-label font-semibold text-sm">
                    Rejection Reason <span className="text-rose">*</span>
                  </label>
                  <textarea
                    id="rejection-reason"
                    rows="4"
                    className="form-input"
                    placeholder="e.g., Aadhaar card image is blurred and unreadable. Please upload a clear photo of the original card."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={actionLoading}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectingFarmer(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? <Loader2 size={14} className="spinning" /> : <XCircle size={14} />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: IN-PAGE DOCUMENT FILE PREVIEW
          ───────────────────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="modal-backdrop" onClick={handleCloseDocPreview}>
          <div className="modal-card doc-preview-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="preview-title-group">
                <FileText size={18} className="text-emerald" />
                <h3 className="font-semibold text-base">{previewDoc.documentName}</h3>
                <span className="doc-type-badge">{previewDoc.documentType}</span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseDocPreview}>
                <X size={18} />
              </button>
            </div>

            <div className="preview-modal-body">
              {previewLoading ? (
                <div className="preview-loading-wrap">
                  <Loader2 size={32} className="spinning" />
                  <p>Loading document preview...</p>
                </div>
              ) : previewError ? (
                <div className="preview-error-wrap">
                  <AlertTriangle size={32} className="text-amber" />
                  <p>{previewError}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-3"
                    onClick={() => downloadDocumentFile(previewDoc)}
                  >
                    <Download size={14} />
                    <span>Try Downloading File</span>
                  </button>
                </div>
              ) : previewDoc.fileType?.startsWith('image/') || previewDoc.documentName?.match(/\.(jpe?g|png)$/i) ? (
                <div className="image-preview-container">
                  <img
                    src={previewBlobUrl}
                    alt={previewDoc.documentName}
                    className="doc-preview-image"
                  />
                </div>
              ) : (
                <div className="pdf-preview-container">
                  <iframe
                    src={previewBlobUrl}
                    title={previewDoc.documentName}
                    className="doc-preview-iframe"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer preview-footer flex justify-between items-center">
              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadDocumentFile(previewDoc)}
                >
                  <Download size={14} />
                  <span>Download File</span>
                </button>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleCloseDocPreview}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVerification;
