const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount cannot be negative'],
    },
    purpose: {
      type: String,
      required: [true, 'Loan purpose is required'],
      trim: true,
    },
    // Optional reference to a LoanProduct catalog entry (added in Phase 4).
    // Legacy loans that pre-date the catalog simply omit this field.
    loanProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
      default: null,
    },
    interestRate: {
      type: Number,
      default: 0,
      min: [0, 'Interest rate cannot be negative'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure in months is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'],
      default: 'SUBMITTED',
    },
    disbursedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    disbursedDate: {
      type: Date,
    },
    repaymentFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'SEASONAL', 'BULLET'],
      default: 'MONTHLY',
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;
