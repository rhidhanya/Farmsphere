const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Document = require('../models/Document');
const Loan = require('../models/Loan');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { recordAuditLog } = require('./auditController');
const User = require('../models/User');
const { getNotificationService } = require('../services/notificationService');

const VALID_DOC_TYPES = [
  'ID_PROOF',
  'ADDRESS_PROOF',
  'LAND_RECORD',
  'FPO_MEMBERSHIP',
  'BANK_STATEMENT',
  'FINANCIAL_REPORT',
  'OTHER',
];

const toDocumentResponse = (document) => {
  const result = document.toObject ? document.toObject() : document;
  return {
    ...result,
    fileAccessUrl: result._id ? `/api/documents/${result._id}/file` : result.fileUrl,
  };
};

// @desc    Upload document for a loan application
// @route   POST /api/documents/upload
// @access  Private (FARMER only)
const uploadDocument = async (req, res) => {
  try {
    const { loan, documentType, documentName } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a document file',
      });
    }

    if (!loan || !mongoose.Types.ObjectId.isValid(loan)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Valid loan ID is required',
      });
    }

    if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid document type. Allowed types: ${VALID_DOC_TYPES.join(', ')}`,
      });
    }

    // Verify loan exists and belongs to the authenticated farmer
    const loanDoc = await Loan.findById(loan);
    if (!loanDoc) {
      return res.status(404).json({
        status: 'fail',
        message: 'Loan application not found',
      });
    }

    if (loanDoc.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: "Forbidden: You cannot upload documents to another farmer's loan application",
      });
    }

    // ── Step 1: Upload to Cloudinary ──────────────────────────────────────────
    // If the Cloudinary upload fails, abort immediately — no DB record is created.
    let cloudinaryResult;
    let isPdf = req.file.mimetype === 'application/pdf';
    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'fpo_loan_documents',
        ...(isPdf
          ? {
              resource_type: 'raw',
              access_mode: 'public',
              public_id: `${crypto.randomUUID()}.pdf`,
            }
          : {}),
      });
    } catch (uploadError) {
      console.error('[Cloudinary] Upload failed:', uploadError.message);
      return res.status(502).json({
        status: 'error',
        message: 'Document upload to storage failed. Please try again.',
      });
    }

    // ── Step 2: Save document metadata in MongoDB ─────────────────────────────
    // If MongoDB save fails after a successful upload, delete the Cloudinary
    // resource to avoid leaving orphaned files in storage.
    let document;
    try {
      document = await Document.create({
        loan: loanDoc._id,
        user: req.user._id,
        documentType,
        documentName: documentName ? documentName.trim() : req.file.originalname,
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryResourceType: cloudinaryResult.resource_type || (isPdf ? 'raw' : 'image'),
        fileType: req.file.mimetype,
        status: 'PENDING',
      });
    } catch (dbError) {
      // Best-effort Cloudinary cleanup to prevent orphaned files
      if (cloudinaryResult && cloudinaryResult.public_id) {
        await deleteFromCloudinary(
          cloudinaryResult.public_id,
          cloudinaryResult.resource_type || (req.file.mimetype.startsWith('image/') ? 'image' : 'raw')
        );
      }
      return res.status(500).json({
        status: 'error',
        message: dbError.message || 'Failed to save document record. Uploaded file has been cleaned up.',
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        document: toDocumentResponse(document),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error uploading document',
    });
  }
};

// @desc    Upload KYC document (Aadhaar or PAN) for farmer identity verification
// @route   POST /api/documents/kyc-upload
// @access  Private (FARMER only)
const uploadKycDocument = async (req, res) => {
  try {
    const { documentName, documentType } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a document file',
      });
    }

    const docType = documentType && VALID_DOC_TYPES.includes(documentType) ? documentType : 'ID_PROOF';
    const isPdf = req.file.mimetype === 'application/pdf';
    let cloudinaryResult;

    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'fpo_kyc_documents',
        ...(isPdf
          ? {
              resource_type: 'raw',
              access_mode: 'public',
              public_id: `${crypto.randomUUID()}.pdf`,
            }
          : {}),
      });
    } catch (uploadError) {
      console.error('[Cloudinary KYC] Upload failed:', uploadError.message);
      return res.status(502).json({
        status: 'error',
        message: 'KYC Document upload to storage failed. Please try again.',
      });
    }

    let document;
    try {
      document = await Document.create({
        user: req.user._id,
        documentType: docType,
        documentName: documentName ? documentName.trim() : req.file.originalname,
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryResourceType: cloudinaryResult.resource_type || (isPdf ? 'raw' : 'image'),
        fileType: req.file.mimetype,
        status: 'PENDING',
      });
    } catch (dbError) {
      if (cloudinaryResult && cloudinaryResult.public_id) {
        await deleteFromCloudinary(
          cloudinaryResult.public_id,
          cloudinaryResult.resource_type || (req.file.mimetype.startsWith('image/') ? 'image' : 'raw')
        );
      }
      return res.status(500).json({
        status: 'error',
        message: dbError.message || 'Failed to save KYC document record.',
      });
    }

    // Set farmer kycStatus to PENDING if not verified
    if (req.user.kycStatus !== 'VERIFIED') {
      await User.findByIdAndUpdate(req.user._id, {
        kycStatus: 'PENDING',
        kycRejectionReason: undefined,
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'KYC Document uploaded successfully',
      data: {
        document: toDocumentResponse(document),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error uploading KYC document',
    });
  }
};

// @desc    Get documents belonging to the authenticated farmer
// @route   GET /api/documents/my
// @access  Private (FARMER only)
const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user._id })
      .populate('loan', 'purpose loanAmount status')
      .sort({ createdAt: -1 });
    const responseDocuments = documents.map(toDocumentResponse);

    return res.status(200).json({
      status: 'success',
      results: responseDocuments.length,
      data: {
        documents: responseDocuments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching your documents',
    });
  }
};

// @desc    Get documents for a specific loan (Farmer accesses own loan, Admin accesses any)
// @route   GET /api/documents/loan/:loanId
// @access  Private (FARMER & FPO_ADMIN)
const getLoanDocuments = async (req, res) => {
  try {
    const { loanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid loan ID format',
      });
    }

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Loan application not found',
      });
    }

    // IDOR Check for Farmers
    if (req.user.role === 'FARMER' && loan.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: "Forbidden: You do not have permission to view documents for this loan",
      });
    }

    const documents = await Document.find({ loan: loanId })
      .populate('user', 'name email phone')
      .populate('verifiedBy', 'name email phone')
      .sort({ createdAt: -1 });
    const responseDocuments = documents.map(toDocumentResponse);

    return res.status(200).json({
      status: 'success',
      results: responseDocuments.length,
      data: {
        documents: responseDocuments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching loan documents',
    });
  }
};

// @desc    Get all documents for admin review with status filter
// @route   GET /api/documents
// @access  Private (FPO_ADMIN only)
const getDocumentFile = async (req, res) => {
  try {
    // Retrieve document metadata
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ status: 'fail', message: 'Document not found' });
    }

    // Authorization: farmers can only access their own documents; admins have full access
    if (req.user.role === 'FARMER') {
      let isOwner = false;
      if (document.user && document.user.toString() === req.user._id.toString()) {
        isOwner = true;
      } else if (document.loan) {
        const loan = await Loan.findById(document.loan);
        if (loan && loan.farmer && loan.farmer.toString() === req.user._id.toString()) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You do not have permission to access this document',
        });
      }
    }

    const fileUrl = document.fileUrl;
    if (!fileUrl) {
      return res.status(404).json({ status: 'fail', message: 'Document file not found' });
    }

    // If external URL (e.g. Cloudinary), redirect client directly
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return res.redirect(fileUrl);
    }

    // If local file path, serve file directly
    return res.sendFile(path.resolve(fileUrl));
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message || 'Server error retrieving document file' });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(upperStatus)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid document status filter '${status}'`,
        });
      }
      query.status = upperStatus;
    }

    const documents = await Document.find(query)
      .populate('user', 'name email phone fpoName')
      .populate('loan', 'purpose status loanAmount')
      .populate('verifiedBy', 'name email phone')
      .sort({ createdAt: -1 });
    const responseDocuments = documents.map(toDocumentResponse);

    return res.status(200).json({
      status: 'success',
      results: responseDocuments.length,
      data: {
        documents: responseDocuments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching all documents',
    });
  }
};

// @desc    Verify a document: PENDING -> VERIFIED
// @route   PUT /api/documents/:id/verify
// @access  Private (FPO_ADMIN only)
const verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid document ID format',
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found',
      });
    }

    document.status = 'VERIFIED';
    document.verifiedAt = new Date();
    document.verifiedBy = req.user._id;

    await document.save();

    // After verification, if this document is an ID proof (Aadhaar or PAN), check if both are verified for the user
    if (document.documentType === 'ID_PROOF' && /aadhaar|pan/i.test(document.documentName)) {
      // Find other ID proof documents for the same user
      const otherDocs = await Document.find({
        user: document.user,
        documentType: 'ID_PROOF',
        _id: { $ne: document._id },
      });
      const hasAadhaar = otherDocs.some(d => /aadhaar/i.test(d.documentName) && d.status === 'VERIFIED');
      const hasPan = otherDocs.some(d => /pan/i.test(d.documentName) && d.status === 'VERIFIED');
      const currentIsAadhaar = /aadhaar/i.test(document.documentName);
      const currentIsPan = /pan/i.test(document.documentName);
      const allVerified = (currentIsAadhaar ? true : hasAadhaar) && (currentIsPan ? true : hasPan);
      if (allVerified) {
        await User.findByIdAndUpdate(document.user, { kycVerified: true });
      }
    }

    // Audit log
    await recordAuditLog(
      req.user._id,
      'DOCUMENT_VERIFIED',
      'Document',
      document._id,
      `Document "${document.documentName}" verified`,
      { documentType: document.documentType }
    );

    // Notify farmer that their document was approved
    try {
      await getNotificationService().notify({
        userId: document.user,
        type: 'DOCUMENT_APPROVED',
        title: 'Document Verified',
        body: `Your document "${document.documentName || document.documentType}" has been verified successfully.`,
        entityType: 'Document',
        entityId: document._id,
        metadata: {
          loanId: document.loan,
          docType: document.documentType,
          docName: document.documentName,
        },
      });
    } catch (notifyErr) {
      console.error('[notify] DOCUMENT_APPROVED error:', notifyErr.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Document verified successfully',
      data: {
        document,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error verifying document',
    });
  }
};

// @desc    Reject a document: PENDING -> REJECTED
// @route   PUT /api/documents/:id/reject
// @access  Private (FPO_ADMIN only)
const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid document ID format',
      });
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Rejection reason is required',
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document not found',
      });
    }

    document.status = 'REJECTED';
    document.verifiedAt = new Date();
    document.verifiedBy = req.user._id;
    document.rejectionReason = rejectionReason.trim();

    await document.save();

    // Audit log
    await recordAuditLog(
      req.user._id,
      'DOCUMENT_REJECTED',
      'Document',
      document._id,
      `Document "${document.documentName}" rejected: ${rejectionReason.trim()}`,
      { documentType: document.documentType, rejectionReason: rejectionReason.trim() }
    );

    try {
      // document.user is the farmer who uploaded — document.farmer does not exist in the schema
      await getNotificationService().notify({
        userId: document.user,
        type: 'DOCUMENT_REJECTED',
        title: 'Document Action Required',
        body: `Document "${document.documentName || document.documentType}" was rejected: ${rejectionReason.trim()}. Please re-upload in the portal.`,
        entityType: 'Document',
        entityId: document._id,
        metadata: {
          loanId: document.loan,
          docType: document.documentType,
          docName: document.documentName,
          reason: rejectionReason.trim(),
        },
      });
    } catch (notifyErr) {
      console.error('[notify] DOCUMENT_REJECTED error:', notifyErr.message);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Document rejected',
      data: {
        document,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error rejecting document',
    });
  }
};

module.exports = {
  uploadDocument,
  uploadKycDocument,
  getMyDocuments,
  getLoanDocuments,
  getDocumentFile,
  getAllDocuments,
  verifyDocument,
  rejectDocument,
};
