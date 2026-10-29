import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.join(__dirname, 'locales', 'en.json');
const taPath = path.join(__dirname, 'locales', 'ta.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

// 1. Header extensions
en.header = {
  ...en.header,
  farmerPortalTitle: "FarmSphere Farmer Portal",
  farmerPortalSub: "Agricultural Credit & Document Services",
  verified: "✓ Verified",
  verify: "Verify",
  linkPhone: "+ Link Phone",
  farmerRole: "FARMER",
  farmerDefault: "Farmer",
  themeDark: "Dark",
  themeLight: "Light",
  signOut: "Sign Out",
  verifiedTooltip: "Verified mobile number (Click to update)",
  unverifiedTooltip: "Mobile unverified (Click to verify)",
  linkPhoneTooltip: "Link mobile number for SMS notifications"
};

ta.header = {
  ...ta.header,
  farmerPortalTitle: "ஃபார்ம்ஸ்பியர் உழவர் தளம்",
  farmerPortalSub: "விவசாயக் கடன் & ஆவணச் சேவைகள்",
  verified: "✓ சரிபார்க்கப்பட்டது",
  verify: "சரிபார்க்கவும்",
  linkPhone: "+ மொபைலை இணைக்கவும்",
  farmerRole: "விவசாயி",
  farmerDefault: "விவசாயி",
  themeDark: "இருண்டது",
  themeLight: "வெளிச்சம்",
  signOut: "வெளியேறு",
  verifiedTooltip: "சரிபார்க்கப்பட்ட மொபைல் எண் (புதுப்பிக்க கிளிக் செய்யவும்)",
  unverifiedTooltip: "சரிபார்க்கப்படாத மொபைல் (சரிபார்க்க கிளிக் செய்யவும்)",
  linkPhoneTooltip: "SMS அறிவிப்புகளுக்கு மொபைல் எண்ணை இணைக்கவும்"
};

// 2. Nav extensions
en.nav = {
  ...en.nav,
  farmerPortal: "Farmer Portal",
  farmerMember: "Farmer Member",
  fpoMember: "FPO Member"
};

ta.nav = {
  ...ta.nav,
  farmerPortal: "உழவர் தளம்",
  farmerMember: "உழவர் உறுப்பினர்",
  fpoMember: "FPO உறுப்பினர்"
};

// 3. Farmer layout banner
en.farmerLayout = {
  verifyPhoneBanner: "Verify your mobile number to receive instant SMS notifications for loan status, disbursements, and payment receipts.",
  verifyNow: "Verify Now"
};

ta.farmerLayout = {
  verifyPhoneBanner: "கடன் நிலை, வழங்கல் மற்றும் கட்டண ரசீதுகளுக்கான உடனடி SMS அறிவிப்புகளைப் பெற உங்கள் மொபைல் எண்ணை சரிபார்க்கவும்.",
  verifyNow: "இப்போதே சரிபார்க்கவும்"
};

// 4. Phone Verification Modal
en.phoneVerification = {
  modalTitleVerify: "Verify Mobile Number",
  modalTitleUpdate: "Update Mobile Number",
  modalSubtitle: "For SMS loan status & repayment alerts",
  verifiedTitle: "Mobile Number Verified!",
  verifiedDesc: "Your account is now linked to {{phone}} with verified status.",
  phonePrompt: "Enter your 10-digit Indian mobile number. We will send a 6-digit one-time password (OTP) via SMS to verify your identity.",
  phoneLabel: "Mobile Number",
  sendOtp: "Send Verification Code",
  sendingOtp: "Sending SMS...",
  otpPrompt: "Enter the 6-digit verification code sent to {{phone}}",
  otpLabel: "6-Digit SMS Code",
  verifyOtp: "Verify & Link Mobile",
  verifyingOtp: "Verifying Code...",
  resendIn: "Resend in {{seconds}}s",
  resendOtp: "Resend OTP",
  changeNumber: "← Change mobile number",
  errValidPhone: "Please enter a valid 10-digit mobile number",
  errValidOtp: "Please enter the 6-digit code received via SMS",
  errServer: "Unable to reach the server. Please verify your network connection and server status.",
  errSmsUnavailable: "SMS delivery is currently unavailable on the server.",
  errSessionExpired: "Session expired. Please sign in again to verify your mobile number.",
  errFailedSend: "Failed to send verification code. Please try again.",
  errInvalidOtp: "Invalid or expired verification code"
};

ta.phoneVerification = {
  modalTitleVerify: "கைபேசி எண்ணை சரிபார்க்கவும்",
  modalTitleUpdate: "கைபேசி எண்ணை புதுப்பிக்கவும்",
  modalSubtitle: "கடன் நிலை & திருப்பிச் செலுத்தும் SMS அறிவிப்புகளுக்கு",
  verifiedTitle: "கைபேசி எண் சரிபார்க்கப்பட்டது!",
  verifiedDesc: "உங்கள் கணக்கு இப்போது சரிபார்க்கப்பட்ட நிலையுடன் {{phone}} உடன் இணைக்கப்பட்டுள்ளது.",
  phonePrompt: "உங்கள் 10 இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும். உங்கள் அடையாளத்தை சரிபார்க்க SMS மூலம் 6 இலக்க ஒரு முறை கடவுச்சொல்லை (OTP) அனுப்புவோம்.",
  phoneLabel: "கைபேசி எண்",
  sendOtp: "சரிபார்ப்புக் குறியீட்டை அனுப்பவும்",
  sendingOtp: "SMS அனுப்பப்படுகிறது...",
  otpPrompt: "{{phone}} என்ற எண்ணிற்கு அனுப்பப்பட்ட 6 இலக்க சரிபார்ப்புக் குறியீட்டை உள்ளிடவும்",
  otpLabel: "6 இலக்க SMS குறியீடு",
  verifyOtp: "சரிபார்த்து மொபைலை இணைக்கவும்",
  verifyingOtp: "குறியீடு சரிபார்க்கப்படுகிறது...",
  resendIn: "{{seconds}} வினாடிகளில் மீண்டும் அனுப்பலாம்",
  resendOtp: "OTP-ஐ மீண்டும் அனுப்பவும்",
  changeNumber: "← கைபேசி எண்ணை மாற்றவும்",
  errValidPhone: "சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்",
  errValidOtp: "SMS மூலம் பெறப்பட்ட 6 இலக்கக் குறியீட்டை உள்ளிடவும்",
  errServer: "சேவையகத்தை அணுக முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.",
  errSmsUnavailable: "சேவையகத்தில் SMS சேவை தற்போது கிடைக்கவில்லை.",
  errSessionExpired: "அமர்வு காலாவதியானது. உங்கள் மொபைல் எண்ணை சரிபார்க்க மீண்டும் உள்நுழையவும்.",
  errFailedSend: "சரிபார்ப்புக் குறியீட்டை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
  errInvalidOtp: "தவறான அல்லது காலாவதியான சரிபார்ப்புக் குறியீடு"
};

// 5. Farmer Dashboard extensions
en.farmerDashboard = {
  ...en.farmerDashboard,
  requested: "requested",
  amountRequested: "₹{{amount}} requested",
  pendingReview: "pending review",
  pendingReviewCount: "{{count}} pending review",
  awaitingPayment: "Awaiting payment",
  overdueCount: "{{count}} overdue",
  noLoansDesc: "Your submitted loan applications will appear here.",
  applyForLoan: "Apply for a Loan",
  thLoanId: "Loan ID",
  thScheme: "Scheme / Purpose",
  thAmount: "Amount",
  thStatus: "Status",
  thAppliedDate: "Applied Date",
  thActions: "Actions",
  thInstallment: "Installment #",
  thDueDate: "Due Date",
  thPrincipal: "Principal",
  thInterest: "Interest",
  thTotalEmi: "Total EMI",
  thPaidDate: "Paid Date",
  thDocType: "Document Type",
  thDocTitle: "Document Title",
  thUploadedDate: "Uploaded Date",
  viewBtn: "View",
  previewBtn: "Preview",
  verified: "VERIFIED",
  pending: "PENDING"
};

ta.farmerDashboard = {
  ...ta.farmerDashboard,
  requested: "கோரப்பட்டது",
  amountRequested: "₹{{amount}} கோரப்பட்டது",
  pendingReview: "மதிப்பாய்வில் உள்ளது",
  pendingReviewCount: "{{count}} மதிப்பாய்வில் உள்ளது",
  awaitingPayment: "கட்டணத்திற்காக காத்திருக்கிறது",
  overdueCount: "{{count}} நிலுவையில் உள்ளது",
  noLoansDesc: "நீங்கள் சமர்ப்பித்த கடன் விண்ணப்பங்கள் இங்கே தோன்றும்.",
  applyForLoan: "கடனுக்கு விண்ணப்பிக்கவும்",
  thLoanId: "கடன் ஐடி",
  thScheme: "திட்டம் / நோக்கம்",
  thAmount: "தொகை",
  thStatus: "நிலை",
  thAppliedDate: "விண்ணப்பித்த தேதி",
  thActions: "செயல்கள்",
  thInstallment: "தவணை எண்",
  thDueDate: "கடைசி தேதி",
  thPrincipal: "அசல்",
  thInterest: "வட்டி",
  thTotalEmi: "மொத்த தவணை (EMI)",
  thPaidDate: "செலுத்திய தேதி",
  thDocType: "ஆவண வகை",
  thDocTitle: "ஆவண தலைப்பு",
  thUploadedDate: "பதிவேற்றிய தேதி",
  viewBtn: "பார்வையிடு",
  previewBtn: "முன்னோட்டம்",
  verified: "சரிபார்க்கப்பட்டது",
  pending: "நிலுவையில் உள்ளது"
};

// 6. Farmer Loans extensions
en.farmerLoans = {
  ...en.farmerLoans,
  officialCreditLine: "Official FPO Credit Line",
  loggedInAs: "Logged in as:",
  farmerMember: "Farmer Member",
  farmerRoleDesc: "Your profile is registered with role FARMER. You can browse all institutional credit schemes, run interactive EMI projections, and submit new loan applications directly.",
  fpoStatus: "FPO Status",
  activeMember: "Active Member",
  kycStanding: "KYC Standing",
  verified: "Verified",
  pendingReview: "Pending Review",
  illustrativeExample: "Illustrative Example",
  pa: "p.a.",
  months: "Months",
  perMonth: "month",
  estimatedEmiFor: "Estimated EMI (for ₹{{amount}} @ {{tenure}}m):",
  keyEligibility: "Key Eligibility:",
  activeFpoMember: "Active registered FPO member",
  docsLabel: "Documents:",
  moreCount: "+{{count}} more",
  schemes: {
    "crop-production": {
      name: "Seasonal Crop Production & Input Loan",
      category: "Crop Inputs & Seasonal Credit",
      description: "Short-term agricultural working capital credit designed for small and marginal farmers to purchase certified high-yield seeds, bio-fertilizers, organic pesticides, micro-nutrients, and essential seasonal cultivation inputs.",
      purpose: "Organic Wheat Seeds & Bio-Fertilizers Purchase"
    },
    "micro-irrigation": {
      name: "Solar Micro-Irrigation & Water Infrastructure",
      category: "Micro-Irrigation & Water",
      description: "Medium-term credit facility to finance drip and sprinkler irrigation units, solar water pumps, field pipelines, farm ponds, and water harvesting structures to maximize water efficiency.",
      purpose: "Solar Pump & Drip Irrigation Installation"
    },
    "farm-machinery": {
      name: "Farm Machinery & Equipment Finance",
      category: "Farm Machinery & Equipment",
      description: "Term loan for purchasing modern tractors, power tillers, rotavators, combined harvesters, laser levelers, and specialized farm implements to reduce labor dependency and improve productivity.",
      purpose: "45HP Tractor & Rotary Tiller Procurement"
    },
    "polyhouse-horticulture": {
      name: "Polyhouse & Protected Cultivation Credit",
      category: "Protected Cultivation / Polyhouse",
      description: "Structured credit for setting up climate-controlled polyhouses, shade net structures, and high-value exotic vegetable and flower cultivation with integrated micro-climate automation.",
      purpose: "Naturally Ventilated Polyhouse Construction (1000 sqm)"
    },
    "post-harvest": {
      name: "Post-Harvest Storage & Produce Marketing Credit",
      category: "Post-Harvest & Storage",
      description: "Working capital advance against electronic negotiable warehouse receipts (e-NWR) and pledge financing to avoid distress selling of agricultural harvest.",
      purpose: "Produce Marketing Advance against Warehouse Receipt"
    },
    "dairy-farming": {
      name: "Dairy Farming & Livestock Credit",
      category: "Dairy Farming",
      description: "Finance for milch cattle purchase, cattle sheds, chaff cutters, and automated milking equipment for dairy farmers.",
      purpose: "Purchase of High-Yield Milch Cows and Modern Shed"
    },
    "poultry-farming": {
      name: "Poultry Farming & Shed Construction Credit",
      category: "Poultry Farming",
      description: "Financing for broiler and layer shed construction, poultry equipment, automated feeding systems, and day-old chicks.",
      purpose: "Commercial Broiler Shed Construction (5000 birds)"
    },
    "goat-sheep-rearing": {
      name: "Goat & Sheep Rearing Credit",
      category: "Goat and Sheep Rearing",
      description: "Credit support for smallholder farmers to purchase commercial breeding units of goats and sheep with elevated shed construction.",
      purpose: "Breeding Unit (20 Does + 1 Buck) & Shed Setup"
    },
    "fisheries-aquaculture": {
      name: "Fisheries & Aquaculture Development Credit",
      category: "Fisheries and Aquaculture",
      description: "Term loans for freshwater fish farming, shrimp ponds, pond aeration units, and fingerling stocking.",
      purpose: "Freshwater Fish Pond Excavation & Seed Stocking"
    },
    "coconut-plantation": {
      name: "Coconut Plantation Development Credit",
      category: "Coconut Plantation Development",
      description: "Long-term credit for coconut seedling replanting, drip fertigation, basin management, intercropping, and value-added copra drying.",
      purpose: "Coconut Replantation, Drip Fertigation & Basin Setup"
    },
    "horticulture-plantation": {
      name: "Horticulture & Plantation Crop Credit",
      category: "Horticulture and Plantation Crops",
      description: "Multi-year gestation credit for establishing orchards (mango, guava, banana, citrus, pomegranate) and spice plantations.",
      purpose: "High-Density Mango & Guava Orchard Establishment"
    },
    "organic-farming": {
      name: "Organic Farming & Certification Credit",
      category: "Organic Farming",
      description: "Transition financing to assist conventional farmers migrating to certified organic cultivation with compost units and bio-inputs.",
      purpose: "Organic Transition Inputs, Vermicompost & NPOP Certification"
    },
    "farm-land-development": {
      name: "Farm Land Development & Soil Health Credit",
      category: "Farm Land Development",
      description: "Long-term improvement credit for land leveling, contour bunding, soil health conditioning, desalination, and sub-surface drainage.",
      purpose: "Laser Land Leveling, Bunding & Soil Remediation"
    },
    "cold-storage-processing": {
      name: "Cold Storage & Agri-Processing Unit Credit",
      category: "Cold Storage and Processing",
      description: "Capital financing for establishing on-farm mini cold storage units, sorting/grading lines, flour mills, oil expellers, and pulse mills.",
      purpose: "On-Farm Solar Micro-Cold Room & Grading Facility"
    },
    "agri-transport-logistics": {
      name: "Agricultural Transport & Logistics Credit",
      category: "Agricultural Transport and Logistics",
      description: "Medium commercial vehicle financing for refrigerated vans, multi-utility rural trucks, and insulated bulk tankers for agricultural produce.",
      purpose: "Pick-up Utility Truck for Direct Market Farm Produce Supply"
    }
  }
};

ta.farmerLoans = {
  ...ta.farmerLoans,
  officialCreditLine: "அதிகாரப்பூர்வ FPO கடன் திட்டம்",
  loggedInAs: "உள்நுழைந்துள்ள கணக்கு:",
  farmerMember: "உழவர் உறுப்பினர்",
  farmerRoleDesc: "உங்கள் சுயவிவரம் 'விவசாயி' (FARMER) பாத்திரத்துடன் பதிவு செய்யப்பட்டுள்ளது. நீங்கள் அனைத்து நிறுவன கடன் திட்டங்களையும் உலாவலாம், ஊடாடும் EMI மதிப்பீடுகளை கணக்கிடலாம் மற்றும் புதிய கடன் விண்ணப்பங்களை நேரடியாக சமர்ப்பிக்கலாம்.",
  fpoStatus: "FPO நிலை",
  activeMember: "செயலில் உள்ள உறுப்பினர்",
  kycStanding: "KYC நிலை",
  verified: "சரிபார்க்கப்பட்டது",
  pendingReview: "மதிப்பாய்வில் உள்ளது",
  illustrativeExample: "விளக்க மாதிரி",
  pa: "ஆண்டுக்கு",
  months: "மாதங்கள்",
  perMonth: "மாதம்",
  estimatedEmiFor: "மதிப்பிடப்பட்ட EMI (₹{{amount}} - {{tenure}} மாதங்களுக்கு):",
  keyEligibility: "முக்கிய தகுதிகள்:",
  activeFpoMember: "பதிவுசெய்த செயலில் உள்ள FPO உறுப்பினர்",
  docsLabel: "ஆவணங்கள்:",
  moreCount: "+{{count}} மேலும்",
  schemes: {
    "crop-production": {
      name: "பருவகால பயிர் சாகுபடி & உள்ளீட்டுக் கடன்",
      category: "பயிர் உள்ளீடுகள் & பருவகால கடன்",
      description: "சிறு மற்றும் குறு விவசாயிகள் சான்றளிக்கப்பட்ட உயர் விளைச்சல் விதைகள், உயிர் உரங்கள், இயற்கை பூச்சிக்கொல்லிகள், நுண்ணூட்டச்சத்துக்கள் மற்றும் அத்தியாவசிய சாகுபடி உள்ளீடுகளை வாங்க வடிவமைக்கப்பட்ட குறுகிய கால விவசாய கடன்.",
      purpose: "இயற்கை கோதுமை விதைகள் & உயிர் உரங்கள் கொள்முதல்"
    },
    "micro-irrigation": {
      name: "சூரியசக்தி நுண்ணீர்ப் பாசனம் & நீர் உள்கட்டமைப்பு கடன்",
      category: "நுண்ணீர்ப் பாசனம் & நீர் மேலாண்மை",
      description: "சொட்டு நீர் மற்றும் தெளிப்பு நீர் பாசன அமைப்புகள், சூரியசக்தி நீர் பம்புகள், பாசன குழாய்கள் மற்றும் பண்ணைக் குட்டைகள் அமைக்க உதவும் நடுத்தர கால கடன்.",
      purpose: "சூரியசக்தி பம்ப் & சொட்டு நீர் பாசனம் அமைத்தல்"
    },
    "farm-machinery": {
      name: "பண்ணை இயந்திரங்கள் & உபகரணங்கள் நிதியுதவி",
      category: "பண்ணை இயந்திரங்கள் & கருவிகள்",
      description: "நவீன டிராக்டர்கள், பவர் டில்லர்கள், ரோட்டாவேட்டர்கள், அறுவடை இயந்திரங்கள் மற்றும் பண்ணைக் கருவிகளை வாங்க உதவும் தவணைக் கடன்.",
      purpose: "45HP டிராக்டர் & ரோட்டரி டில்லர் வாங்குதல்"
    },
    "polyhouse-horticulture": {
      name: "பாலிஹவுஸ் & பாதுகாக்கப்பட்ட பயிர் சாகுபடிக் கடன்",
      category: "பாதுகாக்கப்பட்ட சாகுபடி / பாலிஹவுஸ்",
      description: "காலநிலைக் கட்டுப்படுத்தப்பட்ட பாலிஹவுஸ், நிழல் வலைக் குடில்கள் மற்றும் உயர்மதிப்பு காய்கறிகள், மலர்கள் சாகுபடி செய்ய உதவும் சிறப்பு கடன்.",
      purpose: "இயற்கை காற்றோட்ட பாலிஹவுஸ் கட்டுமானம் (1000 சதுர மீட்டர்)"
    },
    "post-harvest": {
      name: "அறுவடைக்கு பிந்தைய சேமிப்பு & விற்பனைக் கடன்",
      category: "அறுவடைக்கு பிந்தைய மேலாண்மை & சேமிப்பு",
      description: "அறுவடை செய்த விளைபொருட்களை குறைந்த விலைக்கு விற்பதைத் தவிர்க்க, கிடங்கு ரசீதுகள் மற்றும் விளைபொருட்கள் அடமானத்தின் பேரில் வழங்கப்படும் கடன்.",
      purpose: "கிடங்கு ரசீது அடிப்படையில் விளைபொருள் சந்தைப்படுத்தல் முன்பணம்"
    },
    "dairy-farming": {
      name: "பால் பண்ணை & கால்நடை வளர்ப்புக் கடன்",
      category: "பால் பண்ணை",
      description: "கறவை மாடுகள் வாங்குதல், மாட்டுக் கொட்டகை அமைத்தல், தீவன வெட்டும் கருவிகள் மற்றும் பால் கறக்கும் இயந்திரங்கள் வாங்க வழங்கப்படும் கடன்.",
      purpose: "உயர் விளைச்சல் கறவை மாடுகள் வாங்குதல் & நவீன கொட்டகை"
    },
    "poultry-farming": {
      name: "கோழிப் பண்ணை & கொட்டகை அமைப்புக் கடன்",
      category: "கோழிப் பண்ணை",
      description: "கறிக்கோழி மற்றும் முட்டைக்கோழி கொட்டகைகள் அமைத்தல், தீவன அமைப்புகள் மற்றும் கோழிக்குஞ்சுகள் வாங்க உதவும் கடன்.",
      purpose: "வணிக பிராய்லர் கோழிக் கொட்டகை அமைத்தல் (5000 கோழிகள்)"
    },
    "goat-sheep-rearing": {
      name: "ஆடு வளர்ப்பு & பராமரிப்புக் கடன்",
      category: "ஆடு வளர்ப்பு",
      description: "சிறு விவசாயிகள் ஆடுகள் வாங்கவும், நவீன பரண் அமைப்பில் கொட்டகை அமைக்கவும் வழங்கப்படும் கடன் உதவி.",
      purpose: "இனப்பெருக்க ஆடுகள் (20 பெண் + 1 ஆண்) & கொட்டகை அமைத்தல்"
    },
    "fisheries-aquaculture": {
      name: "மீன் வளர்ப்பு & நீர்வாழ் உயிரின மேம்பாட்டுக் கடன்",
      category: "மீன் வளம் & நீர்வாழ் வளர்ப்பு",
      description: "நன்னீர் மீன் வளர்ப்பு, இறால் குளங்கள் அமைத்தல், காற்றூட்டும் அமைப்புகள் மற்றும் மீன் குஞ்சுகள் வாங்க தவணைக் கடன்.",
      purpose: "நன்னீர் மீன் குளம் வெட்டுதல் & மீன் குஞ்சுகள் விடுதல்"
    },
    "coconut-plantation": {
      name: "தென்னை சாகுபடி & பராமரிப்புக் கடன்",
      category: "தென்னை மேம்பாடு",
      description: "தென்னங்கன்றுகள் நடுதல், சொட்டு நீர் பாசனம், ஊடுபயிர் சாகுபடி மற்றும் கொப்பரை உலர் களங்கள் அமைக்க நீண்ட கால கடன்.",
      purpose: "தென்னை மறுநடவு, சொட்டு நீர் உரம் & பாசன அமைப்பு"
    },
    "horticulture-plantation": {
      name: "தோட்டக்கலை & பழப்பயிர் சாகுபடிக் கடன்",
      category: "தோட்டக்கலை & பயிர்கள்",
      description: "மா, கொய்யா, வாழை, எலுமிச்சை போன்ற பழத்தோட்டங்கள் மற்றும் நறுமணப் பயிர்களை நிறுவ பல ஆண்டு கால கடன்.",
      purpose: "அடர்ந்த மா & கொய்யா பழத்தோட்டம் அமைத்தல்"
    },
    "organic-farming": {
      name: "இயற்கை விவசாயம் & சான்றிதழ் கடன்",
      category: "இயற்கை விவசாயம்",
      description: "இயற்கை விவசாயத்திற்கு மாறுவதற்கும், மண்புழு உரக் கூடங்கள் அமைப்பதற்கும், இயற்கை சான்றிதழ் பெறுவதற்கும் நிதியுதவி.",
      purpose: "இயற்கை உள்ளீடுகள், மண்புழு உரம் & NPOP சான்றிதழ் பெறுதல்"
    },
    "farm-land-development": {
      name: "நில மேம்பாடு & மண்வளப் பாதுகாப்புக் கடன்",
      category: "நில மேம்பாடு",
      description: "நிலத்தை சமன்படுத்துதல், வரப்புகள் அமைத்தல், மண்வள சிகிச்சை மற்றும் வடிகால் வசதிகள் செய்ய நீண்ட கால கடன்.",
      purpose: "லேசர் நில சமன்படுத்துதல், வரப்பு & மண்வள சீரமைப்பு"
    },
    "cold-storage-processing": {
      name: "குளிர்பதனக் கிடங்கு & வேளாண் பதப்படுத்துதல் கடன்",
      category: "குளிர்பதனம் & பதப்படுத்துதல்",
      description: "பண்ணை அளவிலான மினி குளிர்பதனக் கிடங்குகள், தரம் பிரிக்கும் அமைப்புகள், மாவு மில்கள் மற்றும் எண்ணெய் பிழியும் ஆலைகள் அமைக்க மூலதனக் கடன்.",
      purpose: "சூரியசக்தி மினி குளிர்பதன அறை & தரம் பிரிக்கும் கூடம்"
    },
    "agri-transport-logistics": {
      name: "வேளாண் சரக்கு போக்குவரத்து & விநியோகக் கடன்",
      category: "வேளாண் போக்குவரத்து",
      description: "குளிரூட்டப்பட்ட சரக்கு வாகனங்கள், கிராமப்புற சரக்கு வாகனங்கள் மற்றும் பால் டேங்கர்கள் வாங்க வணிக வாகன நிதியுதவி.",
      purpose: "பண்ணை விளைபொருட்களை சந்தைக்கு கொண்டு செல்ல பிக்-அப் வாகனம்"
    }
  }
};

// 7. Chatbot extensions
en.chatbot = {
  title: "FarmSphere Loan Assistant",
  clearChat: "Clear conversation",
  closeChat: "Close window",
  faqTitle: "Frequently Asked Questions:",
  inputPlaceholderQuestionnaire: "Type your answer or 'skip'…",
  inputPlaceholderDefault: "Ask a question about loans…",
  sendAria: "Send message",
  openAria: "Open FarmSphere loan assistance chatbot",
  viewDetails: "View Details",
  applyNow: "Apply Now →",
  applyDisabled: "Apply Disabled",
  demoBadge: "Illustrative Demo",
  activeBadge: "Active Scheme",
  metricInterest: "Interest",
  metricTenure: "Tenure",
  metricMin: "Min",
  metricMax: "Max",
  editAnswer: "Edit this answer",
  months: "m",
  pa: "% p.a.",
  suggestions: {
    whichLoan: "Which loan is suitable for me?",
    documents: "What documents do I need?",
    emi: "How much EMI will I pay?",
    apply: "How do I apply for a loan?",
    status: "How can I check my application status?"
  },
  followUps: {
    apply: "How do I apply?",
    documents: "What documents should I upload?",
    interest: "What is the interest rate?",
    emi: "What is my estimated EMI?",
    status: "How do I check my application status?"
  },
  questions: {
    purpose: "1/5: What is the purpose of the loan? (e.g., Irrigation, Crop Seeds & Fertilizer, Farm Machinery, Polyhouse, Storage, Dairy)",
    amount: "2/5: What loan amount do you require? (e.g., ₹90,000)",
    activity: "3/5: What type of farming or agricultural activity do you do? (e.g., Coconut farming, Wheat, Vegetables, Dairy)",
    membership: "4/5: Are you a registered member of the FPO or farmer cooperative? (Yes / No)",
    repayment: "5/5: What is your preferred repayment period in months? (e.g., 12 months)"
  },
  messages: {
    welcome: "Hello! I am your FarmSphere Loan Assistance Assistant.\n\nI can help you find suitable loan schemes, calculate your EMI, explain required documents, or check your application status.\n\nChoose an option below or type your question:",
    startQuestionnaire: "Let's find the best loan scheme for you! I'll ask 5 quick questions.\n\n",
    updateAnswer: "Let's update your answer:\n\n",
    noMatchFound: "Thank you for sharing your requirements.\n\nWe could not verify an exact matching loan scheme based on your stated purpose, amount, and repayment tenure.\n\nThis usually occurs when the requested amount or repayment tenure falls outside the standard guidelines of currently active schemes.\n\nYou can browse all 15 loan categories in the **Available Loans** catalog or ask our FPO officer for tailored credit terms.",
    recIntroSingle: "Based on your requirements, here is the best matching loan scheme:",
    recIntroMultiple: "Based on your requirements, here are the top matching loan schemes (ranked by eligibility and purpose compatibility):",
    recFollowUp: "What would you like to do next? You can click **View Details** or **Apply Now** on real schemes above, or ask any follow-up question below:",
    demoNotice: "Notice: This is an illustrative demonstration product. Applications cannot be submitted for this entry.",
    financialTerms: "Financial Terms:",
    whyMatches: "Why It Matches Your Needs:",
    keyEligibility: "Key Eligibility Verification Conditions:",
    reqDocs: "Required Documents:",
    ratePerAnnum: "% p.a.",
    sanctionLimit: "Sanction Limit:",
    tenureMonths: "Months"
  }
};

ta.chatbot = {
  title: "ஃபார்ம்ஸ்பியர் கடன் உதவியாளர்",
  clearChat: "உரையாடலை அழிக்கவும்",
  closeChat: "சாளரத்தை மூடவும்",
  faqTitle: "அடிக்கடி கேட்கப்படும் கேள்விகள்:",
  inputPlaceholderQuestionnaire: "உங்கள் பதிலை உள்ளிடவும் அல்லது 'skip' என தட்டச்சு செய்யவும்…",
  inputPlaceholderDefault: "கடன்கள் பற்றி ஒரு கேள்வியைக் கேளுங்கள்…",
  sendAria: "செய்தியை அனுப்பவும்",
  openAria: "ஃபார்ம்ஸ்பியர் கடன் உதவி சாட்பாட்டைத் திறக்கவும்",
  viewDetails: "விவரங்களைக் காண்க",
  applyNow: "இப்போதே விண்ணப்பிக்கவும் →",
  applyDisabled: "விண்ணப்பம் முடக்கப்பட்டது",
  demoBadge: "விளக்க மாதிரி",
  activeBadge: "செயலில் உள்ள திட்டம்",
  metricInterest: "வட்டி",
  metricTenure: "கால அளவு",
  metricMin: "குறைந்தபட்சம்",
  metricMax: "அதிகபட்சம்",
  editAnswer: "இந்த பதிலை மாற்றவும்",
  months: "மாதங்கள்",
  pa: "% ஆண்டுக்கு",
  suggestions: {
    whichLoan: "எந்த கடன் எனக்கு ஏற்றது?",
    documents: "என்ன ஆவணங்கள் தேவை?",
    emi: "மாதத் தவணை (EMI) எவ்வளவு?",
    apply: "கடனுக்கு விண்ணப்பிப்பது எப்படி?",
    status: "விண்ணப்ப நிலையை எவ்வாறு அறிவது?"
  },
  followUps: {
    apply: "விண்ணப்பிப்பது எப்படி?",
    documents: "என்ன ஆவணங்களை பதிவேற்ற வேண்டும்?",
    interest: "வட்டி விகிதம் என்ன?",
    emi: "எனது மதிப்பிடப்பட்ட EMI எவ்வளவு?",
    status: "விண்ணப்ப நிலையை சரிபார்ப்பது எப்படி?"
  },
  questions: {
    purpose: "1/5: கடனின் நோக்கம் என்ன? (எ.கா: பாசனம்/மோட்டார் பம்ப், பயிர் விதைகள் & உரம், பண்ணை இயந்திரங்கள்/டிராக்டர், பாலிஹவுஸ், சேமிப்புக் கிடங்கு, பால் பண்ணை)",
    amount: "2/5: உங்களுக்கு எவ்வளவு கடன் தொகை தேவை? (எ.கா: ₹90,000)",
    activity: "3/5: நீங்கள் என்ன வகையான விவசாயம் அல்லது வேளாண்மை செய்கிறீர்கள்? (எ.கா: தென்னை விவசாயம், நெல், காய்கறிகள், பால் பண்ணை)",
    membership: "4/5: நீங்கள் உழவர் உற்பத்தியாளர் நிறுவனத்தில் (FPO) அல்லது கூட்டுறவு சங்கத்தில் பதிவு செய்த உறுப்பினரா? (ஆம் / இல்லை)",
    repayment: "5/5: நீங்கள் விரும்பும் திருப்பிச் செலுத்தும் காலம் எத்தனை மாதங்கள்? (எ.கா: 12 மாதங்கள்)"
  },
  messages: {
    welcome: "வணக்கம்! நான் உங்கள் ஃபார்ம்ஸ்பியர் (FarmSphere) கடன் உதவி உதவியாளர்.\n\nஉங்களுக்குப் பொருத்தமான கடன் திட்டங்களைக் கண்டறியவும், EMI கணக்கிடவும், தேவையான ஆவணங்களை அறியவும் அல்லது உங்கள் விண்ணப்ப நிலையைச் சரிபார்க்கவும் நான் உதவ முடியும்.\n\nகீழே உள்ள விருப்பத்தைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் கேள்வியைத் தட்டச்சு செய்யவும்:",
    startQuestionnaire: "உங்களுக்கான சிறந்த கடன் திட்டத்தைக் கண்டறிவோம்! நான் 5 எளிய கேள்விகளைக் கேட்கிறேன்.\n\n",
    updateAnswer: "உங்கள் பதிலை புதுப்பிப்போம்:\n\n",
    noMatchFound: "உங்கள் தேவைகளைப் பகிர்ந்தமைக்கு நன்றி.\n\nநீங்கள் குறிப்பிட்ட நோக்கம், தொகை மற்றும் திருப்பிச் செலுத்தும் காலத்தின் அடிப்படையில் தகுதியான கடன் திட்டம் நேரடியாகப் பொருந்தவில்லை.\n\nவழக்கமாக கோரப்பட்ட தொகை அல்லது திருப்பிச் செலுத்தும் காலம் தற்போது நடைமுறையில் உள்ள திட்டங்களின் வரம்பிற்கு வெளியே இருக்கும்போது இது நிகழ்கிறது.\n\nநீங்கள் **கிடைக்கும் கடன்கள்** பட்டியலில் உள்ள அனைத்து கடன் வகைகளையும் பார்க்கலாம் அல்லது பொருத்தமான கடன் விதிமுறைகளுக்கு எங்கள் FPO அதிகாரியைத் தொடர்பு கொள்ளலாம்.",
    recIntroSingle: "உங்கள் தேவைகளின் அடிப்படையில் சிறந்த கடன் திட்டம்:",
    recIntroMultiple: "உங்கள் தேவைகளின் அடிப்படையில் பரிந்துரைக்கப்படும் சிறந்த கடன் திட்டங்கள் (தகுதி மற்றும் நோக்கத்தின் அடிப்படையில் வரிசைப்படுத்தப்பட்டது):",
    recFollowUp: "அடுத்து என்ன செய்ய விரும்புகிறீர்கள்? மேலே உள்ள திட்டத்தில் **விவரங்களைக் காண்க** அல்லது **இப்போதே விண்ணப்பிக்கவும்** என்பதைக் கிளிக் செய்யலாம், அல்லது கீழே உள்ள ஏதேனும் கேள்வியைக் கேட்கலாம்:",
    demoNotice: "குறிப்பு: இது ஒரு விளக்க மாதிரி தயாரிப்பு ஆகும். இந்த பதிவிற்கு விண்ணப்பங்களைச் சமர்ப்பிக்க முடியாது.",
    financialTerms: "நிதி விதிமுறைகள்:",
    whyMatches: "இது உங்கள் தேவைகளுடன் எவ்வாறு பொருந்துகிறது:",
    keyEligibility: "முக்கிய தகுதி சரிபார்ப்பு நிபந்தனைகள்:",
    reqDocs: "தேவையான ஆவணங்கள்:",
    ratePerAnnum: "% ஆண்டுக்கு",
    sanctionLimit: "அனுமதி வரம்பு:",
    tenureMonths: "மாதங்கள்"
  }
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(taPath, JSON.stringify(ta, null, 2) + '\n', 'utf8');
console.log('Successfully updated en.json and ta.json with farmer extensions!');
