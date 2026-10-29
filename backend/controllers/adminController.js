const mongoose = require('mongoose');
const { User, Loan, Document } = require('../models');
const { decrypt } = require('../utils/cryptoHelper');
const { recordAuditLog } = require('./auditController');
const { getNotificationService } = require('../services/notificationService');

/**
 * Mask Aadhaar number to only show last 4 digits (e.g., **** **** 1234)
 */
function maskAadhaar(aadhaar) {
  if (!aadhaar) return 'N/A';
  const clean = String(aadhaar).replace(/\s+/g, '');
  if (clean.length < 4) return '****';
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * @desc    Get all registered farmers with aggregated loans and documents
 * @route   GET /api/admin/farmers
 * @access  Private (FPO_ADMIN only)
 */
const getFarmers = async (req, res) => {
  try {
    const farmers = await User.find({ role: 'FARMER' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const farmerIds = farmers.map((f) => f._id);

    // Fetch all loans and documents for these farmers
    const [loans, documents] = await Promise.all([
      Loan.find({ farmer: { $in: farmerIds } }).lean(),
      Document.find({ user: { $in: farmerIds } }).lean(),
    ]);

    const loanMap = new Map();
    loans.forEach((l) => {
      const fid = String(l.farmer);
      if (!loanMap.has(fid)) loanMap.set(fid, []);
      loanMap.get(fid).push(l);
    });

    const docMap = new Map();
    documents.forEach((d) => {
      const uid = String(d.user);
      if (!docMap.has(uid)) docMap.set(uid, []);
      docMap.get(uid).push(d);
    });

    const enrichedFarmers = farmers.map((farmer) => {
      const fid = String(farmer._id);
      return {
        ...farmer,
        kycStatus: farmer.kycStatus || (farmer.kycVerified ? 'VERIFIED' : 'PENDING'),
        loans: loanMap.get(fid) || [],
        documents: docMap.get(fid) || [],
      };
    });

    return res.status(200).json({
      status: 'success',
      results: enrichedFarmers.length,
      data: {
        farmers: enrichedFarmers,
      },
    });
  } catch (err) {
    console.error('[getFarmers] Error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch farmers',
    });
  }
};

/**
 * @desc    Get farmers for KYC review with their Aadhaar and PAN documents
 * @route   GET /api/admin/kyc/farmers
 * @access  Private (FPO_ADMIN only)
 */
const getKycFarmers = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { role: 'FARMER' };
    if (status && status !== 'ALL') {
      if (status === 'VERIFIED') {
        query.kycVerified = true;
      } else if (status === 'REJECTED') {
        query.kycStatus = 'REJECTED';
      } else if (status === 'PENDING') {
        query.kycVerified = false;
        query.kycStatus = { $ne: 'REJECTED' };
      }
    }

    const farmers = await User.find(query)
      .select('+aadhaar -password')
      .populate('kycReviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const farmerIds = farmers.map((f) => f._id);
    const documents = await Document.find({
      user: { $in: farmerIds },
    }).lean();

    const docMap = new Map();
    documents.forEach((d) => {
      const uid = String(d.user);
      if (!docMap.has(uid)) docMap.set(uid, []);
      docMap.get(uid).push(d);
    });

    const results = farmers.map((farmer) => {
      const uid = String(farmer._id);
      const userDocs = docMap.get(uid) || [];

      // Find Aadhaar and PAN documents
      const aadhaarDoc = userDocs.find(
        (d) =>
          d.documentType === 'ID_PROOF' &&
          /aadhaar|aadhar/i.test(d.documentName || '')
      ) || userDocs.find((d) => /aadhaar|aadhar/i.test(d.documentName || '')) || null;

      const panDoc = userDocs.find(
        (d) =>
          d.documentType === 'ID_PROOF' &&
          /pan/i.test(d.documentName || '')
      ) || userDocs.find((d) => /pan/i.test(d.documentName || '')) || null;

      let maskedAadhaarNum = 'N/A';
      if (farmer.aadhaar) {
        try {
          const plain = decrypt(farmer.aadhaar);
          maskedAadhaarNum = maskAadhaar(plain);
        } catch (e) {
          maskedAadhaarNum = 'XXXX-XXXX-****';
        }
      }

      // Calculate approximate age if dob is present and age is not
      let calculatedAge = farmer.age;
      if (!calculatedAge && farmer.dob) {
        const diff = Date.now() - new Date(farmer.dob).getTime();
        calculatedAge = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      }

      const effectiveKycStatus = farmer.kycStatus || (farmer.kycVerified ? 'VERIFIED' : 'PENDING');

      // Return clean object without sensitive encrypted payload
      const { aadhaar, ...farmerData } = farmer;

      return {
        ...farmerData,
        age: calculatedAge || 'N/A',
        maskedAadhaar: maskedAadhaarNum,
        kycStatus: effectiveKycStatus,
        aadhaarDoc,
        panDoc,
        documentsCount: userDocs.length,
        documents: userDocs,
      };
    });

    return res.status(200).json({
      status: 'success',
      results: results.length,
      data: {
        farmers: results,
      },
    });
  } catch (err) {
    console.error('[getKycFarmers] Error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch farmers for KYC review',
    });
  }
};

/**
 * @desc    Approve Farmer KYC (Requires both Aadhaar and PAN documents)
 * @route   PUT /api/admin/kyc/:farmerId/approve
 * @access  Private (FPO_ADMIN only)
 */
const approveFarmerKyc = async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid farmer ID format' });
    }

    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ status: 'fail', message: 'Farmer not found' });
    }

    // Verify both Aadhaar and PAN documents exist
    const docs = await Document.find({ user: farmerId });
    const hasAadhaar = docs.some(
      (d) =>
        (d.documentType === 'ID_PROOF' && /aadhaar|aadhar/i.test(d.documentName || '')) ||
        /aadhaar|aadhar/i.test(d.documentName || '')
    );
    const hasPan = docs.some(
      (d) =>
        (d.documentType === 'ID_PROOF' && /pan/i.test(d.documentName || '')) ||
        /pan/i.test(d.documentName || '')
    );

    if (!hasAadhaar || !hasPan) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot approve KYC: Both Aadhaar and PAN documents must be submitted and available for review.',
        missingDocuments: {
          aadhaar: !hasAadhaar,
          pan: !hasPan,
        },
      });
    }

    // Update farmer KYC state
    farmer.kycVerified = true;
    farmer.kycStatus = 'VERIFIED';
    farmer.kycRejectionReason = undefined;
    farmer.kycReviewedBy = req.user._id;
    farmer.kycReviewedAt = new Date();
    await farmer.save();

    // Also mark Aadhaar and PAN documents as VERIFIED if pending
    await Document.updateMany(
      {
        user: farmerId,
        $or: [
          { documentName: { $regex: /aadhaar|aadhar|pan/i } },
          { documentType: 'ID_PROOF' },
        ],
        status: 'PENDING',
      },
      {
        $set: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: req.user._id,
        },
      }
    );

    // Audit log
    await recordAuditLog(
      req.user._id,
      'FARMER_KYC_APPROVED',
      'User',
      farmer._id,
      `KYC approved for farmer "${farmer.name}" (${farmer.phone || farmer.email})`,
      { farmerId: farmer._id, approvedBy: req.user.name }
    );

    // Notify farmer
    try {
      await getNotificationService().notify({
        userId: farmer._id,
        type: 'KYC_APPROVED',
        title: 'KYC Verification Approved',
        body: 'Congratulations! Your KYC documents have been reviewed and approved by the FPO administration. You are now eligible for loan disbursement.',
        entityType: 'User',
        entityId: farmer._id,
        metadata: {
          reviewedAt: new Date(),
        },
      });
    } catch (notifErr) {
      console.warn('[approveFarmerKyc] Notification failed:', notifErr.message);
    }

    return res.status(200).json({
      status: 'success',
      message: `KYC for ${farmer.name} has been successfully verified and approved.`,
      data: {
        farmer: {
          _id: farmer._id,
          name: farmer.name,
          kycVerified: farmer.kycVerified,
          kycStatus: farmer.kycStatus,
          kycReviewedAt: farmer.kycReviewedAt,
        },
      },
    });
  } catch (err) {
    console.error('[approveFarmerKyc] Error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Server error approving farmer KYC',
    });
  }
};

/**
 * @desc    Reject Farmer KYC (Requires explicit rejection reason)
 * @route   PUT /api/admin/kyc/:farmerId/reject
 * @access  Private (FPO_ADMIN only)
 */
const rejectFarmerKyc = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { rejectionReason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid farmer ID format' });
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'A detailed rejection reason is required so the farmer knows what to correct.',
      });
    }

    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ status: 'fail', message: 'Farmer not found' });
    }

    const reason = rejectionReason.trim();
    farmer.kycVerified = false;
    farmer.kycStatus = 'REJECTED';
    farmer.kycRejectionReason = reason;
    farmer.kycReviewedBy = req.user._id;
    farmer.kycReviewedAt = new Date();
    await farmer.save();

    // Audit log
    await recordAuditLog(
      req.user._id,
      'FARMER_KYC_REJECTED',
      'User',
      farmer._id,
      `KYC rejected for farmer "${farmer.name}": ${reason}`,
      { farmerId: farmer._id, reason, rejectedBy: req.user.name }
    );

    // Notify farmer with the specific reason
    try {
      await getNotificationService().notify({
        userId: farmer._id,
        type: 'KYC_REJECTED',
        title: 'KYC Verification Action Required',
        body: `Your KYC verification requires correction: ${reason}. Please visit the Documents portal to re-upload the required proof.`,
        entityType: 'User',
        entityId: farmer._id,
        metadata: { rejectionReason: reason },
      });
    } catch (notifErr) {
      console.warn('[rejectFarmerKyc] Notification failed:', notifErr.message);
    }

    return res.status(200).json({
      status: 'success',
      message: `KYC for ${farmer.name} has been rejected with reason recorded.`,
      data: {
        farmer: {
          _id: farmer._id,
          name: farmer.name,
          kycVerified: farmer.kycVerified,
          kycStatus: farmer.kycStatus,
          kycRejectionReason: farmer.kycRejectionReason,
          kycReviewedAt: farmer.kycReviewedAt,
        },
      },
    });
  } catch (err) {
    console.error('[rejectFarmerKyc] Error:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Server error rejecting farmer KYC',
    });
  }
};

module.exports = {
  getFarmers,
  getKycFarmers,
  approveFarmerKyc,
  rejectFarmerKyc,
};
