import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { loanAPI, documentAPI, adminAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { openDocumentPreview, downloadDocumentFile } from '../utils/documentPreview';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  LoadingSpinner,
  ErrorState,
  EmptyState,
} from '../components';
import './Farmers.css';

const Farmers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('profile');
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch all required data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [farmerRes, loansRes, docsRes] = await Promise.allSettled([
        adminAPI.getFarmers(),
        loanAPI.getAllLoans({ limit: 500 }),
        documentAPI.getAllDocuments(),
      ]);

      let farmerList = [];
      if (farmerRes.status === 'fulfilled' && farmerRes.value.data?.data?.farmers) {
        farmerList = farmerRes.value.data.data.farmers;
      }

      let loanList = [];
      if (loansRes.status === 'fulfilled' && loansRes.value.data?.data?.loans) {
        loanList = loansRes.value.data.data.loans;
      }

      let docList = [];
      if (docsRes.status === 'fulfilled' && docsRes.value.data?.data?.documents) {
        docList = docsRes.value.data.data.documents;
      }

      const farmerMap = new Map();
      farmerList.forEach((f) => {
        farmerMap.set(String(f._id), {
          ...f,
          loans: f.loans || [],
          documents: f.documents || [],
        });
      });

      // Group loans by farmer if any loan is not attached
      loanList.forEach((ln) => {
        const farmerObj = ln.farmer;
        if (!farmerObj || !farmerObj._id) return;
        const fid = String(farmerObj._id);
        if (!farmerMap.has(fid)) {
          farmerMap.set(fid, {
            ...farmerObj,
            _id: fid,
            loans: [],
            documents: [],
          });
        }
        const record = farmerMap.get(fid);
        if (!record.loans.some((l) => String(l._id) === String(ln._id))) {
          record.loans.push(ln);
        }
      });

      // Group documents by farmer
      docList.forEach((doc) => {
        const uid = String(doc.user?._id || doc.user || '');
        if (uid && farmerMap.has(uid)) {
          const record = farmerMap.get(uid);
          if (!record.documents.some((d) => String(d._id) === String(doc._id))) {
            record.documents.push(doc);
          }
        }
      });

      setFarmers(Array.from(farmerMap.values()));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering & pagination
  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        farmer.name?.toLowerCase().includes(q) ||
        farmer.email?.toLowerCase().includes(q) ||
        farmer.phone?.toLowerCase().includes(q) ||
        farmer._id?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' || farmer.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [farmers, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredFarmers.length / pageSize) || 1;
  const paginatedFarmers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFarmers.slice(start, start + pageSize);
  }, [filteredFarmers, currentPage, pageSize]);

  const formatAddress = (addr) => {
    if (!addr) return t('farmers.address', 'Not Specified');
    if (typeof addr === 'string') return addr;
    return [addr.street, addr.village, addr.district, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ') || 'Not Specified';
  };

  const handleDownloadReport = async (farmerId, farmerName = 'Farmer') => {
    try {
      setDownloadingId(farmerId);
      const response = await adminAPI.downloadFarmerReport(farmerId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FarmerReport_${farmerName.replace(/\s+/g, '_')}_${farmerId.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
      alert(err.response?.data?.message || 'Failed to download farmer report');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading farmer records..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="farmers-page">
      <PageHeader
        title={t('farmers.title', 'Farmer Directory & Portfolio Management')}
        icon={<Users size={24} />}
      />

      {/* Search & Filters */}
      <div className="toolbar flex items-center space-x-4 mb-4">
        <div className="search-input-wrapper flex-1">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('farmers.searchPlaceholder', 'Search by name, phone, email, or ID...')}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select select w-auto"
        >
          <option value="ALL">{t('common.all', 'All Statuses')}</option>
          <option value="ACTIVE">{t('common.active', 'Active')}</option>
          <option value="INACTIVE">{t('common.inactive', 'Inactive')}</option>
        </select>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchData}
          title={t('common.refresh', 'Refresh')}
        >
          <RefreshCw size={15} />
          <span>{t('common.refresh', 'Refresh')}</span>
        </button>
      </div>

      <DataTable
        columns={[
          {
            header: t('farmers.farmerName', 'Farmer Name & ID'),
            key: 'name',
            render: (row) => (
              <div className="flex items-center space-x-3">
                <div className="avatar-circle">
                  <User size={16} />
                </div>
                <div>
                  <strong className="block text-main">{row.name}</strong>
                  <span className="text-xs text-muted font-mono">#{String(row._id).slice(-8)}</span>
                </div>
              </div>
            ),
          },
          { header: t('auth.emailLabel', 'Email'), key: 'email' },
          { header: t('farmers.phone', 'Phone Number'), key: 'phone' },
          {
            header: t('farmers.kycStatus', 'KYC Status'),
            key: 'kycStatus',
            render: (row) => {
              const st = row.kycStatus || (row.kycVerified ? 'VERIFIED' : 'PENDING');
              return <StatusBadge status={st} size="small" />;
            },
          },
          {
            header: t('common.status', 'Account Status'),
            key: 'status',
            render: (row) => <StatusBadge status={row.status} size="small" />,
          },
          {
            header: t('common.actions', 'Actions'),
            key: 'actions',
            render: (row) => (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFarmer(row);
                    setActiveModalTab('profile');
                  }}
                >
                  <Eye size={13} /> <span>{t('common.view', 'View')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadReport(row._id, row.name);
                  }}
                  disabled={downloadingId === row._id}
                  title={t('farmers.downloadReport', 'Download PDF Report')}
                >
                  {downloadingId === row._id ? (
                    <Loader2 size={13} className="spinning" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>{t('farmers.downloadReport', 'Report')}</span>
                </button>
              </div>
            ),
          },
        ]}
        data={paginatedFarmers}
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredFarmers.length,
          pageSize,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
      />

      {/* Farmer Detail Modal Drawer */}
      {selectedFarmer && (
        <div className="modal-backdrop" onClick={() => setSelectedFarmer(null)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="modal-avatar">
                  <User size={22} />
                </div>
                <div>
                  <h2 className="modal-title">{selectedFarmer.name}</h2>
                  <span className="modal-subtitle">
                    {t('common.id', 'ID')}: #{selectedFarmer._id} | {selectedFarmer.fpoName || 'FPO Member'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDownloadReport(selectedFarmer._id, selectedFarmer.name)}
                  disabled={downloadingId === selectedFarmer._id}
                >
                  {downloadingId === selectedFarmer._id ? (
                    <Loader2 size={13} className="spinning" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>{t('farmers.downloadReport', 'Download Report')}</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedFarmer(null)}
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="modal-tabs mt-4 flex space-x-2">
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('profile')}
              >
                <User size={15} /> <span>{t('farmers.profileModalTitle', 'Profile & KYC')}</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'loans' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('loans')}
              >
                <FileText size={15} />{' '}
                <span>
                  {t('farmers.loanHistory', 'Credit History')} ({selectedFarmer.loans?.length || 0})
                </span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('documents')}
              >
                <ShieldCheck size={15} />{' '}
                <span>
                  {t('loanDetail.uploadedDocs', 'Documents')} ({selectedFarmer.documents?.length || 0})
                </span>
              </button>
            </div>

            <div className="modal-body mt-4">
              {/* TAB 1: Profile & KYC Details */}
              {activeModalTab === 'profile' && (
                <div className="tab-content profile-tab">
                  <div className="detail-section">
                    <h3 className="section-title">{t('farmers.profileModalTitle', 'Farmer Profile Details')}</h3>
                    <div className="detail-grid">
                      <div className="detail-field">
                        <span className="field-label">{t('farmers.farmerName', 'Legal Name')}</span>
                        <strong className="field-value">{selectedFarmer.name}</strong>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">{t('auth.emailLabel', 'Email Address')}</span>
                        <span className="field-value">{selectedFarmer.email || 'N/A'}</span>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">{t('farmers.phone', 'Phone Number')}</span>
                        <span className="field-value">
                          {selectedFarmer.phone || 'N/A'}{' '}
                          {selectedFarmer.phoneVerified && (
                            <span className="text-xs text-emerald font-semibold ml-1">✓ Verified</span>
                          )}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">Age &amp; Date of Birth</span>
                        <span className="field-value">
                          {selectedFarmer.age ? `${selectedFarmer.age} yrs` : 'N/A'} (
                          {selectedFarmer.dob ? new Date(selectedFarmer.dob).toLocaleDateString('en-IN') : 'DOB N/A'})
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">{t('farmers.kycStatus', 'KYC Verification')}</span>
                        <span className="field-value flex items-center gap-2">
                          <StatusBadge
                            status={selectedFarmer.kycStatus || (selectedFarmer.kycVerified ? 'VERIFIED' : 'PENDING')}
                          />
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">{t('common.status', 'Account Status')}</span>
                        <span className="field-value">
                          <StatusBadge status={selectedFarmer.status} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedFarmer.kycStatus === 'REJECTED' && selectedFarmer.kycRejectionReason && (
                    <div className="rejection-alert-box p-3 mt-3 bg-red-950/20 border border-red-500/30 rounded text-sm text-red-400">
                      <strong>KYC Rejection Reason:</strong> {selectedFarmer.kycRejectionReason}
                    </div>
                  )}

                  <div className="detail-section mt-4">
                    <h3 className="section-title">{t('farmers.fpoName', 'FPO Affiliation & Address')}</h3>
                    <div className="detail-grid">
                      <div className="detail-field">
                        <span className="field-label">{t('farmers.fpoName', 'FPO Name')}</span>
                        <span className="field-value">{selectedFarmer.fpoName || 'Green Valley Farmers Producer Co.'}</span>
                      </div>
                      <div className="detail-field">
                        <span className="field-label">{t('farmers.registrationNo', 'FPO Reg #')}</span>
                        <span className="field-value">{selectedFarmer.fpoRegistrationNo || 'FPO-MH-2024-001'}</span>
                      </div>
                      <div className="detail-field col-span-2">
                        <span className="field-label">{t('farmers.address', 'Residential Address')}</span>
                        <span className="field-value">{formatAddress(selectedFarmer.address)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Loan History */}
              {activeModalTab === 'loans' && (
                <div className="tab-content loans-tab">
                  {selectedFarmer.loans?.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title={t('farmers.noLoans', 'No Credit Facilities')}
                      description={t('farmers.noLoans', 'This farmer has not submitted any loan applications.')}
                    />
                  ) : (
                    <div className="loans-list space-y-3">
                      {selectedFarmer.loans.map((loan) => (
                        <div key={loan._id} className="loan-card-item glass-panel p-4 rounded-lg border border-border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-main text-base">{loan.purpose}</h4>
                              <span className="text-xs text-muted font-mono">ID: #{loan._id}</span>
                            </div>
                            <StatusBadge status={loan.status} size="small" />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-3">
                            <div>
                              <span className="text-xs text-muted block">Applied Amount</span>
                              <strong className="text-main">₹{(loan.loanAmount || 0).toLocaleString('en-IN')}</strong>
                            </div>
                            <div>
                              <span className="text-xs text-muted block">Disbursed Amount</span>
                              <strong className="text-emerald">
                                {loan.disbursedAmount ? `₹${loan.disbursedAmount.toLocaleString('en-IN')}` : '—'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-xs text-muted block">Tenure</span>
                              <span className="text-main">{loan.tenureMonths || 12} months</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted block">Interest Rate</span>
                              <span className="text-main">{loan.interestRate || 6}% p.a.</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Documents */}
              {activeModalTab === 'documents' && (
                <div className="tab-content docs-tab">
                  {selectedFarmer.documents?.length === 0 ? (
                    <EmptyState
                      icon={ShieldCheck}
                      title={t('documents.noDocsFound', 'No Documents Found')}
                      description={t('documents.noDocsFound', 'No verification documents uploaded yet.')}
                    />
                  ) : (
                    <div className="docs-grid grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedFarmer.documents.map((doc) => (
                        <div key={doc._id} className="doc-card-item glass-panel p-4 flex flex-col justify-between">
                          <div>
                            <div className="doc-card-header flex justify-between items-center mb-2">
                              <span className="doc-type-badge bg-primary/10 text-primary text-xs px-2 py-0.5 rounded font-semibold">
                                {doc.documentType?.toUpperCase() || 'DOCUMENT'}
                              </span>
                              <StatusBadge status={doc.status} size="small" />
                            </div>
                            <h4 className="doc-name-title font-semibold text-main text-sm truncate" title={doc.documentName}>
                              {doc.documentName}
                            </h4>
                            <span className="doc-date text-xs text-muted block mt-1">
                              Uploaded: {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('en-IN')}
                            </span>
                            {doc.rejectionReason && (
                              <div className="doc-rejection-msg text-xs text-rose mt-2 bg-rose-950/20 p-2 rounded">
                                <strong>Reason:</strong> {doc.rejectionReason}
                              </div>
                            )}
                          </div>

                          <div className="doc-actions mt-3 flex items-center gap-2 pt-2 border-t border-border">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm flex items-center gap-1"
                              onClick={() => openDocumentPreview(doc)}
                            >
                              <Eye size={13} />
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm flex items-center gap-1"
                              onClick={() => downloadDocumentFile(doc)}
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedFarmer(null)}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Farmers;
