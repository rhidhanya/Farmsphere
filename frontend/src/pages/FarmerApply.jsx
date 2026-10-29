import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loanAPI, documentAPI, authAPI } from '../api/client';
import { FPO_AVAILABLE_SCHEMES, calculateEMI } from './FarmerLoans';
import {
  Sprout,
  LogOut,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  User,
  Building2,
  FileText,
  FileCheck,
  Upload,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Check,
  Sun,
  Moon,
  Globe,
  Wheat,
  Droplets,
  Tractor,
  Warehouse,
  Calendar,
  Percent,
  IndianRupee,
  HelpCircle,
  Truck,
  Fish,
  Leaf,
  Mountain,
  Snowflake,
  Milk,
  Bird,
  TreePine,
  FlaskConical,
} from 'lucide-react';
import './FarmerApply.css';

const FarmerApply = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial selected scheme
  const initialSchemeId = location.state?.schemeId || 'crop-production';
  const initialScheme =
    FPO_AVAILABLE_SCHEMES.find((s) => s.id === initialSchemeId) || FPO_AVAILABLE_SCHEMES[0];

  // State: Selected Scheme
  const [selectedScheme, setSelectedScheme] = useState(initialScheme);

  // State: Farmer profile from API
  const [farmerProfile, setFarmerProfile] = useState(user || null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // State: Form fields
  const [formData, setFormData] = useState({
    // Loan details
    loanAmount: location.state?.amount || initialScheme.defaultAmount,
    tenureMonths: location.state?.tenure || initialScheme.defaultTenure,
    repaymentFrequency: location.state?.frequency || initialScheme.repaymentFrequency,
    purpose: initialScheme.purpose,

    // Address & FPO details (prefilled from profile)
    village: user?.address?.village || '',
    district: user?.address?.district || '',
    state: user?.address?.state || 'Maharashtra',
    pincode: user?.address?.pincode || '',

    // Farming & Financial details
    cropType: '',
    landArea: '',
    surveyNumber: '',
    irrigationSource: 'Borewell',
    additionalRemarks: '',

    // Declaration
    termsAccepted: false,
  });

  // State: Files attached for upload
  const [attachedFiles, setAttachedFiles] = useState({});

  // State: Submission & UI Lifecycle
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [createdLoan, setCreatedLoan] = useState(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // State: Language menu
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Fetch real authenticated profile and uploaded documents
  const loadFarmerContext = async () => {
    setLoadingProfile(true);
    try {
      const [profileRes, docsRes] = await Promise.allSettled([
        authAPI.getMe(),
        documentAPI.getMyDocuments(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data?.user) {
        const u = profileRes.value.data.data.user;
        setFarmerProfile(u);
        setFormData((prev) => ({
          ...prev,
          village: prev.village || u.address?.village || '',
          district: prev.district || u.address?.district || '',
          state: prev.state || u.address?.state || 'Maharashtra',
          pincode: prev.pincode || u.address?.pincode || '',
        }));
      }

      if (docsRes.status === 'fulfilled') {
        setUploadedDocuments(docsRes.value.data?.data?.documents || []);
      }
    } catch (err) {
      console.warn('Could not sync farmer profile context:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadFarmerContext();
  }, []);

  // Update form defaults when scheme changes
  const handleSchemeChange = (schemeId) => {
    const scheme = FPO_AVAILABLE_SCHEMES.find((s) => s.id === schemeId);
    if (!scheme) return;

    setSelectedScheme(scheme);
    setFormData((prev) => ({
      ...prev,
      loanAmount: scheme.defaultAmount,
      tenureMonths: scheme.defaultTenure,
      repaymentFrequency: scheme.repaymentFrequency,
      purpose: scheme.purpose,
    }));
    setValidationErrors({});
    setApiError(null);
  };

  // Helper: check if a document type is already on file
  const getExistingDoc = (docType) => {
    return uploadedDocuments.find((d) => d.documentType === docType);
  };

  // Handle local file selection
  const handleFileSelect = (docType, file) => {
    if (!file) {
      setAttachedFiles((prev) => {
        const updated = { ...prev };
        delete updated[docType];
        return updated;
      });
      return;
    }
    setAttachedFiles((prev) => ({
      ...prev,
      [docType]: file,
    }));
  };

  // Live EMI Calculation
  const liveEmi = useMemo(() => {
    return calculateEMI(
      formData.loanAmount,
      selectedScheme.interestRate,
      formData.tenureMonths
    );
  }, [formData.loanAmount, selectedScheme.interestRate, formData.tenureMonths]);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    const amount = Number(formData.loanAmount);
    const tenure = Number(formData.tenureMonths);

    if (!amount || isNaN(amount) || amount <= 0) {
      errors.loanAmount = t('farmerApply.errAmountValid', 'Please enter a valid loan amount greater than ₹0.');
    } else if (amount < selectedScheme.minAmount || amount > selectedScheme.maxAmount) {
      errors.loanAmount = t('farmerApply.amountOutOfBounds', {
        min: `₹${selectedScheme.minAmount.toLocaleString('en-IN')}`,
        max: `₹${selectedScheme.maxAmount.toLocaleString('en-IN')}`,
      });
    }

    if (!tenure || isNaN(tenure) || tenure < 1) {
      errors.tenureMonths = t('farmerApply.errTenureValid', 'Tenure must be at least 1 month.');
    } else if (tenure < selectedScheme.minTenure || tenure > selectedScheme.maxTenure) {
      errors.tenureMonths = t('farmerApply.tenureOutOfBounds', {
        min: selectedScheme.minTenure,
        max: selectedScheme.maxTenure,
      });
    }

    if (!formData.purpose || !formData.purpose.trim()) {
      errors.purpose = t('farmerApply.purposeRequired', 'Agricultural loan purpose is required.');
    }

    if (!formData.termsAccepted) {
      errors.termsAccepted = t('farmerApply.termsRequired', 'You must confirm the applicant declaration before submitting.');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    // Prevent duplicate submission
    if (submitting) return;

    if (!validateForm()) {
      // Scroll to the first error
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    try {
      setSubmitting(true);

      // Compile farming context into remarks for backend Loan.remarks
      const farmingParts = [];
      if (formData.cropType) farmingParts.push(`Crop: ${formData.cropType}`);
      if (formData.landArea) farmingParts.push(`Land: ${formData.landArea} Acres`);
      if (formData.surveyNumber) farmingParts.push(`Survey No: ${formData.surveyNumber}`);
      if (formData.irrigationSource) farmingParts.push(`Irrigation: ${formData.irrigationSource}`);
      if (formData.village) farmingParts.push(`Village: ${formData.village}`);
      if (formData.district) farmingParts.push(`District: ${formData.district}`);

      let remarksText = `[Scheme: ${selectedScheme.name}]`;
      if (farmingParts.length > 0) {
        remarksText += ` [Farming Details: ${farmingParts.join(', ')}]`;
      }
      if (formData.additionalRemarks.trim()) {
        remarksText += ` Note: ${formData.additionalRemarks.trim()}`;
      }

      // 1. Submit Loan Application to POST /api/loans
      const payload = {
        loanAmount: Number(formData.loanAmount),
        purpose: formData.purpose.trim(),
        interestRate: Number(selectedScheme.interestRate),
        tenureMonths: Number(formData.tenureMonths),
        repaymentFrequency: formData.repaymentFrequency || 'MONTHLY',
        remarks: remarksText,
        loanProductId: location.state?.loanProductId || selectedScheme._id || undefined,
      };

      const loanResponse = await loanAPI.createLoan(payload);

      if (loanResponse.data?.status === 'success') {
        const newLoan = loanResponse.data.data.loan;
        setCreatedLoan(newLoan);

        // 2. Upload any attached documents using existing POST /api/documents/upload
        const docTypesToUpload = Object.keys(attachedFiles);
        if (docTypesToUpload.length > 0) {
          setUploadProgressMsg(t('farmerApply.uploadProgressNotice', 'Uploading attached verification documents...'));
          for (const docType of docTypesToUpload) {
            try {
              const file = attachedFiles[docType];
              const uploadData = new FormData();
              uploadData.append('loan', newLoan._id);
              uploadData.append('documentType', docType);
              uploadData.append('documentName', file.name);
              uploadData.append('file', file);

              await documentAPI.uploadDocument(uploadData);
            } catch (docErr) {
              console.warn(`Could not upload ${docType}:`, docErr.response?.data || docErr.message);
              // Non-blocking for application creation
            }
          }
          setUploadProgressMsg('');
        }
      } else {
        setApiError(loanResponse.data?.message || t('farmerApply.errSubmitFailed', 'Failed to submit loan application.'));
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          err.message ||
          t('farmerApply.errServerSubmit', 'Server error submitting loan application. Please verify parameters and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderSchemeIcon = (iconName) => {
    switch (iconName) {
      case 'Wheat':
        return <Wheat size={22} />;
      case 'Droplets':
        return <Droplets size={22} />;
      case 'Tractor':
        return <Tractor size={22} />;
      case 'Warehouse':
        return <Warehouse size={22} />;
      case 'Truck':
        return <Truck size={22} />;
      case 'Fish':
        return <Fish size={22} />;
      case 'Leaf':
        return <Leaf size={22} />;
      case 'Mountain':
        return <Mountain size={22} />;
      case 'Snowflake':
        return <Snowflake size={22} />;
      case 'Milk':
        return <Milk size={22} />;
      case 'Bird':
        return <Bird size={22} />;
      case 'TreePine':
        return <TreePine size={22} />;
      case 'FlaskConical':
        return <FlaskConical size={22} />;
      default:
        return <Sprout size={22} />;
    }
  };

  return (
    <div className="farmer-apply-layout" style={{ minHeight: 'auto', background: 'transparent' }}>
      {/* Main Form Content */}
      <main className="farmer-apply-container" style={{ padding: '0 0 2rem 0', maxWidth: '100%' }}>
        {/* Back Link */}
        <div className="apply-breadcrumbs">
          <button
            type="button"
            className="btn-back-link"
            onClick={() => navigate('/farmer/loans')}
          >
            <ArrowLeft size={16} />
            <span>{t('farmerLoans.backToSchemes')}</span>
          </button>
        </div>

        {/* =========================================================
            SUCCESS CONFIRMATION SCREEN
            ========================================================= */}
        {createdLoan ? (
          <section className="apply-success-card glass-panel" aria-live="polite">
            <div className="success-badge-icon">
              <CheckCircle2 size={64} className="text-success" />
            </div>
            <h2 className="success-headline">{t('farmerApply.successTitle')}</h2>
            <p className="success-sub">
              {t('farmerApply.successMessage')}{' '}
              <strong className="loan-id-highlight">#{createdLoan._id}</strong>
            </p>

            <div className="success-details-grid">
              <div className="detail-row">
                <span className="text-muted">{t('farmerApply.statusLabel')}:</span>
                <span className="badge badge-warning status-tag">
                  {createdLoan.status || 'SUBMITTED'}
                </span>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerLoans.schemeDetails', 'Selected Scheme')}:</span>
                <span className="font-semibold text-main">{t(`farmerLoans.schemes.${selectedScheme.id}.name`, selectedScheme.name)}</span>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerApply.loanAmount', 'Requested Amount')}:</span>
                <strong className="text-success font-semibold">
                  ₹{(createdLoan.loanAmount || 0).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerApply.tenureMonths', 'Tenure')}:</span>
                <span>{createdLoan.tenureMonths} {t('farmerLoans.months', 'Months')}</span>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerApply.schemeInterest', 'Subsidized Interest')}:</span>
                <span>{createdLoan.interestRate}% {t('farmerLoans.pa', 'p.a.')}</span>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerApply.repaymentFrequency', 'Repayment Frequency')}:</span>
                <span>{createdLoan.repaymentFrequency}</span>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerLoans.estimatedEmi', 'Estimated Monthly EMI')}:</span>
                <strong className="text-primary font-semibold">
                  ₹{liveEmi.emi.toLocaleString('en-IN')} / {t('farmerLoans.perMonth', 'month')}
                </strong>
              </div>
              <div className="detail-row">
                <span className="text-muted">{t('farmerApplications.appliedOn', 'Submission Date')}:</span>
                <span>{new Date(createdLoan.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="next-steps-banner">
              <div className="next-steps-title">
                <Info size={18} />
                <h4>{t('farmerApply.nextStepsTitle')}</h4>
              </div>
              <ol className="next-steps-list">
                <li>{t('farmerApply.step1Desc', 'Your application has been queued in SUBMITTED status.')}</li>
                <li>{t('farmerApply.step2Desc', 'The FPO loan officer will inspect your land records and FPO membership.')}</li>
                <li>{t('farmerApply.step3Desc', 'Upon administrative approval, your repayment schedule will be automatically generated.')}</li>
              </ol>
            </div>

            <div className="success-actions-bar">
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => navigate('/farmer/dashboard')}
              >
                <CreditCard size={18} />
                <span>{t('farmerApply.goToDashboard')}</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => {
                  setCreatedLoan(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>{t('farmerApply.applyAnother')}</span>
              </button>
            </div>
          </section>
        ) : (
          /* =========================================================
              APPLICATION FORM (SECTIONS 1 TO 7)
              ========================================================= */
          <form onSubmit={handleSubmit} className="apply-form-layout" noValidate>
            {/* Global API Error Banner */}
            {apiError && (
              <div className="form-error-alert glass-panel" role="alert">
                <AlertCircle size={20} className="text-danger flex-shrink-0" />
                <div className="error-alert-content">
                  <strong>{t('farmerApply.submissionError', 'Submission Error:')}</strong>
                  <p>{apiError}</p>
                </div>
              </div>
            )}

            {/* SECTION 1: Selected Loan Scheme */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">1</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section1Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section1Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                {/* Scheme Selector */}
                <div className="form-group">
                  <label htmlFor="schemeSelect" className="field-label">
                    {t('farmerApply.schemeSelectLabel')} *
                  </label>
                  <select
                    id="schemeSelect"
                    value={selectedScheme.id}
                    onChange={(e) => handleSchemeChange(e.target.value)}
                    className="form-select-field"
                  >
                    {FPO_AVAILABLE_SCHEMES.map((scheme) => (
                      <option key={scheme.id} value={scheme.id}>
                        {t(`farmerLoans.schemes.${scheme.id}.name`, scheme.name)} — ({scheme.interestRate}% {t('farmerLoans.pa', 'p.a.')} | Max ₹{scheme.maxAmount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Scheme Highlights Card */}
                <div className="selected-scheme-card">
                  <div className="scheme-card-top-row">
                    <div className="scheme-icon-box">
                      {renderSchemeIcon(selectedScheme.icon)}
                    </div>
                    <div className="scheme-title-box">
                      <span className="scheme-category-tag">{t(`farmerLoans.schemes.${selectedScheme.id}.category`, selectedScheme.category)}</span>
                      <h4 className="scheme-name-text">{t(`farmerLoans.schemes.${selectedScheme.id}.name`, selectedScheme.name)}</h4>
                    </div>
                    <span className="availability-badge">
                      <span className="pulsing-dot" />
                      {selectedScheme.availabilityStatus}
                    </span>
                  </div>

                  <p className="scheme-description-text">{t(`farmerLoans.schemes.${selectedScheme.id}.description`, selectedScheme.description)}</p>

                  <div className="scheme-specs-row">
                    <div className="spec-pill">
                      <Percent size={14} className="text-success" />
                      <span>{t('farmerApply.rateLabel', 'Rate:')} <strong>{selectedScheme.interestRate}% {t('farmerLoans.pa', 'p.a.')}</strong></span>
                    </div>
                    <div className="spec-pill">
                      <IndianRupee size={14} className="text-primary" />
                      <span>
                        {t('farmerApply.amountLabel', 'Amount:')} <strong>₹{selectedScheme.minAmount.toLocaleString('en-IN')} - ₹{selectedScheme.maxAmount.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                    <div className="spec-pill">
                      <Calendar size={14} />
                      <span>
                        {t('farmerApply.tenureLabel', 'Tenure:')} <strong>{selectedScheme.minTenure} - {selectedScheme.maxTenure} {t('farmerLoans.months', 'Months')}</strong>
                      </span>
                    </div>
                    <div className="spec-pill">
                      <ShieldCheck size={14} className="text-success" />
                      <span>{t('farmerApply.feeLabel', 'Fee:')} <strong>{selectedScheme.processingFee}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: Farmer Personal Details */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">2</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section2Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section2Sub')}</p>
                </div>
                <span className="verified-account-badge">
                  <CheckCircle2 size={14} /> {t('farmerApply.verifiedAccount', 'Verified Member Account')}
                </span>
              </div>

              <div className="section-body">
                <div className="fields-grid-two">
                  <div className="form-group">
                    <label className="field-label">{t('farmerApply.applicantName')}</label>
                    <input
                      type="text"
                      value={farmerProfile?.name || user?.name || ''}
                      disabled
                      className="form-input-field disabled-input"
                    />
                    <span className="field-caption">{t('farmerApply.nameCaption', 'Registered farmer member name')}</span>
                  </div>

                  <div className="form-group">
                    <label className="field-label">{t('farmerApply.applicantEmail')}</label>
                    <input
                      type="email"
                      value={farmerProfile?.email || user?.email || ''}
                      disabled
                      className="form-input-field disabled-input"
                    />
                    <span className="field-caption">{t('farmerApply.emailCaption', 'Primary account communication address')}</span>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="field-label">{t('farmerApply.applicantPhone')}</label>
                      {(farmerProfile?.phoneVerified ?? user?.phoneVerified) ? (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✅ {t('farmerDashboard.verified', 'VERIFIED')}</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#ca8a04', fontWeight: 500 }}>⚠️ {t('farmerDashboard.pending', 'PENDING')}</span>
                      )}
                    </div>
                    <input
                      type="tel"
                      value={farmerProfile?.phone || user?.phone || 'Not recorded'}
                      disabled
                      className="form-input-field disabled-input"
                    />
                    <span className="field-caption">{t('farmerApply.phoneCaption', 'Registered contact number for loan updates')}</span>
                  </div>

                  <div className="form-group">
                    <label className="field-label">{t('farmerApply.kycStatus')}</label>
                    <div className="kyc-status-container">
                      {farmerProfile?.kycVerified ? (
                        <span className="badge badge-success kyc-badge">
                          <CheckCircle2 size={14} /> {t('farmerApply.kycVerified', 'KYC Verified by FPO Administrator')}
                        </span>
                      ) : (
                        <span className="badge badge-warning kyc-badge">
                          <AlertCircle size={14} /> {t('farmerApply.kycPending', 'KYC Verification Pending Review')}
                        </span>
                      )}
                    </div>
                    <span className="field-caption">
                      {t('farmerApply.kycCaption', 'Verified KYC qualifies application for immediate disbursement upon approval')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: FPO Membership & Address Details */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">3</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section3Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section3Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                <div className="fields-grid-two">
                  <div className="form-group">
                    <label className="field-label">{t('farmerApply.fpoName')}</label>
                    <input
                      type="text"
                      value={farmerProfile?.fpoName || 'Green Valley Farmers Producer Co.'}
                      disabled
                      className="form-input-field disabled-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="field-label">{t('farmerApply.fpoRegNo')}</label>
                    <input
                      type="text"
                      value={farmerProfile?.fpoRegistrationNo || 'FPO-MH-2024-001'}
                      disabled
                      className="form-input-field disabled-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="villageInput" className="field-label">
                      {t('farmerApply.village')} *
                    </label>
                    <input
                      id="villageInput"
                      type="text"
                      value={formData.village}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, village: e.target.value }))
                      }
                      placeholder="e.g., Khed"
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="districtInput" className="field-label">
                      {t('farmerApply.district')} *
                    </label>
                    <input
                      id="districtInput"
                      type="text"
                      value={formData.district}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, district: e.target.value }))
                      }
                      placeholder="e.g., Pune"
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stateInput" className="field-label">
                      {t('farmerApply.state')}
                    </label>
                    <input
                      id="stateInput"
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, state: e.target.value }))
                      }
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pincodeInput" className="field-label">
                      {t('farmerApply.pincode')}
                    </label>
                    <input
                      id="pincodeInput"
                      type="text"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, pincode: e.target.value }))
                      }
                      placeholder="e.g., 410505"
                      className="form-input-field"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: Loan Amount and Purpose */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">4</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section4Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section4Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                <div className="fields-grid-two">
                  {/* Amount with slider & input */}
                  <div className="form-group">
                    <div className="field-label-split">
                      <label htmlFor="loanAmountInput" className="field-label">
                        {t('farmerApply.loanAmount')} *
                      </label>
                      <span className="field-highlight-text">
                        ₹{Number(formData.loanAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="input-currency-box">
                      <span className="currency-prefix">₹</span>
                      <input
                        id="loanAmountInput"
                        type="number"
                        min={selectedScheme.minAmount}
                        max={selectedScheme.maxAmount}
                        step={1000}
                        value={formData.loanAmount}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            loanAmount: e.target.value,
                          }))
                        }
                        className={`form-input-field currency-padded ${
                          validationErrors.loanAmount ? 'field-error-border' : ''
                        }`}
                        required
                      />
                    </div>

                    <input
                      type="range"
                      min={selectedScheme.minAmount}
                      max={selectedScheme.maxAmount}
                      step={5000}
                      value={formData.loanAmount || selectedScheme.defaultAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          loanAmount: Number(e.target.value),
                        }))
                      }
                      className="slider-range-bar"
                    />

                    <div className="slider-limits-row">
                      <span>₹{selectedScheme.minAmount.toLocaleString('en-IN')}</span>
                      <span>₹{selectedScheme.maxAmount.toLocaleString('en-IN')}</span>
                    </div>

                    {validationErrors.loanAmount && (
                      <span className="field-error-msg">{validationErrors.loanAmount}</span>
                    )}
                  </div>

                  {/* Tenure with slider & input */}
                  <div className="form-group">
                    <div className="field-label-split">
                      <label htmlFor="tenureInput" className="field-label">
                        {t('farmerApply.tenureMonths')} *
                      </label>
                      <span className="field-highlight-text">{formData.tenureMonths} Months</span>
                    </div>

                    <input
                      id="tenureInput"
                      type="number"
                      min={selectedScheme.minTenure}
                      max={selectedScheme.maxTenure}
                      step={1}
                      value={formData.tenureMonths}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tenureMonths: e.target.value,
                        }))
                      }
                      className={`form-input-field ${
                        validationErrors.tenureMonths ? 'field-error-border' : ''
                      }`}
                      required
                    />

                    <input
                      type="range"
                      min={selectedScheme.minTenure}
                      max={selectedScheme.maxTenure}
                      step={1}
                      value={formData.tenureMonths || selectedScheme.defaultTenure}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tenureMonths: Number(e.target.value),
                        }))
                      }
                      className="slider-range-bar"
                    />

                    <div className="slider-limits-row">
                      <span>{selectedScheme.minTenure} Months</span>
                      <span>{selectedScheme.maxTenure} Months</span>
                    </div>

                    {validationErrors.tenureMonths && (
                      <span className="field-error-msg">{validationErrors.tenureMonths}</span>
                    )}
                  </div>

                  {/* Repayment Frequency */}
                  <div className="form-group">
                    <label className="field-label">
                      {t('farmerApply.repaymentFrequency')} *
                    </label>
                    <select
                      value={formData.repaymentFrequency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          repaymentFrequency: e.target.value,
                        }))
                      }
                      className="form-select-field"
                    >
                      {selectedScheme.supportedFrequencies.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <span className="field-caption">
                      {t('farmerApply.freqCaption', 'Standard agricultural payment frequency supported for this scheme')}
                    </span>
                  </div>

                  {/* Fixed Subsidized Interest Rate */}
                  <div className="form-group">
                    <label className="field-label">
                      {t('farmerApply.schemeInterest')}
                    </label>
                    <input
                      type="text"
                      value={`${selectedScheme.interestRate}% ${t('farmerLoans.pa', 'p.a.')} (${t('farmerLoanDetail.subsidized', 'Subsidized')} FPO Rate)`}
                      disabled
                      className="form-input-field disabled-input"
                    />
                    <span className="field-caption">
                      {t('farmerApply.interestCaption', 'Interest computed on reducing balance method')}
                    </span>
                  </div>
                </div>

                {/* Purpose Field */}
                <div className="form-group full-width-field">
                  <label htmlFor="purposeInput" className="field-label">
                    {t('farmerApply.purpose')} *
                  </label>
                  <input
                    id="purposeInput"
                    type="text"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purpose: e.target.value }))
                    }
                    placeholder={t('farmerApply.purposePlaceholder')}
                    className={`form-input-field ${
                      validationErrors.purpose ? 'field-error-border' : ''
                    }`}
                    required
                  />
                  {validationErrors.purpose && (
                    <span className="field-error-msg">{validationErrors.purpose}</span>
                  )}
                  <span className="field-caption">
                    {t('farmerApply.purposeCaption', 'Directly recorded on your application and visible during loan evaluation')}
                  </span>
                </div>

                {/* Live Real-Time EMI Preview Box */}
                <div className="live-emi-preview-container">
                  <div className="preview-metric-box primary">
                    <span className="metric-box-label">{t('farmerLoans.estimatedEmi', 'Estimated Monthly Installment')}</span>
                    <strong className="metric-box-val highlight-green">
                      ₹{liveEmi.emi.toLocaleString('en-IN')}
                      <small> / {t('farmerLoans.perMonth', 'month')}</small>
                    </strong>
                    <span className="metric-box-sub">
                      For ₹{Number(formData.loanAmount || 0).toLocaleString('en-IN')} @ {selectedScheme.interestRate}% {t('farmerLoans.pa', 'p.a.')}
                    </span>
                  </div>

                  <div className="preview-metric-box">
                    <span className="metric-box-label">{t('farmerLoans.totalRepayment', 'Total Repayment Amount')}</span>
                    <strong className="metric-box-val">
                      ₹{liveEmi.totalRepayment.toLocaleString('en-IN')}
                    </strong>
                    <span className="metric-box-sub">{t('farmerApply.principalPlusInterest', 'Principal + Total Interest')}</span>
                  </div>

                  <div className="preview-metric-box">
                    <span className="metric-box-label">{t('farmerLoans.totalInterest', 'Total Subsidized Interest')}</span>
                    <strong className="metric-box-val text-warning">
                      ₹{liveEmi.totalInterest.toLocaleString('en-IN')}
                    </strong>
                    <span className="metric-box-sub">
                      {t('farmerApply.overCycles', { count: formData.tenureMonths })}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 5: Farming and Financial Details, where required */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">5</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section5Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section5Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                <div className="fields-grid-two">
                  <div className="form-group">
                    <label htmlFor="cropTypeInput" className="field-label">
                      {t('farmerApply.cropType')}
                    </label>
                    <input
                      id="cropTypeInput"
                      type="text"
                      value={formData.cropType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cropType: e.target.value }))
                      }
                      placeholder={t('farmerApply.cropPlaceholder')}
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="landAreaInput" className="field-label">
                      {t('farmerApply.landArea')}
                    </label>
                    <input
                      id="landAreaInput"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.landArea}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, landArea: e.target.value }))
                      }
                      placeholder={t('farmerApply.landPlaceholder')}
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="surveyNoInput" className="field-label">
                      {t('farmerApply.surveyNo')}
                    </label>
                    <input
                      id="surveyNoInput"
                      type="text"
                      value={formData.surveyNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, surveyNumber: e.target.value }))
                      }
                      placeholder={t('farmerApply.surveyPlaceholder')}
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="irrigationSourceSelect" className="field-label">
                      {t('farmerApply.irrigationSource')}
                    </label>
                    <select
                      id="irrigationSourceSelect"
                      value={formData.irrigationSource}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          irrigationSource: e.target.value,
                        }))
                      }
                      className="form-select-field"
                    >
                      <option value="Borewell">{t('farmerApply.irrigationBorewell')}</option>
                      <option value="Open Well">{t('farmerApply.irrigationWell')}</option>
                      <option value="Canal">{t('farmerApply.irrigationCanal')}</option>
                      <option value="Rainfed">{t('farmerApply.irrigationRainfed')}</option>
                      <option value="Farm Pond">{t('farmerApply.irrigationPond')}</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width-field">
                  <label htmlFor="remarksInput" className="field-label">
                    {t('farmerApply.additionalRemarks')}
                  </label>
                  <textarea
                    id="remarksInput"
                    rows={2}
                    value={formData.additionalRemarks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        additionalRemarks: e.target.value,
                      }))
                    }
                    placeholder={t('farmerApply.remarksPlaceholder')}
                    className="form-textarea-field"
                  />
                  <span className="field-caption">
                    {t('farmerApply.remarksCaption', 'Information entered here will be passed directly to the FPO credit evaluation officers')}
                  </span>
                </div>
              </div>
            </section>

            {/* SECTION 6: Required Documents */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">6</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section6Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section6Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                <div className="docs-explanatory-banner">
                  <Info size={16} />
                  <span>{t('farmerApply.documentNotice')}</span>
                </div>

                <div className="apply-docs-list">
                  {selectedScheme.requiredDocuments.map((docItem) => {
                    const existingDoc = getExistingDoc(docItem.type);
                    const attachedFile = attachedFiles[docItem.type];

                    return (
                      <div key={docItem.type} className="apply-doc-row">
                        <div className="doc-info-col">
                          <div className="doc-tag-and-title">
                            <span className="doc-code-pill">
                              {docItem.type.replace('_', ' ')}
                            </span>
                            <h5 className="doc-row-title">{docItem.title}</h5>
                          </div>
                          <p className="doc-row-desc">{docItem.description}</p>

                          {existingDoc && (
                            <div className="existing-doc-indicator">
                              <CheckCircle2 size={13} className="text-success" />
                              <span>
                                {t('farmerApply.onFile', 'On File')}: <strong>{existingDoc.documentName}</strong> ({existingDoc.status})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="doc-action-col">
                          {attachedFile ? (
                            <div className="file-attached-pill">
                              <FileCheck size={14} className="text-success" />
                              <span className="file-name-truncated">{attachedFile.name}</span>
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={() => handleFileSelect(docItem.type, null)}
                                title="Remove File"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <label className="upload-file-label">
                              <Upload size={14} />
                              <span>{t('farmerApply.selectFile')}</span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) =>
                                  handleFileSelect(docItem.type, e.target.files?.[0])
                                }
                                className="hidden-file-input"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* SECTION 7: Review and Submit */}
            <section className="form-section-card glass-panel">
              <div className="section-header-row">
                <div className="section-number">7</div>
                <div>
                  <h3 className="section-heading">{t('farmerApply.section7Title')}</h3>
                  <p className="section-subheading">{t('farmerApply.section7Sub')}</p>
                </div>
              </div>

              <div className="section-body">
                {/* Review Summary Grid */}
                <div className="review-summary-container">
                  <div className="review-summary-header">
                    <h4>{t('farmerApply.applicationSummary', 'Application Summary')}</h4>
                    <span className="badge badge-warning">{t('farmerApply.readyToSubmit', 'Draft — Ready to Submit')}</span>
                  </div>

                  <div className="review-key-values-grid">
                    <div className="review-item">
                      <span className="review-label">{t('farmerLoans.schemeDetails', 'Selected Scheme')}</span>
                      <strong className="review-value text-main">{t(`farmerLoans.schemes.${selectedScheme.id}.name`, selectedScheme.name)}</strong>
                    </div>

                    <div className="review-item">
                      <span className="review-label">{t('farmerApply.loanAmount', 'Requested Loan Amount')}</span>
                      <strong className="review-value text-success">
                        ₹{Number(formData.loanAmount || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="review-item">
                      <span className="review-label">{t('farmerApply.tenureAndFreq', 'Tenure & Frequency')}</span>
                      <span className="review-value">
                        {formData.tenureMonths} {t('farmerLoans.months', 'Months')} ({formData.repaymentFrequency})
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">{t('farmerApply.schemeInterest', 'Subsidized Interest')}</span>
                      <span className="review-value text-primary font-semibold">
                        {selectedScheme.interestRate}% {t('farmerLoans.pa', 'p.a.')}
                      </span>
                    </div>

                    <div className="review-item">
                      <span className="review-label">{t('farmerLoans.estimatedEmi', 'Estimated Monthly Installment')}</span>
                      <strong className="review-value highlight-green">
                        ₹{liveEmi.emi.toLocaleString('en-IN')} / {t('farmerLoans.perMonth', 'month')}
                      </strong>
                    </div>

                    <div className="review-item">
                      <span className="review-label">{t('farmerLoans.totalRepayment', 'Total Repayment')}</span>
                      <span className="review-value">
                        ₹{liveEmi.totalRepayment.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="review-item full-span">
                      <span className="review-label">{t('farmerApply.purpose', 'Purpose Statement')}</span>
                      <span className="review-value text-muted">{formData.purpose}</span>
                    </div>

                    <div className="review-item full-span">
                      <span className="review-label">{t('farmerApply.applicantLocation', 'Applicant & Location')}</span>
                      <span className="review-value text-muted">
                        {farmerProfile?.name} | {formData.village || 'Khed'}, {formData.district || 'Pune'} |{' '}
                        {farmerProfile?.fpoName || 'FPO'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Declaration Checkbox */}
                <div className="declaration-checkbox-group">
                  <label className="checkbox-label-container">
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          termsAccepted: e.target.checked,
                        }))
                      }
                      className="custom-checkbox-input"
                    />
                    <span className="declaration-text">
                      {t('farmerApply.termsDeclaration')}
                    </span>
                  </label>
                  {validationErrors.termsAccepted && (
                    <span className="field-error-msg block-error">
                      {validationErrors.termsAccepted}
                    </span>
                  )}
                </div>

                {/* In-Flight Upload Message */}
                {uploadProgressMsg && (
                  <div className="upload-progress-alert">
                    <RefreshCw size={16} className="spinning" />
                    <span>{uploadProgressMsg}</span>
                  </div>
                )}

                {/* Submit Actions Row */}
                <div className="submit-actions-row">
                  <button
                    type="button"
                    className="btn-cancel-action"
                    onClick={() => navigate('/farmer/loans')}
                    disabled={submitting}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>

                  <button
                    type="submit"
                    className="btn-submit-application"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={18} className="spinning" />
                        <span>{t('farmerApply.submittingBtn')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('farmerApply.submitBtn')}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </form>
        )}
      </main>
    </div>
  );
};

export default FarmerApply;
