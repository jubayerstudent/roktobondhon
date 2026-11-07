import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLOOD_COMPATIBILITY_MAP,
  filterDonors,
  checkDonorEligibility,
  validateEmergencyRequest,
  validateDonorRegistration,
  isValidDistrictUpazilaPair,
  maskBangladeshPhone,
} from './bloodLogic';
import {
  generateOpaqueDonorId,
  isValidOpaqueDonorId,
  evaluateDonorRegistrationTransaction,
  getDhakaQuotaDateKey,
  getPacificQuotaDateKey,
  computePayloadFingerprint,
  assertValidLedger,
  reserveAiQuotaSlot,
  markAiDispatching,
  finalizeAiQuotaSlot,
  reconcileExpiredAiLease,
  evaluateContactShareAccess,
  computeRestoreDryRunDiff,
} from './stage3ArchitectureLogic';
import { DemoDonor } from '../types/blood';

const SAMPLE_DONORS: DemoDonor[] = [
  {
    id: 'd1',
    code: 'RB-BRG-101',
    nameBn: 'ডেমো রক্তদাতা ০১',
    nameEn: 'Demo Donor 01',
    bloodGroup: 'O-',
    upazilaId: 'barguna-sadar',
    locationBn: 'বরগুনা সদর',
    locationEn: 'Barguna Sadar',
    isAvailable: true,
    lastDonationDaysAgo: 120,
    totalDonations: 6,
    maskedPhone: '017XX-XXXXXX (ডেমো)',
    verifiedByOrgBn: 'বরগুনা স্বেচ্ছাসেবী ইউনিট',
    verifiedByOrgEn: 'Barguna Volunteer Unit',
    isDemoRecord: true,
  },
  {
    id: 'd2',
    code: 'RB-AMT-102',
    nameBn: 'ডেমো রক্তদাতা ০২',
    nameEn: 'Demo Donor 02',
    bloodGroup: 'A+',
    upazilaId: 'amtali',
    locationBn: 'আমতলী পৌরসভা',
    locationEn: 'Amtali Municipality',
    isAvailable: false,
    lastDonationDaysAgo: 45,
    totalDonations: 3,
    maskedPhone: '018XX-XXXXXX (ডেমো)',
    verifiedByOrgBn: 'আমতলী ইউনিট',
    verifiedByOrgEn: 'Amtali Unit',
    isDemoRecord: true,
  },
  {
    id: 'd3',
    code: 'RB-PTH-103',
    nameBn: 'ডেমো রক্তদাতা ০৩',
    nameEn: 'Demo Donor 03',
    bloodGroup: 'B+',
    upazilaId: 'patharghata',
    locationBn: 'পাথরঘাটা সদর',
    locationEn: 'Patharghata Sadar',
    isAvailable: true,
    lastDonationDaysAgo: 140,
    totalDonations: 4,
    maskedPhone: '019XX-XXXXXX (ডেমো)',
    verifiedByOrgBn: 'পাথরঘাটা ইউনিট',
    verifiedByOrgEn: 'Patharghata Unit',
    isDemoRecord: true,
  },
];

test('BLOOD_COMPATIBILITY_MAP validates universal donor O- and universal recipient AB+', () => {
  assert.equal(BLOOD_COMPATIBILITY_MAP['O-'].canDonateTo.length, 8);
  assert.deepEqual(BLOOD_COMPATIBILITY_MAP['O-'].canReceiveFrom, ['O-']);
  assert.equal(BLOOD_COMPATIBILITY_MAP['AB+'].canReceiveFrom.length, 8);
  assert.deepEqual(BLOOD_COMPATIBILITY_MAP['AB+'].canDonateTo, ['AB+']);
});

test('filterDonors filters by exact blood group, compatible blood groups, and upazila', () => {
  const exactAPlus = filterDonors(SAMPLE_DONORS, { bloodGroup: 'A+' });
  assert.equal(exactAPlus.length, 1);
  assert.equal(exactAPlus[0].id, 'd2');

  const compatibleForAPlus = filterDonors(SAMPLE_DONORS, {
    bloodGroup: 'A+',
    includeCompatibleDonors: true,
  });
  assert.equal(compatibleForAPlus.length, 2);

  const availableCompatible = filterDonors(SAMPLE_DONORS, {
    bloodGroup: 'A+',
    includeCompatibleDonors: true,
    onlyAvailable: true,
  });
  assert.equal(availableCompatible.length, 1);
  assert.equal(availableCompatible[0].id, 'd1');

  const patharghataDonors = filterDonors(SAMPLE_DONORS, {
    upazilaId: 'patharghata',
  });
  assert.equal(patharghataDonors.length, 1);
  assert.equal(patharghataDonors[0].bloodGroup, 'B+');
});

test('checkDonorEligibility enforces age, weight, and 90-day interval rules', () => {
  const eligible = checkDonorEligibility({
    age: 26,
    weightKg: 58,
    daysSinceLastDonation: 110,
    hemoglobinGdl: 13.5,
    hasRecentSurgeryOrIllness: false,
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.nextEligibleInDays, 0);

  const tooRecent = checkDonorEligibility({
    age: 26,
    weightKg: 58,
    daysSinceLastDonation: 60,
  });
  assert.equal(tooRecent.eligible, false);
  assert.equal(tooRecent.nextEligibleInDays, 30);
});

test('validateEmergencyRequest validates Barguna upazila membership, length bounds, and BD phone numbers', () => {
  const validReq = validateEmergencyRequest({
    patientName: 'রহিম উদ্দিন',
    bloodGroup: 'B+',
    bagsNeeded: 2,
    upazilaId: 'barguna-sadar',
    hospitalName: 'বরগুনা ২৫০ শয্যা জেনারেল হাসপাতাল',
    contactPhone: '01712345678',
  });
  assert.equal(validReq.valid, true);

  const invalidPhone = validateEmergencyRequest({
    patientName: 'রহিম উদ্দিন',
    bloodGroup: 'B+',
    bagsNeeded: 2,
    upazilaId: 'amtali',
    hospitalName: 'আমতলী উপজেলা স্বাস্থ্য কমপ্লেক্স',
    contactPhone: '12345',
  });
  assert.equal(invalidPhone.valid, false);

  const invalidUpazila = validateEmergencyRequest({
    patientName: 'রহিম উদ্দিন',
    bloodGroup: 'B+',
    bagsNeeded: 2,
    upazilaId: 'invalid-upazila' as any,
    hospitalName: 'বরগুনা সদর হাসপাতাল',
    contactPhone: '01712345678',
  });
  assert.equal(invalidUpazila.valid, false);
  assert.equal(isValidDistrictUpazilaPair('barguna', 'taltali'), true);
  assert.equal(isValidDistrictUpazilaPair('barguna', 'fake-upazila'), false);
});

test('validateDonorRegistration enforces all 3 mandatory donor consents and valid BD phone', () => {
  const validDonor = validateDonorRegistration({
    fullName: 'মাহমুদুল হাসান',
    bloodGroup: 'O+',
    upazilaId: 'barguna-sadar',
    areaName: 'কলেজ রোড, বরগুনা সদর',
    phone: '01711223344',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
  });
  assert.equal(validDonor.valid, true);

  const missingConsent = validateDonorRegistration({
    fullName: 'মাহমুদুল হাসান',
    bloodGroup: 'O+',
    upazilaId: 'barguna-sadar',
    areaName: 'কলেজ রোড, বরগুনা সদর',
    phone: '01711223344',
    consentPublicDirectory: true,
    consentContactWorkflow: false,
    consentVoluntaryNoPayment: true,
  });
  assert.equal(missingConsent.valid, false);
});

test('maskBangladeshPhone masks personal digits to protect donor and requester privacy', () => {
  const maskedBn = maskBangladeshPhone('+8801712345678', 'bn');
  assert.equal(maskedBn.includes('01712345678'), false);
  assert.equal(maskedBn.startsWith('017XX-XXXX78'), true);

  const maskedEn = maskBangladeshPhone('01898765432', 'en');
  assert.equal(maskedEn.includes('01898765432'), false);
  assert.equal(maskedEn.startsWith('018XX-XXXX32'), true);
});

test('Stage 3 Donor Ownership: Opaque Donor ID and Write-Once activeDonorId Latch prevent duplicate profiles and UID leaks', () => {
  const opaqueId = generateOpaqueDonorId();
  assert.equal(isValidOpaqueDonorId(opaqueId), true);
  assert.equal(isValidOpaqueDonorId('uid_12345'), false);

  // First registration succeeds
  const firstAttempt = evaluateDonorRegistrationTransaction({
    authUid: 'firebase_uid_abc123',
    emailVerified: true,
    existingUserDoc: { uid: 'firebase_uid_abc123', activeDonorId: null },
    proposedPublicDonorId: opaqueId,
    donorDocOwnerUid: 'firebase_uid_abc123',
    privateContactOwnerUid: 'firebase_uid_abc123',
    districtId: 'barguna',
    upazilaId: 'patharghata',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
  });
  assert.equal(firstAttempt.allowed, true);
  assert.equal(firstAttempt.updatedActiveDonorId, opaqueId);

  // Second registration attempt by same user is blocked by Write-Once Latch
  const duplicateAttempt = evaluateDonorRegistrationTransaction({
    authUid: 'firebase_uid_abc123',
    emailVerified: true,
    existingUserDoc: { uid: 'firebase_uid_abc123', activeDonorId: opaqueId },
    proposedPublicDonorId: generateOpaqueDonorId(),
    donorDocOwnerUid: 'firebase_uid_abc123',
    privateContactOwnerUid: 'firebase_uid_abc123',
    districtId: 'barguna',
    upazilaId: 'patharghata',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
  });
  assert.equal(duplicateAttempt.allowed, false);
  assert.equal(duplicateAttempt.code, 'DUPLICATE_DONOR_PROFILE');

  // Using Firebase UID as publicDonorId is strictly rejected
  const uidExposureAttempt = evaluateDonorRegistrationTransaction({
    authUid: 'firebase_uid_abc123',
    emailVerified: true,
    existingUserDoc: null,
    proposedPublicDonorId: 'firebase_uid_abc123',
    donorDocOwnerUid: 'firebase_uid_abc123',
    privateContactOwnerUid: 'firebase_uid_abc123',
    districtId: 'barguna',
    upazilaId: 'amtali',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
  });
  assert.equal(uidExposureAttempt.allowed, false);
  assert.equal(uidExposureAttempt.code, 'UID_EXPOSED_IN_PUBLIC_ID');
});

test('Stage 3 AI Quota State Machine: Enforces UUIDv4 idempotency, payload hash, fencing tokens, reserved>=1 assertions, and UNCERTAIN post-dispatch recovery', () => {
  const dhakaKey = getDhakaQuotaDateKey(new Date('2026-11-06T20:00:00Z'));
  const pacificKey = getPacificQuotaDateKey(new Date('2026-11-06T20:00:00Z'));
  assert.equal(dhakaKey, 'bd_2026-11-07'); // 20:00 UTC is 02:00 AM next day in Dhaka (UTC+6)
  assert.equal(pacificKey, 'pt_2026-11-06');

  const key1 = '550e8400-e29b-41d4-a716-446655440000';
  const hash1 = computePayloadFingerprint({
    uid: 'user_1',
    endpoint: '/api/ai/generate-poster',
    prompt: 'Barguna Sadar Blood Drive',
    imageSize: '1K',
    aspectRatio: '16:9',
  });
  const hash2 = computePayloadFingerprint({
    uid: 'user_1',
    endpoint: '/api/ai/generate-poster',
    prompt: 'Different Prompt With Same Key',
    imageSize: '4K',
    aspectRatio: '1:1',
  });

  const initialGlobal = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 100 };
  const initialUser = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 5 };

  // 1. Reserve new slot
  const res1 = reserveAiQuotaSlot({
    idempotencyKey: key1,
    uid: 'user_1',
    dateKey: dhakaKey,
    payloadHash: hash1,
    nowMs: 1000,
    existingRecord: null,
    globalLedger: initialGlobal,
    userLedger: initialUser,
  });
  assert.equal(res1.status, 'RESERVED_NEW');
  assert.equal(res1.globalLedger.reserved, 1);
  assert.equal(res1.userLedger.reserved, 1);

  // 2. Concurrent request with same key while lease is active -> 409
  const concurrentAttempt = reserveAiQuotaSlot({
    idempotencyKey: key1,
    uid: 'user_1',
    dateKey: dhakaKey,
    payloadHash: hash1,
    nowMs: 2000,
    existingRecord: res1.record!,
    globalLedger: res1.globalLedger,
    userLedger: res1.userLedger,
  });
  assert.equal(concurrentAttempt.status, 'REJECT_IN_FLIGHT_409');

  // 3. Reusing same key with different payload -> 422
  const mismatchAttempt = reserveAiQuotaSlot({
    idempotencyKey: key1,
    uid: 'user_1',
    dateKey: dhakaKey,
    payloadHash: hash2,
    nowMs: 2000,
    existingRecord: res1.record!,
    globalLedger: res1.globalLedger,
    userLedger: res1.userLedger,
  });
  assert.equal(mismatchAttempt.status, 'REJECT_PAYLOAD_MISMATCH_422');

  // 4. Mark DISPATCHING and simulate post-dispatch timeout -> transitions to UNCERTAIN (retaining consumed slot)
  const dispatchingRecord = markAiDispatching(res1.record!, res1.fencingToken!);
  const uncertainFinal = finalizeAiQuotaSlot({
    record: dispatchingRecord,
    fencingToken: res1.fencingToken!,
    outcome: { type: 'POST_DISPATCH_TIMEOUT_OR_5XX' },
    globalLedger: res1.globalLedger,
    userLedger: res1.userLedger,
  });
  assert.equal(uncertainFinal.record.state, 'UNCERTAIN');
  assert.equal(uncertainFinal.globalLedger.reserved, 0);
  assert.equal(uncertainFinal.globalLedger.uncertain, 1);

  // 5. Retrying an UNCERTAIN key is blocked with 409 (prevents duplicate paid API call)
  const retryAfterUncertain = reserveAiQuotaSlot({
    idempotencyKey: key1,
    uid: 'user_1',
    dateKey: dhakaKey,
    payloadHash: hash1,
    nowMs: 5000,
    existingRecord: uncertainFinal.record,
    globalLedger: uncertainFinal.globalLedger,
    userLedger: uncertainFinal.userLedger,
  });
  assert.equal(retryAfterUncertain.status, 'REJECT_UNCERTAIN_OUTCOME_409');

  // 6. Strict ledger integrity check throws instead of silent Math.max(0, reserved - 1)
  assert.throws(
    () =>
      assertValidLedger(
        { reserved: 0, completed: 1, released: 0, uncertain: 0, limit: 5 },
        true
      ),
    /LEDGER_INTEGRITY_VIOLATION/
  );
});

test('Stage 3 Contact Mediation & Backup Restore Dry-Run Diff', () => {
  // Mode A never exposes donor phone directly
  const modeA = evaluateContactShareAccess({
    authUid: 'req_user_1',
    shareDoc: {
      contactRequestId: 'cr_1',
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      requesterId: 'req_user_1',
      mode: 'mediated_callback',
      expiresAtMs: 50_000,
      revoked: false,
    },
    liveDonorDoc: {
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      isPubliclyListed: true,
      consentContactWorkflow: true,
    },
    nowMs: 10_000,
  });
  assert.equal(modeA.allowed, false);

  // Mode B allows within 24h while live consent is active, and immediately denies when consent is withdrawn
  const modeBActive = evaluateContactShareAccess({
    authUid: 'req_user_1',
    shareDoc: {
      contactRequestId: 'cr_2',
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      requesterId: 'req_user_1',
      mode: 'direct_on_approval',
      expiresAtMs: 50_000,
      revoked: false,
    },
    liveDonorDoc: {
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      isPubliclyListed: true,
      consentContactWorkflow: true,
    },
    nowMs: 10_000,
  });
  assert.equal(modeBActive.allowed, true);

  const modeBWithdrawn = evaluateContactShareAccess({
    authUid: 'req_user_1',
    shareDoc: {
      contactRequestId: 'cr_2',
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      requesterId: 'req_user_1',
      mode: 'direct_on_approval',
      expiresAtMs: 50_000,
      revoked: false,
    },
    liveDonorDoc: {
      publicDonorId: 'dnr_abcdefghijklmnop1234',
      isPubliclyListed: true,
      consentContactWorkflow: false,
    },
    nowMs: 10_000,
  });
  assert.equal(modeBWithdrawn.allowed, false);
  assert.equal(modeBWithdrawn.reason, 'DONOR_CONSENT_WITHDRAWN_LIVE_CHECK');

  // Restore Dry-Run Diff chunks missing docs into <= 15 per batch and skips existing docs
  const backupIds = Array.from({ length: 20 }, (_, i) => `doc_${i + 1}`);
  const existingSet = new Set(['doc_1', 'doc_2']);
  const diff = computeRestoreDryRunDiff({
    backupDocIds: backupIds,
    existingCloudDocIds: existingSet,
  });
  assert.equal(diff.mode, 'merge_missing_only');
  assert.equal(diff.existingIdsSkipped.length, 2);
  assert.equal(diff.missingIdsToInsert.length, 18);
  assert.equal(diff.batches.length, 2);
  assert.equal(diff.batches[0].length, 15);
  assert.equal(diff.batches[1].length, 3);
});

test('Stage 3 Static Configuration Verification: firestore.indexes.json (23 indexes) and firestore.rules', () => {
  const indexesPath = path.resolve(process.cwd(), 'firestore.indexes.json');
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');

  const indexesJson = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
  assert.equal(indexesJson.indexes.length, 21);
  assert.equal(indexesJson.fieldOverrides.length, 2);

  const rulesText = fs.readFileSync(rulesPath, 'utf8');
  assert.equal(rulesText.includes("rules_version = '2';"), true);
  assert.equal(rulesText.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), true);
  assert.equal(rulesText.includes('match /donors/{publicDonorId}'), true);
  assert.equal(rulesText.includes('match /donorPrivateContacts/{publicDonorId}'), true);
  assert.equal(rulesText.includes('match /approvedContactShares/{crId}'), true);
});
