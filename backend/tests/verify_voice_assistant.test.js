/**
 * FarmSphere Automated Verification Suite: Voice Assistant
 * Tests all 5 categories, Tamil & English processing, DB grounding, tenant isolation,
 * EMI calculations, and SMS eradication.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_voice_assistant';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Document = require('../models/Document');
const LoanProduct = require('../models/LoanProduct');

const {
  detectLanguage,
  classifyIntent,
  calculateEstimatedEMI,
  getFarmerContext,
  generateGroundedResponse,
  processAssistantQuery,
} = require('../services/voiceAssistantService');

async function runVoiceAssistantTests() {
  console.log('================================================================');
  console.log('  FarmSphere Voice Assistant Verification Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB.\n');

    // -------------------------------------------------------------
    // Test 1: Language Detection & Intent Classification
    // -------------------------------------------------------------
    console.log('--- 1. Language Detection & Intent Classification ---');
    assert(detectLanguage('எனது கடன் தொகை எவ்வளவு?') === 'ta', 'Tamil text detected as ta');
    assert(detectLanguage('What is my outstanding balance?') === 'en', 'English text detected as en');
    assert(detectLanguage('', 'ta') === 'ta', 'Fallback to preferred language ta');

    assert(classifyIntent('எனது நிலுவைத் தொகை எவ்வளவு?') === 'LOAN_BALANCE', 'Classified Tamil loan balance query');
    assert(classifyIntent('what is my outstanding balance?') === 'LOAN_BALANCE', 'Classified English loan balance query');
    assert(classifyIntent('அடுத்த தவணை எப்போது?') === 'REPAYMENT_DUE', 'Classified Tamil next installment query');
    assert(classifyIntent('when is my next emi due date?') === 'REPAYMENT_DUE', 'Classified English next installment query');
    assert(classifyIntent('விண்ணப்ப நிலை என்ன?') === 'APPLICATION_STATUS', 'Classified Tamil application status query');
    assert(classifyIntent('status of my application') === 'APPLICATION_STATUS', 'Classified English application status query');
    assert(classifyIntent('KYC நிலை என்ன?') === 'KYC_STATUS', 'Classified Tamil KYC status query');
    assert(classifyIntent('what is my kyc verification status?') === 'KYC_STATUS', 'Classified English KYC status query');
    assert(classifyIntent('விடுபட்ட ஆவணங்கள் என்ன?') === 'MISSING_DOCUMENTS', 'Classified Tamil missing documents query');
    assert(classifyIntent('what are missing documents?') === 'MISSING_DOCUMENTS', 'Classified English missing documents query');
    assert(classifyIntent('எனக்கு ஏற்ற கடன் திட்டங்கள் எவை?') === 'SCHEME_RECOMMENDATIONS', 'Classified Tamil scheme recommendation query');
    assert(classifyIntent('recommend loan schemes') === 'SCHEME_RECOMMENDATIONS', 'Classified English scheme recommendation query');

    // -------------------------------------------------------------
    // Test 2: EMI Calculation Helper
    // -------------------------------------------------------------
    console.log('\n--- 2. Mathematical Precision: EMI Calculation ---');
    const emi1 = calculateEstimatedEMI(100000, 12, 12);
    // P=100000, r=0.01, n=12 -> EMI approx 8885
    assert(emi1 >= 8880 && emi1 <= 8890, `EMI calculated correctly: ₹${emi1} for 100k @ 12% for 12 mos`);
    const emiZeroRate = calculateEstimatedEMI(120000, 0, 12);
    assert(emiZeroRate === 10000, `0% rate EMI matches principal/tenure: ₹${emiZeroRate}`);

    // -------------------------------------------------------------
    // Seed Data: Farmer A & Farmer B
    // -------------------------------------------------------------
    console.log('\n--- 3. Database Grounding & Seed Setup ---');
    const farmerA = await User.create({
      name: 'Muthukumar S',
      email: 'muthu@farmsphere.test',
      phone: '9876543210',
      password: 'TestPassword123!',
      role: 'FARMER',
      kycStatus: 'VERIFIED',
      kycVerified: true,
      aadhaarMasked: 'XXXXXXXX1234',
      panMasked: 'ABCDE1234F',
    });

    const farmerB = await User.create({
      name: 'Ramasamy K',
      email: 'ramasamy@farmsphere.test',
      phone: '9876500000',
      password: 'TestPassword123!',
      role: 'FARMER',
      kycStatus: 'PENDING',
      kycVerified: false,
    });

    // Create loan catalog products
    const productCrop = await LoanProduct.create({
      slugId: 'kccs-01',
      name: 'Kisan Crop Credit Scheme',
      code: 'KCCS-01',
      description: 'Short-term credit for seasonal crop cultivation and inputs',
      category: 'CROP',
      minAmount: 10000,
      maxAmount: 200000,
      interestRate: 7.0,
      minTenure: 6,
      maxTenure: 24,
      defaultTenure: 12,
      repaymentFrequency: 'MONTHLY',
      requiredDocuments: [{ type: 'ID_PROOF', title: 'Aadhaar / ID Proof' }],
      status: 'ACTIVE',
      acceptingApplications: true,
    });

    const productDairy = await LoanProduct.create({
      slugId: 'dcdl-02',
      name: 'Dairy Cattle Development Loan',
      code: 'DCDL-02',
      description: 'Term loan for milch animal purchase and shed construction',
      category: 'DAIRY',
      minAmount: 50000,
      maxAmount: 300000,
      interestRate: 9.5,
      minTenure: 12,
      maxTenure: 60,
      defaultTenure: 36,
      repaymentFrequency: 'MONTHLY',
      requiredDocuments: [{ type: 'ID_PROOF', title: 'ID Proof' }],
      status: 'ACTIVE',
      acceptingApplications: true,
    });

    // Seed Farmer A: Disbursed loan of ₹1,00,000, repaid ₹30,000, balance ₹70,000
    const loanA1 = await Loan.create({
      farmer: farmerA._id,
      loanProductId: productCrop._id,
      loanAmount: 100000,
      disbursedAmount: 100000,
      interestRate: 7.0,
      tenureMonths: 12,
      purpose: 'Paddy seed and fertilizer purchase',
      status: 'DISBURSED',
      repaymentFrequency: 'MONTHLY',
      disbursementDate: new Date('2026-09-01'),
      repaymentSchedule: [
        {
          installmentNumber: 1,
          dueDate: new Date('2026-10-01'),
          amount: 8653,
          principalAmount: 8070,
          interestAmount: 583,
          status: 'PAID',
        },
        {
          installmentNumber: 2,
          dueDate: new Date('2026-11-01'),
          amount: 8653,
          principalAmount: 8117,
          interestAmount: 536,
          status: 'PENDING',
        },
      ],
    });

    await Repayment.create({
      loan: loanA1._id,
      borrower: farmerA._id,
      installmentNumber: 1,
      amountDue: 8653,
      amountPaid: 30000,
      dueDate: new Date('2026-10-01'),
      paidDate: new Date('2026-10-15'),
      paymentStatus: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'UTR20261015001',
    });

    await Repayment.create({
      loan: loanA1._id,
      borrower: farmerA._id,
      installmentNumber: 2,
      amountDue: 8653,
      amountPaid: 0,
      dueDate: new Date('2026-11-01'),
      paymentStatus: 'PENDING',
    });

    // Seed Farmer A's uploaded documents
    await Document.create({
      user: farmerA._id,
      loan: loanA1._id,
      documentType: 'ID_PROOF',
      documentName: 'Aadhaar Card',
      fileUrl: '/uploads/aadhaar.pdf',
      status: 'VERIFIED',
    });

    // Seed Farmer B: Submitted application for ₹50,000, no repayment
    const loanB1 = await Loan.create({
      farmer: farmerB._id,
      loanProductId: productCrop._id,
      loanAmount: 50000,
      interestRate: 7.0,
      tenureMonths: 12,
      purpose: 'Vegetable cultivation',
      status: 'SUBMITTED',
      repaymentFrequency: 'MONTHLY',
    });

    assert(farmerA._id && farmerB._id, 'Farmers and loan records seeded successfully');

    // -------------------------------------------------------------
    // Test 4: Category 1 — Loan Balance & Repayment Info
    // -------------------------------------------------------------
    console.log('\n--- 4. Category 1: Loan & Repayment Information ---');
    const balanceTamil = await processAssistantQuery({
      farmerId: farmerA._id,
      query: 'எனது கடன் நிலுவைத் தொகை எவ்வளவு?',
      language: 'ta',
    });

    assert(balanceTamil.intent === 'LOAN_BALANCE', 'Intent correctly identified as LOAN_BALANCE');
    assert(balanceTamil.reply.includes('₹70,000'), `Tamil reply contains exact outstanding balance ₹70,000`);
    assert(balanceTamil.reply.includes('₹30,000'), `Tamil reply mentions paid amount ₹30,000`);
    assert(balanceTamil.audioText.length > 0, `Audio text generated for Tamil TTS`);

    const balanceEnglish = await processAssistantQuery({
      farmerId: farmerA._id,
      query: 'How much loan balance is left to pay?',
      language: 'en',
    });
    assert(balanceEnglish.reply.includes('₹70,000'), `English reply contains exact balance ₹70,000`);
    assert(balanceEnglish.reply.includes('₹30,000'), `English reply contains repaid ₹30,000`);

    const nextEmiQuery = await processAssistantQuery({
      farmerId: farmerA._id,
      query: 'அடுத்த தவணை எப்போது செலுத்த வேண்டும்?',
      language: 'ta',
    });
    assert(nextEmiQuery.intent === 'REPAYMENT_DUE', 'Next installment intent matched');
    assert(nextEmiQuery.reply.includes('₹8,653'), `Tamil reply gives scheduled next EMI ₹8,653`);
    assert(nextEmiQuery.reply.includes('01/11/2026') || nextEmiQuery.reply.includes('2026'), `Next EMI date included`);

    // -------------------------------------------------------------
    // Test 5: Category 2 — Loan Application Status
    // -------------------------------------------------------------
    console.log('\n--- 5. Category 2: Loan Application Status ---');
    const statusB = await processAssistantQuery({
      farmerId: farmerB._id,
      query: 'What is the status of my loan application?',
      language: 'en',
    });
    assert(statusB.intent === 'APPLICATION_STATUS', 'Application status intent matched');
    assert(statusB.reply.includes('SUBMITTED') || statusB.reply.includes('Submitted'), 'Status shows SUBMITTED');
    assert(statusB.reply.includes('₹50,000'), 'Mentions requested amount ₹50,000');

    // -------------------------------------------------------------
    // Test 6: Category 3 — KYC & Missing Documents
    // -------------------------------------------------------------
    console.log('\n--- 6. Category 3: Missing Documents & KYC Status ---');
    const kycA = await processAssistantQuery({
      farmerId: farmerA._id,
      query: 'எனது KYC நிலை என்ன?',
      language: 'ta',
    });
    assert(kycA.reply.includes('சரிபார்க்கப்பட்டது') || kycA.reply.includes('VERIFIED'), 'Farmer A KYC is verified in Tamil');

    const kycB = await processAssistantQuery({
      farmerId: farmerB._id,
      query: 'What is my KYC status?',
      language: 'en',
    });
    assert(kycB.reply.includes('Pending') || kycB.reply.includes('PENDING'), 'Farmer B KYC shows pending in English');

    // -------------------------------------------------------------
    // Test 7: Category 4 — Scheme Recommendations
    // -------------------------------------------------------------
    console.log('\n--- 7. Category 4: Scheme Recommendations ---');
    const schemesTamil = await processAssistantQuery({
      farmerId: farmerA._id,
      query: 'எனக்கு ஏற்ற கடன் திட்டங்களை பரிந்துரைக்கவும்',
      language: 'ta',
    });
    assert(schemesTamil.intent === 'SCHEME_RECOMMENDATIONS', 'Scheme intent matched');
    assert(schemesTamil.reply.includes('Kisan Crop Credit Scheme'), 'Lists Kisan Crop Credit Scheme');
    assert(schemesTamil.reply.includes('7%') || schemesTamil.reply.includes('7.0%'), 'Includes interest rate 7%');
    assert(schemesTamil.reply.includes('மாத தவணை') || schemesTamil.reply.includes('EMI'), 'Includes estimated EMI info');

    // -------------------------------------------------------------
    // Test 8: Tenant Isolation & Data Privacy
    // -------------------------------------------------------------
    console.log('\n--- 8. Strict Tenant Isolation ---');
    // Farmer B asking for loan balance should see 0 active loans / no balance, NOT Farmer A's ₹70,000
    const isolationTest = await processAssistantQuery({
      farmerId: farmerB._id,
      query: 'What is my loan balance?',
      language: 'en',
    });
    assert(!isolationTest.reply.includes('₹70,000'), 'Farmer B CANNOT see Farmer A balance ₹70,000');
    assert(!isolationTest.reply.includes('Muthukumar'), 'Farmer B response does NOT contain Farmer A name');

    // Check Aadhaar/PAN privacy: full Aadhaar should never be returned
    assert(!JSON.stringify(kycA).includes('987654321012'), 'Full Aadhaar number is never exposed');

    // -------------------------------------------------------------
    // Test 9: Complete SMS Eradication Verification
    // -------------------------------------------------------------
    console.log('\n--- 9. Complete SMS Eradication Check ---');
    const userDoc = await User.findById(farmerA._id).lean();
    assert(userDoc.smsConsent === undefined, 'smsConsent removed from User schema');
    assert(userDoc.notificationPreferences?.sms === undefined, 'sms removed from notificationPreferences');
    assert(userDoc.notificationPreferences?.email === true, 'email notification preference preserved');

    let twilioFound = false;
    try {
      require.resolve('twilio');
      twilioFound = true;
    } catch {
      twilioFound = false;
    }
    assert(!twilioFound, 'twilio npm package is completely uninstalled');

  } catch (err) {
    console.error('Test run failed with error:', err);
    assert(false, `Unexpected test failure: ${err.message}`);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }

  console.log('\n================================================================');
  console.log(`  Tests Completed: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runVoiceAssistantTests();
