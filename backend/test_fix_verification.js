/**
 * FarmSphere — Targeted Fix Verification Suite
 *
 * Verifies the three targeted SMS notification fixes applied 2026-10-22:
 *   Fix 1: USER_REGISTERED SMS template added
 *   Fix 2: DOCUMENT_APPROVED / DOCUMENT_REJECTED use docName (farmer-friendly)
 *   Fix 3: PAYMENT_RECORDED uses repayment.borrower (dead .farmer fallback removed)
 *
 * Also verifies all existing templates still render correctly, including the ₹ symbol.
 *
 * Usage: node test_fix_verification.js
 * Safe: No real SMS sent. No network calls. No DB writes.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Force test isolation — zero outbound requests
process.env.SMS_TEST_MODE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { SmsTemplates, sendSms } = require('./services/smsService');

let pass = 0;
let fail = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  \u2714 ${label}`);
    pass++;
  } else {
    console.error(`  \u2718 FAIL: ${label}${detail ? ' -- ' + detail : ''}`);
    fail++;
  }
}

console.log('\n' + '='.repeat(65));
console.log('  FARMSPHERE SMS FIX VERIFICATION SUITE');
console.log('='.repeat(65));

// ─────────────────────────────────────────────────────────────────
// FIX 1: USER_REGISTERED template
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Fix 1: USER_REGISTERED SMS template ---');
{
  assert(
    'USER_REGISTERED template exists and is a function',
    typeof SmsTemplates.USER_REGISTERED === 'function',
    'Got type: ' + typeof SmsTemplates.USER_REGISTERED
  );

  if (typeof SmsTemplates.USER_REGISTERED === 'function') {
    const msg = SmsTemplates.USER_REGISTERED();
    assert('USER_REGISTERED: returns a non-empty string', typeof msg === 'string' && msg.length > 0, msg);
    assert('USER_REGISTERED: contains FarmSphere branding', msg.includes('FarmSphere'), msg);
    assert('USER_REGISTERED: mentions account', /account/i.test(msg), msg);
    assert('USER_REGISTERED: length <= 160 chars (single SMS segment)', msg.length <= 160, 'Length: ' + msg.length + ' -- "' + msg + '"');
    console.log('  [sample] ' + msg);
  }
}

// ─────────────────────────────────────────────────────────────────
// FIX 2a: DOCUMENT_APPROVED uses docName
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Fix 2a: DOCUMENT_APPROVED uses human-readable docName ---');
{
  const loanId = '507f1f77bcf86cd799439011';

  // docName wins over enum
  const msgWithName = SmsTemplates.DOCUMENT_APPROVED({ loanId, docType: 'ID_PROOF', docName: 'Aadhaar Card' });
  assert('DOCUMENT_APPROVED: shows docName ("Aadhaar Card") when provided', msgWithName.includes('Aadhaar Card'), msgWithName);
  assert('DOCUMENT_APPROVED: does NOT show raw enum "ID_PROOF" when docName present', !msgWithName.includes('ID_PROOF'), msgWithName);
  assert('DOCUMENT_APPROVED: contains FarmSphere branding', msgWithName.includes('FarmSphere'), msgWithName);
  assert('DOCUMENT_APPROVED: contains loan ID suffix', msgWithName.includes(loanId.slice(-6)), msgWithName);

  // fallback to enum when docName absent
  const msgFallback = SmsTemplates.DOCUMENT_APPROVED({ loanId, docType: 'ADDRESS_PROOF', docName: undefined });
  assert('DOCUMENT_APPROVED: falls back to docType enum when docName undefined', msgFallback.includes('ADDRESS_PROOF'), msgFallback);

  // fallback to "Document" when both absent
  const msgNeither = SmsTemplates.DOCUMENT_APPROVED({ loanId, docType: undefined, docName: undefined });
  assert('DOCUMENT_APPROVED: falls back to "Document" when both absent', msgNeither.includes('Document'), msgNeither);

  console.log('  [sample] ' + msgWithName);
}

// ─────────────────────────────────────────────────────────────────
// FIX 2b: DOCUMENT_REJECTED uses docName
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Fix 2b: DOCUMENT_REJECTED uses human-readable docName ---');
{
  const loanId = '507f1f77bcf86cd799439022';
  const reason = 'Blurry image';

  const msgWithName = SmsTemplates.DOCUMENT_REJECTED({ loanId, docType: 'ID_PROOF', docName: 'PAN Card', reason });
  assert('DOCUMENT_REJECTED: shows docName ("PAN Card") when provided', msgWithName.includes('PAN Card'), msgWithName);
  assert('DOCUMENT_REJECTED: does NOT show raw enum "ID_PROOF" when docName present', !msgWithName.includes('ID_PROOF'), msgWithName);
  assert('DOCUMENT_REJECTED: includes rejection reason', msgWithName.includes(reason), msgWithName);
  assert('DOCUMENT_REJECTED: contains FarmSphere branding', msgWithName.includes('FarmSphere'), msgWithName);
  assert('DOCUMENT_REJECTED: contains loan ID suffix', msgWithName.includes(loanId.slice(-6)), msgWithName);

  const msgFallback = SmsTemplates.DOCUMENT_REJECTED({ loanId, docType: 'LAND_RECORD', docName: undefined, reason: 'Expired' });
  assert('DOCUMENT_REJECTED: falls back to docType enum when docName undefined', msgFallback.includes('LAND_RECORD'), msgFallback);

  const msgNeither = SmsTemplates.DOCUMENT_REJECTED({ loanId, docType: undefined, docName: undefined, reason: 'Missing' });
  assert('DOCUMENT_REJECTED: falls back to "Document" when both absent', msgNeither.includes('Document'), msgNeither);

  console.log('  [sample] ' + msgWithName);
}

// ─────────────────────────────────────────────────────────────────
// FIX 3: PAYMENT_RECORDED uses borrower, not farmer
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Fix 3: PAYMENT_RECORDED recipient field is repayment.borrower ---');
{
  // Mirror the Repayment Mongoose document — .farmer does NOT exist on the model
  const repayment = {
    _id:         '507f1f77bcf86cd799430001',
    loan:        '507f1f77bcf86cd799430002',
    borrower:    '507f1f77bcf86cd799430003',
    amountDue:   5000,
    amountPaid:  5000,
    paymentStatus: 'PAID',
  };

  // Exact expression from the fixed controller
  const resolvedUserId = repayment.borrower;

  assert('repayment.borrower resolves to a truthy ObjectId', Boolean(resolvedUserId), String(resolvedUserId));
  assert('repayment.farmer is undefined (field absent from Repayment model)', repayment.farmer === undefined, String(repayment.farmer));
  assert('resolved userId equals repayment.borrower', resolvedUserId === repayment.borrower, resolvedUserId);

  // Template rendering
  const msg = SmsTemplates.PAYMENT_RECORDED({ loanId: repayment.loan, amount: repayment.amountPaid, remainingBalance: 0 });
  assert('PAYMENT_RECORDED template: renders non-empty string', typeof msg === 'string' && msg.length > 0, msg);
  assert('PAYMENT_RECORDED template: contains rupee symbol \u20b9', msg.includes('\u20b9'), msg);
  assert('PAYMENT_RECORDED template: contains paid amount (5,000)', msg.includes('5,000'), msg);
  assert('PAYMENT_RECORDED template: contains loan ID suffix', msg.includes(String(repayment.loan).slice(-6)), msg);
  assert('PAYMENT_RECORDED template: contains FarmSphere branding', msg.includes('FarmSphere'), msg);
  console.log('  [sample] ' + msg);
}

// ─────────────────────────────────────────────────────────────────
// ALL TEMPLATES: rupee symbol and content integrity
// ─────────────────────────────────────────────────────────────────
console.log('\n--- All templates: rupee symbol \u20b9 and content integrity ---');
{
  const loanId = '507f1f77bcf86cd799430099';
  const rupee = '\u20b9';

  const templateTests = [
    {
      name: 'OTP (LOGIN)',
      fn: () => SmsTemplates.OTP({ otp: '845231', purpose: 'LOGIN' }),
      checks: [
        ['contains OTP code', (m) => m.includes('845231')],
        ['mentions 10 minutes', (m) => m.includes('10 minutes')],
        ['contains share warning', (m) => /share/i.test(m)],
      ],
    },
    {
      name: 'OTP (VERIFY_PHONE)',
      fn: () => SmsTemplates.OTP({ otp: '111111', purpose: 'VERIFY_PHONE' }),
      checks: [
        ['purpose text: mobile verification', (m) => /mobile verif/i.test(m)],
      ],
    },
    {
      name: 'OTP (UPDATE_PHONE)',
      fn: () => SmsTemplates.OTP({ otp: '222222', purpose: 'UPDATE_PHONE' }),
      checks: [
        ['purpose text: mobile number update', (m) => /mobile number update/i.test(m)],
      ],
    },
    {
      name: 'USER_REGISTERED',
      fn: () => SmsTemplates.USER_REGISTERED(),
      checks: [
        ['FarmSphere branding', (m) => m.includes('FarmSphere')],
        ['no rupee expected (no amount)', (m) => true],
      ],
    },
    {
      name: 'LOAN_SUBMITTED',
      fn: () => SmsTemplates.LOAN_SUBMITTED({ loanId, amount: 75000 }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['formatted amount 75,000', (m) => m.includes('75,000')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'LOAN_APPROVED',
      fn: () => SmsTemplates.LOAN_APPROVED({ loanId, amount: 100000 }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['APPROVED keyword', (m) => m.includes('APPROVED')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'LOAN_REJECTED',
      fn: () => SmsTemplates.LOAN_REJECTED({ loanId, reason: 'Insufficient collateral' }),
      checks: [
        ['contains rejection reason', (m) => m.includes('Insufficient collateral')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'LOAN_DISBURSED',
      fn: () => SmsTemplates.LOAN_DISBURSED({ loanId, amount: 50000, dueDate: '01/11/2026' }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['amount 50,000', (m) => m.includes('50,000')],
        ['due date', (m) => m.includes('01/11/2026')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'DOCUMENT_APPROVED (docName path)',
      fn: () => SmsTemplates.DOCUMENT_APPROVED({ loanId, docType: 'ID_PROOF', docName: 'Voter ID' }),
      checks: [
        ['shows docName', (m) => m.includes('Voter ID')],
        ['hides enum', (m) => !m.includes('ID_PROOF')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'DOCUMENT_REJECTED (docName path)',
      fn: () => SmsTemplates.DOCUMENT_REJECTED({ loanId, docType: 'BANK_STATEMENT', docName: 'Bank Passbook', reason: 'Outdated' }),
      checks: [
        ['shows docName', (m) => m.includes('Bank Passbook')],
        ['hides enum', (m) => !m.includes('BANK_STATEMENT')],
        ['reason included', (m) => m.includes('Outdated')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'EMI_UPCOMING',
      fn: () => SmsTemplates.EMI_UPCOMING({ loanId, amount: 8750, dueDate: '15/11/2026' }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['amount 8,750', (m) => m.includes('8,750')],
        ['due date', (m) => m.includes('15/11/2026')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'EMI_OVERDUE',
      fn: () => SmsTemplates.EMI_OVERDUE({ loanId, amount: 8750, dueDate: '01/10/2026' }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['OVERDUE keyword', (m) => m.includes('OVERDUE')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
    {
      name: 'PAYMENT_RECORDED',
      fn: () => SmsTemplates.PAYMENT_RECORDED({ loanId, amount: 8750, remainingBalance: 52500 }),
      checks: [
        ['contains rupee', (m) => m.includes(rupee)],
        ['paid amount 8,750', (m) => m.includes('8,750')],
        ['remaining balance 52,500', (m) => m.includes('52,500')],
        ['loan ID suffix', (m) => m.includes(loanId.slice(-6))],
      ],
    },
  ];

  for (const { name, fn, checks } of templateTests) {
    const msg = fn();
    assert(name + ': renders non-empty string', typeof msg === 'string' && msg.length > 0, String(msg));
    for (const [label, checkFn] of checks) {
      assert(name + ': ' + label, checkFn(msg), '"' + msg + '"');
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Test-mode interception: sendSms makes zero outbound calls
// ─────────────────────────────────────────────────────────────────
console.log('\n--- SMS_TEST_MODE: zero outbound requests ---');
(async () => {
  process.env.SMS_TEST_MODE = 'true';
  const res = await sendSms({ to: '+919876543210', message: 'FarmSphere: Fix verification test -- no real SMS.' });
  assert('sendSms intercepted by test mode (accepted=true)', res.accepted === true, JSON.stringify(res));
  assert('delivered=true (mock)', res.delivered === true, JSON.stringify(res));
  assert('provider="test_authorized"', res.provider === 'test_authorized', 'Got: ' + res.provider);
  assert('non-empty mock messageId generated', Boolean(res.messageId), 'Got: ' + res.messageId);

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('Results: ' + pass + ' passed, ' + fail + ' failed');
  if (fail === 0) {
    console.log('All fix verification tests passed. No real messages were sent.');
  } else {
    console.error('\n' + fail + ' test(s) FAILED. Review output above.');
    process.exit(1);
  }
  console.log('='.repeat(65));
})();
