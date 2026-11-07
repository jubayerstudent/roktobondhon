import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateOpaqueDonorId,
  isValidOpaqueDonorId,
  evaluateDonorRegistrationTransaction,
  UserOwnershipRecord,
  DonorRegistrationTransactionAttempt,
  TransactionEvaluationResult,
  getDhakaQuotaDateKey,
  getPacificQuotaDateKey,
  isValidUuidV4IdempotencyKey,
  computePayloadFingerprint,
  assertValidLedger,
  getConsumedSlots,
  reserveAiQuotaSlot,
  markAiDispatching,
  finalizeAiQuotaSlot,
  reconcileExpiredAiLease,
  QuotaLedgerState,
  AiIdempotencyRecord,
} from '../src/utils/stage3ArchitectureLogic';
import { isValidDistrictUpazilaPair } from '../src/utils/bloodLogic';
import { BloodGroup, BargunaUpazilaId } from '../src/types/blood';

/**
 * ============================================================================
 * ROKTOBONDHON UNIFIED WORKFLOW TEST SUITE (tests/workflow.test.ts)
 * ============================================================================
 * Defines deterministic Pass/Fail acceptance criteria for:
 *   1. Donor Registration via runTransaction (Serializable Concurrency & Write-Once Latch)
 *   2. Search Pagination with Cursor Markers (Composite Index & Tie-Breaker Verification)
 *   3. Gemini API Quota Reservation with Idempotency & Fencing Tokens
 */

// ----------------------------------------------------------------------------
// SECTION 1 HARNESS: Firestore runTransaction() Serializable Concurrency Simulator
// ----------------------------------------------------------------------------

interface SimulatedDonorPublicDoc {
  publicDonorId: string;
  ownerUid: string;
  districtId: string;
  upazilaId: string;
  isPubliclyListed: boolean;
  createdAtMs: number;
}

interface SimulatedDonorPrivateContactDoc {
  publicDonorId: string;
  ownerUid: string;
  phone: string;
  consentVersion: string;
}

class SerializableFirestoreStore {
  private users = new Map<string, { data: UserOwnershipRecord; version: number }>();
  private donors = new Map<string, { data: SimulatedDonorPublicDoc; version: number }>();
  private privateContacts = new Map<
    string,
    { data: SimulatedDonorPrivateContactDoc; version: number }
  >();

  /**
   * Simulates Firestore's runTransaction() with optimistic concurrency control
   * and automatic retry on write-conflict detection (up to maxAttempts).
   */
  public async runRegisterDonorTransaction(
    buildAttempt: (
      existingUserDoc: UserOwnershipRecord | null,
      attemptNumber: number
    ) => DonorRegistrationTransactionAttempt & { phone: string },
    simulateConcurrentInterferenceBeforeCommit?: () => void,
    maxAttempts = 5
  ): Promise<{
    result: TransactionEvaluationResult;
    attemptsUsed: number;
  }> {
    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
      // 1. Snapshot Read Phase
      const initialProbe = buildAttempt(null, attemptNumber);
      const userSnap = this.users.get(initialProbe.authUid);
      const readUserVersion = userSnap ? userSnap.version : 0;
      const existingUserDoc = userSnap ? { ...userSnap.data } : null;

      const attempt = buildAttempt(existingUserDoc, attemptNumber);
      const donorSnap = this.donors.get(attempt.proposedPublicDonorId);
      const privateSnap = this.privateContacts.get(attempt.proposedPublicDonorId);

      if (donorSnap || privateSnap) {
        return {
          result: { allowed: false, code: 'DUPLICATE_DONOR_PROFILE' },
          attemptsUsed: attemptNumber,
        };
      }

      // 2. Evaluate Stage 3 Transaction Invariants
      const evaluation = evaluateDonorRegistrationTransaction(attempt);
      if (!evaluation.allowed) {
        return {
          result: evaluation,
          attemptsUsed: attemptNumber,
        };
      }

      // Optional hook to simulate a competing transaction committing right before our commit
      if (attemptNumber === 1 && simulateConcurrentInterferenceBeforeCommit) {
        simulateConcurrentInterferenceBeforeCommit();
      }

      // 3. Serializable Commit Phase: verify read set versions have not changed
      const currentUserSnap = this.users.get(attempt.authUid);
      const currentUserVersion = currentUserSnap ? currentUserSnap.version : 0;
      const currentDonorSnap = this.donors.get(attempt.proposedPublicDonorId);
      const currentPrivateSnap = this.privateContacts.get(attempt.proposedPublicDonorId);

      if (
        currentUserVersion !== readUserVersion ||
        currentDonorSnap !== undefined ||
        currentPrivateSnap !== undefined
      ) {
        // Optimistic lock contention detected -> retry transaction with fresh snapshot
        continue;
      }

      // Commit all 3 documents atomically
      this.users.set(attempt.authUid, {
        data: {
          uid: attempt.authUid,
          activeDonorId: evaluation.updatedActiveDonorId!,
        },
        version: currentUserVersion + 1,
      });

      this.donors.set(attempt.proposedPublicDonorId, {
        data: {
          publicDonorId: attempt.proposedPublicDonorId,
          ownerUid: attempt.authUid,
          districtId: attempt.districtId,
          upazilaId: attempt.upazilaId,
          isPubliclyListed: true,
          createdAtMs: Date.now(),
        },
        version: 1,
      });

      this.privateContacts.set(attempt.proposedPublicDonorId, {
        data: {
          publicDonorId: attempt.proposedPublicDonorId,
          ownerUid: attempt.authUid,
          phone: attempt.phone,
          consentVersion: attempt.consentVersion,
        },
        version: 1,
      });

      return {
        result: evaluation,
        attemptsUsed: attemptNumber,
      };
    }

    throw new Error('TRANSACTION_MAX_RETRIES_EXCEEDED');
  }

  public getUser(uid: string): UserOwnershipRecord | null {
    return this.users.get(uid)?.data ?? null;
  }

  public getDonorCount(): number {
    return this.donors.size;
  }

  public getPrivateContactCount(): number {
    return this.privateContacts.size;
  }

  public getDonor(publicDonorId: string): SimulatedDonorPublicDoc | null {
    return this.donors.get(publicDonorId)?.data ?? null;
  }
}

// ----------------------------------------------------------------------------
// SECTION 2 HARNESS: Cursor-Based Search Pagination Engine & Index Verifier
// ----------------------------------------------------------------------------

export interface IndexedDonorDocument {
  id: string; // Firestore __name__ (opaque publicDonorId)
  isPubliclyListed: boolean;
  districtId: string;
  upazilaId: BargunaUpazilaId;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  updatedAtMs: number;
}

export interface PaginationCursorMarker {
  updatedAtMs: number;
  id: string; // Tie-breaker corresponding to Firestore __name__ DESC
}

export interface PaginatedDonorSearchQuery {
  isPubliclyListed: boolean;
  districtId: string;
  upazilaId?: BargunaUpazilaId;
  bloodGroup?: BloodGroup;
  isAvailable?: boolean;
  pageSize: number;
  cursor?: string | null; // Base64URL encoded PaginationCursorMarker
}

export interface PaginatedSearchResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}

export const MAX_DONOR_SEARCH_PAGE_SIZE = 12;

export function encodeCursorMarker(marker: PaginationCursorMarker): string {
  if (
    !Number.isInteger(marker.updatedAtMs) ||
    marker.updatedAtMs < 0 ||
    !isValidOpaqueDonorId(marker.id)
  ) {
    throw new Error('INVALID_CURSOR_MARKER: Cannot encode malformed cursor fields.');
  }
  return Buffer.from(JSON.stringify(marker), 'utf8').toString('base64url');
}

export function decodeCursorMarker(encoded: string): PaginationCursorMarker {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Number.isInteger(parsed.updatedAtMs) ||
      parsed.updatedAtMs < 0 ||
      typeof parsed.id !== 'string' ||
      !isValidOpaqueDonorId(parsed.id)
    ) {
      throw new Error('Malformed cursor payload');
    }
    return { updatedAtMs: parsed.updatedAtMs, id: parsed.id };
  } catch {
    throw new Error('INVALID_CURSOR_MARKER: Cursor token is corrupted or tampered.');
  }
}

/**
 * Executes a deterministic Firestore-equivalent cursor-paginated donor search:
 * - Enforces mandatory partition filters (isPubliclyListed == true, districtId == 'barguna')
 * - Enforces bounded pageSize (1 <= pageSize <= 12)
 * - Sorts deterministically by (updatedAtMs DESC, id DESC) matching Firestore's
 *   orderBy('updatedAt', 'desc').orderBy('__name__', 'desc')
 * - Applies startAfter(cursor.updatedAtMs, cursor.id)
 */
export function executeCursorPaginatedDonorSearch(
  dataset: IndexedDonorDocument[],
  query: PaginatedDonorSearchQuery
): PaginatedSearchResponse<IndexedDonorDocument> {
  if (!query.isPubliclyListed || query.districtId !== 'barguna') {
    throw new Error(
      'UNBOUNDED_OR_UNAUTHORIZED_QUERY: Mandatory partition filters (isPubliclyListed=true, districtId=barguna) required.'
    );
  }
  if (
    !Number.isInteger(query.pageSize) ||
    query.pageSize < 1 ||
    query.pageSize > MAX_DONOR_SEARCH_PAGE_SIZE
  ) {
    throw new Error(
      `INVALID_PAGE_SIZE: pageSize must be between 1 and ${MAX_DONOR_SEARCH_PAGE_SIZE}, received ${query.pageSize}.`
    );
  }
  if (
    query.upazilaId !== undefined &&
    !isValidDistrictUpazilaPair(query.districtId, query.upazilaId)
  ) {
    throw new Error('INVALID_GEOGRAPHY_FILTER: Upazila does not belong to district.');
  }

  const cursorMarker = query.cursor ? decodeCursorMarker(query.cursor) : null;

  // 1. Equality prefix filtering
  const filtered = dataset.filter((doc) => {
    if (doc.isPubliclyListed !== query.isPubliclyListed) return false;
    if (doc.districtId !== query.districtId) return false;
    if (query.upazilaId !== undefined && doc.upazilaId !== query.upazilaId) return false;
    if (query.bloodGroup !== undefined && doc.bloodGroup !== query.bloodGroup) return false;
    if (query.isAvailable !== undefined && doc.isAvailable !== query.isAvailable) return false;
    return true;
  });

  // 2. Deterministic ordering: updatedAtMs DESC, then __name__ (id) DESC
  filtered.sort((a, b) => {
    if (b.updatedAtMs !== a.updatedAtMs) {
      return b.updatedAtMs - a.updatedAtMs;
    }
    return b.id.localeCompare(a.id);
  });

  // 3. Apply startAfter(updatedAtMs, id) cursor boundary
  const afterCursor = cursorMarker
    ? filtered.filter((doc) => {
        if (doc.updatedAtMs < cursorMarker.updatedAtMs) return true;
        if (doc.updatedAtMs > cursorMarker.updatedAtMs) return false;
        return doc.id.localeCompare(cursorMarker.id) < 0;
      })
    : filtered;

  // 4. Slice page + 1 probe to determine hasMore
  const pageItems = afterCursor.slice(0, query.pageSize);
  const hasMore = afterCursor.length > query.pageSize;
  const lastItem = pageItems[pageItems.length - 1];

  return {
    items: pageItems,
    nextCursor:
      hasMore && lastItem
        ? encodeCursorMarker({ updatedAtMs: lastItem.updatedAtMs, id: lastItem.id })
        : null,
    hasMore,
    pageSize: query.pageSize,
  };
}

// ============================================================================
// SUITE 1: DONOR REGISTRATION VIA runTransaction() (PASS / FAIL CRITERIA)
// ============================================================================

test('WORKFLOW 1.1 [PASS CRITERION]: runTransaction() atomically registers donor, private contact, and latches activeDonorId', async () => {
  const store = new SerializableFirestoreStore();
  const authUid = 'usr_barguna_verified_001';
  const publicDonorId = generateOpaqueDonorId();

  const { result, attemptsUsed } = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: true,
    existingUserDoc: existingUser,
    proposedPublicDonorId: publicDonorId,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: authUid,
    districtId: 'barguna',
    upazilaId: 'barguna-sadar',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
    phone: '01711223344',
  }));

  assert.equal(result.allowed, true, 'Transaction must succeed when all invariants hold');
  assert.equal(result.code, 'OK');
  assert.equal(result.updatedActiveDonorId, publicDonorId);
  assert.equal(attemptsUsed, 1);

  // Verify all 3 documents were atomically committed
  const userRecord = store.getUser(authUid);
  assert.deepEqual(userRecord, { uid: authUid, activeDonorId: publicDonorId });
  assert.equal(store.getDonorCount(), 1);
  assert.equal(store.getPrivateContactCount(), 1);
  assert.equal(store.getDonor(publicDonorId)?.ownerUid, authUid);
});

test('WORKFLOW 1.2 [PASS CRITERION]: Concurrent runTransaction() race retries on contention and enforces 1-donor-per-user Write-Once Latch', async () => {
  const store = new SerializableFirestoreStore();
  const authUid = 'usr_concurrent_racer_002';
  const donorIdWinner = generateOpaqueDonorId();
  const donorIdLoser = generateOpaqueDonorId();

  // Simulate Transaction B reading existingUserDoc=null, then Transaction A committing first
  // before Transaction B reaches its commit phase. Transaction B must detect version mismatch,
  // retry with fresh snapshot (seeing activeDonorId = donorIdWinner), and abort with DUPLICATE_DONOR_PROFILE.
  const txBOutcome = await store.runRegisterDonorTransaction(
    (existingUser) => ({
      authUid,
      emailVerified: true,
      existingUserDoc: existingUser,
      proposedPublicDonorId: donorIdLoser,
      donorDocOwnerUid: authUid,
      privateContactOwnerUid: authUid,
      districtId: 'barguna',
      upazilaId: 'amtali',
      consentPublicDirectory: true,
      consentContactWorkflow: true,
      consentVoluntaryNoPayment: true,
      consentVersion: '1.0',
      phone: '01811223344',
    }),
    () => {
      // Competing Transaction A commits while Transaction B is in flight
      void store.runRegisterDonorTransaction((existingUserA) => ({
        authUid,
        emailVerified: true,
        existingUserDoc: existingUserA,
        proposedPublicDonorId: donorIdWinner,
        donorDocOwnerUid: authUid,
        privateContactOwnerUid: authUid,
        districtId: 'barguna',
        upazilaId: 'amtali',
        consentPublicDirectory: true,
        consentContactWorkflow: true,
        consentVoluntaryNoPayment: true,
        consentVersion: '1.0',
        phone: '01811223344',
      }));
    }
  );

  // PASS Criteria:
  // 1. Transaction B retried (attemptsUsed === 2) after optimistic lock conflict
  // 2. On retry, Transaction B saw activeDonorId === donorIdWinner and failed with DUPLICATE_DONOR_PROFILE
  // 3. Exactly 1 donor document and 1 private contact document exist in the database (winner only)
  assert.equal(txBOutcome.attemptsUsed, 2, 'Conflicting transaction must retry on version change');
  assert.equal(txBOutcome.result.allowed, false);
  assert.equal(txBOutcome.result.code, 'DUPLICATE_DONOR_PROFILE');
  assert.equal(store.getUser(authUid)?.activeDonorId, donorIdWinner);
  assert.equal(store.getDonorCount(), 1, 'Must never create duplicate donor profiles');
  assert.equal(store.getPrivateContactCount(), 1, 'Must never create orphaned private contact docs');
  assert.equal(store.getDonor(donorIdLoser), null);
});

test('WORKFLOW 1.3 [FAIL CRITERIA]: runTransaction() rejects unverified email, UID exposure, invalid geography, ownership mismatch, and missing consent', async () => {
  const store = new SerializableFirestoreStore();
  const authUid = 'usr_security_audit_003';
  const validOpaqueId = generateOpaqueDonorId();

  // Fail Case A: Unverified email
  const unverified = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: false,
    existingUserDoc: existingUser,
    proposedPublicDonorId: validOpaqueId,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: authUid,
    districtId: 'barguna',
    upazilaId: 'betagi',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
    phone: '01711000000',
  }));
  assert.equal(unverified.result.allowed, false);
  assert.equal(unverified.result.code, 'UNVERIFIED_EMAIL');

  // Fail Case B: Raw Firebase UID leaked in publicDonorId
  const uidExposed = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: true,
    existingUserDoc: existingUser,
    proposedPublicDonorId: `dnr_${authUid}`,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: authUid,
    districtId: 'barguna',
    upazilaId: 'betagi',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
    phone: '01711000000',
  }));
  assert.equal(uidExposed.result.allowed, false);
  assert.equal(uidExposed.result.code, 'UID_EXPOSED_IN_PUBLIC_ID');

  // Fail Case C: Cross-user ownership spoofing in donorPrivateContacts
  const spoofedOwner = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: true,
    existingUserDoc: existingUser,
    proposedPublicDonorId: validOpaqueId,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: 'attacker_uid_999',
    districtId: 'barguna',
    upazilaId: 'bamna',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
    phone: '01711000000',
  }));
  assert.equal(spoofedOwner.result.allowed, false);
  assert.equal(spoofedOwner.result.code, 'OWNERSHIP_MISMATCH');

  // Fail Case D: Invalid district/upazila hierarchy
  const badGeography = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: true,
    existingUserDoc: existingUser,
    proposedPublicDonorId: validOpaqueId,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: authUid,
    districtId: 'barguna',
    upazilaId: 'non_existent_upazila',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: true,
    consentVersion: '1.0',
    phone: '01711000000',
  }));
  assert.equal(badGeography.result.allowed, false);
  assert.equal(badGeography.result.code, 'INVALID_GEOGRAPHY');

  // Fail Case E: Missing mandatory consent or wrong consentVersion
  const missingConsent = await store.runRegisterDonorTransaction((existingUser) => ({
    authUid,
    emailVerified: true,
    existingUserDoc: existingUser,
    proposedPublicDonorId: validOpaqueId,
    donorDocOwnerUid: authUid,
    privateContactOwnerUid: authUid,
    districtId: 'barguna',
    upazilaId: 'taltali',
    consentPublicDirectory: true,
    consentContactWorkflow: true,
    consentVoluntaryNoPayment: false,
    consentVersion: '1.0',
    phone: '01711000000',
  }));
  assert.equal(missingConsent.result.allowed, false);
  assert.equal(missingConsent.result.code, 'MISSING_CONSENT');

  // Ensure zero documents were written across all failed transactions
  assert.equal(store.getDonorCount(), 0);
  assert.equal(store.getPrivateContactCount(), 0);
  assert.equal(store.getUser(authUid), null);
});

// ============================================================================
// SUITE 2: SEARCH PAGINATION WITH CURSOR MARKERS (PASS / FAIL CRITERIA)
// ============================================================================

test('WORKFLOW 2.1 [PASS CRITERION]: Cursor pagination traverses 28 donors across 3 pages (12, 12, 4) with deterministic tie-breaking on identical timestamps', () => {
  // Build 28 matching O+ available donors in Barguna Sadar, including timestamp ties
  const totalMatching = 28;
  const dataset: IndexedDonorDocument[] = [];

  for (let i = 0; i < totalMatching; i++) {
    const paddedIndex = String(i + 1).padStart(2, '0');
    const opaqueId = `dnr_bargunasadar0000${paddedIndex}`;
    assert.equal(isValidOpaqueDonorId(opaqueId), true);

    // Intentionally create timestamp ties every 4 records to verify __name__ DESC tie-breaker
    const sharedTimestampGroup = Math.floor(i / 4);
    const updatedAtMs = 1_762_000_000_000 + sharedTimestampGroup * 60_000;

    dataset.push({
      id: opaqueId,
      isPubliclyListed: true,
      districtId: 'barguna',
      upazilaId: 'barguna-sadar',
      bloodGroup: 'O+',
      isAvailable: true,
      updatedAtMs,
    });
  }

  // Add non-matching noise records (unlisted, unavailable, different upazila/bloodGroup)
  dataset.push(
    {
      id: 'dnr_noiseunlisted000001',
      isPubliclyListed: false,
      districtId: 'barguna',
      upazilaId: 'barguna-sadar',
      bloodGroup: 'O+',
      isAvailable: true,
      updatedAtMs: 1_763_000_000_000,
    },
    {
      id: 'dnr_noiseamtali00000002',
      isPubliclyListed: true,
      districtId: 'barguna',
      upazilaId: 'amtali',
      bloodGroup: 'O+',
      isAvailable: true,
      updatedAtMs: 1_763_000_000_000,
    }
  );

  // Page 1 (12 items)
  const page1 = executeCursorPaginatedDonorSearch(dataset, {
    isPubliclyListed: true,
    districtId: 'barguna',
    upazilaId: 'barguna-sadar',
    bloodGroup: 'O+',
    isAvailable: true,
    pageSize: 12,
    cursor: null,
  });
  assert.equal(page1.items.length, 12);
  assert.equal(page1.hasMore, true);
  assert.ok(page1.nextCursor, 'Page 1 must emit a valid nextCursor marker');

  // Page 2 (12 items) using page1.nextCursor
  const page2 = executeCursorPaginatedDonorSearch(dataset, {
    isPubliclyListed: true,
    districtId: 'barguna',
    upazilaId: 'barguna-sadar',
    bloodGroup: 'O+',
    isAvailable: true,
    pageSize: 12,
    cursor: page1.nextCursor,
  });
  assert.equal(page2.items.length, 12);
  assert.equal(page2.hasMore, true);
  assert.ok(page2.nextCursor, 'Page 2 must emit a valid nextCursor marker');

  // Page 3 (remaining 4 items) using page2.nextCursor
  const page3 = executeCursorPaginatedDonorSearch(dataset, {
    isPubliclyListed: true,
    districtId: 'barguna',
    upazilaId: 'barguna-sadar',
    bloodGroup: 'O+',
    isAvailable: true,
    pageSize: 12,
    cursor: page2.nextCursor,
  });
  assert.equal(page3.items.length, 4);
  assert.equal(page3.hasMore, false);
  assert.equal(page3.nextCursor, null, 'Final page must return nextCursor = null');

  // Verify zero duplicates, zero skipped records, and strict monotonic sort order across all 28 items
  const allVisited = [...page1.items, ...page2.items, ...page3.items];
  assert.equal(allVisited.length, 28);
  const uniqueIds = new Set(allVisited.map((d) => d.id));
  assert.equal(uniqueIds.size, 28, 'Cursor traversal must never duplicate or skip records');

  for (let i = 1; i < allVisited.length; i++) {
    const prev = allVisited[i - 1];
    const curr = allVisited[i];
    const validOrder =
      prev.updatedAtMs > curr.updatedAtMs ||
      (prev.updatedAtMs === curr.updatedAtMs && prev.id.localeCompare(curr.id) > 0);
    assert.equal(
      validOrder,
      true,
      `Strict (updatedAt DESC, __name__ DESC) ordering violated at index ${i}`
    );
  }
});

test('WORKFLOW 2.2 [PASS CRITERION]: All 8 donor search shapes and 4 emergency request shapes match exact composite indexes in firestore.indexes.json', () => {
  const indexesPath = path.resolve(process.cwd(), 'firestore.indexes.json');
  const indexesConfig = JSON.parse(fs.readFileSync(indexesPath, 'utf8')) as {
    indexes: Array<{
      collectionGroup: string;
      fields: Array<{ fieldPath: string; order: string }>;
    }>;
  };

  const hasExactIndex = (
    collectionGroup: string,
    expectedEqualityFields: string[],
    rangeField: string,
    rangeOrder: 'ASCENDING' | 'DESCENDING'
  ): boolean => {
    return indexesConfig.indexes.some((idx) => {
      if (idx.collectionGroup !== collectionGroup) return false;
      if (idx.fields.length !== expectedEqualityFields.length + 1) return false;
      const lastField = idx.fields[idx.fields.length - 1];
      if (lastField.fieldPath !== rangeField || lastField.order !== rangeOrder) {
        return false;
      }
      const idxEqFields = idx.fields
        .slice(0, -1)
        .filter((f) => f.order === 'ASCENDING')
        .map((f) => f.fieldPath)
        .sort();
      const targetEqFields = [...expectedEqualityFields].sort();
      return JSON.stringify(idxEqFields) === JSON.stringify(targetEqFields);
    });
  };

  // All 8 donor query combinations (optional upazilaId, optional bloodGroup, optional isAvailable)
  const donorEqualityCombinations: string[][] = [
    ['isPubliclyListed', 'districtId'],
    ['isPubliclyListed', 'districtId', 'isAvailable'],
    ['isPubliclyListed', 'districtId', 'bloodGroup'],
    ['isPubliclyListed', 'districtId', 'bloodGroup', 'isAvailable'],
    ['isPubliclyListed', 'districtId', 'upazilaId'],
    ['isPubliclyListed', 'districtId', 'upazilaId', 'isAvailable'],
    ['isPubliclyListed', 'districtId', 'upazilaId', 'bloodGroup'],
    ['isPubliclyListed', 'districtId', 'upazilaId', 'bloodGroup', 'isAvailable'],
  ];

  for (const eqFields of donorEqualityCombinations) {
    assert.equal(
      hasExactIndex('donors', eqFields, 'updatedAt', 'DESCENDING'),
      true,
      `Missing composite index for donors equality set: ${eqFields.join(', ')}`
    );
  }

  // All 4 emergencyRequests query combinations
  const emergencyEqualityCombinations: string[][] = [
    ['districtId', 'status'],
    ['districtId', 'upazilaId', 'status'],
    ['districtId', 'bloodGroup', 'status'],
    ['districtId', 'upazilaId', 'bloodGroup', 'status'],
  ];

  for (const eqFields of emergencyEqualityCombinations) {
    assert.equal(
      hasExactIndex('emergencyRequests', eqFields, 'createdAt', 'DESCENDING'),
      true,
      `Missing composite index for emergencyRequests equality set: ${eqFields.join(', ')}`
    );
  }
});

test('WORKFLOW 2.3 [FAIL CRITERIA]: Search pagination rejects corrupted cursor markers, oversized page limits (>12), and missing partition keys', () => {
  const sampleDataset: IndexedDonorDocument[] = [];

  // Fail Case A: Corrupted or tampered Base64URL cursor token
  assert.throws(
    () =>
      executeCursorPaginatedDonorSearch(sampleDataset, {
        isPubliclyListed: true,
        districtId: 'barguna',
        pageSize: 12,
        cursor: 'tampered_not_valid_base64_json!!!',
      }),
    /INVALID_CURSOR_MARKER/
  );

  // Fail Case B: Cursor with non-opaque donor ID (e.g., raw UID injection)
  const forgedCursor = Buffer.from(
    JSON.stringify({ updatedAtMs: 1762000000000, id: 'raw_firebase_uid_123' }),
    'utf8'
  ).toString('base64url');
  assert.throws(
    () =>
      executeCursorPaginatedDonorSearch(sampleDataset, {
        isPubliclyListed: true,
        districtId: 'barguna',
        pageSize: 12,
        cursor: forgedCursor,
      }),
    /INVALID_CURSOR_MARKER/
  );

  // Fail Case C: Page size exceeding MAX_DONOR_SEARCH_PAGE_SIZE (12)
  assert.throws(
    () =>
      executeCursorPaginatedDonorSearch(sampleDataset, {
        isPubliclyListed: true,
        districtId: 'barguna',
        pageSize: 50,
      }),
    /INVALID_PAGE_SIZE/
  );

  // Fail Case D: Query attempting to scan unlisted donors or omit districtId
  assert.throws(
    () =>
      executeCursorPaginatedDonorSearch(sampleDataset, {
        isPubliclyListed: false,
        districtId: 'barguna',
        pageSize: 12,
      }),
    /UNBOUNDED_OR_UNAUTHORIZED_QUERY/
  );
});

// ============================================================================
// SUITE 3: GEMINI API QUOTA RESERVATION WITH IDEMPOTENCY TOKENS (PASS / FAIL)
// ============================================================================

test('WORKFLOW 3.1 [PASS CRITERION]: Valid UUIDv4 idempotency token reserves quota atomically, finalizes to COMPLETED, and replays cached result without extra cost', () => {
  const idempotencyKey = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  assert.equal(isValidUuidV4IdempotencyKey(idempotencyKey), true);

  const now = new Date('2026-11-06T18:30:00Z'); // 00:30 AM Nov 7 in Asia/Dhaka (UTC+6)
  const dhakaDateKey = getDhakaQuotaDateKey(now);
  const pacificDateKey = getPacificQuotaDateKey(now);
  assert.equal(dhakaDateKey, 'bd_2026-11-07');
  assert.equal(pacificDateKey, 'pt_2026-11-06');

  const payloadHash = computePayloadFingerprint({
    uid: 'usr_campaign_coord_01',
    endpoint: '/api/ai/campaign-banner',
    prompt: 'Barguna Sadar Voluntary Blood Donation Camp',
    imageSize: '2K',
    aspectRatio: '16:9',
  });

  const initialGlobal: QuotaLedgerState = {
    reserved: 0,
    completed: 10,
    released: 2,
    uncertain: 0,
    limit: 100,
  };
  const initialUser: QuotaLedgerState = {
    reserved: 0,
    completed: 1,
    released: 0,
    uncertain: 0,
    limit: 5,
  };

  // Step 1: Pre-dispatch reservation
  const reserved = reserveAiQuotaSlot({
    idempotencyKey,
    uid: 'usr_campaign_coord_01',
    dateKey: dhakaDateKey,
    payloadHash,
    nowMs: 10_000,
    existingRecord: null,
    globalLedger: initialGlobal,
    userLedger: initialUser,
  });

  assert.equal(reserved.status, 'RESERVED_NEW');
  assert.equal(reserved.fencingToken, 1);
  assert.equal(reserved.record?.state, 'RESERVED');
  assert.equal(reserved.record?.dispatchStatus, 'NOT_DISPATCHED');
  assert.equal(reserved.globalLedger.reserved, 1);
  assert.equal(reserved.userLedger.reserved, 1);
  assert.equal(getConsumedSlots(reserved.globalLedger), 11);
  assert.equal(getConsumedSlots(reserved.userLedger), 2);

  // Step 2: Mark DISPATCHING right before invoking Gemini API
  const dispatchingRecord = markAiDispatching(reserved.record!, reserved.fencingToken!);
  assert.equal(dispatchingRecord.dispatchStatus, 'DISPATCHING');

  // Step 3: Finalize SUCCESS with Cloud Storage reference metadata
  const finalized = finalizeAiQuotaSlot({
    record: dispatchingRecord,
    fencingToken: reserved.fencingToken!,
    outcome: {
      type: 'SUCCESS',
      meta: {
        model: 'gemini-3-pro-image-preview',
        imageSize: '2K',
        aspectRatio: '16:9',
        checksumSha256: 'sha256_cloud_storage_banner_ref_001',
      },
    },
    globalLedger: reserved.globalLedger,
    userLedger: reserved.userLedger,
  });

  assert.equal(finalized.record.state, 'COMPLETED');
  assert.equal(finalized.globalLedger.reserved, 0);
  assert.equal(finalized.globalLedger.completed, 11);
  assert.equal(finalized.userLedger.reserved, 0);
  assert.equal(finalized.userLedger.completed, 2);

  // Step 4: Replay with identical idempotencyKey and payloadHash returns cached metadata with zero new quota usage
  const replay = reserveAiQuotaSlot({
    idempotencyKey,
    uid: 'usr_campaign_coord_01',
    dateKey: dhakaDateKey,
    payloadHash,
    nowMs: 25_000,
    existingRecord: finalized.record,
    globalLedger: finalized.globalLedger,
    userLedger: finalized.userLedger,
  });

  assert.equal(replay.status, 'REPLAY_COMPLETED');
  assert.equal(
    replay.record?.cachedResponseMeta?.checksumSha256,
    'sha256_cloud_storage_banner_ref_001'
  );
  assert.equal(replay.globalLedger.completed, 11, 'Replay must not increment completed counter');
  assert.equal(replay.userLedger.completed, 2, 'Replay must not increment user counter');
});

test('WORKFLOW 3.2 [PASS CRITERION]: Intentional new generation with identical prompt on same day succeeds when client provides a distinct UUIDv4 idempotencyKey', () => {
  const uid = 'usr_designer_02';
  const dateKey = 'bd_2026-11-07';
  const identicalPromptHash = computePayloadFingerprint({
    uid,
    endpoint: '/api/ai/campaign-banner',
    prompt: 'Amtali Upazila Thalassemia Awareness Drive',
    imageSize: '1K',
    aspectRatio: '16:9',
  });

  const keyAttempt1 = '11111111-2222-4333-8444-555555555555';
  const keyAttempt2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';

  const global0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 100 };
  const user0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 5 };

  const gen1 = reserveAiQuotaSlot({
    idempotencyKey: keyAttempt1,
    uid,
    dateKey,
    payloadHash: identicalPromptHash,
    nowMs: 1_000,
    existingRecord: null,
    globalLedger: global0,
    userLedger: user0,
  });
  assert.equal(gen1.status, 'RESERVED_NEW');

  const gen2 = reserveAiQuotaSlot({
    idempotencyKey: keyAttempt2,
    uid,
    dateKey,
    payloadHash: identicalPromptHash,
    nowMs: 2_000,
    existingRecord: null,
    globalLedger: gen1.globalLedger,
    userLedger: gen1.userLedger,
  });
  assert.equal(gen2.status, 'RESERVED_NEW');
  assert.equal(gen2.globalLedger.reserved, 2);
  assert.equal(gen2.userLedger.reserved, 2);
});

test('WORKFLOW 3.3 [PASS CRITERION]: Pre-dispatch abort refunds quota (RELEASED), whereas post-dispatch timeout retains slot in UNCERTAIN and blocks duplicate retry', () => {
  const uid = 'usr_coord_03';
  const dateKey = 'bd_2026-11-07';
  const payloadHash = computePayloadFingerprint({
    uid,
    endpoint: '/api/ai/campaign-banner',
    prompt: 'Patharghata Coastal Blood Camp',
  });

  const global0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 100 };
  const user0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 5 };

  // Case A: Pre-dispatch abort refunds quota cleanly
  const resPre = reserveAiQuotaSlot({
    idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0001',
    uid,
    dateKey,
    payloadHash,
    nowMs: 10_000,
    existingRecord: null,
    globalLedger: global0,
    userLedger: user0,
  });

  const refunded = finalizeAiQuotaSlot({
    record: resPre.record!,
    fencingToken: resPre.fencingToken!,
    outcome: { type: 'PRE_DISPATCH_ABORT' },
    globalLedger: resPre.globalLedger,
    userLedger: resPre.userLedger,
  });
  assert.equal(refunded.record.state, 'RELEASED');
  assert.equal(refunded.globalLedger.reserved, 0);
  assert.equal(refunded.globalLedger.released, 1);
  assert.equal(getConsumedSlots(refunded.globalLedger), 0, 'Released slots must not count as consumed');

  // Case B: Post-dispatch 504 timeout transitions to UNCERTAIN and keeps slot consumed
  const resPost = reserveAiQuotaSlot({
    idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0002',
    uid,
    dateKey,
    payloadHash,
    nowMs: 20_000,
    existingRecord: null,
    globalLedger: refunded.globalLedger,
    userLedger: refunded.userLedger,
  });
  const dispatching = markAiDispatching(resPost.record!, resPost.fencingToken!);
  const uncertain = finalizeAiQuotaSlot({
    record: dispatching,
    fencingToken: resPost.fencingToken!,
    outcome: { type: 'POST_DISPATCH_TIMEOUT_OR_5XX' },
    globalLedger: resPost.globalLedger,
    userLedger: resPost.userLedger,
  });
  assert.equal(uncertain.record.state, 'UNCERTAIN');
  assert.equal(uncertain.globalLedger.reserved, 0);
  assert.equal(uncertain.globalLedger.uncertain, 1);
  assert.equal(getConsumedSlots(uncertain.globalLedger), 1, 'UNCERTAIN slot must remain accounted');

  // Retrying an UNCERTAIN record with the same idempotencyKey must be blocked with 409
  const retryUncertain = reserveAiQuotaSlot({
    idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0002',
    uid,
    dateKey,
    payloadHash,
    nowMs: 30_000,
    existingRecord: uncertain.record,
    globalLedger: uncertain.globalLedger,
    userLedger: uncertain.userLedger,
  });
  assert.equal(retryUncertain.status, 'REJECT_UNCERTAIN_OUTCOME_409');
});

test('WORKFLOW 3.4 [PASS CRITERION]: Expired lease reconciliation increments fencingToken and rejects stale worker finalization (FENCING_TOKEN_MISMATCH)', () => {
  const idempotencyKey = '12345678-1234-4234-8234-1234567890ab';
  const uid = 'usr_fencing_test';
  const dateKey = 'bd_2026-11-07';
  const payloadHash = computePayloadFingerprint({
    uid,
    endpoint: '/api/ai/fast-triage',
    prompt: 'Emergency O- Trauma Triage',
  });

  const global0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 100 };
  const user0: QuotaLedgerState = { reserved: 0, completed: 0, released: 0, uncertain: 0, limit: 5 };

  // Worker 1 reserves slot at t=1000ms with 45,000ms lease (expires at 46,000ms), fencingToken = 1
  const worker1Res = reserveAiQuotaSlot({
    idempotencyKey,
    uid,
    dateKey,
    payloadHash,
    nowMs: 1_000,
    leaseDurationMs: 45_000,
    existingRecord: null,
    globalLedger: global0,
    userLedger: user0,
  });
  assert.equal(worker1Res.fencingToken, 1);

  // Worker 1 stalls BEFORE marking DISPATCHING. At t=50,000ms, Worker 2 arrives with the same key.
  // reserveAiQuotaSlot automatically reconciles the expired NOT_DISPATCHED lease and issues fencingToken = 3.
  const worker2Res = reserveAiQuotaSlot({
    idempotencyKey,
    uid,
    dateKey,
    payloadHash,
    nowMs: 50_000,
    leaseDurationMs: 45_000,
    existingRecord: worker1Res.record!,
    globalLedger: worker1Res.globalLedger,
    userLedger: worker1Res.userLedger,
  });

  assert.equal(worker2Res.status, 'RESERVED_NEW');
  assert.ok(
    worker2Res.fencingToken! > worker1Res.fencingToken!,
    'New lease must have strictly higher fencingToken'
  );
  assert.equal(worker2Res.globalLedger.reserved, 1);
  assert.equal(worker2Res.globalLedger.released, 1);

  // Stale Worker 1 wakes up and attempts to finalize using old fencingToken = 1 -> MUST THROW
  assert.throws(
    () =>
      finalizeAiQuotaSlot({
        record: worker2Res.record!,
        fencingToken: worker1Res.fencingToken!,
        outcome: {
          type: 'SUCCESS',
          meta: { model: 'gemini-3.1-flash-lite-preview', imageSize: '1K', aspectRatio: '1:1' },
        },
        globalLedger: worker2Res.globalLedger,
        userLedger: worker2Res.userLedger,
      }),
    /FENCING_TOKEN_MISMATCH/
  );
});

test('WORKFLOW 3.5 [FAIL CRITERIA]: Quota reservation rejects invalid UUIDv4, payload mismatch (422), active in-flight lease (409), quota exhaustion (429), and corrupt ledger state', () => {
  // Fail Case A: Non-UUIDv4 idempotency token validation
  assert.equal(isValidUuidV4IdempotencyKey('not-a-uuid'), false);
  assert.equal(isValidUuidV4IdempotencyKey('550e8400-e29b-11d4-a716-446655440000'), false); // v1 UUID rejected

  const key = '550e8400-e29b-41d4-a716-446655440099';
  const uid = 'usr_quota_limits';
  const dateKey = 'bd_2026-11-07';
  const hashA = computePayloadFingerprint({ uid, endpoint: '/api/ai/fast-triage', prompt: 'Prompt A' });
  const hashB = computePayloadFingerprint({ uid, endpoint: '/api/ai/fast-triage', prompt: 'Prompt B' });

  const activeRecord: AiIdempotencyRecord = {
    idempotencyKey: key,
    uid,
    dateKey,
    payloadHash: hashA,
    state: 'RESERVED',
    dispatchStatus: 'DISPATCHING',
    fencingToken: 1,
    leaseExpiresAtMs: 60_000,
  };

  const baseGlobal: QuotaLedgerState = { reserved: 1, completed: 0, released: 0, uncertain: 0, limit: 100 };
  const baseUser: QuotaLedgerState = { reserved: 1, completed: 0, released: 0, uncertain: 0, limit: 5 };

  // Fail Case B: Payload tampering on same idempotencyKey -> 422
  const mismatch = reserveAiQuotaSlot({
    idempotencyKey: key,
    uid,
    dateKey,
    payloadHash: hashB,
    nowMs: 20_000,
    existingRecord: activeRecord,
    globalLedger: baseGlobal,
    userLedger: baseUser,
  });
  assert.equal(mismatch.status, 'REJECT_PAYLOAD_MISMATCH_422');

  // Fail Case C: Concurrent request while lease is active -> 409
  const inFlight = reserveAiQuotaSlot({
    idempotencyKey: key,
    uid,
    dateKey,
    payloadHash: hashA,
    nowMs: 20_000,
    existingRecord: activeRecord,
    globalLedger: baseGlobal,
    userLedger: baseUser,
  });
  assert.equal(inFlight.status, 'REJECT_IN_FLIGHT_409');

  // Fail Case D: User daily limit exhausted (5 consumed slots: 3 completed + 1 reserved + 1 uncertain) -> 429
  const userExhausted = reserveAiQuotaSlot({
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440088',
    uid,
    dateKey,
    payloadHash: hashA,
    nowMs: 20_000,
    existingRecord: null,
    globalLedger: baseGlobal,
    userLedger: { reserved: 1, completed: 3, released: 4, uncertain: 1, limit: 5 },
  });
  assert.equal(userExhausted.status, 'REJECT_USER_QUOTA_429');

  // Fail Case E: Global daily limit exhausted (100 consumed slots) -> 429
  const globalExhausted = reserveAiQuotaSlot({
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440077',
    uid,
    dateKey,
    payloadHash: hashA,
    nowMs: 20_000,
    existingRecord: null,
    globalLedger: { reserved: 5, completed: 90, released: 12, uncertain: 5, limit: 100 },
    userLedger: baseUser,
  });
  assert.equal(globalExhausted.status, 'REJECT_GLOBAL_QUOTA_429');

  // Fail Case F: Ledger integrity violation when finalizing with reserved === 0
  assert.throws(
    () =>
      finalizeAiQuotaSlot({
        record: activeRecord,
        fencingToken: 1,
        outcome: { type: 'PRE_DISPATCH_ABORT' },
        globalLedger: { reserved: 0, completed: 10, released: 0, uncertain: 0, limit: 100 },
        userLedger: baseUser,
      }),
    /LEDGER_INTEGRITY_VIOLATION/
  );
});
