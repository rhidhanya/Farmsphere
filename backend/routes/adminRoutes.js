// Admin routes for privileged operations
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { downloadFarmerReport } = require('../controllers/reportController');
const {
  getFarmers,
  getKycFarmers,
  approveFarmerKyc,
  rejectFarmerKyc,
} = require('../controllers/adminController');

// Farmers management
router.get('/farmers', protect, authorize('FPO_ADMIN'), getFarmers);

// Farmer KYC Verification workflow
router.get('/kyc/farmers', protect, authorize('FPO_ADMIN'), getKycFarmers);
router.put('/kyc/:farmerId/approve', protect, authorize('FPO_ADMIN'), approveFarmerKyc);
router.put('/kyc/:farmerId/reject', protect, authorize('FPO_ADMIN'), rejectFarmerKyc);

// Individual farmer PDF report download
router.get('/farmers/:id/report', protect, authorize('FPO_ADMIN'), downloadFarmerReport);

module.exports = router;
