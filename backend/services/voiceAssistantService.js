const User = require('../models/User');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Document = require('../models/Document');
const LoanProduct = require('../models/LoanProduct');

/**
 * Format currency in Indian Numbering System (e.g. ₹1,50,000)
 */
function formatINR(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Format dates to clean Indian format (DD/MM/YYYY)
 */
function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Standard EMI Calculation
 */
function calculateEstimatedEMI(principal, annualRate, tenureMonths) {
  const P = Number(principal);
  const N = Number(tenureMonths);
  const annualR = Number(annualRate);
  if (!P || !N) return 0;
  if (!annualR || annualR <= 0) return Math.round(P / N);

  const r = annualR / (12 * 100);
  const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
  return Math.round(emi);
}

/**
 * Detect language from text (checks for Tamil Unicode range \u0B80-\u0BFF)
 */
function detectLanguage(text, preferredLang = null) {
  if (!text) return preferredLang || 'ta';
  const hasTamil = /[\u0B80-\u0BFF]/.test(text);
  if (hasTamil) return 'ta';
  if (preferredLang === 'ta') return 'ta';
  if (preferredLang === 'en') return 'en';
  if (/^[a-zA-Z0-9\s.,?!₹₹'"]+$/.test(text.trim())) {
    return 'en';
  }
  return preferredLang || 'ta';
}

/**
 * Classify user intent from query text in Tamil or English
 */
function classifyIntent(text) {
  const lower = (text || '').toLowerCase().trim();

  // 1. Next EMI / Due Date
  const emiPatterns = [
    'அடுத்த தவணை', 'தவணை தேதி', 'எப்போது செலுத்த', 'கடைசி தேதி', 'டியூ', 'மாதத் தவணை எப்போது',
    'next emi', 'next installment', 'due date', 'when is my next', 'upcoming emi', 'upcoming installment', 'next payment date', 'emi due date'
  ];
  if (emiPatterns.some(p => lower.includes(p))) {
    return 'REPAYMENT_DUE';
  }

  // 2. Loan Balance / Outstanding / Total Repaid
  const balancePatterns = [
    'கடன் தொகை', 'பாக்கி', 'மீதி', 'எவ்வளவு செலுத்த வேண்டும்', 'எவ்வளவு செலுத்தியுள்ளேன்', 'கடன் அளவு', 'கடன் விவரம்', 'நிலுவை',
    'balance', 'outstanding', 'how much have i paid', 'how much do i owe', 'remaining amount', 'loan amount', 'total paid', 'paid so far'
  ];
  if (balancePatterns.some(p => lower.includes(p))) {
    return 'LOAN_BALANCE';
  }

  // 3. Application Status
  const statusPatterns = [
    'விண்ணப்பத்தின் நிலை', 'விண்ணப்ப நிலை', 'விண்ணப்பம்', 'கடன் ஒப்புதல்', 'ஒப்புதல் அளிக்கப்பட்டுள்ளதா', 'நிராகரிக்கப்பட்டதா', 'விண்ணப்பம் என்னாச்சு', 'ஸ்டேட்டஸ்',
    'application status', 'loan approved', 'has my loan been approved', 'status of my loan', 'status of my application', 'is my loan approved', 'application under review', 'loan status'
  ];
  if (statusPatterns.some(p => lower.includes(p))) {
    return 'APPLICATION_STATUS';
  }

  // 4. KYC Status
  const kycPatterns = [
    'kyc நிலை', 'kyc', 'கேஒய்சி', 'அடையாள சரிபார்ப்பு', 'சரிபார்க்கப்பட்டதா',
    'kyc status', 'is my kyc verified', 'kyc approved', 'kyc rejected', 'verification status'
  ];
  if (kycPatterns.some(p => lower.includes(p))) {
    return 'KYC_STATUS';
  }

  // 5. Missing / Required Documents
  const docPatterns = [
    'ஆவணங்கள்', 'என்ன ஆவணங்கள் தேவை', 'விடுபட்ட ஆவணங்கள்', 'சான்றிதழ்', 'பதிவேற்ற வேண்டும்', 'டாக்குமெண்ட்',
    'missing documents', 'documents required', 'what documents', 'upload documents', 'document status', 'need to upload'
  ];
  if (docPatterns.some(p => lower.includes(p))) {
    return 'MISSING_DOCUMENTS';
  }

  // 6. Scheme Recommendations
  const schemePatterns = [
    'திட்டம்', 'திட்டங்கள்', 'கடன் திட்டம்', 'எந்த கடன்', 'பரிந்துரை', 'புதிய கடன்', 'வட்டி விகிதம்', 'ஸ்கீம்',
    'recommend', 'which scheme', 'suitable loan', 'loan scheme', 'loan schemes', 'best loan', 'which loan is suitable', 'available schemes', 'schemes'
  ];
  if (schemePatterns.some(p => lower.includes(p))) {
    return 'SCHEME_RECOMMENDATIONS';
  }

  // 7. General Help / Guidance
  const guidancePatterns = [
    'விண்ணப்பிப்பது எப்படி', 'விண்ணப்பிக்க', 'உதவி', 'தொடர்பு', 'வழிமுறை', 'செயல்முறை',
    'how to apply', 'how do i apply', 'help', 'contact', 'procedure', 'how can i apply'
  ];
  if (guidancePatterns.some(p => lower.includes(p))) {
    return 'GENERAL_GUIDANCE';
  }

  return 'GENERAL_GUIDANCE';
}

/**
 * Fetch and aggregate real backend financial & profile facts for the authenticated farmer
 */
async function getFarmerContext(farmerId) {
  const farmer = await User.findById(farmerId).select('name email phone kycStatus kycVerified kycRejectionReason address');
  if (!farmer) {
    throw new Error('Authenticated farmer profile not found');
  }

  // Fetch loans
  const loans = await Loan.find({ farmer: farmerId }).populate('loanProductId').sort({ createdAt: -1 });

  // Fetch repayments
  const repayments = await Repayment.find({ borrower: farmerId }).sort({ installmentNumber: 1 });

  // Fetch uploaded documents
  const documents = await Document.find({ user: farmerId }).sort({ createdAt: -1 });

  // Fetch active catalog schemes
  const schemes = await LoanProduct.find({ status: 'ACTIVE', acceptingApplications: true }).sort({ minAmount: 1 });

  // Financial aggregates
  const disbursedLoans = loans.filter(l => l.status === 'DISBURSED');
  const totalBorrowed = disbursedLoans.reduce((sum, l) => sum + (l.disbursedAmount || l.loanAmount || 0), 0);
  const totalRepaid = repayments.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const totalDue = repayments.reduce((sum, r) => sum + (r.amountDue || 0), 0);
  const totalBase = totalDue > totalBorrowed ? totalDue : totalBorrowed;
  const outstandingBalance = Math.max(0, totalBase - totalRepaid);

  // Next installment calculation
  const pendingRepayments = repayments.filter(r => r.paymentStatus === 'PENDING' || r.paymentStatus === 'PARTIAL' || r.paymentStatus === 'OVERDUE');
  const nextRepayment = pendingRepayments.length > 0 ? pendingRepayments[0] : null;

  let nextDueAmount = 0;
  let nextDueDate = null;
  let isNextOverdue = false;

  if (nextRepayment) {
    nextDueAmount = (nextRepayment.amountDue || 0) - (nextRepayment.amountPaid || 0);
    nextDueDate = nextRepayment.dueDate;
    isNextOverdue = new Date(nextRepayment.dueDate) < new Date();
  } else if (disbursedLoans.length > 0 && outstandingBalance > 0) {
    // If schedule records aren't individually created, compute estimated next installment from active loan
    const activeLoan = disbursedLoans[0];
    nextDueAmount = calculateEstimatedEMI(
      activeLoan.disbursedAmount || activeLoan.loanAmount,
      activeLoan.interestRate,
      activeLoan.tenureMonths
    );
    const dDate = activeLoan.disbursedDate || activeLoan.createdAt || new Date();
    const nextDate = new Date(dDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDueDate = nextDate;
    isNextOverdue = nextDueDate < new Date();
  }

  // Latest application status
  const latestLoan = loans.length > 0 ? loans[0] : null;

  return {
    farmer: {
      id: farmer._id,
      name: farmer.name || 'Farmer',
      kycStatus: farmer.kycStatus || 'PENDING',
      kycVerified: Boolean(farmer.kycVerified),
      kycRejectionReason: farmer.kycRejectionReason || null,
    },
    loansCount: loans.length,
    activeLoansCount: disbursedLoans.length,
    latestLoan: latestLoan ? {
      id: latestLoan._id,
      ref: String(latestLoan._id).slice(-6),
      amount: latestLoan.loanAmount,
      disbursedAmount: latestLoan.disbursedAmount,
      status: latestLoan.status,
      schemeName: latestLoan.loanProductId?.name || latestLoan.purpose || 'Agricultural Loan',
      tenureMonths: latestLoan.tenureMonths,
      interestRate: latestLoan.interestRate,
      remarks: latestLoan.remarks || null,
      createdAt: latestLoan.createdAt,
    } : null,
    finances: {
      totalBorrowed,
      totalRepaid,
      outstandingBalance,
      nextDueAmount,
      nextDueDate,
      isNextOverdue,
      hasPendingDues: pendingRepayments.length > 0 || nextDueAmount > 0,
    },
    documents: documents.map(d => ({
      type: d.documentType,
      name: d.documentName,
      status: d.status,
      rejectionReason: d.rejectionReason,
    })),
    schemes: schemes.map(s => ({
      id: s._id,
      name: s.name,
      code: s.code,
      category: s.category,
      minAmount: s.minAmount,
      maxAmount: s.maxAmount,
      interestRate: s.interestRate,
      defaultTenure: s.defaultTenure || s.maxTenure || 12,
      processingFee: s.processingFee,
      purpose: s.purpose || s.description,
      eligibility: s.eligibilityCriteria || [],
      requiredDocs: s.requiredDocuments || [],
    })),
  };
}

/**
 * Generate fully grounded Tamil and English response for the detected intent
 */
function generateGroundedResponse(intent, context, language = 'ta', rawQuery = '') {
  const isTa = language === 'ta';
  const name = context.farmer.name;
  const finances = context.finances;
  const latest = context.latestLoan;

  let reply = '';
  let audioText = '';

  switch (intent) {
    case 'LOAN_BALANCE': {
      if (context.activeLoansCount === 0 && !latest) {
        if (isTa) {
          reply = `வணக்கம் ${name}! உங்களிடம் தற்போது செயலில் உள்ள கடன் ஏதுமில்லை. புதிய கடனுக்கு விண்ணப்பிக்க **கடன் திட்டங்கள்** பக்கத்தைப் பார்வையிடலாம்.`;
          audioText = `வணக்கம் ${name}! உங்களிடம் தற்போது செயலில் உள்ள கடன் ஏதுமில்லை.`;
        } else {
          reply = `Hello ${name}! You currently have no active loans. You can explore available schemes and apply through the **Available Schemes** page.`;
          audioText = `Hello ${name}! You currently have no active loans with FarmSphere.`;
        }
      } else {
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் கடன் மற்றும் திருப்பிச் செலுத்துதல் நிலுவை விவரங்கள்:\n\n` +
            `• **மொத்த கடன் தொகை:** ${formatINR(finances.totalBorrowed)}\n` +
            `• **இதுவரை செலுத்திய தொகை:** ${formatINR(finances.totalRepaid)}\n` +
            `• **மீதமுள்ள கடன் பாக்கி:** ${formatINR(finances.outstandingBalance)}\n` +
            (finances.nextDueAmount > 0
              ? `• **அடுத்த தவணை:** ${formatINR(finances.nextDueAmount)} (${formatDate(finances.nextDueDate)} க்குள்)`
              : `• **அடுத்த தவணை:** செலுத்த வேண்டிய நிலுவைத் தவணைகள் ஏதுமில்லை.`);
          audioText = `வணக்கம் ${name}! உங்கள் மொத்த கடன் தொகை ${formatINR(finances.totalBorrowed)}. நீங்கள் இதுவரை செலுத்திய தொகை ${formatINR(finances.totalRepaid)}. மீதமுள்ள கடன் பாக்கி ${formatINR(finances.outstandingBalance)}.`;
        } else {
          reply = `Hello **${name}**! Here is your loan and repayment balance summary:\n\n` +
            `• **Total Loan Disbursed:** ${formatINR(finances.totalBorrowed)}\n` +
            `• **Total Amount Repaid:** ${formatINR(finances.totalRepaid)}\n` +
            `• **Outstanding Balance:** ${formatINR(finances.outstandingBalance)}\n` +
            (finances.nextDueAmount > 0
              ? `• **Next Installment:** ${formatINR(finances.nextDueAmount)} (Due on ${formatDate(finances.nextDueDate)})`
              : `• **Next Installment:** No pending installments due.`);
          audioText = `Hello ${name}! Your total borrowed amount is ${formatINR(finances.totalBorrowed)}. You have paid ${formatINR(finances.totalRepaid)}, and your remaining outstanding balance is ${formatINR(finances.outstandingBalance)}.`;
        }
      }
      break;
    }

    case 'REPAYMENT_DUE': {
      if (!finances.hasPendingDues || finances.nextDueAmount === 0) {
        if (isTa) {
          reply = `வணக்கம் ${name}! உங்களிடம் தற்போது செலுத்த வேண்டிய தவணை ஏதுமில்லை. உங்கள் கடன் தவணைகள் அனைத்தும் முறையாகச் செலுத்தப்பட்டுள்ளன.`;
          audioText = `வணக்கம் ${name}! உங்களிடம் தற்போது நிலுவைத் தவணை ஏதுமில்லை.`;
        } else {
          reply = `Hello ${name}! You have no pending installments at this time. All scheduled payments are up to date!`;
          audioText = `Hello ${name}! You have no pending installments due right now.`;
        }
      } else {
        const statusNote = finances.isNextOverdue
          ? (isTa ? '⚠️ **கவனிக்கவும்:** இந்தத் தவணைக்கான தேதி கடந்துவிட்டது (நிலுவை).' : '⚠️ **Attention:** This payment is currently overdue.')
          : '';
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் அடுத்த தவணை விவரம்:\n\n` +
            `• **செலுத்த வேண்டிய தொகை:** ${formatINR(finances.nextDueAmount)}\n` +
            `• **கடைசி தேதி:** ${formatDate(finances.nextDueDate)}\n` +
            (statusNote ? `${statusNote}\n` : '') +
            `\nதவணைத் தொகையை FPO வங்கிக் கணக்கிற்கு UPI அல்லது நேரடிப் பரிமாற்றம் மூலம் செலுத்திப் ரசீதைப் பெறலாம்.`;
          audioText = `வணக்கம் ${name}! உங்கள் அடுத்த தவணை தொகை ${formatINR(finances.nextDueAmount)}, செலுத்த வேண்டிய தேதி ${formatDate(finances.nextDueDate)}.`;
        } else {
          reply = `Hello **${name}**! Here is your next upcoming installment details:\n\n` +
            `• **Amount Due:** ${formatINR(finances.nextDueAmount)}\n` +
            `• **Due Date:** ${formatDate(finances.nextDueDate)}\n` +
            (statusNote ? `${statusNote}\n` : '') +
            `\nYou can complete the payment via UPI or direct bank transfer to the FPO account.`;
          audioText = `Hello ${name}! Your next installment of ${formatINR(finances.nextDueAmount)} is due on ${formatDate(finances.nextDueDate)}.`;
        }
      }
      break;
    }

    case 'APPLICATION_STATUS': {
      if (!latest) {
        if (isTa) {
          reply = `வணக்கம் ${name}! நீங்கள் இதுவரை கடன் விண்ணப்பம் எதுவும் சமர்ப்பிக்கவில்லை. புதிய கடன் பெற **கடன் திட்டங்கள்** பக்கத்தில் 'விண்ணப்பிக்க' பட்டனை அழுத்தவும்.`;
          audioText = `வணக்கம் ${name}! நீங்கள் இதுவரை கடன் விண்ணப்பம் எதுவும் சமர்ப்பிக்கவில்லை.`;
        } else {
          reply = `Hello ${name}! You have not submitted any loan applications yet. You can apply for a loan through the **Available Schemes** section.`;
          audioText = `Hello ${name}! You have not submitted any loan applications yet.`;
        }
      } else {
        const statusMapTa = {
          SUBMITTED: 'சமர்ப்பிக்கப்பட்டது (FPO சரிபார்ப்பில் உள்ளது)',
          UNDER_REVIEW: 'மதிப்பாய்வில் உள்ளது (கடன் குழு பரிசீலனை செய்கிறது)',
          APPROVED: 'ஒப்புதல் அளிக்கப்பட்டது! (தொகை விரைவில் உங்கள் கணக்கில் வரவு வைக்கப்படும்)',
          REJECTED: 'நிராகரிக்கப்பட்டது',
          DISBURSED: 'வழங்கப்பட்டது (தொகை வழங்கப்பட்டு பயன்பாட்டில் உள்ளது)',
          CLOSED: 'முடிக்கப்பட்டது (கடன் முழுமையாக திருப்பிச் செலுத்தப்பட்டது)',
        };

        const statusMapEn = {
          SUBMITTED: 'Submitted (Awaiting FPO verification)',
          UNDER_REVIEW: 'Under Review by Credit Committee',
          APPROVED: 'Approved! (Queued for disbursement)',
          REJECTED: 'Rejected',
          DISBURSED: 'Disbursed and Active',
          CLOSED: 'Closed (Fully Repaid)',
        };

        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் சமீபத்திய கடன் விண்ணப்ப விவரம்:\n\n` +
            `• **விண்ணப்ப எண்:** #${latest.ref}\n` +
            `• **திட்டம்:** ${latest.schemeName}\n` +
            `• **கோரிய தொகை:** ${formatINR(latest.amount)}\n` +
            `• **தற்போதைய நிலை:** **${statusMapTa[latest.status] || latest.status}**\n` +
            (latest.status === 'REJECTED' && latest.remarks ? `• **காரணம்:** ${latest.remarks}\n` : '') +
            (latest.status === 'APPROVED' ? `\n🎉 வாழ்த்துகள்! உங்கள் கடன் அங்கீகரிக்கப்பட்டுள்ளது. விரைவில் FPO நிர்வாகத்தால் தொகை வழங்கப்படும்.` : '');
          audioText = `வணக்கம் ${name}! விண்ணப்ப எண் ${latest.ref} இன் தற்போதைய நிலை: ${statusMapTa[latest.status] || latest.status}. கோரிய தொகை ${formatINR(latest.amount)}.`;
        } else {
          reply = `Hello **${name}**! Here is the status of your latest loan application:\n\n` +
            `• **Application Ref:** #${latest.ref}\n` +
            `• **Scheme:** ${latest.schemeName}\n` +
            `• **Requested Amount:** ${formatINR(latest.amount)}\n` +
            `• **Current Status:** **${statusMapEn[latest.status] || latest.status}**\n` +
            (latest.status === 'REJECTED' && latest.remarks ? `• **Rejection Reason:** ${latest.remarks}\n` : '') +
            (latest.status === 'APPROVED' ? `\n🎉 Congratulations! Your loan is approved and awaiting fund disbursement.` : '');
          audioText = `Hello ${name}! Your loan application number ${latest.ref} is currently ${statusMapEn[latest.status] || latest.status}.`;
        }
      }
      break;
    }

    case 'KYC_STATUS': {
      const kyc = context.farmer;
      if (kyc.kycVerified || kyc.kycStatus === 'VERIFIED') {
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் **KYC ஆவணங்கள் வெற்றிகரமாகச் சரிபார்க்கப்பட்டது** (VERIFIED). நீங்கள் FPO வின் அனைத்து கடன் திட்டங்களுக்கும் விண்ணப்பிக்க முழு தகுதி பெற்றுள்ளீர்கள்.`;
          audioText = `வணக்கம் ${name}! உங்கள் கேஒய்சி சரிபார்க்கப்பட்டது. நீங்கள் கடன் திட்டங்களுக்கு விண்ணப்பிக்கலாம்.`;
        } else {
          reply = `Hello **${name}**! Your **KYC verification is fully completed and approved** (VERIFIED). You are eligible to apply for all active FPO credit schemes.`;
          audioText = `Hello ${name}! Your KYC is verified. You are eligible to apply for loans.`;
        }
      } else if (kyc.kycStatus === 'REJECTED') {
        const reason = kyc.kycRejectionReason ? `: "${kyc.kycRejectionReason}"` : '';
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் KYC சரிபார்ப்பு **நிராகரிக்கப்பட்டுள்ளது**${reason}.\n\nதயவுசெய்து **KYC ஆவணங்கள்** பக்கத்திற்குச் சென்று, தெளிவான ஆதார் மற்றும் பான் அட்டை நகல்களை மீண்டும் பதிவேற்றவும்.`;
          audioText = `வணக்கம் ${name}! உங்கள் கேஒய்சி நிராகரிக்கப்பட்டுள்ளது. கேஒய்சி ஆவணங்கள் பக்கத்தில் சென்று மீண்டும் பதிவேற்றவும்.`;
        } else {
          reply = `Hello **${name}**! Your KYC verification was **rejected**${reason}.\n\nPlease navigate to the **KYC Documents** page and re-upload clear scans of your Aadhaar and PAN cards.`;
          audioText = `Hello ${name}! Your KYC verification was rejected. Please re-upload your documents on the KYC page.`;
        }
      } else {
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் KYC சரிபார்ப்பு தற்போது **நிலுவையில் உள்ளது** (Pending Review). FPO நிர்வாகம் உங்கள் ஆவணங்களை விரைவில் பரிசீலித்து ஒப்புதல் அளிக்கும்.`;
          audioText = `வணக்கம் ${name}! உங்கள் கேஒய்சி சரிபார்ப்பு தற்போது நிலுவையில் உள்ளது.`;
        } else {
          reply = `Hello **${name}**! Your KYC verification is currently **Pending Review**. The FPO administration will verify your submitted documents shortly.`;
          audioText = `Hello ${name}! Your KYC status is currently pending review.`;
        }
      }
      break;
    }

    case 'MISSING_DOCUMENTS': {
      const docs = context.documents;
      const hasIdProof = docs.some(d => d.type === 'ID_PROOF' && d.status !== 'REJECTED');
      const hasLandRecord = docs.some(d => d.type === 'LAND_RECORD' && d.status !== 'REJECTED');
      const rejectedDocs = docs.filter(d => d.status === 'REJECTED');

      const missing = [];
      if (!hasIdProof) missing.push(isTa ? 'அடையாளச் சான்று (ஆதார் / பான் அட்டை)' : 'ID Proof (Aadhaar / PAN Card)');
      if (!hasLandRecord) missing.push(isTa ? 'நில உரிமை ஆவணம் (பட்டா / சிட்டா / அடங்கல்)' : 'Land Record (Patta / Chitta)');

      if (missing.length === 0 && rejectedDocs.length === 0) {
        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்களிடம் விடுபட்ட ஆவணங்கள் ஏதுமில்லை. உங்கள் அடையாள மற்றும் நில ஆவணங்கள் பதிவேற்றப்பட்டு FPO வில் உள்ளன.`;
          audioText = `வணக்கம் ${name}! உங்களிடம் விடுபட்ட ஆவணங்கள் ஏதுமில்லை.`;
        } else {
          reply = `Hello **${name}**! You have no missing required documents. Your ID and supporting documents are submitted.`;
          audioText = `Hello ${name}! You have no missing documents on file.`;
        }
      } else {
        if (isTa) {
          reply = `வணக்கம் **${name}**! நீங்கள் சமர்ப்பிக்க வேண்டிய ஆவணங்கள்:\n\n` +
            (missing.length > 0 ? `**விடுபட்ட ஆவணங்கள்:**\n` + missing.map(m => `• ${m}`).join('\n') + `\n\n` : '') +
            (rejectedDocs.length > 0 ? `**மறுபதிவேற்றம் செய்ய வேண்டியவை (நிராகரிக்கப்பட்டவை):**\n` + rejectedDocs.map(d => `• ${d.name} (${d.rejectionReason || 'மறுபரிசீலனை தேவை'})`).join('\n') + `\n\n` : '') +
            `இவற்றை **ஆவணங்கள்** பக்கத்தில் எளிதாகப் பதிவேற்றலாம்.`;
          audioText = `வணக்கம் ${name}! நீங்கள் இன்னும் பதிவேற்ற வேண்டிய ஆவணங்கள் உள்ளன. விவரங்களை திரையில் பார்க்கவும்.`;
        } else {
          reply = `Hello **${name}**! Here are the documents required from your account:\n\n` +
            (missing.length > 0 ? `**Missing Documents:**\n` + missing.map(m => `• ${m}`).join('\n') + `\n\n` : '') +
            (rejectedDocs.length > 0 ? `**Rejected Documents Requiring Re-upload:**\n` + rejectedDocs.map(d => `• ${d.name} (${d.rejectionReason || 'Needs re-upload'})`).join('\n') + `\n\n` : '') +
            `Please visit the **My Documents** page to upload them.`;
          audioText = `Hello ${name}! You have missing or rejected documents that require your attention.`;
        }
      }
      break;
    }

    case 'SCHEME_RECOMMENDATIONS': {
      const schemes = context.schemes;
      if (!schemes || schemes.length === 0) {
        if (isTa) {
          reply = `வணக்கம் ${name}! தற்போது புதிய கடன் திட்டங்கள் ஏதும் செயலில் இல்லை. FPO நிர்வாகத்தைத் தொடர்பு கொள்ளவும்.`;
          audioText = `வணக்கம் ${name}! தற்போது கடன் திட்டங்கள் ஏதும் செயலில் இல்லை.`;
        } else {
          reply = `Hello ${name}! There are currently no active schemes accepting applications. Please check back later.`;
          audioText = `Hello ${name}! There are no active loan schemes available right now.`;
        }
      } else {
        // Recommend up to 2 schemes
        const rec1 = schemes[0];
        const rec2 = schemes.length > 1 ? schemes[1] : null;

        const emi1 = calculateEstimatedEMI(rec1.minAmount || 50000, rec1.interestRate, rec1.defaultTenure);
        const emi2 = rec2 ? calculateEstimatedEMI(rec2.minAmount || 100000, rec2.interestRate, rec2.defaultTenure) : null;

        if (isTa) {
          reply = `வணக்கம் **${name}**! உங்கள் விவசாயத் தேவைகளுக்குப் பரிந்துரைக்கப்படும் FPO கடன் திட்டங்கள்:\n\n` +
            `1. **${rec1.name}**\n` +
            `   • **வட்டி விகிதம்:** ஆண்டுக்கு ${rec1.interestRate}%\n` +
            `   • **கடன் வரம்பு:** ${formatINR(rec1.minAmount)} முதல் ${formatINR(rec1.maxAmount)} வரை\n` +
            `   • **கால அளவு:** ${rec1.defaultTenure} மாதங்கள்\n` +
            `   • **மதிப்பிடப்பட்ட EMI:** ~${formatINR(emi1)} / மாதம் (${formatINR(rec1.minAmount)} கடனுக்கு)\n` +
            `   • **நோக்கம்:** ${rec1.purpose || 'விவசாய மேம்பாடு'}\n\n` +
            (rec2 ? `2. **${rec2.name}**\n` +
              `   • **வட்டி விகிதம்:** ஆண்டுக்கு ${rec2.interestRate}%\n` +
              `   • **கடன் வரம்பு:** ${formatINR(rec2.minAmount)} முதல் ${formatINR(rec2.maxAmount)} வரை\n` +
              `   • **கால அளவு:** ${rec2.defaultTenure} மாதங்கள்\n` +
              `   • **மதிப்பிடப்பட்ட EMI:** ~${formatINR(emi2)} / மாதம் (${formatINR(rec2.minAmount)} கடனுக்கு)\n` +
              `   • **நோக்கம்:** ${rec2.purpose || 'விவசாய உபகரணங்கள்'}\n\n` : '') +
            `*குறிப்பு: EMI மதிப்பீடு தோராயமானது. விண்ணப்பிக்க 'கடன் திட்டங்கள்' பக்கத்திற்குச் செல்லவும்.*`;
          audioText = `வணக்கம் ${name}! உங்களுக்குப் பரிந்துரைக்கப்படும் திட்டம்: ${rec1.name}, வட்டி ${rec1.interestRate} சதவீதம். விவரங்களை திரையில் பார்க்கவும்.`;
        } else {
          reply = `Hello **${name}**! Here are the recommended FPO loan schemes for your farming needs:\n\n` +
            `1. **${rec1.name}**\n` +
            `   • **Interest Rate:** ${rec1.interestRate}% p.a.\n` +
            `   • **Loan Range:** ${formatINR(rec1.minAmount)} to ${formatINR(rec1.maxAmount)}\n` +
            `   • **Tenure:** Up to ${rec1.defaultTenure} months\n` +
            `   • **Estimated EMI:** ~${formatINR(emi1)} / month (for ${formatINR(rec1.minAmount)})\n` +
            `   • **Purpose:** ${rec1.purpose || 'Agricultural operations'}\n\n` +
            (rec2 ? `2. **${rec2.name}**\n` +
              `   • **Interest Rate:** ${rec2.interestRate}% p.a.\n` +
              `   • **Loan Range:** ${formatINR(rec2.minAmount)} to ${formatINR(rec2.maxAmount)}\n` +
              `   • **Tenure:** Up to ${rec2.defaultTenure} months\n` +
              `   • **Estimated EMI:** ~${formatINR(emi2)} / month (for ${formatINR(rec2.minAmount)})\n` +
              `   • **Purpose:** ${rec2.purpose || 'Farm mechanization'}\n\n` : '') +
            `*Note: EMI estimates are indicative based on standard reducing balance.*`;
          audioText = `Hello ${name}! We recommend the ${rec1.name} with ${rec1.interestRate}% interest. Check the screen for full details.`;
        }
      }
      break;
    }

    case 'GENERAL_GUIDANCE':
    default: {
      if (isTa) {
        reply = `வணக்கம் **${name}**! நான் உங்கள் FarmSphere குரல் உதவியாளர். உங்களுக்கு உதவ சில வழிமுறைகள்:\n\n` +
          `• **கடன் விண்ணப்பிக்க:** இடதுபுற மெனுவில் **'கடன் திட்டங்கள்'** சென்று, பொருத்தமான திட்டத்தைத் தேர்ந்தெடுத்து **'விண்ணப்பிக்க'** அழுத்தவும்.\n` +
          `• **ஆவணங்கள் பதிவேற்ற:** **'KYC ஆவணங்கள்'** பகுதியில் ஆதார் மற்றும் பான் அட்டை நகல்களைப் பதிவேற்றவும்.\n` +
          `• **தவணை செலுத்த:** **'திருப்பிச் செலுத்துதல்'** பக்கத்தில் நிலுவைத் தவணைகளைச் சரிபார்த்து ரசீது பெறலாம்.\n\n` +
          `நீங்கள் கேட்கக்கூடிய கேள்விகள்:\n` +
          `1. *"எனது கடன் தொகை எவ்வளவு?"*\n` +
          `2. *"எனது அடுத்த தவணை எப்போது?"*\n` +
          `3. *"கடன் விண்ணப்பத்தின் நிலை என்ன?"*\n` +
          `4. *"எந்த கடன் திட்டம் எனக்கு ஏற்றது?"*`;
        audioText = `வணக்கம் ${name}! நான் உங்கள் பார்ம்ஸ்பியர் குரல் உதவியாளர். கடன் பாக்கி, தவணை தேதி மற்றும் விண்ணப்ப நிலையை அறிய என்னிடம் கேளுங்கள்.`;
      } else {
        reply = `Hello **${name}**! I am your FarmSphere Voice Assistant. Here is how I can help you:\n\n` +
          `• **To apply for a loan:** Open **'Available Schemes'**, pick a suitable scheme, and click **'Apply Now'**.\n` +
          `• **To upload documents:** Go to **'KYC Documents'** and submit your Aadhaar and PAN documents.\n` +
          `• **To track repayments:** Visit **'Repayments'** to review upcoming installments and download receipts.\n\n` +
          `Try asking:\n` +
          `1. *"What is my outstanding balance?"*\n` +
          `2. *"When is my next EMI due?"*\n` +
          `3. *"Has my loan been approved?"*\n` +
          `4. *"Recommend a loan scheme for me"*`;
        audioText = `Hello ${name}! I am your FarmSphere Voice Assistant. You can ask me about your loan balance, next installment, application status, or suitable schemes.`;
      }
      break;
    }
  }

  return {
    reply,
    audioText,
    intent,
    language,
  };
}

/**
 * Main query handler: classifies intent, retrieves real DB context, and formulates response
 */
async function processAssistantQuery({ farmerId, query, language = 'ta' }) {
  if (!farmerId) {
    throw new Error('Authentication required: missing farmer ID');
  }

  const cleanQuery = (query || '').trim();
  const detectedLang = detectLanguage(cleanQuery, language);
  const intent = classifyIntent(cleanQuery);

  // Retrieve strictly authorized farmer context
  const context = await getFarmerContext(farmerId);

  // Generate grounded deterministic response
  const result = generateGroundedResponse(intent, context, detectedLang, cleanQuery);

  return {
    query: cleanQuery,
    intent,
    language: detectedLang,
    reply: result.reply,
    audioText: result.audioText,
    contextSummary: {
      farmerName: context.farmer.name,
      kycStatus: context.farmer.kycStatus,
      activeLoansCount: context.activeLoansCount,
      outstandingBalance: context.finances.outstandingBalance,
      nextDueAmount: context.finances.nextDueAmount,
      nextDueDate: context.finances.nextDueDate,
    },
  };
}

module.exports = {
  detectLanguage,
  classifyIntent,
  calculateEstimatedEMI,
  getFarmerContext,
  generateGroundedResponse,
  processAssistantQuery,
};
