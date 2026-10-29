require('dotenv').config();
const mongoose = require('mongoose');
const { User, Loan, Document } = require('./models');

async function seedTestData() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('No MONGO_URI, skipping seed');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding');

    // Create Farmer 1
    const farmer1Email = 'ramesh.patel@farmer.fpo.org';
    let farmer1 = await User.findOne({ email: farmer1Email });
    if (!farmer1) {
      farmer1 = await User.create({
        name: 'Ramesh Patel',
        email: farmer1Email,
        password: 'Password@123',
        phone: '9998887777', // Unique phone to avoid duplicate
        role: 'FARMER',
        fpoName: 'Green Valley Farmers Producer Co.',
        fpoRegistrationNo: 'FPO-MH-2024-001',
        address: {
          street: 'Main Road',
          village: 'Khed',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '410505',
        },
        kycVerified: true,
        status: 'ACTIVE',
      });
      console.log('✔ Seeded Farmer 1:', farmer1.name);
    }

    // Create Farmer 2
    const farmer2Email = 'sita.devi@farmer.fpo.org';
    let farmer2 = await User.findOne({ email: farmer2Email });
    if (!farmer2) {
      farmer2 = await User.create({
        name: 'Sita Devi',
        email: farmer2Email,
        password: 'Password@123',
        phone: '9997776666', // Unique phone to avoid duplicate
        role: 'FARMER',
        fpoName: 'Green Valley Farmers Producer Co.',
        fpoRegistrationNo: 'FPO-MH-2024-001',
        address: {
          street: 'Station Area',
          village: 'Baramati',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '413102',
        },
        kycVerified: false,
        status: 'ACTIVE',
      });
      console.log('✔ Seeded Farmer 2:', farmer2.name);
    }

    // Create Loan 1 for Farmer 1
    const loan1Exists = await Loan.findOne({ farmer: farmer1._id });
    if (!loan1Exists) {
      const loan1 = await Loan.create({
        farmer: farmer1._id,
        loanAmount: 75000,
        purpose: 'Organic Wheat Seeds & Bio-Fertilizers',
        interestRate: 4,
        tenureMonths: 12,
        repaymentFrequency: 'MONTHLY',
        status: 'UNDER_REVIEW',
        remarks: 'Land 7/12 record verified by local FPO officer.',
      });
      console.log('✔ Seeded Loan 1:', loan1.purpose, '₹' + loan1.loanAmount);

      // Create Document for Loan 1
      await Document.create({
        loan: loan1._id,
        user: farmer1._id,
        documentType: 'LAND_RECORD',
        documentName: 'Khed_7-12_Land_Record.pdf',
        fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/fpo_docs/land_712.pdf',
        status: 'VERIFIED',
      });
      console.log('✔ Seeded Document 1');
    }

    // Create Loan 2 for Farmer 2
    const loan2Exists = await Loan.findOne({ farmer: farmer2._id });
    if (!loan2Exists) {
      const loan2 = await Loan.create({
        farmer: farmer2._id,
        loanAmount: 120000,
        purpose: 'Drip Irrigation Equipment Installation',
        interestRate: 6,
        tenureMonths: 24,
        repaymentFrequency: 'MONTHLY',
        status: 'SUBMITTED',
      });
      console.log('✔ Seeded Loan 2:', loan2.purpose, '₹' + loan2.loanAmount);
    }

    console.log('Seeding completed successfully');
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

seedTestData();
