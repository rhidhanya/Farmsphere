#!/usr/bin/env node
/**
 * seed_loan_products.js
 * ─────────────────────
 * Idempotent seeder: creates the 15 FarmSphere loan-product catalog entries.
 * Running it multiple times is safe — it uses slugId as the upsert key so no
 * duplicates are ever created.
 *
 * Usage:
 *   node backend/seed_loan_products.js
 *
 * Requires MONGODB_URI and JWT_SECRET in backend/.env (or the environment).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const LoanProduct = require('./models/LoanProduct');

// ── Catalog data ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── 1. Crop Production & Seasonal Credit ──────────────────────────────────
  {
    slugId: 'crop-production',
    code: 'CROP-PROD',
    name: 'Seasonal Crop Production & Input Loan',
    category: 'Crop Inputs & Seasonal Credit',
    icon: 'Wheat',
    purpose: 'Organic Wheat Seeds & Bio-Fertilizers Purchase',
    description:
      'Short-term agricultural working capital credit designed for small and marginal farmers to purchase certified high-yield seeds, bio-fertilizers, organic pesticides, micro-nutrients, and essential seasonal cultivation inputs.',
    minAmount: 10000,
    maxAmount: 150000,
    defaultAmount: 75000,
    interestRate: 4.0,
    minTenure: 6,
    maxTenure: 12,
    defaultTenure: 12,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'SEASONAL', 'BULLET'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Current Kharif & Rabi Sowing Seasons',
    badge: 'Low Interest (4.0% p.a.)',
    whoCanApply:
      'Small, marginal, and tenant farmers with cultivable agricultural land affiliated with the FPO.',
    eligibilityCriteria: [
      'Active registered member of the FPO in good standing',
      'Cultivable agricultural landholding (min 0.5 acre) or verified tenancy agreement',
      'Identity & KYC profile verified with FPO administrator',
      'No active defaults or overdue installments from previous agricultural seasons',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Land 7/12 Record / Patta Passbook', description: 'Latest land title record or registered tenancy agreement showing cultivable area.' },
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo identification (Aadhaar Card or Voter ID).' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Share Certificate', description: 'Proof of active shareholding and registered farmer membership in the FPO.' },
      { type: 'BANK_STATEMENT', title: 'Bank Account Passbook / Statement', description: 'Bank passbook copy or 6-month statement showing active savings account.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 2. Irrigation & Water Infrastructure ──────────────────────────────────
  {
    slugId: 'micro-irrigation',
    code: 'IRRIG-INFRA',
    name: 'Solar Micro-Irrigation & Water Infrastructure',
    category: 'Micro-Irrigation & Water',
    icon: 'Droplets',
    purpose: 'Solar Drip Irrigation Equipment Installation',
    description:
      'Medium-term capital financing for installing high-efficiency drip irrigation networks, micro-sprinklers, solar water pumping systems, and farm pond conveyance pipelines to enhance water efficiency and climate resilience.',
    minAmount: 50000,
    maxAmount: 300000,
    defaultAmount: 100000,
    interestRate: 6.0,
    minTenure: 12,
    maxTenure: 24,
    defaultTenure: 18,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open Year-Round (Water Conservation Priority)',
    badge: 'Climate Resilient',
    whoCanApply:
      'Farmers with dedicated irrigation water sources seeking micro-irrigation and solar pumping adoption.',
    eligibilityCriteria: [
      'Active FPO member with minimum 1 acre cultivable landholding',
      'Documented water access (open well, borewell, canal outlet, or farm pond)',
      'Farmer KYC verified by FPO administration',
      'Cost quotation or proforma invoice from an authorized irrigation equipment provider',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Land Record with Water Source Entry', description: '7/12 extract or title deed confirming operational irrigation well or borewell.' },
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID (Aadhaar Card or Voter ID).' },
      { type: 'ADDRESS_PROOF', title: 'Address & Residence Proof', description: 'Electricity bill, agricultural power connection receipt, or ration card.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Proof of active farmer member registration in the FPO.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: 'Recent 6-month bank statement with active transaction history.' },
      { type: 'OTHER', title: 'Equipment Vendor Quotation', description: 'Itemized quotation from an authorized drip irrigation or solar pump dealer.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 3. Farm Machinery & Equipment ─────────────────────────────────────────
  {
    slugId: 'farm-machinery',
    code: 'FARM-EQUIP',
    name: 'Farm Machinery & Equipment Finance',
    category: 'Farm Machinery & Equipment',
    icon: 'Tractor',
    purpose: 'Tractor Attachments & Soil Testing Gear',
    description:
      'Asset-backed financing for acquiring, upgrading, or repairing essential agricultural mechanization implements including rotavators, power tillers, multi-crop threshers, precision seeders, and tractor attachments.',
    minAmount: 30000,
    maxAmount: 250000,
    defaultAmount: 85000,
    interestRate: 5.5,
    minTenure: 12,
    maxTenure: 36,
    defaultTenure: 24,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Farm Mechanization Program',
    badge: 'Asset Backed',
    whoCanApply:
      'Individual agricultural producers seeking mechanization tools to reduce crop production labor costs.',
    eligibilityCriteria: [
      'Continuous FPO membership for minimum 6 months in good standing',
      'Demonstrated operational farm with recurring seasonal mechanization needs',
      'KYC verified farmer member profile',
      'Proforma invoice or official price estimate from registered equipment dealer',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or Voter ID card.' },
      { type: 'ADDRESS_PROOF', title: 'Residence Proof', description: 'Ration card, domicile certificate, or utility bill.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Share Certificate', description: 'Official member certificate issued by the FPO management.' },
      { type: 'BANK_STATEMENT', title: 'Bank Account Passbook', description: 'Passbook copy showing account details and IFSC.' },
      { type: 'OTHER', title: 'Dealer Machinery Quotation', description: 'Formal equipment quotation or repair overhaul estimate from authorized dealer.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 4. Protected Cultivation & Polyhouse ──────────────────────────────────
  {
    slugId: 'polyhouse-horticulture',
    code: 'HORT-POLY',
    name: 'Polyhouse & Protected Cultivation Credit',
    category: 'Protected Cultivation / Polyhouse',
    icon: 'Sprout',
    purpose: 'Polyhouse Net Installation & Micro-Sprinklers',
    description:
      'Specialized credit facility for controlled-environment agriculture, including naturally ventilated polyhouses, shaded net structures, micro-misting systems, and nursery raising setups for high-value vegetables and floriculture.',
    minAmount: 100000,
    maxAmount: 500000,
    defaultAmount: 150000,
    interestRate: 7.0,
    minTenure: 18,
    maxTenure: 36,
    defaultTenure: 24,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Next Agricultural Cycle',
    badge: 'High Value',
    whoCanApply:
      'Progressive farmers transitioning to climate-controlled horticulture or floriculture crops.',
    eligibilityCriteria: [
      'Minimum 0.5 acre clear-title landholding suitable for structure fabrication',
      'Active FPO membership with verified KYC profile',
      'Prior crop cultivation record or completion of FPO protected farming orientation',
      'Technical feasibility clearance from FPO Field Agricultural Officer',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Clear Title 7/12 Land Record', description: 'Official land record verifying undisputed ownership and boundary demarcation.' },
      { type: 'ID_PROOF', title: 'Government Identity Proof', description: 'Aadhaar Card or Voter ID.' },
      { type: 'ADDRESS_PROOF', title: 'Residential Proof', description: 'Electricity bill or ration card.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'FPO share certificate and membership ID.' },
      { type: 'BANK_STATEMENT', title: '6-Month Bank Statement', description: 'Detailed bank statement from an authorized commercial or cooperative bank.' },
      { type: 'FINANCIAL_REPORT', title: 'Projected Crop Income Statement', description: 'Estimated seasonal harvest yield and revenue projections for protected crop.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 5. Post-Harvest Storage & Marketing ───────────────────────────────────
  {
    slugId: 'post-harvest',
    code: 'POST-HARVEST',
    name: 'Post-Harvest Storage & Produce Marketing Credit',
    category: 'Post-Harvest & Storage',
    icon: 'Warehouse',
    purpose: 'Crop Cold Storage & Grain Packaging',
    description:
      'Warehouse receipt pledge financing and short-term liquidity against harvested agricultural commodities, allowing farmers to store produce safely in FPO-managed warehouses or cold chains and avoid distressed sales.',
    minAmount: 20000,
    maxAmount: 150000,
    defaultAmount: 50000,
    interestRate: 5.0,
    minTenure: 3,
    maxTenure: 12,
    defaultTenure: 6,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'BULLET'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Post-Harvest Marketing Window',
    badge: 'Harvest Pledge',
    whoCanApply:
      'Farmers with harvested grains, pulses, or horticultural produce deposited in FPO accredited storage.',
    eligibilityCriteria: [
      'Produce deposited in FPO collection center, accredited warehouse, or cold store',
      'Active FPO member with verified KYC profile',
      'Valid warehouse storage receipt or commodity deposit voucher',
      'Quality grading certificate signed by FPO storage manager',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or official photo ID.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Member Certificate', description: 'Proof of active membership in the Farmer Producer Organization.' },
      { type: 'BANK_STATEMENT', title: 'Bank Passbook Copy', description: 'Bank passbook copy with account details.' },
      { type: 'OTHER', title: 'Warehouse Deposit Receipt / Voucher', description: 'Official commodity deposit acknowledgement voucher showing quantity and grade.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 6. Dairy Farming ──────────────────────────────────────────────────────
  {
    slugId: 'dairy-farming',
    code: 'DAIRY-FARM',
    name: 'Dairy Farming & Livestock Credit',
    category: 'Dairy Farming',
    icon: 'Milk',
    purpose: 'Purchase of milch cattle, fodder and dairy equipment',
    description:
      'Medium-term credit for establishing or expanding dairy enterprises, covering the purchase of high-yield milch cattle (HF/Sahiwal), cattle shed construction, fodder cultivation, and milk chilling equipment.',
    minAmount: 50000,
    maxAmount: 300000,
    defaultAmount: 150000,
    interestRate: 5.5,
    minTenure: 12,
    maxTenure: 36,
    defaultTenure: 24,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Livestock Finance Program',
    badge: 'Livestock Credit',
    whoCanApply:
      'FPO-affiliated farmers with existing or planned dairy operations and adequate fodder resources.',
    eligibilityCriteria: [
      'Active FPO membership in good standing',
      'Adequate land or shed infrastructure for cattle housing',
      'Access to fodder supply or cultivable fodder land',
      'KYC verified by FPO administration',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID (Aadhaar or Voter ID).' },
      { type: 'ADDRESS_PROOF', title: 'Residence Proof', description: 'Ration card or utility bill.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Active share certificate from the FPO.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
      { type: 'OTHER', title: 'Livestock Vendor Quotation', description: 'Purchase quote or bill from registered livestock dealer.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 7. Poultry Farming ────────────────────────────────────────────────────
  {
    slugId: 'poultry-farming',
    code: 'POULTRY-FARM',
    name: 'Poultry Farming & Shed Construction Credit',
    category: 'Poultry Farming',
    icon: 'Bird',
    purpose: 'Poultry shed construction, birds and feed procurement',
    description:
      'Short-to-medium-term credit for setting up or expanding broiler/layer poultry units, covering shed construction, purchase of day-old chicks, feed procurement, and veterinary equipment.',
    minAmount: 40000,
    maxAmount: 250000,
    defaultAmount: 100000,
    interestRate: 6.0,
    minTenure: 12,
    maxTenure: 30,
    defaultTenure: 18,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Allied Agriculture Program',
    badge: 'Allied Agri',
    whoCanApply:
      'FPO-affiliated farmers with space for poultry shed and access to feed and veterinary support.',
    eligibilityCriteria: [
      'Active FPO membership',
      'Land or leased space for poultry unit construction',
      'KYC verified farmer profile',
      'Willingness to participate in FPO-managed poultry buyback or marketing program',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or Voter ID.' },
      { type: 'ADDRESS_PROOF', title: 'Residence Proof', description: 'Utility bill or ration card.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Valid FPO share certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month transaction statement.' },
      { type: 'OTHER', title: 'Shed Construction Estimate', description: 'Cost estimate for poultry shed from civil contractor.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 8. Goat & Sheep Rearing ───────────────────────────────────────────────
  {
    slugId: 'goat-sheep-rearing',
    code: 'GOAT-SHEEP',
    name: 'Goat & Sheep Rearing Credit',
    category: 'Goat and Sheep Rearing',
    icon: 'Mountain',
    purpose: 'Purchase of small ruminants and shed infrastructure',
    description:
      'Credit facility for small ruminant (goat and sheep) rearing enterprises covering purchase of breeding stock, shed construction, feed, healthcare, and marketing linkage through FPO aggregation.',
    minAmount: 25000,
    maxAmount: 200000,
    defaultAmount: 80000,
    interestRate: 5.8,
    minTenure: 12,
    maxTenure: 24,
    defaultTenure: 12,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Small Ruminant Livelihood Program',
    badge: 'Livelihood Credit',
    whoCanApply:
      'Small and marginal farmers supplementing income through goat or sheep rearing allied to crop farming.',
    eligibilityCriteria: [
      'Active FPO membership',
      'Grazing land access or shed space (owned or leased)',
      'KYC verified by FPO administration',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Active share certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
      { type: 'OTHER', title: 'Livestock Purchase Quotation', description: 'Quote from registered livestock supplier or haat market receipt.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 9. Fisheries & Aquaculture ────────────────────────────────────────────
  {
    slugId: 'fisheries-aquaculture',
    code: 'FISH-AQUA',
    name: 'Fisheries & Aquaculture Development Credit',
    category: 'Fisheries and Aquaculture',
    icon: 'Fish',
    purpose: 'Pond construction, fish seed, feed and nets',
    description:
      'Capital and working-capital credit for inland fisheries and aquaculture enterprises, covering freshwater pond excavation or lining, fish seed procurement, feed, aerators, and harvesting equipment.',
    minAmount: 60000,
    maxAmount: 350000,
    defaultAmount: 180000,
    interestRate: 6.2,
    minTenure: 12,
    maxTenure: 36,
    defaultTenure: 24,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Blue Economy Program',
    badge: 'Blue Economy',
    whoCanApply:
      'Farmers or fisherfolk with access to water bodies, ponds, or land for pond construction affiliated to FPO.',
    eligibilityCriteria: [
      'Active FPO membership',
      'Verified access to perennial water source or existing pond site',
      'KYC verified farmer or fisherfolk profile',
      'No outstanding default on prior FPO loans',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or Voter ID.' },
      { type: 'LAND_RECORD', title: 'Land / Water Body Record', description: 'Land record or fishing lease agreement confirming access to pond or water body.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Valid membership certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month statement.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 10. Coconut Plantation Development ───────────────────────────────────
  {
    slugId: 'coconut-plantation',
    code: 'COCONUT-PLN',
    name: 'Coconut Plantation Development Credit',
    category: 'Coconut Plantation Development',
    icon: 'TreePine',
    purpose: 'Establishing and maintaining coconut plantations',
    description:
      'Long-term plantation credit for establishing new coconut gardens, replanting senile palms, soil-nutrient management, drip irrigation installation, and intercrop cultivation in coconut plots.',
    minAmount: 80000,
    maxAmount: 400000,
    defaultAmount: 200000,
    interestRate: 6.5,
    minTenure: 24,
    maxTenure: 48,
    defaultTenure: 36,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Plantation Crop Program',
    badge: 'Plantation Credit',
    whoCanApply:
      'Farmers with suitable coastal or inland land for coconut cultivation, affiliated with FPO.',
    eligibilityCriteria: [
      'Active FPO membership',
      'Minimum 1 acre of land suitable for coconut cultivation',
      'KYC verified and existing land record in applicant name',
      'Water access for drip irrigation (desirable)',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID.' },
      { type: 'LAND_RECORD', title: 'Land Ownership Record', description: '7/12 extract confirming land suitable for coconut farming.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Active member certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 11. Horticulture & Plantation Crops ──────────────────────────────────
  {
    slugId: 'horticulture-plantation',
    code: 'HORT-PLANT',
    name: 'Horticulture & Plantation Crop Credit',
    category: 'Horticulture and Plantation Crops',
    icon: 'Leaf',
    purpose: 'Fruit orchard, spice and plantation crop development',
    description:
      'Medium-to-long-term credit for establishing mango, banana, turmeric, ginger, cardamom, or other high-value horticultural and plantation crops, covering planting material, land development, and primary maintenance.',
    minAmount: 50000,
    maxAmount: 350000,
    defaultAmount: 150000,
    interestRate: 6.0,
    minTenure: 18,
    maxTenure: 48,
    defaultTenure: 24,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Horticultural Development Program',
    badge: 'High Value Horticulture',
    whoCanApply:
      'Farmers transitioning to high-value horticultural or spice crops, affiliated with FPO.',
    eligibilityCriteria: [
      'Active FPO membership with minimum 6 months standing',
      'Minimum 0.5 acre of suitable agricultural land',
      'KYC verification completed',
      'Crop-specific technical clearance from FPO agri-officer (for new plantings)',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Land 7/12 Record', description: 'Land record confirming suitable horticulture land.' },
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or Voter ID.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Member share certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 12. Organic Farming ───────────────────────────────────────────────────
  {
    slugId: 'organic-farming',
    code: 'ORGANIC-FARM',
    name: 'Organic Farming & Certification Credit',
    category: 'Organic Farming',
    icon: 'FlaskConical',
    purpose: 'Organic input procurement, compost units and certification costs',
    description:
      'Working-capital and investment credit for farmers transitioning to certified organic farming, covering bio-input production units, compost, vermicompost, organic certification fee, and market linkage under organic premium programs.',
    minAmount: 20000,
    maxAmount: 150000,
    defaultAmount: 60000,
    interestRate: 4.5,
    minTenure: 6,
    maxTenure: 24,
    defaultTenure: 12,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'SEASONAL'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Organic Transition Program',
    badge: 'Green Credit',
    whoCanApply:
      'Farmers committing to chemical-free organic cultivation affiliated with the FPO organic cluster.',
    eligibilityCriteria: [
      'Active FPO membership with enrollment in FPO organic cluster',
      'Commitment to complete organic farming protocol during transition period',
      'KYC verified profile',
      'Land suitable for organic certification (no prohibited chemical use in preceding seasons)',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Land Record', description: 'Land ownership or tenancy record.' },
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Organic Cluster Enrollment', description: 'Enrollment certificate in the FPO organic farming cluster.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 13. Farm Land Development ─────────────────────────────────────────────
  {
    slugId: 'farm-land-development',
    code: 'LAND-DEV',
    name: 'Farm Land Development & Soil Health Credit',
    category: 'Farm Land Development',
    icon: 'Mountain',
    purpose: 'Land leveling, contour bunding and soil reclamation',
    description:
      'Capital credit for permanent land improvements including land leveling, contour bunding, check dam construction, gully plugging, waterway development, and soil health restoration for enhanced productivity.',
    minAmount: 40000,
    maxAmount: 250000,
    defaultAmount: 100000,
    interestRate: 5.0,
    minTenure: 24,
    maxTenure: 60,
    defaultTenure: 36,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '₹0 (Nil - FPO Subsidized)',
    availability: 'Open for Land Development Program',
    badge: 'Land Improvement',
    whoCanApply:
      'Farmers with degraded, undulating, or flood-prone agricultural land requiring permanent structural improvements.',
    eligibilityCriteria: [
      'Active FPO membership',
      'Clear land title or long-term lease of minimum 5 years',
      'Land development plan approval from FPO technical team',
      'KYC verified profile',
    ],
    requiredDocuments: [
      { type: 'LAND_RECORD', title: 'Land 7/12 or Patta Record', description: 'Land ownership record confirming title and area.' },
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'Active membership certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month statement.' },
      { type: 'FINANCIAL_REPORT', title: 'Land Development Cost Estimate', description: 'Technical cost estimate prepared by FPO field engineer or approved contractor.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 14. Cold Storage & Processing ────────────────────────────────────────
  {
    slugId: 'cold-storage-processing',
    code: 'COLD-STORE',
    name: 'Cold Storage & Agri-Processing Unit Credit',
    category: 'Cold Storage and Processing',
    icon: 'Snowflake',
    purpose: 'Cold room equipment, processing machinery and packaging line',
    description:
      'Capital financing for farmer groups or FPO clusters investing in mini cold storage units, primary processing lines, grading and sorting machines, and packaging infrastructure to reduce post-harvest losses.',
    minAmount: 200000,
    maxAmount: 1000000,
    defaultAmount: 400000,
    interestRate: 7.5,
    minTenure: 24,
    maxTenure: 60,
    defaultTenure: 36,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY', 'QUARTERLY'],
    processingFee: '1% of loan amount (indicative)',
    availability: 'Open for Agri-Infrastructure Program',
    badge: 'Infrastructure Credit',
    whoCanApply:
      'FPO farmer groups or individual entrepreneurs with demonstrated produce aggregation volume for cold storage or processing.',
    eligibilityCriteria: [
      'Active FPO membership or FPO-endorsed farmer group',
      'Demonstrated produce aggregation volume justifying storage investment',
      'Land or built space for cold room installation',
      'Financial feasibility report endorsed by FPO management',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Government photo ID.' },
      { type: 'ADDRESS_PROOF', title: 'Business Address Proof', description: 'Premises ownership or lease deed for cold storage site.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership / Endorsement Letter', description: 'Membership certificate or official endorsement from FPO board.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '12-month bank statement.' },
      { type: 'FINANCIAL_REPORT', title: 'Financial Feasibility Report', description: 'Projected cost, throughput, and revenue plan for the cold storage unit.' },
      { type: 'OTHER', title: 'Equipment Supplier Quotation', description: 'Formal quotation for cold room panels, compressors, and processing machinery.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },

  // ── 15. Agricultural Transport & Logistics ────────────────────────────────
  {
    slugId: 'agri-transport-logistics',
    code: 'AGRI-TRANSPORT',
    name: 'Agricultural Transport & Logistics Credit',
    category: 'Agricultural Transport and Logistics',
    icon: 'Truck',
    purpose: 'Farm vehicle, tractor-trailer and produce transport',
    description:
      'Vehicle financing for FPO-affiliated farmers and agri-entrepreneurs acquiring mini-trucks, tractor-trailers, refrigerated vans, or two-wheelers for farm produce collection, inter-mandi transport, and last-mile agri-logistics.',
    minAmount: 100000,
    maxAmount: 700000,
    defaultAmount: 250000,
    interestRate: 7.0,
    minTenure: 24,
    maxTenure: 60,
    defaultTenure: 36,
    repaymentFrequency: 'MONTHLY',
    supportedFrequencies: ['MONTHLY'],
    processingFee: '1% of loan amount (indicative)',
    availability: 'Open for Agri-Logistics Program',
    badge: 'Logistics Finance',
    whoCanApply:
      'FPO-affiliated farmers or entrepreneur members requiring transport assets for agricultural trade.',
    eligibilityCriteria: [
      'Active FPO membership with minimum 1 year standing',
      'Valid commercial driving licence (or undertaking to hire licensed driver)',
      'Demonstrated transport route or produce collection plan endorsed by FPO',
      'KYC verified profile with clean credit history',
    ],
    requiredDocuments: [
      { type: 'ID_PROOF', title: 'Identity Proof', description: 'Aadhaar Card or Voter ID.' },
      { type: 'ADDRESS_PROOF', title: 'Residence Proof', description: 'Ration card or utility bill.' },
      { type: 'FPO_MEMBERSHIP', title: 'FPO Membership Certificate', description: 'One-year-plus active membership certificate.' },
      { type: 'BANK_STATEMENT', title: 'Bank Statement', description: '6-month bank statement.' },
      { type: 'OTHER', title: 'Vehicle Dealer Quotation', description: 'Proforma invoice or quotation from authorized vehicle dealer.' },
    ],
    status: 'ACTIVE',
    acceptingApplications: true,
  },
];

// ── Seeder ────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGO_URI or MONGODB_URI is not set in environment / .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  let created = 0;
  let updated = 0;

  for (const product of PRODUCTS) {
    const { slugId, ...rest } = product;
    const result = await LoanProduct.findOneAndUpdate(
      { slugId },
      { $set: rest },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      console.log(`  ✅ CREATED  [${slugId}]  ${result.name}`);
      created++;
    } else {
      console.log(`  🔄 UPDATED  [${slugId}]  ${result.name}`);
      updated++;
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated. Total: ${PRODUCTS.length} products.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
