/**
 * FarmSphere Responsive HTML Email Templates
 */

const getBaseStyles = () => `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
  .email-wrapper { width: 100%; background-color: #f1f5f9; padding: 28px 12px; }
  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
  .email-header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 32px 24px; text-align: center; }
  .email-brand { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
  .email-subbrand { font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500; letter-spacing: 0.3px; }
  .email-body { padding: 32px 28px; line-height: 1.6; }
  .email-greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
  .email-message { font-size: 15px; color: #334155; margin-bottom: 24px; }
  .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #64748b; font-weight: 500; }
  .info-value { color: #0f172a; font-weight: 700; text-align: right; }
  .cta-section { text-align: center; margin: 28px 0 16px 0; }
  .cta-button { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25); }
  .badge-success { background-color: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block; }
  .badge-danger { background-color: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block; }
  .badge-warning { background-color: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block; }
  .badge-info { background-color: #e0f2fe; color: #075985; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block; }
  .email-footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  .email-footer a { color: #059669; text-decoration: none; }
`;

const renderEmailShell = ({ title, preheader, bodyHtml, appUrl }) => {
  const portalUrl = (appUrl || process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="email-header">
              <h1 class="email-brand">🌱 FarmSphere</h1>
              <div class="email-subbrand">FPO Institutional Credit &amp; Agricultural Support</div>
            </td>
          </tr>
          <tr>
            <td class="email-body">
              ${bodyHtml}
              <div class="cta-section">
                <a href="${portalUrl}/login" class="cta-button" target="_blank" rel="noopener noreferrer">Sign In to Farmer Portal</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="email-footer">
              <p style="margin: 0 0 6px 0;">This is an automated notification from your Farmers Producer Organization (FPO).</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} FarmSphere. All rights reserved. &bull; <a href="${portalUrl}">Visit FarmSphere</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const formatCurrencyINR = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDateINR = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? String(dateVal) : d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * 1. Sign-In Notification Template
 */
const getSignInTemplate = ({ name, email, loginTime, ipAddress, userAgent, appUrl }) => {
  const formattedTime = loginTime ? new Date(loginTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const bodyHtml = `
    <div class="email-greeting">Hello ${name || 'Farmer'},</div>
    <p class="email-message">
      You have successfully signed in to your <strong>FarmSphere Farmer Portal</strong> account.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Account Email:</td>
          <td class="info-value" style="padding: 6px 0;">${email || 'Registered Email'}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Sign-In Time:</td>
          <td class="info-value" style="padding: 6px 0;">${formattedTime}</td>
        </tr>
        ${ipAddress ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">IP Address:</td>
          <td class="info-value" style="padding: 6px 0;">${ipAddress}</td>
        </tr>` : ''}
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Security Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-success">Verified Session</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
      If you did not initiate this login, please contact your FPO Administrator immediately or reset your credentials.
    </p>
  `;

  return {
    subject: 'FarmSphere: Successful Sign-In to Your Account',
    text: `Hello ${name || 'Farmer'},\n\nYou have successfully signed in to your FarmSphere account on ${formattedTime}.\nIf this was not you, please contact your FPO Administrator immediately.`,
    html: renderEmailShell({
      title: 'Successful Sign-In',
      preheader: `Sign-in confirmed for ${email} at ${formattedTime}`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 2. Loan Application Submitted Template
 */
const getLoanSubmittedTemplate = ({ name, loanId, schemeName, loanAmount, purpose, tenureMonths, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Namaste ${name || 'Farmer'},</div>
    <p class="email-message">
      Your loan application has been successfully submitted to your FPO credit committee for review.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Application Ref:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Credit Scheme:</td>
          <td class="info-value" style="padding: 6px 0;">${schemeName || 'Agricultural Credit Scheme'}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Requested Amount:</td>
          <td class="info-value" style="padding: 6px 0; color: #047857; font-size: 16px;">${formatCurrencyINR(loanAmount)}</td>
        </tr>
        ${purpose ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Purpose:</td>
          <td class="info-value" style="padding: 6px 0;">${purpose}</td>
        </tr>` : ''}
        ${tenureMonths ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Tenure:</td>
          <td class="info-value" style="padding: 6px 0;">${tenureMonths} Months</td>
        </tr>` : ''}
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Current Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-warning">SUBMITTED &bull; Awaiting Review</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>Next Steps:</strong> Your FPO committee will review your application along with your submitted documents. You can track your application status anytime from your portal.
    </p>
  `;

  return {
    subject: `FarmSphere: Loan Application Submitted (${ref} - ${formatCurrencyINR(loanAmount)})`,
    text: `Namaste ${name || 'Farmer'},\n\nYour loan application ${ref} for ${formatCurrencyINR(loanAmount)} under scheme "${schemeName || 'Agricultural Credit Scheme'}" has been submitted successfully.\n\nLog in to track status: ${(appUrl || 'http://localhost:5173')}/farmer/applications`,
    html: renderEmailShell({
      title: 'Loan Application Submitted',
      preheader: `Loan application ${ref} for ${formatCurrencyINR(loanAmount)} is now under review.`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 3. Loan Approved Template
 */
const getLoanApprovedTemplate = ({ name, loanId, schemeName, approvedAmount, interestRate, tenureMonths, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Congratulations ${name || 'Farmer'}! 🎉</div>
    <p class="email-message">
      We are pleased to inform you that your agricultural loan application has been <strong>APPROVED</strong> by the FPO Administration.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Application Ref:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Approved Amount:</td>
          <td class="info-value" style="padding: 6px 0; color: #166534; font-size: 18px;">${formatCurrencyINR(approvedAmount)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Scheme Name:</td>
          <td class="info-value" style="padding: 6px 0;">${schemeName || 'Agricultural Credit Scheme'}</td>
        </tr>
        ${interestRate !== undefined ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Interest Rate:</td>
          <td class="info-value" style="padding: 6px 0;">${interestRate}% p.a.</td>
        </tr>` : ''}
        ${tenureMonths ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Repayment Tenure:</td>
          <td class="info-value" style="padding: 6px 0;">${tenureMonths} Months</td>
        </tr>` : ''}
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Decision Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-success">APPROVED</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>Next Steps:</strong> Your loan facility is queued for disbursement into your registered bank account. You will receive an immediate notification as soon as the funds are released.
    </p>
  `;

  return {
    subject: `FarmSphere: Loan Application Approved! (${ref} - ${formatCurrencyINR(approvedAmount)})`,
    text: `Congratulations ${name || 'Farmer'}!\n\nYour loan application ${ref} for ${formatCurrencyINR(approvedAmount)} has been APPROVED.\nNext step: Funds are queued for disbursement.\n\nSign in to review details: ${(appUrl || 'http://localhost:5173')}/farmer/applications`,
    html: renderEmailShell({
      title: 'Loan Approved',
      preheader: `Good news! Your loan application ${ref} for ${formatCurrencyINR(approvedAmount)} is approved.`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 4. Loan Rejected Template
 */
const getLoanRejectedTemplate = ({ name, loanId, schemeName, reason, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Hello ${name || 'Farmer'},</div>
    <p class="email-message">
      Thank you for submitting your credit request to the FPO. After careful review by the credit committee, we regret to inform you that loan application <strong>${ref}</strong> could not be approved at this time.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Application Ref:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Scheme:</td>
          <td class="info-value" style="padding: 6px 0;">${schemeName || 'Agricultural Credit Scheme'}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-danger">REJECTED</span></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Reason for Decision:</td>
          <td class="info-value" style="padding: 6px 0; color: #991b1b;">${reason || 'Credit eligibility criteria not met at this time.'}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>What You Can Do:</strong> You may review the decision details, update your supporting documents, or consult with your local FPO coordinator for guidance on alternative credit options.
    </p>
  `;

  return {
    subject: `FarmSphere: Update on Loan Application (${ref})`,
    text: `Hello ${name || 'Farmer'},\n\nYour loan application ${ref} could not be approved at this time.\nReason: ${reason || 'Criteria not met.'}\n\nPlease log in to review: ${(appUrl || 'http://localhost:5173')}/farmer/applications`,
    html: renderEmailShell({
      title: 'Loan Application Update',
      preheader: `Update regarding your loan application ${ref}`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 5. Loan Disbursed Template
 */
const getLoanDisbursedTemplate = ({ name, loanId, schemeName, disbursedAmount, disbursedDate, dueDate, firstEmiAmount, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Funds Disbursed, ${name || 'Farmer'}! 🌾</div>
    <p class="email-message">
      The loan amount for reference <strong>${ref}</strong> has been successfully <strong>DISBURSED</strong> to your account.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Loan Reference:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Disbursed Amount:</td>
          <td class="info-value" style="padding: 6px 0; color: #166534; font-size: 18px;">${formatCurrencyINR(disbursedAmount)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Disbursement Date:</td>
          <td class="info-value" style="padding: 6px 0;">${formatDateINR(disbursedDate || new Date())}</td>
        </tr>
        ${dueDate ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">First Installment Due:</td>
          <td class="info-value" style="padding: 6px 0; color: #b45309;">${formatDateINR(dueDate)}</td>
        </tr>` : ''}
        ${firstEmiAmount ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Installment Amount:</td>
          <td class="info-value" style="padding: 6px 0;">${formatCurrencyINR(firstEmiAmount)}</td>
        </tr>` : ''}
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Facility Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-success">ACTIVE &bull; DISBURSED</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>Repayment Information:</strong> Your complete repayment calendar has been generated in your portal. Please ensure timely payments to maintain a strong credit standing with your FPO.
    </p>
  `;

  return {
    subject: `FarmSphere: Loan Funds Disbursed (${ref} - ${formatCurrencyINR(disbursedAmount)})`,
    text: `Hello ${name || 'Farmer'},\n\nYour loan funds of ${formatCurrencyINR(disbursedAmount)} for loan ${ref} have been disbursed.\nDisbursement Date: ${formatDateINR(disbursedDate || new Date())}\nFirst Due Date: ${formatDateINR(dueDate)}\n\nView repayment schedule: ${(appUrl || 'http://localhost:5173')}/farmer/repayments`,
    html: renderEmailShell({
      title: 'Loan Disbursed',
      preheader: `Loan ${ref} of ${formatCurrencyINR(disbursedAmount)} has been disbursed.`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 6. Repayment Received Template
 */
const getRepaymentReceivedTemplate = ({ name, loanId, amount, remainingBalance, paymentDate, paymentMethod, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Payment Received, ${name || 'Farmer'}! ✅</div>
    <p class="email-message">
      We have successfully recorded your repayment of <strong>${formatCurrencyINR(amount)}</strong> towards loan facility <strong>${ref}</strong>.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Loan Reference:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Amount Paid:</td>
          <td class="info-value" style="padding: 6px 0; color: #166534; font-size: 16px;">${formatCurrencyINR(amount)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Payment Date:</td>
          <td class="info-value" style="padding: 6px 0;">${formatDateINR(paymentDate || new Date())}</td>
        </tr>
        ${paymentMethod ? `
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Payment Mode:</td>
          <td class="info-value" style="padding: 6px 0;">${paymentMethod}</td>
        </tr>` : ''}
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Outstanding Balance:</td>
          <td class="info-value" style="padding: 6px 0; color: #047857; font-weight: 800;">${formatCurrencyINR(remainingBalance)}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      Thank you for keeping your account up to date. You can download official payment receipts anytime from your Farmer Portal.
    </p>
  `;

  return {
    subject: `FarmSphere: Payment Received for Loan ${ref} (${formatCurrencyINR(amount)})`,
    text: `Hello ${name || 'Farmer'},\n\nPayment of ${formatCurrencyINR(amount)} for loan ${ref} received on ${formatDateINR(paymentDate || new Date())}.\nRemaining balance: ${formatCurrencyINR(remainingBalance)}.\n\nPortal: ${(appUrl || 'http://localhost:5173')}/farmer/repayments`,
    html: renderEmailShell({
      title: 'Repayment Received',
      preheader: `Payment of ${formatCurrencyINR(amount)} received for loan ${ref}.`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 7. Overdue Repayment Template
 */
const getOverdueTemplate = ({ name, loanId, amount, dueDate, appUrl }) => {
  const ref = loanId ? `#${String(loanId).slice(-6)}` : 'N/A';
  const bodyHtml = `
    <div class="email-greeting">Important Notice, ${name || 'Farmer'} ⚠️</div>
    <p class="email-message">
      This is a reminder that your scheduled installment for loan <strong>${ref}</strong> is now <strong>OVERDUE</strong>.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Loan Reference:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${ref}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Overdue Amount:</td>
          <td class="info-value" style="padding: 6px 0; color: #991b1b; font-size: 16px;">${formatCurrencyINR(amount)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Scheduled Due Date:</td>
          <td class="info-value" style="padding: 6px 0; color: #991b1b;">${formatDateINR(dueDate)}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-danger">OVERDUE</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      Please clear this installment as soon as possible to avoid late penalties and maintain eligibility for future seasonal FPO credit schemes.
    </p>
  `;

  return {
    subject: `FarmSphere Urgent: Overdue Installment for Loan ${ref} (${formatCurrencyINR(amount)})`,
    text: `Hello ${name || 'Farmer'},\n\nYour loan installment of ${formatCurrencyINR(amount)} for loan ${ref} due on ${formatDateINR(dueDate)} is OVERDUE.\nPlease settle promptly: ${(appUrl || 'http://localhost:5173')}/farmer/repayments`,
    html: renderEmailShell({
      title: 'Installment Overdue Notice',
      preheader: `Urgent: Installment of ${formatCurrencyINR(amount)} for loan ${ref} is overdue.`,
      bodyHtml,
      appUrl,
    }),
  };
};

/**
 * 8. KYC Decision (Approved / Rejected) Templates
 */
const getKycApprovedTemplate = ({ name, reviewedAt, appUrl }) => {
  const bodyHtml = `
    <div class="email-greeting">KYC Verification Approved, ${name || 'Farmer'}! ✅</div>
    <p class="email-message">
      Congratulations! Your submitted identity and address verification documents (Aadhaar &amp; PAN) have been reviewed and <strong>APPROVED</strong> by the FPO administration.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Farmer Name:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${name || 'Registered Farmer'}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Approval Date:</td>
          <td class="info-value" style="padding: 6px 0;">${formatDateINR(reviewedAt || new Date())}</td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">KYC Standing:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-success">VERIFIED &bull; ELIGIBLE</span></td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>You are now fully eligible:</strong> You can now explore all subsidized FPO credit schemes and apply for agricultural working capital loans directly through your portal.
    </p>
  `;

  return {
    subject: 'FarmSphere: KYC Verification Approved!',
    text: `Hello ${name || 'Farmer'},\n\nYour KYC documents have been reviewed and APPROVED by the FPO administration on ${formatDateINR(reviewedAt || new Date())}.\nYou are now eligible to apply for all FPO loan schemes: ${(appUrl || 'http://localhost:5173')}/farmer/loans`,
    html: renderEmailShell({
      title: 'KYC Verified',
      preheader: 'Your KYC verification has been approved by the FPO administration.',
      bodyHtml,
      appUrl,
    }),
  };
};

const getKycRejectedTemplate = ({ name, reason, appUrl }) => {
  const bodyHtml = `
    <div class="email-greeting">KYC Verification Action Required, ${name || 'Farmer'}</div>
    <p class="email-message">
      Your submitted KYC documents have been reviewed. However, they could not be verified in their current format and require correction.
    </p>
    <div class="info-card">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Farmer Name:</td>
          <td class="info-value" style="padding: 6px 0;"><strong>${name || 'Registered Farmer'}</strong></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Verification Status:</td>
          <td class="info-value" style="padding: 6px 0;"><span class="badge-danger">ACTION REQUIRED</span></td>
        </tr>
        <tr class="info-row">
          <td class="info-label" style="padding: 6px 0;">Reason for Rejection:</td>
          <td class="info-value" style="padding: 6px 0; color: #991b1b;">${reason || 'Document scan is unclear or details do not match profile.'}</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #334155;">
      <strong>Next Steps:</strong> Please visit your <strong>KYC Documents</strong> page, review the rejection note, and re-upload clear copies of your Aadhaar and PAN certificates.
    </p>
  `;

  return {
    subject: 'FarmSphere: KYC Verification Requires Correction',
    text: `Hello ${name || 'Farmer'},\n\nYour KYC documents require correction: ${reason || 'Document details need attention.'}\nPlease log in to re-upload: ${(appUrl || 'http://localhost:5173')}/farmer/kyc`,
    html: renderEmailShell({
      title: 'KYC Action Required',
      preheader: `Action required: ${reason || 'Please correct your KYC documents.'}`,
      bodyHtml,
      appUrl,
    }),
  };
};

module.exports = {
  renderEmailShell,
  formatCurrencyINR,
  formatDateINR,
  getSignInTemplate,
  getLoanSubmittedTemplate,
  getLoanApprovedTemplate,
  getLoanRejectedTemplate,
  getLoanDisbursedTemplate,
  getRepaymentReceivedTemplate,
  getOverdueTemplate,
  getKycApprovedTemplate,
  getKycRejectedTemplate,
};
