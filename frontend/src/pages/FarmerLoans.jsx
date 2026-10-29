import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loanAPI, documentAPI, authAPI, loanProductAPI } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Sprout,
  LogOut,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Calculator,
  FileCheck,
  FileText,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Info,
  X,
  ArrowRight,
  Sun,
  Moon,
  Globe,
  Sliders,
  DollarSign,
  Percent,
  Calendar,
  Building2,
  Wheat,
  Droplets,
  Tractor,
  Warehouse,
  Check,
  ExternalLink,
  Truck,
  Fish,
  Leaf,
  Mountain,
  Snowflake,
  Milk,
  Bird,
  TreePine,
  FlaskConical,
} from 'lucide-react';
import './FarmerLoans.css';

/**
 * Standard EMI Calculation Logic Grounded in Backend Math (backend/utils/emiCalculator.js)
 * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * If r <= 0: EMI = P / n
 */
export const calculateEMI = (principal, annualInterestRate = 0, tenureMonths = 1) => {
  const p = Number(principal);
  const rate = Number(annualInterestRate) || 0;
  const n = Number(tenureMonths);

  if (isNaN(p) || p <= 0 || isNaN(n) || n <= 0) {
    return { emi: 0, totalRepayment: 0, totalInterest: 0 };
  }

  let emi = 0;
  if (rate <= 0) {
    emi = Math.round((p / n) * 100) / 100;
  } else {
    const r = rate / (12 * 100);
    const rateFactor = Math.pow(1 + r, n);
    emi = Math.round(((p * r * rateFactor) / (rateFactor - 1)) * 100) / 100;
  }

  const totalRepayment = Math.round(emi * n * 100) / 100;
  const totalInterest = Math.max(0, Math.round((totalRepayment - p) * 100) / 100);

  return { emi, totalRepayment, totalInterest };
};

/**
 * FPO Institutional Credit Schemes Catalog
 * Grounded in Backend Models (Loan, Document, User) and Seed/Test Datasets
 * Note: Backend currently accepts custom applications at /api/loans;
 * master scheme CRUD endpoints are not currently exposed by backend.
 */
export const FPO_AVAILABLE_SCHEMES = [
  {
    id: 'crop-production',
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
    availabilityStatus: 'OPEN',
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
      {
        type: 'LAND_RECORD',
        title: 'Land 7/12 Record / Patta Passbook',
        description: 'Latest land title record or registered tenancy agreement showing cultivable area.',
      },
      {
        type: 'ID_PROOF',
        title: 'Identity Proof',
        description: 'Government photo identification (Aadhaar Card or Voter ID).',
      },
      {
        type: 'FPO_MEMBERSHIP',
        title: 'FPO Membership Share Certificate',
        description: 'Proof of active shareholding and registered farmer membership in the FPO.',
      },
      {
        type: 'BANK_STATEMENT',
        title: 'Bank Account Passbook / Statement',
        description: 'Bank passbook copy or 6-month statement showing active savings account.',
      },
    ],
  },
  {
    id: 'micro-irrigation',
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
    availabilityStatus: 'OPEN',
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
      {
        type: 'LAND_RECORD',
        title: 'Land Record with Water Source Entry',
        description: '7/12 extract or title deed confirming operational irrigation well or borewell.',
      },
      {
        type: 'ID_PROOF',
        title: 'Identity Proof',
        description: 'Government photo ID (Aadhaar Card or Voter ID).',
      },
      {
        type: 'ADDRESS_PROOF',
        title: 'Address & Residence Proof',
        description: 'Electricity bill, agricultural power connection receipt, or ration card.',
      },
      {
        type: 'FPO_MEMBERSHIP',
        title: 'FPO Membership Certificate',
        description: 'Proof of active farmer member registration in the FPO.',
      },
      {
        type: 'BANK_STATEMENT',
        title: 'Bank Statement',
        description: 'Recent 6-month bank statement with active transaction history.',
      },
      {
        type: 'OTHER',
        title: 'Equipment Vendor Quotation',
        description: 'Itemized quotation from an authorized drip irrigation or solar pump dealer.',
      },
    ],
  },
  {
    id: 'farm-machinery',
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
    availabilityStatus: 'OPEN',
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
      {
        type: 'ID_PROOF',
        title: 'Identity Proof',
        description: 'Aadhaar Card or Voter ID card.',
      },
      {
        type: 'ADDRESS_PROOF',
        title: 'Residence Proof',
        description: 'Ration card, domicile certificate, or utility bill.',
      },
      {
        type: 'FPO_MEMBERSHIP',
        title: 'FPO Membership Share Certificate',
        description: 'Official member certificate issued by the FPO management.',
      },
      {
        type: 'BANK_STATEMENT',
        title: 'Bank Account Passbook',
        description: 'Passbook copy showing account details and IFSC.',
      },
      {
        type: 'OTHER',
        title: 'Dealer Machinery Quotation',
        description: 'Formal equipment quotation or repair overhaul estimate from authorized dealer.',
      },
    ],
  },
  {
    id: 'polyhouse-horticulture',
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
    availabilityStatus: 'OPEN',
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
      {
        type: 'LAND_RECORD',
        title: 'Clear Title 7/12 Land Record',
        description: 'Official land record verifying undisputed ownership and boundary demarcation.',
      },
      {
        type: 'ID_PROOF',
        title: 'Government Identity Proof',
        description: 'Aadhaar Card or Voter ID.',
      },
      {
        type: 'ADDRESS_PROOF',
        title: 'Residential Proof',
        description: 'Electricity bill or ration card.',
      },
      {
        type: 'FPO_MEMBERSHIP',
        title: 'FPO Membership Certificate',
        description: 'FPO share certificate and membership ID.',
      },
      {
        type: 'BANK_STATEMENT',
        title: '6-Month Bank Statement',
        description: 'Detailed bank statement from an authorized commercial or cooperative bank.',
      },
      {
        type: 'FINANCIAL_REPORT',
        title: 'Projected Crop Income Statement',
        description: 'Estimated seasonal harvest yield and revenue projections for protected crop.',
      },
    ],
  },
  {
    id: 'post-harvest',
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
    availabilityStatus: 'OPEN',
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
      {
        type: 'ID_PROOF',
        title: 'Identity Proof',
        description: 'Aadhaar Card or official photo ID.',
      },
      {
        type: 'FPO_MEMBERSHIP',
        title: 'FPO Member Certificate',
        description: 'Proof of active membership in the Farmer Producer Organization.',
      },
      {
        type: 'BANK_STATEMENT',
        title: 'Bank Passbook Copy',
        description: 'Bank passbook copy with account details.',
      },
      {
        type: 'OTHER',
        title: 'Warehouse Deposit Receipt / Voucher',
        description: 'Official commodity deposit acknowledgement voucher showing quantity and grade.',
      },
    ],
  },
  {
    id: 'dairy-farming',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'poultry-farming',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'goat-sheep-rearing',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'fisheries-aquaculture',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'coconut-plantation',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'horticulture-plantation',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'organic-farming',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'farm-land-development',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'cold-storage-processing',
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
    availabilityStatus: 'OPEN',
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
  },
  {
    id: 'agri-transport-logistics',
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
    availabilityStatus: 'OPEN',
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
  },
];

export const ILLUSTRATIVE_SCHEMES = [];
export const ALL_DISPLAY_SCHEMES = FPO_AVAILABLE_SCHEMES;

const FarmerLoans = ({ openApplyModal = false }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { schemeId: routeSchemeId } = useParams();

  // State: Data from Backend APIs
  const [farmerProfile, setFarmerProfile] = useState(user || null);
  const [existingLoans, setExistingLoans] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [apiError, setApiError] = useState(null);

  // State: Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedInterestMax, setSelectedInterestMax] = useState('ALL');
  const [selectedTenureMax, setSelectedTenureMax] = useState('ALL');
  const [selectedAmountRange, setSelectedAmountRange] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECOMMENDED');

  // State: Dynamic live schemes enriched with backend MongoDB IDs
  const [liveSchemes, setLiveSchemes] = useState(ALL_DISPLAY_SCHEMES);

  // State: Selected Scheme for Detailed View
  const [activeScheme, setActiveScheme] = useState(null);

  // State: Interactive EMI Calculator (Inside Scheme View or Standalone)
  const [calculatorInputs, setCalculatorInputs] = useState({
    amount: 75000,
    tenure: 12,
    rate: 4.0,
    frequency: 'MONTHLY',
  });

  // State: Apply Now Modal Flow
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(openApplyModal);
  const [applyScheme, setApplyScheme] = useState(null);
  const [applyFormData, setApplyFormData] = useState({
    loanAmount: 75000,
    tenureMonths: 12,
    interestRate: 4.0,
    repaymentFrequency: 'MONTHLY',
    purpose: '',
    remarks: '',
  });
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applySuccessData, setApplySuccessData] = useState(null);
  const [applyError, setApplyError] = useState(null);

  // State: Language menu
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Fetch real backend data for farmer
  const fetchFarmerContext = async () => {
    setLoadingData(true);
    setApiError(null);
    try {
      const [profileRes, loansRes, docsRes, productsRes] = await Promise.allSettled([
        authAPI.getMe(),
        loanAPI.getMyLoans(),
        documentAPI.getMyDocuments(),
        loanProductAPI.getActive(),
      ]);

      if (productsRes.status === 'fulfilled' && productsRes.value.data?.data) {
        const liveProducts = productsRes.value.data.data;
        if (liveProducts.length > 0) {
          // Merge MongoDB _id into static scheme list
          setLiveSchemes((prev) =>
            prev.map((s) => {
              const matched = liveProducts.find((p) => p.slugId === s.id || p.code === s.code);
              return matched ? { ...s, _id: matched._id, acceptingApplications: matched.acceptingApplications } : s;
            })
          );
        }
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data?.user) {
        setFarmerProfile(profileRes.value.data.data.user);
      }
      if (loansRes.status === 'fulfilled') {
        setExistingLoans(loansRes.value.data?.data?.loans || []);
      }
      if (docsRes.status === 'fulfilled') {
        setUploadedDocuments(docsRes.value.data?.data?.documents || []);
      }
    } catch (err) {
      console.warn('Farmer data fetch error:', err);
      setApiError('Notice: Could not sync some profile data. Local view is active.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchFarmerContext();
  }, []);

  // Handle route-based scheme selection (e.g. /farmer/loans/:schemeId)
  useEffect(() => {
    if (routeSchemeId) {
      const match = liveSchemes.find((s) => s.id === routeSchemeId);
      if (match) {
        handleOpenSchemeDetails(match);
      }
    }
  }, [routeSchemeId]);

  // Handle location state if navigated with state (e.g. from Apply Loan button)
  useEffect(() => {
    if (location.state?.selectedSchemeId) {
      const match = liveSchemes.find((s) => s.id === location.state.selectedSchemeId);
      if (match) {
        handleOpenSchemeDetails(match);
      }
    }
    if (openApplyModal || location.state?.openApply) {
      const targetScheme =
        (location.state?.selectedSchemeId &&
          liveSchemes.find((s) => s.id === location.state.selectedSchemeId)) ||
        FPO_AVAILABLE_SCHEMES[0];
      handleOpenApplyModal(targetScheme);
    }
  }, [location.state, openApplyModal]);

  // Open Scheme Details View & Initialize Calculator
  const handleOpenSchemeDetails = (scheme) => {
    setActiveScheme(scheme);
    setCalculatorInputs({
      amount: scheme.defaultAmount,
      tenure: scheme.defaultTenure,
      rate: scheme.interestRate,
      frequency: scheme.repaymentFrequency,
    });
  };

  const handleCloseSchemeDetails = () => {
    setActiveScheme(null);
    if (routeSchemeId) {
      navigate('/farmer/loans', { replace: true });
    }
  };

  // Navigate to Dedicated Apply Page with Scheme parameters
  const handleOpenApplyModal = (scheme) => {
    // Scheme is active and functional
    const calcAmount =
      activeScheme && activeScheme.id === scheme.id ? calculatorInputs.amount : scheme.defaultAmount;
    const calcTenure =
      activeScheme && activeScheme.id === scheme.id ? calculatorInputs.tenure : scheme.defaultTenure;
    const calcFreq =
      activeScheme && activeScheme.id === scheme.id ? calculatorInputs.frequency : scheme.repaymentFrequency;

    navigate('/farmer/apply', {
      state: {
        schemeId: scheme.id,
        amount: calcAmount,
        tenure: calcTenure,
        frequency: calcFreq,
        loanProductId: scheme._id || undefined,
      },
    });
  };

  const handleCloseApplyModal = () => {
    setIsApplyModalOpen(false);
    setApplySuccessData(null);
    setApplyError(null);
  };

  // Submit Loan Application to Backend via loanAPI.createLoan (POST /api/loans)
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplyError(null);

    const amount = Number(applyFormData.loanAmount);
    const tenure = Number(applyFormData.tenureMonths);

    if (!amount || amount <= 0) {
      setApplyError('Please enter a valid loan amount greater than ₹0.');
      return;
    }
    if (applyScheme && (amount < applyScheme.minAmount || amount > applyScheme.maxAmount)) {
      setApplyError(
        `Loan amount must be between ₹${applyScheme.minAmount.toLocaleString(
          'en-IN'
        )} and ₹${applyScheme.maxAmount.toLocaleString('en-IN')}.`
      );
      return;
    }
    if (!tenure || tenure < 1) {
      setApplyError('Loan tenure must be at least 1 month.');
      return;
    }
    if (applyScheme && (tenure < applyScheme.minTenure || tenure > applyScheme.maxTenure)) {
      setApplyError(
        `Tenure must be between ${applyScheme.minTenure} and ${applyScheme.maxTenure} months for this scheme.`
      );
      return;
    }
    if (!applyFormData.purpose.trim()) {
      setApplyError('Loan purpose is required.');
      return;
    }

    try {
      setSubmittingApply(true);
      const payload = {
        loanAmount: amount,
        purpose: applyFormData.purpose.trim(),
        interestRate: Number(applyFormData.interestRate) || 0,
        tenureMonths: tenure,
        repaymentFrequency: applyFormData.repaymentFrequency || 'MONTHLY',
        remarks: applyFormData.remarks.trim() || undefined,
      };

      const response = await loanAPI.createLoan(payload);
      if (response.data?.status === 'success') {
        const createdLoan = response.data.data.loan;
        setApplySuccessData(createdLoan);
        // Refresh loans in background
        fetchFarmerContext();
      } else {
        setApplyError(response.data?.message || 'Failed to submit loan application.');
      }
    } catch (err) {
      setApplyError(
        err.response?.data?.message || err.message || 'Server error submitting application.'
      );
    } finally {
      setSubmittingApply(false);
    }
  };

  // Helper: check if a document type has already been uploaded by this farmer
  const getDocumentStatus = (docType) => {
    const existing = uploadedDocuments.find((d) => d.documentType === docType);
    if (!existing) {
      return { uploaded: false, status: 'NOT_UPLOADED' };
    }
    return { uploaded: true, status: existing.status, doc: existing };
  };

  // Compute live EMI for the calculator
  const liveEmiCalculation = useMemo(() => {
    return calculateEMI(
      calculatorInputs.amount,
      calculatorInputs.rate,
      calculatorInputs.tenure
    );
  }, [calculatorInputs.amount, calculatorInputs.rate, calculatorInputs.tenure]);

  // Filter & Search Logic
  const filteredSchemes = useMemo(() => {
    return liveSchemes.filter((scheme) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = scheme.name.toLowerCase().includes(q);
        const matchesDesc = scheme.description.toLowerCase().includes(q);
        const matchesPurpose = scheme.purpose.toLowerCase().includes(q);
        const matchesCategory = scheme.category.toLowerCase().includes(q);
        const matchesEligibility = scheme.eligibilityCriteria.some((c) =>
          c.toLowerCase().includes(q)
        );
        if (
          !matchesName &&
          !matchesDesc &&
          !matchesPurpose &&
          !matchesCategory &&
          !matchesEligibility
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'ALL' && scheme.category !== selectedCategory) {
        return false;
      }

      // Interest Rate filter
      if (selectedInterestMax !== 'ALL') {
        const maxRate = Number(selectedInterestMax);
        if (scheme.interestRate > maxRate) return false;
      }

      // Tenure filter
      if (selectedTenureMax !== 'ALL') {
        const maxTenure = Number(selectedTenureMax);
        if (scheme.minTenure > maxTenure) return false;
      }

      // Amount filter
      if (selectedAmountRange !== 'ALL') {
        if (selectedAmountRange === '50000' && scheme.minAmount > 50000) return false;
        if (selectedAmountRange === '100000' && scheme.minAmount > 100000) return false;
        if (selectedAmountRange === '250000' && scheme.minAmount > 250000) return false;
        if (selectedAmountRange === '250001' && scheme.maxAmount <= 250000) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'INTEREST_ASC') return a.interestRate - b.interestRate;
      if (sortBy === 'AMOUNT_DESC') return b.maxAmount - a.maxAmount;
      if (sortBy === 'TENURE_ASC') return a.defaultTenure - b.defaultTenure;
      return 0; // RECOMMENDED / default order
    });
  }, [
    searchTerm,
    selectedCategory,
    selectedInterestMax,
    selectedTenureMax,
    selectedAmountRange,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedInterestMax('ALL');
    setSelectedTenureMax('ALL');
    setSelectedAmountRange('ALL');
    setSortBy('RECOMMENDED');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderSchemeIcon = (iconName) => {
    switch (iconName) {
      case 'Wheat':
        return <Wheat size={24} />;
      case 'Droplets':
        return <Droplets size={24} />;
      case 'Tractor':
        return <Tractor size={24} />;
      case 'Warehouse':
        return <Warehouse size={24} />;
      case 'Truck':
        return <Truck size={24} />;
      case 'Fish':
        return <Fish size={24} />;
      case 'Leaf':
        return <Leaf size={24} />;
      case 'Mountain':
        return <Mountain size={24} />;
      case 'Snowflake':
        return <Snowflake size={24} />;
      case 'Milk':
        return <Milk size={24} />;
      case 'Bird':
        return <Bird size={24} />;
      case 'TreePine':
        return <TreePine size={24} />;
      case 'FlaskConical':
        return <FlaskConical size={24} />;
      case 'Building2':
        return <Building2 size={24} />;
      default:
        return <Sprout size={24} />;
    }
  };

  return (
    <div className="farmer-loans-layout" style={{ minHeight: 'auto', background: 'transparent' }}>
      {/* Main Page Body */}
      <main className="farmer-loans-container" style={{ padding: '0 0 2rem 0', maxWidth: '100%' }}>
        {/* Farmer Status Summary */}
        <section className="farmer-eligibility-summary glass-panel">
          <div className="summary-left">
            <div className="farmer-status-header">
              <h3 className="farmer-headline">
                {farmerProfile?.name || t('farmerLoans.farmerMember', 'Farmer Member')}
                {farmerProfile?.fpoName && (
                  <span className="fpo-association"> · {farmerProfile.fpoName}</span>
                )}
              </h3>
            </div>
            <p className="farmer-eligibility-desc">
              {t('farmerLoans.farmerRoleDescShort', 'Browse available credit schemes, calculate EMI, and apply for a loan.')}
            </p>
          </div>

          <div className="summary-chips-grid">
            <div className="eligibility-chip">
              <span className="chip-label">{t('farmerLoans.kycStanding', 'KYC Status')}</span>
              {farmerProfile?.kycStatus === 'VERIFIED' || farmerProfile?.kycVerified ? (
                <span className="chip-val text-success">
                  <CheckCircle2 size={15} /> {t('farmerLoans.verified', 'Verified')}
                </span>
              ) : farmerProfile?.kycStatus === 'REJECTED' ? (
                <span className="chip-val text-danger" style={{ color: '#ef4444' }}>
                  <XCircle size={15} /> {t('farmerLoans.rejected', 'Rejected')}
                </span>
              ) : (
                <span className="chip-val text-warning">
                  <AlertCircle size={15} /> {t('farmerLoans.pendingReview', 'Pending')}
                </span>
              )}
            </div>
            <div className="eligibility-chip">
              <span className="chip-label">{t('farmerDashboard.myLoans', 'Active Loans')}</span>
              <span className="chip-val text-main">
                <CreditCard size={15} /> {existingLoans.length}
              </span>
            </div>
          </div>
        </section>

        {/* Search, Filter & Quick Metric Bar */}
        <section className="filter-and-search-section glass-panel">
          <div className="search-bar-row">
            {/* Search Input */}
            <div className="search-input-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('farmerLoans.searchPlaceholder')}
                className="loans-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="clear-search-btn"
                  aria-label="Clear Search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="sort-dropdown-box">
              <span className="filter-label">{t('farmerLoans.sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select-input"
              >
                <option value="RECOMMENDED">{t('farmerLoans.sortRecommended', 'Recommended')}</option>
                <option value="INTEREST_ASC">{t('farmerLoans.sortRateAsc', 'Interest Rate: Low to High')}</option>
                <option value="AMOUNT_DESC">{t('farmerLoans.sortAmountDesc', 'Max Loan: High to Low')}</option>
                <option value="TENURE_ASC">{t('farmerLoans.sortTenureAsc', 'Shortest Tenure')}</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="filters-row">
            {/* Category Filter */}
            <div className="filter-select-group">
              <span className="filter-label">{t('farmerLoans.filterByCategory')}</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select-input"
              >
                <option value="ALL">{t('farmerLoans.allCategories')}</option>
                <option value="Crop Inputs & Seasonal Credit">{t('farmerLoans.categories.crop_production', 'Crop Production and Seasonal Credit')}</option>
                <option value="Micro-Irrigation & Water">{t('farmerLoans.categories.irrigation', 'Irrigation and Water Infrastructure')}</option>
                <option value="Farm Machinery & Equipment">{t('farmerLoans.categories.machinery', 'Farm Machinery & Equipment')}</option>
                <option value="Protected Cultivation / Polyhouse">{t('farmerLoans.categories.protected_farming', 'Protected Cultivation & Polyhouse')}</option>
                <option value="Post-Harvest & Storage">{t('farmerLoans.categories.post_harvest', 'Post-Harvest Storage & Marketing')}</option>
                <option value="Dairy Farming">{t('farmerLoans.categories.dairy', 'Dairy Farming')}</option>
                <option value="Poultry Farming">{t('farmerLoans.categories.poultry', 'Poultry Farming')}</option>
                <option value="Goat and Sheep Rearing">{t('farmerLoans.categories.goat_sheep', 'Goat and Sheep Rearing')}</option>
                <option value="Fisheries and Aquaculture">{t('farmerLoans.categories.fisheries', 'Fisheries and Aquaculture')}</option>
                <option value="Coconut Plantation Development">{t('farmerLoans.categories.coconut', 'Coconut Plantation Development')}</option>
                <option value="Horticulture and Plantation Crops">{t('farmerLoans.categories.horticulture', 'Horticulture and Plantation Crops')}</option>
                <option value="Organic Farming">{t('farmerLoans.categories.organic', 'Organic Farming')}</option>
                <option value="Farm Land Development">{t('farmerLoans.categories.land_dev', 'Farm Land Development')}</option>
                <option value="Cold Storage and Processing">{t('farmerLoans.categories.cold_storage', 'Cold Storage and Processing')}</option>
                <option value="Agricultural Transport and Logistics">{t('farmerLoans.categories.logistics', 'Agricultural Transport and Logistics')}</option>
              </select>
            </div>

            {/* Interest Rate Filter */}
            <div className="filter-select-group">
              <span className="filter-label">{t('farmerLoans.filterByInterest')}</span>
              <select
                value={selectedInterestMax}
                onChange={(e) => setSelectedInterestMax(e.target.value)}
                className="filter-select-input"
              >
                <option value="ALL">{t('farmerLoans.allInterestRates', 'All Interest Rates')}</option>
                <option value="4">{t('farmerLoans.subsidizedRate', 'Up to 4.0% p.a. (Subsidized)')}</option>
                <option value="6">{t('farmerLoans.rate6', 'Up to 6.0% p.a.')}</option>
                <option value="7">{t('farmerLoans.rate7', 'Up to 7.0% p.a.')}</option>
              </select>
            </div>

            {/* Tenure Filter */}
            <div className="filter-select-group">
              <span className="filter-label">{t('farmerLoans.filterByTenure')}</span>
              <select
                value={selectedTenureMax}
                onChange={(e) => setSelectedTenureMax(e.target.value)}
                className="filter-select-input"
              >
                <option value="ALL">{t('farmerLoans.allTenures', 'All Tenures')}</option>
                <option value="12">{t('farmerLoans.shortTerm', 'Short Term (≤ 12 Months)')}</option>
                <option value="24">{t('farmerLoans.mediumTerm', 'Medium Term (≤ 24 Months)')}</option>
                <option value="36">{t('farmerLoans.extendedTerm', 'Extended Term (≤ 36 Months)')}</option>
              </select>
            </div>

            {/* Amount Filter */}
            <div className="filter-select-group">
              <span className="filter-label">{t('farmerLoans.filterByAmount')}</span>
              <select
                value={selectedAmountRange}
                onChange={(e) => setSelectedAmountRange(e.target.value)}
                className="filter-select-input"
              >
                <option value="ALL">{t('farmerLoans.allAmounts', 'All Amounts')}</option>
                <option value="50000">{t('farmerLoans.upTo50k', 'Up to ₹50,000')}</option>
                <option value="100000">{t('farmerLoans.upTo100k', 'Up to ₹1,00,000')}</option>
                <option value="250000">{t('farmerLoans.upTo250k', 'Up to ₹2,50,000')}</option>
                <option value="250001">{t('farmerLoans.above250k', 'Above ₹2,50,000')}</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchTerm ||
              selectedCategory !== 'ALL' ||
              selectedInterestMax !== 'ALL' ||
              selectedTenureMax !== 'ALL' ||
              selectedAmountRange !== 'ALL' ||
              sortBy !== 'RECOMMENDED') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-reset-filters"
              >
                <RefreshCw size={14} />
                <span>{t('farmerLoans.resetFilters')}</span>
              </button>
            )}
          </div>
        </section>

        {/* Search Results Summary */}
        <div className="results-count-bar">
          <span className="results-count-text">
            {t('farmerLoans.schemesFound', { count: filteredSchemes.length })}
          </span>
          <span className="text-muted text-sm">
            {t('farmerLoans.emiFormulaNote', 'Interest rates calculated using reducing balance EMI formula.')}
          </span>
        </div>

        {/* Scheme Cards Grid */}
        {filteredSchemes.length === 0 ? (
          <div className="no-schemes-card glass-panel">
            <AlertCircle size={40} className="text-warning" />
            <h3>{t('farmerLoans.noSchemesFound')}</h3>
            <p>{t('farmerLoans.adjustFilters')}</p>
            <button type="button" onClick={handleResetFilters} className="btn-primary-action">
              <RefreshCw size={16} />
              <span>{t('farmerLoans.resetFilters')}</span>
            </button>
          </div>
        ) : (
          <div className="schemes-cards-grid">
            {filteredSchemes.map((scheme) => {
              const defaultEmiResult = calculateEMI(
                scheme.defaultAmount,
                scheme.interestRate,
                scheme.defaultTenure
              );

              return (
                <div key={scheme.id} className="scheme-card glass-panel">
                  {/* Card Header */}
                  <div className="scheme-card-header">
                    <div className="scheme-icon-and-badge">
                      <div className="scheme-card-icon">
                        {renderSchemeIcon(scheme.icon)}
                      </div>
                      <span className="scheme-category-badge">{t(`farmerLoans.schemes.${scheme.id}.category`, scheme.category)}</span>
                    </div>
                    {scheme.illustrative ? (
                      <span className="availability-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', borderColor: '#eab308' }}>
                        <span className="pulsing-dot" style={{ background: '#ca8a04' }} />
                        {t('farmerLoans.illustrativeExample', 'Illustrative Example')}
                      </span>
                    ) : (
                      <span className="availability-pill">
                        <span className="pulsing-dot" />
                        {scheme.availabilityStatus}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="scheme-card-body">
                    <h3 className="scheme-card-title">{t(`farmerLoans.schemes.${scheme.id}.name`, scheme.name)}</h3>
                    <p className="scheme-card-desc">{t(`farmerLoans.schemes.${scheme.id}.description`, scheme.description)}</p>

                    {/* Key Metrics Grid */}
                    <div className="scheme-metrics-grid">
                      <div className="metric-cell">
                        <span className="metric-cell-label">{t('farmerLoans.interestRate')}</span>
                        <span className="metric-cell-val highlight-green">
                          {scheme.interestRate}% <small>{t('farmerLoans.pa', 'p.a.')}</small>
                        </span>
                      </div>
                      <div className="metric-cell">
                        <span className="metric-cell-label">{t('farmerLoans.tenure')}</span>
                        <span className="metric-cell-val">
                          {scheme.minTenure} - {scheme.maxTenure} <small>{t('farmerLoans.months', 'Months')}</small>
                        </span>
                      </div>
                      <div className="metric-cell">
                        <span className="metric-cell-label">{t('farmerLoans.minAmount')}</span>
                        <span className="metric-cell-val">
                          ₹{scheme.minAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="metric-cell">
                        <span className="metric-cell-label">{t('farmerLoans.maxAmount')}</span>
                        <span className="metric-cell-val">
                          ₹{scheme.maxAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Indicative Default EMI Highlight */}
                    <div className="indicative-emi-box">
                      <div className="emi-label-group">
                        <Calculator size={14} />
                        <span>{t('farmerLoans.estimatedEmiFor', { amount: scheme.defaultAmount.toLocaleString('en-IN'), tenure: scheme.defaultTenure })}</span>
                      </div>
                      <div className="emi-amount-highlight">
                        <strong>₹{defaultEmiResult.emi.toLocaleString('en-IN')}</strong> / {t('farmerLoans.perMonth', 'month')}
                      </div>
                    </div>

                    {/* Eligibility Checklist Summary */}
                    <div className="eligibility-highlights">
                      <span className="eligibility-title">{t('farmerLoans.keyEligibility', 'Key Eligibility:')}</span>
                      <ul className="eligibility-bullet-list">
                        <li>
                          <Check size={14} className="text-success" />
                          <span>{t('farmerLoans.activeFpoMember', 'Active registered FPO member')}</span>
                        </li>
                        <li>
                          <Check size={14} className="text-success" />
                          <span>{scheme.eligibilityCriteria[1] || 'Cultivable land record'}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Required Documents Tag Row */}
                    <div className="required-docs-row">
                      <span className="docs-tag-label">{t('farmerLoans.docsLabel', 'Documents:')}</span>
                      <div className="docs-tags-wrap">
                        {scheme.requiredDocuments.slice(0, 3).map((d) => (
                          <span key={d.type} className="doc-tag-pill">
                            {d.type.replace('_', ' ')}
                          </span>
                        ))}
                        {scheme.requiredDocuments.length > 3 && (
                          <span className="doc-tag-pill more-pill">
                            {t('farmerLoans.moreCount', { count: scheme.requiredDocuments.length - 3 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="scheme-card-footer">
                    <button
                      type="button"
                      className="btn-view-details"
                      onClick={() => handleOpenSchemeDetails(scheme)}
                    >
                      <Calculator size={16} />
                      <span>{t('farmerLoans.viewDetails')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-apply-direct"
                      onClick={() => handleOpenApplyModal(scheme)}
                    >
                      <span>{t('farmerLoans.applyNow')}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================
          SCHEME DETAILS VIEW & INTERACTIVE EMI CALCULATOR MODAL
          ========================================================= */}
      {activeScheme && (
        <div className="scheme-modal-overlay" onClick={handleCloseSchemeDetails}>
          <div
            className="scheme-details-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scheme-modal-title"
          >
            {/* Modal Header */}
            <div className="scheme-modal-header">
              <div className="header-meta">
                <span className="scheme-category-badge">{activeScheme.category}</span>
                <span className="scheme-code-badge">{activeScheme.code}</span>
                <span className="availability-pill">
                  <span className="pulsing-dot" />
                  {activeScheme.availability}
                </span>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseSchemeDetails}
                aria-label="Close Details Modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="scheme-modal-scrollable-body">


              {/* Scheme Title & Objective */}
              <div className="scheme-title-block">
                <div className="scheme-title-icon-wrap">
                  {renderSchemeIcon(activeScheme.icon)}
                </div>
                <div>
                  <h2 id="scheme-modal-title" className="scheme-modal-title">
                    {t(`farmerLoans.schemes.${activeScheme.id}.name`, activeScheme.name)}
                  </h2>
                  <p className="scheme-modal-subtitle">{t(`farmerLoans.schemes.${activeScheme.id}.purpose`, activeScheme.purpose)}</p>
                </div>
              </div>

              {/* Description */}
              <p className="scheme-full-description">{t(`farmerLoans.schemes.${activeScheme.id}.description`, activeScheme.description)}</p>

              {/* Financial Specifications Table */}
              <div className="details-specs-container">
                <h4 className="section-title">
                  <Info size={16} /> {t('farmerLoans.financialTermsTitle', 'Financial Terms & Limits')}
                </h4>
                <div className="specs-grid">
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.minAmount')}</span>
                    <span className="spec-value">₹{activeScheme.minAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.maxAmount')}</span>
                    <span className="spec-value">₹{activeScheme.maxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.interestRate')}</span>
                    <span className="spec-value highlight-green">{activeScheme.interestRate}% {t('farmerLoans.pa', 'p.a.')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.tenure')} Range</span>
                    <span className="spec-value">{activeScheme.minTenure} - {activeScheme.maxTenure} {t('farmerLoans.months', 'Months')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.repayment')} Frequencies</span>
                    <span className="spec-value">{activeScheme.supportedFrequencies.join(', ')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">{t('farmerLoans.fees')}</span>
                    <span className="spec-value highlight-green">{activeScheme.processingFee}</span>
                  </div>
                </div>
              </div>

              {/* Eligibility Criteria & Who Can Apply */}
              <div className="details-eligibility-container">
                <h4 className="section-title">
                  <ShieldCheck size={16} /> {t('farmerLoans.eligibilityCriteria')} & {t('farmerLoans.whoCanApply')}
                </h4>
                <div className="who-can-apply-box">
                  <strong>{t('farmerLoans.whoCanApply')}:</strong> {activeScheme.whoCanApply}
                </div>
                <div className="eligibility-rules-list">
                  {activeScheme.eligibilityCriteria.map((rule, idx) => (
                    <div key={idx} className="eligibility-rule-item">
                      <CheckCircle2 size={18} className="rule-check-icon" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive EMI Calculator Embedded in Details */}
              <div className="embedded-calculator-section glass-panel">
                <div className="calc-header-row">
                  <div>
                    <h4 className="calc-title">
                      <Calculator size={18} /> {t('farmerLoans.calculatorTitle')}
                    </h4>
                    <p className="calc-subtitle">{t('farmerLoans.calculatorSub')}</p>
                  </div>
                  <span className="badge badge-success">
                    {t('farmerLoans.reducingBalance', 'Reducing Balance Method')}
                  </span>
                </div>

                <div className="calc-body-grid">
                  {/* Left: Input Controls */}
                  <div className="calc-inputs-column">
                    {/* Amount Slider & Input */}
                    <div className="calc-form-group">
                      <div className="calc-label-row">
                        <label>{t('farmerLoans.loanAmountLabel')}</label>
                        <span className="calc-number-highlight">
                          ₹{Number(calculatorInputs.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={activeScheme.minAmount}
                        max={activeScheme.maxAmount}
                        step={5000}
                        value={calculatorInputs.amount}
                        onChange={(e) =>
                          setCalculatorInputs((prev) => ({
                            ...prev,
                            amount: Number(e.target.value),
                          }))
                        }
                        className="calc-range-slider"
                      />
                      <div className="range-bounds-row">
                        <span>₹{activeScheme.minAmount.toLocaleString('en-IN')}</span>
                        <span>₹{activeScheme.maxAmount.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Quick Amount Preset Chips */}
                      <div className="preset-amounts-row">
                        {[
                          activeScheme.minAmount,
                          Math.round((activeScheme.minAmount + activeScheme.maxAmount) / 2),
                          activeScheme.maxAmount,
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`preset-chip-btn ${
                              calculatorInputs.amount === preset ? 'active' : ''
                            }`}
                            onClick={() =>
                              setCalculatorInputs((prev) => ({ ...prev, amount: preset }))
                            }
                          >
                            ₹{preset.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tenure Slider & Input */}
                    <div className="calc-form-group">
                      <div className="calc-label-row">
                        <label>{t('farmerLoans.tenureLabel')}</label>
                        <span className="calc-number-highlight">
                          {calculatorInputs.tenure} Months
                        </span>
                      </div>
                      <input
                        type="range"
                        min={activeScheme.minTenure}
                        max={activeScheme.maxTenure}
                        step={1}
                        value={calculatorInputs.tenure}
                        onChange={(e) =>
                          setCalculatorInputs((prev) => ({
                            ...prev,
                            tenure: Number(e.target.value),
                          }))
                        }
                        className="calc-range-slider"
                      />
                      <div className="range-bounds-row">
                        <span>{activeScheme.minTenure} Months</span>
                        <span>{activeScheme.maxTenure} Months</span>
                      </div>
                    </div>

                    {/* Repayment Frequency */}
                    <div className="calc-form-group">
                      <label className="calc-static-label">{t('farmerLoans.frequencyLabel')}</label>
                      <div className="frequency-selector-row">
                        {activeScheme.supportedFrequencies.map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            className={`freq-btn ${
                              calculatorInputs.frequency === freq ? 'active' : ''
                            }`}
                            onClick={() =>
                              setCalculatorInputs((prev) => ({ ...prev, frequency: freq }))
                            }
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Output Breakdown Cards */}
                  <div className="calc-outputs-column">
                    <div className="emi-result-card primary-card">
                      <span className="output-card-label">{t('farmerLoans.estimatedEmi')}</span>
                      <div className="output-card-val">
                        ₹{liveEmiCalculation.emi.toLocaleString('en-IN')}
                        <small> / month</small>
                      </div>
                      <span className="output-card-sub">
                        For ₹{calculatorInputs.amount.toLocaleString('en-IN')} @ {activeScheme.interestRate}% p.a. over {calculatorInputs.tenure} months
                      </span>
                    </div>

                    <div className="emi-secondary-metrics-grid">
                      <div className="secondary-metric-card">
                        <span className="output-card-label">{t('farmerLoans.totalInterest')}</span>
                        <span className="metric-val text-warning">
                          ₹{liveEmiCalculation.totalInterest.toLocaleString('en-IN')}
                        </span>
                        <span className="output-card-sub">
                          {((liveEmiCalculation.totalInterest / (calculatorInputs.amount || 1)) * 100).toFixed(1)}% of loan
                        </span>
                      </div>

                      <div className="secondary-metric-card">
                        <span className="output-card-label">{t('farmerLoans.totalRepayment')}</span>
                        <span className="metric-val text-main">
                          ₹{liveEmiCalculation.totalRepayment.toLocaleString('en-IN')}
                        </span>
                        <span className="output-card-sub">Principal + Total Interest</span>
                      </div>
                    </div>

                    {/* Visual Ratio Progress Bar */}
                    <div className="amortization-visual-bar">
                      <div className="amortization-bar-labels">
                        <span>
                          Principal: ₹{calculatorInputs.amount.toLocaleString('en-IN')}
                        </span>
                        <span>
                          Interest: ₹{liveEmiCalculation.totalInterest.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill-principal"
                          style={{
                            width: `${Math.round(
                              (calculatorInputs.amount / (liveEmiCalculation.totalRepayment || 1)) * 100
                            )}%`,
                          }}
                        />
                        <div
                          className="bar-fill-interest"
                          style={{
                            width: `${Math.round(
                              (liveEmiCalculation.totalInterest / (liveEmiCalculation.totalRepayment || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Repayment Frequency Adjustment Note */}
                    {calculatorInputs.frequency !== 'MONTHLY' && (
                      <div className="frequency-adjustment-note">
                        <Info size={14} />
                        <span>
                          Selected <strong>{calculatorInputs.frequency}</strong> repayment schedule:{' '}
                          {calculatorInputs.frequency === 'QUARTERLY' &&
                            `Installment due every 3 months (~₹${(liveEmiCalculation.emi * 3).toLocaleString('en-IN')}).`}
                          {calculatorInputs.frequency === 'SEASONAL' &&
                            `Installment aligned with crop harvest twice a year (~₹${(liveEmiCalculation.emi * 6).toLocaleString('en-IN')}).`}
                          {calculatorInputs.frequency === 'BULLET' &&
                            `Full principal & interest payable upon harvest realization at end of tenure.`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Required Documents Checklist with Live Farmer Sync */}
              <div className="details-documents-container">
                <h4 className="section-title">
                  <FileText size={16} /> {t('farmerLoans.requiredDocuments')} & Upload Status
                </h4>
                <div className="docs-checklist-grid">
                  {activeScheme.requiredDocuments.map((docItem) => {
                    const statusInfo = getDocumentStatus(docItem.type);

                    return (
                      <div key={docItem.type} className="doc-checklist-card">
                        <div className="doc-card-top">
                          <span className="doc-type-badge">{docItem.type.replace('_', ' ')}</span>
                          {statusInfo.uploaded ? (
                            statusInfo.status === 'VERIFIED' ? (
                              <span className="badge badge-success doc-status-pill">
                                <CheckCircle2 size={12} /> {t('farmerLoans.documentStatusVerified')}
                              </span>
                            ) : (
                              <span className="badge badge-warning doc-status-pill">
                                <Clock size={12} /> Uploaded (Pending Review)
                              </span>
                            )
                          ) : (
                            <span className="badge badge-neutral doc-status-pill">
                              {t('farmerLoans.documentStatusPending')}
                            </span>
                          )}
                        </div>
                        <h5 className="doc-card-title">{docItem.title}</h5>
                        <p className="doc-card-desc">{docItem.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="scheme-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCloseSchemeDetails}
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                className="btn-modal-apply"
                onClick={() => {
                  handleCloseSchemeDetails();
                  handleOpenApplyModal(activeScheme);
                }}
              >
                <span>{t('farmerLoans.applyNow')} for this Scheme</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          APPLY NOW APPLICATION SUBMISSION MODAL
          Pre-filled with Scheme parameters & ready for POST /api/loans
          ========================================================= */}
      {isApplyModalOpen && applyScheme && (
        <div className="scheme-modal-overlay" onClick={handleCloseApplyModal}>
          <div
            className="scheme-apply-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
          >
            {/* Modal Header */}
            <div className="scheme-modal-header">
              <div>
                <span className="scheme-category-badge">{applyScheme.category}</span>
                <h3 id="apply-modal-title" className="apply-modal-title">
                  {t('farmerLoans.applyModalTitle')}
                </h3>
                <p className="apply-modal-sub">{applyScheme.name}</p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseApplyModal}
                aria-label="Close Apply Modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Application Success State */}
            {applySuccessData ? (
              <div className="apply-success-view">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={54} className="text-success" />
                </div>
                <h3>{t('farmerLoans.applicationSuccess')}</h3>
                <p>{t('farmerLoans.applicationSuccessMsg')}</p>

                <div className="created-loan-summary glass-panel">
                  <div className="summary-row">
                    <span className="text-muted">Application ID:</span>
                    <strong className="loan-id-tag">#{applySuccessData._id.slice(-8).toUpperCase()}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Purpose:</span>
                    <span>{applySuccessData.purpose}</span>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Loan Amount:</span>
                    <strong className="text-success">₹{applySuccessData.loanAmount?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Tenure:</span>
                    <span>{applySuccessData.tenureMonths} Months</span>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Interest Rate:</span>
                    <span>{applySuccessData.interestRate}% p.a.</span>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Repayment Frequency:</span>
                    <span>{applySuccessData.repaymentFrequency}</span>
                  </div>
                  <div className="summary-row">
                    <span className="text-muted">Status:</span>
                    <span className="badge badge-warning">{applySuccessData.status}</span>
                  </div>
                </div>

                <div className="success-actions-row">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={handleCloseApplyModal}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-modal-apply"
                    onClick={() => navigate('/farmer/dashboard')}
                  >
                    <span>{t('farmerLoans.viewInDashboard')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Application Form */
              <form onSubmit={handleSubmitApplication} className="apply-form-container">
                {applyError && (
                  <div className="farmer-error-banner">
                    <AlertCircle size={18} />
                    <span>{applyError}</span>
                  </div>
                )}

                {/* Farmer Profile Verification Box */}
                <div className="apply-applicant-strip">
                  <div className="applicant-avatar">
                    <Sprout size={18} />
                  </div>
                  <div className="applicant-info">
                    <span className="applicant-name">
                      Applicant: <strong>{farmerProfile?.name || 'Farmer Member'}</strong>
                    </span>
                    <span className="applicant-meta">
                      {farmerProfile?.email} | {farmerProfile?.fpoName || 'FPO Member'}
                    </span>
                  </div>
                  {farmerProfile?.kycVerified ? (
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} /> KYC Verified
                    </span>
                  ) : (
                    <span className="badge badge-warning" title="KYC will need review by FPO admin">
                      <AlertCircle size={12} /> KYC Pending
                    </span>
                  )}
                </div>

                <div className="apply-fields-grid">
                  {/* Loan Amount */}
                  <div className="form-field-group">
                    <label className="form-field-label">
                      {t('farmerLoans.loanAmountLabel')} *
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="number"
                        min={applyScheme.minAmount}
                        max={applyScheme.maxAmount}
                        step={1000}
                        value={applyFormData.loanAmount}
                        onChange={(e) =>
                          setApplyFormData((prev) => ({
                            ...prev,
                            loanAmount: e.target.value,
                          }))
                        }
                        className="form-input"
                        required
                      />
                    </div>
                    <span className="field-hint">
                      Min: ₹{applyScheme.minAmount.toLocaleString('en-IN')} — Max: ₹{applyScheme.maxAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Tenure Months */}
                  <div className="form-field-group">
                    <label className="form-field-label">
                      {t('farmerLoans.tenureLabel')} *
                    </label>
                    <input
                      type="number"
                      min={applyScheme.minTenure}
                      max={applyScheme.maxTenure}
                      step={1}
                      value={applyFormData.tenureMonths}
                      onChange={(e) =>
                        setApplyFormData((prev) => ({
                          ...prev,
                          tenureMonths: e.target.value,
                        }))
                      }
                      className="form-input"
                      required
                    />
                    <span className="field-hint">
                      Allowed range: {applyScheme.minTenure} to {applyScheme.maxTenure} months
                    </span>
                  </div>

                  {/* Interest Rate (Fixed by Scheme) */}
                  <div className="form-field-group">
                    <label className="form-field-label">
                      {t('farmerLoans.interestRateLabel')}
                    </label>
                    <input
                      type="text"
                      value={`${applyScheme.interestRate}% p.a. (Subsidized)`}
                      disabled
                      className="form-input disabled-input"
                    />
                    <span className="field-hint">
                      {t('farmerLoans.interestRateHint', 'FPO subsidized rate — fixed for this scheme.')}
                    </span>
                  </div>

                  {/* Repayment Frequency */}
                  <div className="form-field-group">
                    <label className="form-field-label">
                      {t('farmerLoans.frequencyLabel')} *
                    </label>
                    <select
                      value={applyFormData.repaymentFrequency}
                      onChange={(e) =>
                        setApplyFormData((prev) => ({
                          ...prev,
                          repaymentFrequency: e.target.value,
                        }))
                      }
                      className="form-input"
                    >
                      {applyScheme.supportedFrequencies.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <span className="field-hint">Frequency of installment payments</span>
                  </div>
                </div>

                {/* Purpose (Pre-filled from Scheme) */}
                <div className="form-field-group full-width">
                  <label className="form-field-label">Loan Purpose *</label>
                  <input
                    type="text"
                    value={applyFormData.purpose}
                    onChange={(e) =>
                      setApplyFormData((prev) => ({ ...prev, purpose: e.target.value }))
                    }
                    className="form-input"
                    required
                  />
                  <span className="field-hint">
                    Directly matches agricultural purpose approved under this credit line
                  </span>
                </div>

                {/* Optional Remarks */}
                <div className="form-field-group full-width">
                  <label className="form-field-label">
                    {t('farmerLoans.remarksLabel')}
                  </label>
                  <textarea
                    rows={2}
                    value={applyFormData.remarks}
                    onChange={(e) =>
                      setApplyFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder={t('farmerLoans.remarksPlaceholder')}
                    className="form-input textarea-input"
                  />
                </div>

                {/* Live Pre-Submission EMI Preview */}
                <div className="pre-submit-emi-preview">
                  <div className="preview-item">
                    <span className="preview-label">Estimated Monthly EMI</span>
                    <strong className="preview-val highlight-green">
                      ₹
                      {calculateEMI(
                        applyFormData.loanAmount,
                        applyScheme.interestRate,
                        applyFormData.tenureMonths
                      ).emi.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">Total Repayment</span>
                    <strong className="preview-val">
                      ₹
                      {calculateEMI(
                        applyFormData.loanAmount,
                        applyScheme.interestRate,
                        applyFormData.tenureMonths
                      ).totalRepayment.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">Processing Fee</span>
                    <strong className="preview-val text-success">
                      {applyScheme.processingFee}
                    </strong>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="scheme-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={handleCloseApplyModal}
                    disabled={submittingApply}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-apply"
                    disabled={submittingApply}
                  >
                    {submittingApply ? (
                      <>
                        <RefreshCw size={16} className="spinning" />
                        <span>{t('farmerLoans.submitting')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('farmerLoans.submitApplication')}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerLoans;
