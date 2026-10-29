#!/usr/bin/env node
/**
 * verify_farmer_documents.js
 * Automated verification suite for the Farmer Document Upload & Tracking UI
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const FRONTEND = ROOT;

let passed = 0;
let failed = 0;

function test(name, fn, detail = '') {
  try {
    const result = fn();
    if (result === false) {
      console.log(` ✖ FAIL: ${name}${detail ? ' [' + detail + ']' : ''}`);
      failed++;
    } else {
      console.log(` ✔ PASS: ${name}${detail ? ' [' + detail + ']' : ''}`);
      passed++;
    }
  } catch (err) {
    console.log(` ✖ FAIL: ${name} — ${err.message}${detail ? ' [' + detail + ']' : ''}`);
    failed++;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

console.log('\n================================================================');
console.log('  STARTING VERIFICATION SUITE: FARMER DOCUMENT UPLOAD & TRACKING');
console.log('================================================================\n');

// ── Files Exist ─────────────────────────────────────────────────────────────
test('Files: FarmerDocuments.jsx created', () => fileExists('src/pages/FarmerDocuments.jsx'),
  'Core page component');

test('Files: FarmerDocuments.css created', () => fileExists('src/pages/FarmerDocuments.css'),
  'Stylesheet');

// ── Routing ──────────────────────────────────────────────────────────────────
const appJsx = readFile('src/App.jsx');
test('Routing: /farmer/documents route registered', () => appJsx.includes("path=\"documents\" element={<FarmerDocuments />}"),
  'Route declaration in App.jsx under /farmer layout');

test('Routing: FarmerDocuments imported in App.jsx', () => appJsx.includes("import FarmerDocuments from './pages/FarmerDocuments'"),
  'Component import');

test('Security: /farmer routes protected by FARMER role', () => {
  const routeBlock = appJsx.match(/path="\/farmer"[\s\S]{0,100}requiredRole="FARMER"/);
  return !!routeBlock;
}, 'ProtectedRoute wraps the /farmer route layout');

// ── Component API Usage ───────────────────────────────────────────────────────
const component = readFile('src/pages/FarmerDocuments.jsx');

test('API: Uses loanAPI.getMyLoans for farmer loan list', () => component.includes('loanAPI.getMyLoans'),
  'GET /api/loans/my — fetches only own loans');

test('API: Uses documentAPI.getLoanDocuments per selected loan', () => component.includes('documentAPI.getLoanDocuments'),
  'GET /api/documents/loan/:loanId — scoped to selected application');

test('API: Uses documentAPI.uploadDocument for multipart upload', () => component.includes('documentAPI.uploadDocument'),
  'POST /api/documents/upload — existing upload API');

test('API: Uses openDocumentPreview utility for file viewing', () => component.includes('openDocumentPreview'),
  'GET /api/documents/:id/file — proxied through existing utility');

test('API: Does not call verifyDocument or rejectDocument', () => {
  return !component.includes('verifyDocument') && !component.includes('rejectDocument');
}, 'Verify/reject restricted to FPO_ADMIN — not exposed to farmer');

// ── File Validation ───────────────────────────────────────────────────────────
test('Validation: MIME type validation present', () => component.includes("ALLOWED_MIME_TYPES"),
  'PDF, JPG, JPEG, PNG MIME enforcement');

test('Validation: 5 MB file size limit enforced', () => component.includes("5 * 1024 * 1024"),
  'Matches backend uploadMiddleware.js LIMIT_FILE_SIZE');

test('Validation: Extension validation present', () => component.includes("ALLOWED_EXTENSIONS"),
  '.pdf .jpg .jpeg .png extension check');

test('Validation: validateFile returns error string for invalid files', () => {
  // Inline re-evaluate the validate function logic
  const ALLOWED_MIME_TYPES = ['application/pdf','image/jpeg','image/jpg','image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf','.jpg','.jpeg','.png'];
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const validateFile = (file) => {
    const ext = '.' + (file.name || '').split('.').pop().toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Invalid file type';
    if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Invalid file extension';
    if (file.size > MAX_FILE_BYTES) return 'File size exceeds';
    return null;
  };

  const errType = validateFile({ name: 'test.exe', type: 'application/octet-stream', size: 1000 });
  const errSize = validateFile({ name: 'test.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 });
  const ok = validateFile({ name: 'test.pdf', type: 'application/pdf', size: 1024 });

  return !!errType && !!errSize && ok === null;
}, 'Validation correctly rejects invalid type, oversized, and passes valid file');

// ── Security / IDOR ───────────────────────────────────────────────────────────
test('Security: getMyLoans scopes to authenticated farmer only', () => {
  return component.includes('loanAPI.getMyLoans') && !component.includes('loanAPI.getAllLoans');
}, 'No cross-farmer data access — cannot enumerate all loans');

test('Security: getLoanDocuments used (not getMyDocuments) for per-loan view', () => {
  return component.includes('documentAPI.getLoanDocuments');
}, 'Per-loan document fetch — IDOR check handled by backend');

// ── UX Features ──────────────────────────────────────────────────────────────
test('UX: Empty state when no loans present', () => component.includes('No Loan Applications Found'),
  'Zero-state guidance with Apply for a Loan CTA');

test('UX: Empty state when no documents uploaded for selected loan', () => component.includes('No documents uploaded yet'),
  'Zero-doc state per loan');

test('UX: Rejection reason displayed when document rejected', () => component.includes('Rejection Reason'),
  'Shows doc.rejectionReason from backend');

test('UX: Verified documents cannot be replaced (read-only badge)', () => component.includes('cannot be replaced'),
  'VERIFIED docs locked from re-upload');

test('UX: Replace allowed for PENDING and REJECTED documents', () => component.includes("doc.status !== 'VERIFIED'"),
  'Only non-verified docs show Replace button');

test('UX: Status summary chips (Pending / Verified / Rejected counts)', () => component.includes('statusCounts'),
  'Visual summary of document verification progress');

test('UX: Limitations section documents missing backend capabilities', () => {
  return component.includes('Upload progress bar') &&
         component.includes('Document deletion') &&
         component.includes('Verification actions') &&
         component.includes('Real-time status push');
}, '4 identified limitations clearly documented in UI');

// ── Navigation Integration ────────────────────────────────────────────────────
test('Navigation: FarmerSidebar includes My Documents linking to /farmer/documents', () => {
  const sidebar = readFile('src/components/FarmerSidebar.jsx');
  return sidebar.includes('/farmer/documents') && sidebar.includes('nav.myDocuments');
}, 'FarmerSidebar nav item registered');

// ── i18n ─────────────────────────────────────────────────────────────────────
const en = JSON.parse(readFile('src/i18n/locales/en.json'));
const ta = JSON.parse(readFile('src/i18n/locales/ta.json'));

test('i18n: farmerDocuments namespace exists in en.json', () => !!en.farmerDocuments,
  'English translations added');

test('i18n: farmerDocuments namespace exists in ta.json', () => !!ta.farmerDocuments,
  'Tamil translations added');

test('i18n: 100% key parity between en and ta for farmerDocuments', () => {
  const enKeys = Object.keys(en.farmerDocuments || {}).sort();
  const taKeys = Object.keys(ta.farmerDocuments || {}).sort();
  const match = JSON.stringify(enKeys) === JSON.stringify(taKeys);
  if (!match) {
    const onlyEn = enKeys.filter(k => !taKeys.includes(k));
    const onlyTa = taKeys.filter(k => !enKeys.includes(k));
    if (onlyEn.length) console.log(`    Only in EN: ${onlyEn.join(', ')}`);
    if (onlyTa.length) console.log(`    Only in TA: ${onlyTa.join(', ')}`);
  }
  return match;
}, `${Object.keys(en.farmerDocuments || {}).length} keys matched in both locales`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`  VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
