const express = require('express');
const router = express.Router();
const {
  getActiveProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
} = require('../controllers/loanProductController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// ── Public / Farmer routes ───────────────────────────────────────────────────
// Farmers (and unauthenticated users if you wish) can browse active products.
// We protect it with JWT so the farmer's identity is known for future Apply.
router.get('/active', protect, authorize('FARMER', 'FPO_ADMIN'), getActiveProducts);

// ── Admin-only routes ────────────────────────────────────────────────────────
router.get('/', protect, authorize('FPO_ADMIN'), getAllProducts);
router.get('/:id', protect, authorize('FPO_ADMIN'), getProductById);
router.post('/', protect, authorize('FPO_ADMIN'), createProduct);
router.put('/:id', protect, authorize('FPO_ADMIN'), updateProduct);
router.put('/:id/status', protect, authorize('FPO_ADMIN'), toggleProductStatus);

module.exports = router;
