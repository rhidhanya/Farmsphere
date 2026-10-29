// Report controller for generating individual farmer PDF reports
// This endpoint is protected and admin‑only. It aggregates farmer profile, KYC status, loan
// history, repayment summary and other relevant details, then streams a PDF using pdfkit.
// Sensitive Aadhaar data is decrypted, masked (showing only last 4 digits), and never logged.

const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const { decrypt } = require('../utils/cryptoHelper');

// Helper to mask Aadhaar – show only last 4 digits
function maskAadhaar(aadhaar) {
  if (!aadhaar) return 'N/A';
  const clean = String(aadhaar).replace(/\s+/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-****';
  const visible = clean.slice(-4);
  return `XXXX-XXXX-${visible}`;
}

// Generate PDF and pipe to response
async function downloadFarmerReport(req, res) {
  try {
    const farmerId = req.params.id;
    // Fetch farmer, include encrypted Aadhaar
    const farmer = await User.findById(farmerId).select('+aadhaar');
    if (!farmer) {
      return res.status(404).json({ status: 'fail', message: 'Farmer not found' });
    }

    // Fetch loans belonging to farmer
    const loans = await Loan.find({ farmer: farmerId }).sort({ createdAt: -1 }).lean();
    const loanIds = loans.map((l) => l._id);
    // Fetch repayments for those loans
    const repayments = await Repayment.find({ loan: { $in: loanIds } }).sort({ installmentNumber: 1 }).lean();

    // Decrypt and mask Aadhaar for display only
    let maskedAadhaar = 'N/A';
    if (farmer.aadhaar) {
      try {
        const plain = decrypt(farmer.aadhaar);
        maskedAadhaar = maskAadhaar(plain);
      } catch (e) {
        maskedAadhaar = 'XXXX-XXXX-****';
      }
    }

    // Initialise PDF document with proper margins
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const filename = `FarmerReport_${farmer.name.replace(/\s+/g, '_')}_${farmer._id.toString().slice(-6)}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Primary Colors
    const primaryColor = '#166534'; // Green
    const secondaryColor = '#334155'; // Slate
    const mutedColor = '#64748b'; // Gray
    const accentBorder = '#cbd5e1';

    // ── Header Banner ──
    doc.rect(50, 45, 495, 65).fill('#f0fdf4');
    doc.rect(50, 45, 6, 65).fill(primaryColor);

    doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold')
      .text('FARMSPHERE FPO CREDIT SYSTEM', 68, 56);
    doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
      .text('Comprehensive Farmer Profile, KYC Verification & Credit History', 68, 78);
    doc.fillColor(mutedColor).fontSize(8)
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 68, 92);

    doc.moveDown(2.5);

    // ── Section 1: Farmer Profile & KYC Status ──
    const startY = 125;
    doc.rect(50, startY, 495, 22).fill('#f8fafc');
    doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold')
      .text('1. FARMER PROFILE & FPO MEMBERSHIP', 58, startY + 6);

    const kycStatusStr = farmer.kycStatus || (farmer.kycVerified ? 'VERIFIED' : 'PENDING');
    let dobStr = 'Not Provided';
    if (farmer.dob) {
      dobStr = new Date(farmer.dob).toLocaleDateString('en-IN');
    }

    let addrStr = 'Not Specified';
    if (farmer.address) {
      const a = farmer.address;
      addrStr = [a.village, a.district, a.state, a.pincode].filter(Boolean).join(', ') || 'N/A';
    }

    const col1X = 60;
    const col2X = 300;
    let rowY = startY + 30;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(secondaryColor);
    doc.text('Farmer Reference ID:', col1X, rowY);
    doc.font('Helvetica').fillColor(mutedColor).text(farmer._id.toString(), col1X + 115, rowY);

    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('KYC Standing:', col2X, rowY);
    const kycColor = kycStatusStr === 'VERIFIED' ? '#15803d' : (kycStatusStr === 'REJECTED' ? '#b91c1c' : '#b45309');
    doc.font('Helvetica-Bold').fillColor(kycColor).text(kycStatusStr, col2X + 80, rowY);

    rowY += 16;
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Full Legal Name:', col1X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(farmer.name || 'N/A', col1X + 115, rowY);

    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Aadhaar (Masked):', col2X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(maskedAadhaar, col2X + 95, rowY);

    rowY += 16;
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Contact Phone:', col1X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(`${farmer.phone || 'N/A'} ${farmer.phoneVerified ? '(Verified)' : ''}`, col1X + 115, rowY);

    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Date of Birth / Age:', col2X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(`${dobStr} (${farmer.age ? farmer.age + ' yrs' : 'N/A'})`, col2X + 95, rowY);

    rowY += 16;
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('FPO Producer Co.:', col1X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(farmer.fpoName || 'Green Valley Farmers Producer Co.', col1X + 115, rowY);

    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('FPO Reg Number:', col2X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(farmer.fpoRegistrationNo || 'FPO-MH-2024-001', col2X + 95, rowY);

    rowY += 16;
    doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Residential Address:', col1X, rowY);
    doc.font('Helvetica').fillColor('#0f172a').text(addrStr, col1X + 115, rowY, { width: 370 });

    rowY += 25;

    // ── Section 2: Credit Facilities & Loan Summary ──
    doc.rect(50, rowY, 495, 22).fill('#f8fafc');
    doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold')
      .text('2. LOAN APPLICATIONS & SANCTIONS', 58, rowY + 6);

    rowY += 30;

    if (loans.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedColor)
        .text('No loan applications or historical credit records found for this farmer.', 60, rowY);
      rowY += 20;
    } else {
      // Aggregate numbers
      const totalSanctioned = loans.reduce((sum, l) => sum + (l.disbursedAmount || (l.status === 'APPROVED' ? l.loanAmount : 0)), 0);
      const totalDue = repayments.reduce((sum, r) => sum + (r.amountDue || 0), 0);
      const totalPaid = repayments.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const currentOutstanding = Math.max(0, totalDue - totalPaid);
      const overdueAmount = repayments
        .filter((r) => r.paymentStatus === 'OVERDUE')
        .reduce((sum, r) => sum + (r.amountDue - (r.amountPaid || 0)), 0);

      // Financial Snapshot Box
      doc.rect(50, rowY, 495, 42).fill('#faf5ff');
      doc.rect(50, rowY, 495, 42).stroke('#e9d5ff');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b21a8')
        .text('TOTAL DISBURSED', 60, rowY + 6)
        .text('TOTAL REPAID', 180, rowY + 6)
        .text('OUTSTANDING BALANCE', 300, rowY + 6)
        .text('OVERDUE AMOUNT', 420, rowY + 6);

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text(`INR ${totalSanctioned.toLocaleString('en-IN')}`, 60, rowY + 20)
        .text(`INR ${totalPaid.toLocaleString('en-IN')}`, 180, rowY + 20)
        .text(`INR ${currentOutstanding.toLocaleString('en-IN')}`, 300, rowY + 20);

      const odColor = overdueAmount > 0 ? '#b91c1c' : '#15803d';
      doc.fillColor(odColor).text(`INR ${overdueAmount.toLocaleString('en-IN')}`, 420, rowY + 20);

      rowY += 52;

      // Loans Table
      loans.forEach((loan, idx) => {
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }

        doc.rect(50, rowY, 495, 52).fill('#ffffff').stroke(accentBorder);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
          .text(`Loan #${idx + 1}: ${loan.purpose}`, 58, rowY + 7);

        // Status badge text
        const stColor = loan.status === 'DISBURSED' ? '#1d4ed8' : (loan.status === 'APPROVED' ? '#15803d' : (loan.status === 'REJECTED' ? '#b91c1c' : '#b45309'));
        doc.fillColor(stColor).text(`[${loan.status}]`, 450, rowY + 7);

        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        const lId = loan._id.toString();
        const lAmt = (loan.loanAmount || 0).toLocaleString('en-IN');
        const dAmt = loan.disbursedAmount ? (loan.disbursedAmount).toLocaleString('en-IN') : 'N/A';
        doc.text(`ID: ${lId.slice(0, 10)}... | Applied: INR ${lAmt} | Disbursed: INR ${dAmt} | Rate: ${loan.interestRate || 6}% p.a. | Tenure: ${loan.tenureMonths || 12} mo`, 58, rowY + 22);

        // Associated repayments breakdown
        const loanReps = repayments.filter((r) => r.loan && String(r.loan) === lId);
        const lDue = loanReps.reduce((s, r) => s + (r.amountDue || 0), 0);
        const lPaid = loanReps.reduce((s, r) => s + (r.amountPaid || 0), 0);
        const lRem = Math.max(0, lDue - lPaid);
        doc.font('Helvetica-Oblique').fillColor(mutedColor);
        doc.text(`Repayment Milestones: ${loanReps.length} total | Due: INR ${lDue.toLocaleString('en-IN')} | Paid: INR ${lPaid.toLocaleString('en-IN')} | Remaining: INR ${lRem.toLocaleString('en-IN')}`, 58, rowY + 36);

        rowY += 58;
      });
    }

    // ── Section 3: Repayment Milestone Log ──
    if (rowY > 650) {
      doc.addPage();
      rowY = 50;
    }

    doc.rect(50, rowY, 495, 22).fill('#f8fafc');
    doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold')
      .text('3. REPAYMENT RECORD & INSTALLMENT SCHEDULE', 58, rowY + 6);

    rowY += 30;

    if (repayments.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedColor)
        .text('No active installments scheduled or recorded.', 60, rowY);
      rowY += 20;
    } else {
      // Table Header
      doc.rect(50, rowY, 495, 18).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(secondaryColor);
      doc.text('Inst #', 55, rowY + 5);
      doc.text('Due Date', 100, rowY + 5);
      doc.text('Due (INR)', 175, rowY + 5);
      doc.text('Paid (INR)', 240, rowY + 5);
      doc.text('Status', 305, rowY + 5);
      doc.text('Payment Method / Ref', 380, rowY + 5);
      rowY += 20;

      repayments.slice(0, 15).forEach((rep) => {
        if (rowY > 740) {
          doc.addPage();
          rowY = 50;
        }

        const dDate = rep.dueDate ? new Date(rep.dueDate).toLocaleDateString('en-IN') : 'N/A';
        const st = rep.paymentStatus || 'PENDING';
        const stC = st === 'PAID' ? '#15803d' : (st === 'OVERDUE' ? '#b91c1c' : '#b45309');

        doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
        doc.text(`#${rep.installmentNumber}`, 55, rowY);
        doc.text(dDate, 100, rowY);
        doc.text((rep.amountDue || 0).toLocaleString('en-IN'), 175, rowY);
        doc.text((rep.amountPaid || 0).toLocaleString('en-IN'), 240, rowY);
        doc.font('Helvetica-Bold').fillColor(stC).text(st, 305, rowY);
        doc.font('Helvetica').fillColor(mutedColor).text(
          rep.paymentMethod ? `${rep.paymentMethod} ${rep.transactionReference ? '(' + rep.transactionReference + ')' : ''}` : '—',
          380,
          rowY,
          { width: 160, ellipsis: true }
        );

        rowY += 15;
      });

      if (repayments.length > 15) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(mutedColor)
          .text(`... and ${repayments.length - 15} additional installments recorded in database.`, 55, rowY + 5);
      }
    }

    // ── Number all pages dynamically ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor(mutedColor)
        .text(
          `FarmSphere FPO Credit System | Confidential Individual Farmer Report | Page ${i + 1} of ${range.count}`,
          50,
          780,
          { align: 'center', width: 495 }
        );
    }

    // Finalise PDF
    doc.end();
  } catch (err) {
    console.error('Error generating farmer report:', err);
    if (!res.headersSent) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate report' });
    }
  }
}

module.exports = { downloadFarmerReport };
