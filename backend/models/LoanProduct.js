const mongoose = require('mongoose');

const requiredDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'ID_PROOF',
        'ADDRESS_PROOF',
        'LAND_RECORD',
        'FPO_MEMBERSHIP',
        'BANK_STATEMENT',
        'FINANCIAL_REPORT',
        'OTHER',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const loanProductSchema = new mongoose.Schema(
  {
    /**
     * Stable, human-readable slug used to identify the product across reseeds.
     * Once set, do NOT change — it is used as the idempotency key in the seeder.
     */
    slugId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Display identifiers
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: 'CreditCard' },

    // Descriptive content
    purpose: { type: String, trim: true },
    description: { type: String, trim: true },
    whoCanApply: { type: String, trim: true },
    badge: { type: String, trim: true },

    // Loan amounts
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, required: true, min: 0 },
    defaultAmount: { type: Number, min: 0 },

    // Interest & tenure
    interestRate: { type: Number, required: true, min: 0 },
    minTenure: { type: Number, required: true, min: 1 },
    maxTenure: { type: Number, required: true, min: 1 },
    defaultTenure: { type: Number, min: 1 },
    repaymentFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'SEASONAL', 'BULLET'],
      default: 'MONTHLY',
    },
    supportedFrequencies: {
      type: [String],
      default: ['MONTHLY'],
    },

    // Fees & availability
    processingFee: { type: String, trim: true, default: '₹0 (Nil)' },
    availability: { type: String, trim: true },

    // Eligibility & documents
    eligibilityCriteria: { type: [String], default: [] },
    requiredDocuments: { type: [requiredDocumentSchema], default: [] },

    /**
     * Lifecycle control
     * status:               DRAFT → not visible; ACTIVE → visible; INACTIVE → hidden
     * acceptingApplications: only true products with this flag allow Apply Now
     */
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    acceptingApplications: {
      type: Boolean,
      default: true,
    },

    // Attribution
    configuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast public query (farmers fetching active products)
loanProductSchema.index({ status: 1, acceptingApplications: 1 });

const LoanProduct = mongoose.model('LoanProduct', loanProductSchema);

module.exports = LoanProduct;
