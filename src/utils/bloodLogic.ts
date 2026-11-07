import {
  BloodGroup,
  BloodCompatibilityInfo,
  BargunaUpazilaId,
  DemoDonor,
} from '../types/blood';

export const ALL_BLOOD_GROUPS: BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

export const BLOOD_COMPATIBILITY_MAP: Record<BloodGroup, BloodCompatibilityInfo> = {
  'A+': {
    group: 'A+',
    nameBn: 'এ পজিটিভ (A+)',
    canDonateTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
    plasmaCanDonateTo: ['A+', 'A-', 'O+', 'O-'],
    clinicalNoteBn: 'বাংলাদেশে অন্যতম প্রচলিত রক্তের গ্রুপ; A+ এবং AB+ রোগীদের লোহিত কণিকা দিতে পারে।',
    clinicalNoteEn: 'One of the most common blood types; red cells are compatible with A+ and AB+ recipients.',
  },
  'A-': {
    group: 'A-',
    nameBn: 'এ নেগেটিভ (A-)',
    canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-'],
    plasmaCanDonateTo: ['A+', 'A-', 'O+', 'O-'],
    clinicalNoteBn: 'দুর্লভ নেগেটিভ গ্রুপ; সকল A এবং AB গ্রুপের রোগীকে রক্ত দিতে পারে।',
    clinicalNoteEn: 'Rare Rh-negative group; can donate red blood cells to both Rh+ and Rh- A and AB patients.',
  },
  'B+': {
    group: 'B+',
    nameBn: 'বি পজিটিভ (B+)',
    canDonateTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
    plasmaCanDonateTo: ['B+', 'B-', 'O+', 'O-'],
    clinicalNoteBn: 'দক্ষিণ এশিয়ায় অত্যন্ত গুরুত্বপূর্ণ ও বহুল প্রচলিত গ্রুপ; B+ ও AB+ রোগীদের রক্ত দিতে পারে।',
    clinicalNoteEn: 'Highly prevalent across Bangladesh; donates red cells to B+ and AB+ patients.',
  },
  'B-': {
    group: 'B-',
    nameBn: 'বি নেগেটিভ (B-)',
    canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-'],
    plasmaCanDonateTo: ['B+', 'B-', 'O+', 'O-'],
    clinicalNoteBn: 'অত্যন্ত দুর্লভ গ্রুপ; জরুরি প্রয়োজনে B-, B+, AB- ও AB+ রোগীদের জীবন বাঁচাতে অপরিহার্য।',
    clinicalNoteEn: 'Rare blood type; vital reserve for B-, B+, AB-, and AB+ patients during emergencies.',
  },
  'O+': {
    group: 'O+',
    nameBn: 'ও পজিটিভ (O+)',
    canDonateTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-'],
    plasmaCanDonateTo: ['O+', 'O-'],
    clinicalNoteBn: 'সকল পজিটিভ রক্তের গ্রুপের (A+, B+, AB+, O+) রোগীকে লোহিত কণিকা দান করতে পারে।',
    clinicalNoteEn: 'High-demand blood group; can donate red cells to all Rh-positive blood groups.',
  },
  'O-': {
    group: 'O-',
    nameBn: 'ও নেগেটিভ (O-)',
    canDonateTo: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    canReceiveFrom: ['O-'],
    plasmaCanDonateTo: ['O+', 'O-'],
    clinicalNoteBn: 'সার্বজনীন রক্তদাতা (Universal Red Cell Donor); জরুরি ট্রমা ও নবজাতকের চিকিৎসায় অপরিহার্য।',
    clinicalNoteEn: 'Universal red blood cell donor; critical for emergency trauma when patient type is unknown.',
  },
  'AB+': {
    group: 'AB+',
    nameBn: 'এবি পজিটিভ (AB+)',
    canDonateTo: ['AB+'],
    canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    plasmaCanDonateTo: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    clinicalNoteBn: 'সার্বজনীন গ্রহীতা (Universal Red Cell Recipient); যেকোনো গ্রুপের লোহিত কণিকা গ্রহণ করতে পারে।',
    clinicalNoteEn: 'Universal red cell recipient and universal plasma donor across all ABO groups.',
  },
  'AB-': {
    group: 'AB-',
    nameBn: 'এবি নেগেটিভ (AB-)',
    canDonateTo: ['AB+', 'AB-'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    plasmaCanDonateTo: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    clinicalNoteBn: 'সবচেয়ে দুর্লভ রক্তের গ্রুপগুলোর একটি; প্লাজমা দানে সার্বজনীনভাবে কার্যকর।',
    clinicalNoteEn: 'Rarest blood group; receives from all Rh-negative types and serves as universal plasma donor.',
  },
};

export interface DonorFilterOptions {
  bloodGroup?: BloodGroup | 'ALL';
  upazilaId?: BargunaUpazilaId | 'ALL';
  onlyAvailable?: boolean;
  includeCompatibleDonors?: boolean;
  searchQuery?: string;
}

/**
 * Filters demonstration donors by exact or clinically compatible blood group,
 * Barguna upazila, availability status, and text query.
 */
export function filterDonors(
  donors: DemoDonor[],
  options: DonorFilterOptions
): DemoDonor[] {
  const {
    bloodGroup = 'ALL',
    upazilaId = 'ALL',
    onlyAvailable = false,
    includeCompatibleDonors = false,
    searchQuery = '',
  } = options;

  const allowedGroups: BloodGroup[] | null =
    bloodGroup === 'ALL'
      ? null
      : includeCompatibleDonors
      ? BLOOD_COMPATIBILITY_MAP[bloodGroup].canReceiveFrom
      : [bloodGroup];

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return donors.filter((donor) => {
    if (allowedGroups && !allowedGroups.includes(donor.bloodGroup)) {
      return false;
    }
    if (upazilaId !== 'ALL' && donor.upazilaId !== upazilaId) {
      return false;
    }
    if (onlyAvailable && !donor.isAvailable) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${donor.nameBn} ${donor.nameEn} ${donor.locationBn} ${donor.locationEn} ${donor.code} ${donor.bloodGroup}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}

export interface EligibilityInput {
  age: number;
  weightKg: number;
  daysSinceLastDonation: number;
  hemoglobinGdl?: number;
  hasRecentSurgeryOrIllness?: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  nextEligibleInDays: number;
  reasonsBn: string[];
  reasonsEn: string[];
}

/**
 * Evaluates standard Bangladesh safe blood donation clinical eligibility criteria:
 * - Age: 18 to 60 years
 * - Weight: >= 48 kg
 * - Interval since last whole blood donation: >= 90 days (3 months)
 * - Hemoglobin: >= 12.5 g/dL (if provided)
 */
export function checkDonorEligibility(input: EligibilityInput): EligibilityResult {
  const reasonsBn: string[] = [];
  const reasonsEn: string[] = [];
  let nextEligibleInDays = 0;

  if (input.age < 18 || input.age > 60) {
    reasonsBn.push('রক্তদাতার বয়স ১৮ থেকে ৬০ বছরের মধ্যে হতে হবে।');
    reasonsEn.push('Donor age must be between 18 and 60 years.');
  }

  if (input.weightKg < 48) {
    reasonsBn.push('নিরাপদ রক্তদানের জন্য ওজন কমপক্ষে ৪৮ কেজি (১০৬ পাউন্ড) হতে হবে।');
    reasonsEn.push('Minimum body weight for safe blood donation is 48 kg.');
  }

  if (input.daysSinceLastDonation < 90) {
    nextEligibleInDays = 90 - input.daysSinceLastDonation;
    reasonsBn.push(
      `সর্বশেষ রক্তদানের পর ৯০ দিন পূর্ণ হতে আরও ${toBnDigits(nextEligibleInDays)} দিন বাকি।`
    );
    reasonsEn.push(
      `Must wait ${nextEligibleInDays} more day(s) to complete the 90-day recovery interval.`
    );
  }

  if (input.hemoglobinGdl !== undefined && input.hemoglobinGdl < 12.5) {
    reasonsBn.push('হিমোগ্লোবিন মাত্রা কমপক্ষে ১২.৫ g/dL হতে হবে।');
    reasonsEn.push('Hemoglobin level must be at least 12.5 g/dL.');
  }

  if (input.hasRecentSurgeryOrIllness) {
    reasonsBn.push('সাম্প্রতিক বড় অস্ত্রোপচার বা তীব্র অসুস্থতা থাকলে বর্তমানে রক্তদান স্থগিত রাখুন।');
    reasonsEn.push('Please defer donation if recovering from recent major surgery or acute illness.');
  }

  return {
    eligible: reasonsBn.length === 0,
    nextEligibleInDays,
    reasonsBn,
    reasonsEn,
  };
}

export const VALID_BARGUNA_UPAZILA_IDS: readonly BargunaUpazilaId[] = [
  'barguna-sadar',
  'amtali',
  'betagi',
  'bamna',
  'patharghata',
  'taltali',
] as const;

/**
 * Validates that a (districtId, upazilaId) pair belongs to a valid parent-child
 * geographic hierarchy (currently Barguna District's 6 Upazilas, extensible to 64 districts).
 */
export function isValidDistrictUpazilaPair(
  districtId: string,
  upazilaId: string
): boolean {
  if (districtId !== 'barguna') {
    return false;
  }
  return (VALID_BARGUNA_UPAZILA_IDS as readonly string[]).includes(upazilaId);
}

export interface EmergencyRequestInput {
  patientName: string;
  bloodGroup: BloodGroup | '';
  bagsNeeded: number;
  upazilaId: BargunaUpazilaId | '';
  hospitalName: string;
  contactPhone: string;
}

export interface ValidationResult {
  valid: boolean;
  errorBn?: string;
  errorEn?: string;
}

/**
 * Validates emergency blood request inputs including strict Barguna Upazila membership,
 * field length boundaries, and Bangladesh mobile format.
 */
export function validateEmergencyRequest(
  input: EmergencyRequestInput
): ValidationResult {
  const trimmedPatient = (input.patientName || '').trim();
  if (trimmedPatient.length < 2 || trimmedPatient.length > 100) {
    return {
      valid: false,
      errorBn: 'রোগীর নাম ২ থেকে ১০০ অক্ষরের মধ্যে হতে হবে।',
      errorEn: 'Patient name must be between 2 and 100 characters.',
    };
  }
  if (!input.bloodGroup || !ALL_BLOOD_GROUPS.includes(input.bloodGroup)) {
    return {
      valid: false,
      errorBn: 'রক্তের গ্রুপ নির্বাচন করুন।',
      errorEn: 'Please select a valid blood group.',
    };
  }
  if (!Number.isFinite(input.bagsNeeded) || input.bagsNeeded < 1 || input.bagsNeeded > 10) {
    return {
      valid: false,
      errorBn: 'রক্তের ব্যাগের সংখ্যা ১ থেকে ১০ এর মধ্যে হতে হবে।',
      errorEn: 'Number of blood bags must be between 1 and 10.',
    };
  }
  if (
    !input.upazilaId ||
    !(VALID_BARGUNA_UPAZILA_IDS as readonly string[]).includes(input.upazilaId)
  ) {
    return {
      valid: false,
      errorBn: 'বরগুনা জেলার বৈধ উপজেলা নির্বাচন করুন।',
      errorEn: 'Please select a valid Upazila in Barguna District.',
    };
  }
  const trimmedHospital = (input.hospitalName || '').trim();
  if (trimmedHospital.length < 3 || trimmedHospital.length > 150) {
    return {
      valid: false,
      errorBn: 'হাসপাতাল বা ক্লিনিকের নাম ৩ থেকে ১৫০ অক্ষরের মধ্যে উল্লেখ করুন।',
      errorEn: 'Hospital or clinic name must be between 3 and 150 characters.',
    };
  }
  const cleanPhone = (input.contactPhone || '').replace(/[\s-]/g, '');
  const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
  if (!bdPhoneRegex.test(cleanPhone)) {
    return {
      valid: false,
      errorBn: 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।',
      errorEn: 'Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).',
    };
  }

  return { valid: true };
}

export interface DonorRegistrationInput {
  fullName: string;
  bloodGroup: BloodGroup | '';
  upazilaId: BargunaUpazilaId | '';
  areaName: string;
  phone: string;
  consentPublicDirectory: boolean;
  consentContactWorkflow: boolean;
  consentVoluntaryNoPayment: boolean;
}

/**
 * Validates donor registration inputs and enforces all three mandatory donor consents:
 * 1. Public masked directory listing consent
 * 2. Verified contact mediation workflow consent
 * 3. 100% voluntary, non-commercial blood donation pledge
 */
export function validateDonorRegistration(
  input: DonorRegistrationInput
): ValidationResult {
  const trimmedName = (input.fullName || '').trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return {
      valid: false,
      errorBn: 'অনুগ্রহ করে রক্তদাতার পূর্ণ নাম লিখুন (২–৮০ অক্ষর)।',
      errorEn: 'Please enter the donor full name (2–80 characters).',
    };
  }
  if (!input.bloodGroup || !ALL_BLOOD_GROUPS.includes(input.bloodGroup)) {
    return {
      valid: false,
      errorBn: 'বৈধ রক্তের গ্রুপ নির্বাচন করুন।',
      errorEn: 'Please select a valid blood group.',
    };
  }
  if (
    !input.upazilaId ||
    !(VALID_BARGUNA_UPAZILA_IDS as readonly string[]).includes(input.upazilaId)
  ) {
    return {
      valid: false,
      errorBn: 'বরগুনা জেলার বৈধ উপজেলা নির্বাচন করুন।',
      errorEn: 'Please select a valid Upazila in Barguna District.',
    };
  }
  const trimmedArea = (input.areaName || '').trim();
  if (trimmedArea.length < 2 || trimmedArea.length > 120) {
    return {
      valid: false,
      errorBn: 'আপনার ইউনিয়ন বা এলাকার নাম লিখুন (২–১২০ অক্ষর)।',
      errorEn: 'Please enter your union or locality in Barguna (2–120 characters).',
    };
  }
  const cleanPhone = (input.phone || '').replace(/[\s-]/g, '');
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone)) {
    return {
      valid: false,
      errorBn: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।',
      errorEn: 'Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX).',
    };
  }
  if (
    !input.consentPublicDirectory ||
    !input.consentContactWorkflow ||
    !input.consentVoluntaryNoPayment
  ) {
    return {
      valid: false,
      errorBn:
        'রক্তদাতা হিসেবে নিবন্ধনের জন্য ৩টি আবশ্যিক গোপনীয়তা ও স্বেচ্ছাসেবী সম্মতিতে টিক চিহ্ন দিন।',
      errorEn:
        'Please accept all 3 mandatory privacy, contact mediation, and voluntary donation consents to register.',
    };
  }

  return { valid: true };
}

const EN_TO_BN_DIGIT_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

/**
 * Converts ASCII digits (0-9) to Bengali numerals (০-৯) so numbers embedded inside
 * Bengali sentences render seamlessly in Hind Siliguri without mid-word font switching.
 */
export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => EN_TO_BN_DIGIT_MAP[d] ?? d);
}

/**
 * Masks a Bangladesh mobile phone number for privacy protection in demonstration
 * and public board views (e.g., "01712345678" -> "017XX-XXXX78 [নমুনা গোপনীয়তা সুরক্ষিত]").
 */
export function maskBangladeshPhone(
  rawPhone: string,
  lang: 'bn' | 'en' = 'bn'
): string {
  const digits = rawPhone.replace(/\D/g, '');
  const local = digits.startsWith('880') ? digits.slice(2) : digits;
  if (local.length === 11 && local.startsWith('01')) {
    const prefix = local.slice(0, 3);
    const suffix = local.slice(-2);
    return lang === 'bn'
      ? `${prefix}XX-XXXX${suffix} [নমুনা গোপনীয়তা সুরক্ষিত]`
      : `${prefix}XX-XXXX${suffix} [Demo Masked]`;
  }
  return lang === 'bn'
    ? '017XX-XXXXXX [নমুনা গোপনীয়তা সুরক্ষিত]'
    : '017XX-XXXXXX [Demo Masked]';
}
