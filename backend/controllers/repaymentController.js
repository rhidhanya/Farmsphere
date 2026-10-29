const mongoose = require('mongoose');
const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');
const calculateEMI = require('../utils/emiCalculator');
const checkAndUpdateOverdueRepayments = require('../utils/overdueChecker');
const { getNotificationService } = require('../services/notificationService');


/**
 * Generate repayment schedule automatically when a loan is DISBURSED
 * @param {Object} loan - Disbursed loan Mongoose document
 * @returns {Promise<Array>} List of generated Repayment documents
 */
const generateRepaymentSchedule = async (loan) => {
  if (!loan || !['DISBURSED', 'CLOSED'].includes(loan.status)) {
    throw new Error('Repayment schedule can only be generated for DISBURSED or CLOSED loans');
  }

  // Check for existing schedule to prevent duplicate generation
  const existingCount = await Repayment.countDocuments({ loan: loan._id });
  if (existingCount > 0) {
    return await Repayment.find({ loan: loan._id }).sort({ installmentNumber: 1 });
  }

  const principal = loan.disbursedAmount || loan.loanAmount;
  const tenure = loan.tenureMonths;
  const emi = calculateEMI(principal, loan.interestRate, tenure);

  const baseDate = loan.disbursedDate ? new Date(loan.disbursedDate) : new Date();
  const repaymentDocs = [];

  for (let i = 1; i <= tenure; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    repaymentDocs.push({
      loan: loan._id,
      borrower: loan.farmer,
      installmentNumber: i,
      amountDue: emi,
      amountPaid: 0,
      dueDate,
      paymentStatus: 'PENDING',
    });
  }

  return await Repayment.insertMany(repaymentDocs);
};

// @desc    Get repayment schedule for authenticated farmer
// @route   GET /api/repayments/my
// @access  Private (FARMER only)
const getMyRepayments = async (req, res) => {
  try {
    await checkAndUpdateOverdueRepayments();

    const repayments = await Repayment.find({ borrower: req.user._id })
      .populate('loan', 'purpose loanAmount status interestRate tenureMonths')
      .sort({ dueDate: 1 });

    return res.status(200).json({
      status: 'success',
      results: repayments.length,
      data: {
        repayments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching your repayment schedule',
    });
  }
};

// @desc    Get repayment schedule for a specific loan (Farmer accesses own, Admin accesses any)
// @route   GET /api/repayments/loan/:loanId
// @access  Private (FARMER & FPO_ADMIN)
const getLoanRepayments = async (req, res) => {
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

    // IDOR Protection for Farmer
    if (req.user.role === 'FARMER' && loan.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view repayment schedule for this loan',
      });
    }

    await checkAndUpdateOverdueRepayments(loanId);

    const repayments = await Repayment.find({ loan: loanId }).sort({ installmentNumber: 1 });

    return res.status(200).json({
      status: 'success',
      results: repayments.length,
      data: {
        repayments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching loan repayment schedule',
    });
  }
};

// @desc    Get all repayment records for admin review with filtering & pagination
// @route   GET /api/repayments
// @access  Private (FPO_ADMIN only)
const getAllRepayments = async (req, res) => {
  try {
    const { paymentStatus, loan, borrower, page = 1, limit = 20 } = req.query;

    await checkAndUpdateOverdueRepayments();

    const query = {};
    if (paymentStatus) {
      const upperStatus = paymentStatus.toUpperCase();
      if (!['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'].includes(upperStatus)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid paymentStatus filter '${paymentStatus}'`,
        });
      }
      query.paymentStatus = upperStatus;
    }

    if (loan && mongoose.Types.ObjectId.isValid(loan)) {
      query.loan = loan;
    }

    if (borrower && mongoose.Types.ObjectId.isValid(borrower)) {
      query.borrower = borrower;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Repayment.countDocuments(query);
    const repayments = await Repayment.find(query)
      .populate('borrower', 'name email phone fpoName')
      .populate('loan', 'purpose status loanAmount interestRate')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      status: 'success',
      results: repayments.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: {
        repayments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error fetching repayment records',
    });
  }
};

// @desc    Record/Mark repayment installment payment
// @route   PUT /api/repayments/:id/pay
// @access  Private (FPO_ADMIN only)
const markRepaymentPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod, transactionReference, remarks } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid repayment ID format',
      });
    }

    const repayment = await Repayment.findById(id);
    if (!repayment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Repayment installment record not found',
      });
    }

    if (repayment.paymentStatus === 'PAID') {
      return res.status(400).json({
        status: 'fail',
        message: 'Installment is already fully PAID and cannot be modified',
      });
    }

    // Amount validation
    const newAmountPaid = amountPaid !== undefined ? Number(amountPaid) : repayment.amountDue;

    if (isNaN(newAmountPaid) || newAmountPaid < 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Payment amount cannot be negative',
      });
    }

    if (newAmountPaid > repayment.amountDue) {
      return res.status(400).json({
        status: 'fail',
        message: `Payment amount (${newAmountPaid}) cannot exceed installment amount due (${repayment.amountDue})`,
      });
    }

    // Payment method validation if provided
    if (paymentMethod && !['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'OTHER'].includes(paymentMethod)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid payment method',
      });
    }

    repayment.amountPaid = newAmountPaid;

    if (paymentMethod) {
      repayment.paymentMethod = paymentMethod;
    }

    if (transactionReference) {
      repayment.transactionReference = transactionReference.trim();
    }

    if (remarks) {
      repayment.remarks = remarks.trim();
    }

    // Payment status assignment
    if (newAmountPaid === 0) {
      repayment.paymentStatus = repayment.dueDate < new Date() ? 'OVERDUE' : 'PENDING';
    } else if (newAmountPaid < repayment.amountDue) {
      repayment.paymentStatus = 'PARTIAL';
    } else {
      repayment.paymentStatus = 'PAID';
      repayment.paidDate = new Date();
    }

    await repayment.save();

    // Automatic Loan Closure Check: DISBURSED -> CLOSED
    let loanClosed = false;
    const allLoanRepayments = await Repayment.find({ loan: repayment.loan });
    if (allLoanRepayments.length > 0 && allLoanRepayments.every((r) => r.paymentStatus === 'PAID')) {
      await Loan.findByIdAndUpdate(repayment.loan, { status: 'CLOSED' });
      loanClosed = true;
    }

    if (newAmountPaid > 0) {
      try {
        const remainingBalance = allLoanRepayments.reduce(
          (sum, r) => sum + (r.amountDue - (r.amountPaid || 0)),
          0
        );
        await getNotificationService().notify({
          userId: repayment.borrower,
          type: 'PAYMENT_RECORDED',
          title: 'Repayment Received',
          body: `Payment of ₹${newAmountPaid.toLocaleString('en-IN')} for loan #${String(repayment.loan).slice(-6)} received. Balance: ₹${remainingBalance.toLocaleString('en-IN')}.`,
          entityType: 'Repayment',
          entityId: repayment._id,
          metadata: {
            loanId: repayment.loan,
            amount: newAmountPaid,
            remainingBalance,
          },
        });
      } catch (notifyErr) {
        console.error('[notify] PAYMENT_RECORDED error:', notifyErr.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: repayment.paymentStatus === 'PAID' ? 'Repayment successfully marked as PAID' : 'Partial payment recorded',
      loanClosed,
      data: {
        repayment,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Server error recording repayment',
    });
  }
};

module.exports = {
  generateRepaymentSchedule,
  getMyRepayments,
  getLoanRepayments,
  getAllRepayments,
  markRepaymentPaid,
};
