const LoanProduct = require('../models/LoanProduct');

/**
 * @desc  Get all ACTIVE loan products (public — farmer-facing)
 * @route GET /api/loan-products/active
 * @access FARMER (and effectively public; no sensitive data exposed)
 */
const getActiveProducts = async (req, res, next) => {
  try {
    const products = await LoanProduct.find({ status: 'ACTIVE' })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      count: products.length,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get ALL loan products with optional filtering (admin-only)
 * @route GET /api/loan-products
 * @access FPO_ADMIN
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      LoanProduct.find(filter).sort({ createdAt: 1 }).skip(skip).limit(Number(limit)).lean(),
      LoanProduct.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get a single loan product by MongoDB _id (admin-only)
 * @route GET /api/loan-products/:id
 * @access FPO_ADMIN
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await LoanProduct.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Loan product not found' });
    }
    return res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a new loan product (admin-only)
 * @route POST /api/loan-products
 * @access FPO_ADMIN
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await LoanProduct.create({
      ...req.body,
      configuredBy: req.user._id,
    });
    return res.status(201).json({ status: 'success', data: product });
  } catch (err) {
    // Unique constraint violation on slugId
    if (err.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'A loan product with that slugId already exists.',
      });
    }
    next(err);
  }
};

/**
 * @desc  Update an existing loan product (admin-only)
 * @route PUT /api/loan-products/:id
 * @access FPO_ADMIN
 */
const updateProduct = async (req, res, next) => {
  try {
    // Prevent overwriting slugId after creation
    delete req.body.slugId;

    const product = await LoanProduct.findByIdAndUpdate(
      req.params.id,
      { ...req.body, configuredBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Loan product not found' });
    }

    return res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Toggle acceptingApplications and/or status (admin-only)
 * @route PUT /api/loan-products/:id/status
 * @access FPO_ADMIN
 */
const toggleProductStatus = async (req, res, next) => {
  try {
    const { status, acceptingApplications } = req.body;
    const update = { configuredBy: req.user._id };
    if (status !== undefined) update.status = status;
    if (acceptingApplications !== undefined) update.acceptingApplications = acceptingApplications;

    const product = await LoanProduct.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ status: 'fail', message: 'Loan product not found' });
    }

    return res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getActiveProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
};
