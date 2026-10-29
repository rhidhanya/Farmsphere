const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema(
  {
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: [true, 'Loan reference is required'],
    },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Borrower reference is required'],
    },
    installmentNumber: {
      type: Number,
      required: [true, 'Installment number is required'],
      min: [1, 'Installment number must be at least 1'],
    },
    amountDue: {
      type: Number,
      required: [true, 'Amount due is required'],
      min: [0, 'Amount due cannot be negative'],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidDate: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'OTHER'],
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    lastUpcomingReminderSentAt: {
      type: Date,
      default: null,
    },
    upcomingReminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastOverdueReminderSentAt: {
      type: Date,
      default: null,
    },
    overdueReminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Repayment = mongoose.model('Repayment', repaymentSchema);

module.exports = Repayment;
