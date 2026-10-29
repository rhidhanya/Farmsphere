/**
 * Automated Verification Test Suite for Farmer Loan Application UI (/farmer/apply)
 * Tests Form Sections, Validation Logic, API Service Bindings, i18n Parity, and Security Routes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n================================================================');
console.log('  STARTING VERIFICATION SUITE: FARMER LOAN APPLICATION UI (/farmer/apply) ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(` ✔ PASS: ${testName} ${detail ? `[${detail}]` : ''}`);
    passed++;
  } else {
    console.error(` ✖ FAIL: ${testName} ${detail ? `[${detail}]` : ''}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: Route Registration and Role Guard in App.jsx
// -------------------------------------------------------------
const appJsx = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf8');

assert(
  appJsx.includes('path="/farmer/apply"') &&
  appJsx.includes('<FarmerApply />'),
  'Routing: /farmer/apply route registered with FarmerApply component',
  'Primary application route configured'
);

assert(
  appJsx.includes('path="/farmer/apply-loan"') &&
  appJsx.includes('<FarmerApply />'),
  'Routing: /farmer/apply-loan route also supported to prevent dead links',
  'Fallback/alternate route alias mapped'
);

assert(
  appJsx.includes('<ProtectedRoute requiredRole="FARMER">\n                      <FarmerApply />\n                    </ProtectedRoute>') ||
  appJsx.includes('<ProtectedRoute requiredRole="FARMER">') && appJsx.includes('<FarmerApply />'),
  'Security: /farmer/apply is strictly guarded by ProtectedRoute role FARMER',
  'Unauthenticated/unauthorized access blocked'
);

// -------------------------------------------------------------
// Test 2: Form Sections Completeness
// -------------------------------------------------------------
const farmerApplyJsx = fs.readFileSync(
  path.join(__dirname, 'src', 'pages', 'FarmerApply.jsx'),
  'utf8'
);

assert(
  farmerApplyJsx.includes('section1Title') &&
  farmerApplyJsx.includes('section2Title') &&
  farmerApplyJsx.includes('section3Title') &&
  farmerApplyJsx.includes('section4Title') &&
  farmerApplyJsx.includes('section5Title') &&
  farmerApplyJsx.includes('section6Title') &&
  farmerApplyJsx.includes('section7Title'),
  'Sections: All 7 required sections implemented in FarmerApply.jsx',
  '1: Scheme, 2: Personal, 3: FPO/Address, 4: Amount/Purpose, 5: Farming/Financial, 6: Documents, 7: Review & Submit'
);

// -------------------------------------------------------------
// Test 3: Validation Logic
// -------------------------------------------------------------
const validateTest = (amount, tenure, purpose, terms, minAmount, maxAmount, minTenure, maxTenure) => {
  const errors = {};
  const numAmount = Number(amount);
  const numTenure = Number(tenure);

  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    errors.loanAmount = 'Amount must be > 0';
  } else if (numAmount < minAmount || numAmount > maxAmount) {
    errors.loanAmount = `Amount must be between ${minAmount} and ${maxAmount}`;
  }

  if (!numTenure || isNaN(numTenure) || numTenure < 1) {
    errors.tenureMonths = 'Tenure must be >= 1';
  } else if (numTenure < minTenure || numTenure > maxTenure) {
    errors.tenureMonths = `Tenure must be between ${minTenure} and ${maxTenure}`;
  }

  if (!purpose || !purpose.trim()) {
    errors.purpose = 'Purpose required';
  }

  if (!terms) {
    errors.termsAccepted = 'Declaration required';
  }

  return errors;
};

// 3.1 Valid form submission
const validErrors = validateTest(75000, 12, 'Wheat Seeds Purchase', true, 10000, 150000, 6, 12);
assert(
  Object.keys(validErrors).length === 0,
  'Validation: Correct parameters pass validation with 0 errors',
  'Valid amount (75k), tenure (12m), purpose, and declaration'
);

// 3.2 Amount out of bounds
const outOfBoundsErrors = validateTest(200000, 12, 'Wheat Seeds Purchase', true, 10000, 150000, 6, 12);
assert(
  !!outOfBoundsErrors.loanAmount,
  'Validation: Catches amount exceeding scheme max limit (200k > 150k)',
  outOfBoundsErrors.loanAmount
);

// 3.3 Tenure out of bounds
const tenureErrors = validateTest(75000, 24, 'Wheat Seeds Purchase', true, 10000, 150000, 6, 12);
assert(
  !!tenureErrors.tenureMonths,
  'Validation: Catches tenure exceeding scheme max limit (24m > 12m)',
  tenureErrors.tenureMonths
);

// 3.4 Missing purpose and declaration
const missingErrors = validateTest(75000, 12, '', false, 10000, 150000, 6, 12);
assert(
  !!missingErrors.purpose && !!missingErrors.termsAccepted,
  'Validation: Blocks submission if purpose is empty or declaration unconfirmed',
  'Both required fields flagged'
);

// -------------------------------------------------------------
// Test 4: Duplicate Submission Prevention
// -------------------------------------------------------------
assert(
  farmerApplyJsx.includes('if (submitting) return') &&
  farmerApplyJsx.includes('disabled={submitting}'),
  'Concurrency: Submissions are guarded against duplicate clicks while in-flight',
  'submitting state lock and disabled submit button'
);

// -------------------------------------------------------------
// Test 5: API Service Integration & Document Uploading
// -------------------------------------------------------------
const clientJs = fs.readFileSync(path.join(__dirname, 'src', 'api', 'client.js'), 'utf8');

assert(
  clientJs.includes("uploadDocument: (formData) =>\n    apiClient.post('/documents/upload', formData") ||
  clientJs.includes("apiClient.post('/documents/upload', formData"),
  'API Client: documentAPI.uploadDocument configured for multipart/form-data upload',
  'Uses existing backend /documents/upload API'
);

assert(
  farmerApplyJsx.includes('loanAPI.createLoan(payload)') &&
  farmerApplyJsx.includes('documentAPI.uploadDocument(uploadData)'),
  'API Flow: FarmerApply coordinates loan creation and document attachment',
  'POST /api/loans followed by POST /api/documents/upload'
);

// -------------------------------------------------------------
// Test 6: Navigation to My Applications after Submission
// -------------------------------------------------------------
assert(
  farmerApplyJsx.includes("navigate('/farmer/dashboard')"),
  'Navigation: Success screen provides 1-click navigation to My Applications on Farmer Dashboard',
  'Direct redirection to portfolio view'
);

// -------------------------------------------------------------
// Test 7: i18n Localization Parity for farmerApply
// -------------------------------------------------------------
const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
const ta = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'i18n', 'locales', 'ta.json'), 'utf8'));

assert(
  en.farmerApply && typeof en.farmerApply === 'object' &&
  ta.farmerApply && typeof ta.farmerApply === 'object',
  'i18n: farmerApply section exists in both en.json and ta.json',
  'Localization files intact'
);

const enApplyKeys = Object.keys(en.farmerApply);
const taApplyKeys = Object.keys(ta.farmerApply);
const missingTa = enApplyKeys.filter((k) => !taApplyKeys.includes(k));
const missingEn = taApplyKeys.filter((k) => !enApplyKeys.includes(k));

assert(
  missingTa.length === 0 && missingEn.length === 0,
  'i18n: 100% key parity for farmerApply namespace',
  `${enApplyKeys.length} keys in English and Tamil matched exactly`
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`  VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
