import crypto from 'node:crypto';
import { isValidDistrictUpazilaPair } from './bloodLogic';

/**
 * 1. OPAQUE PUBLIC DONOR ID & WRITE-ONCE OWNERSHIP LATCH
 * Prevents Firebase UID scraping and guarantees 1 account = max 1 donor profile.
 */
export const OPAQUE_DONOR_ID_REGEX = /^dnr_[a-z0-9]{16,28}$/;

export function generateOpaqueDonorId(): string {
  const bytes = crypto.randomBytes(12);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `dnr_${suffix}${Date.now().toString(36).slice(-6)}`;
}

export function isValidOpaqueDonorId(id: string): boolean {
  return typeof id === 'string' && OPAQUE_DONOR_ID_REGEX.test(id);
}

export interface UserOwnershipRecord {
  uid: string;
  activeDonorId: string | null;
}

export interface DonorRegistrationTransactionAttempt {
  authUid: string;
  emailVerified: boolean;
  existingUserDoc: UserOwnershipRecord | null;
  proposedPublicDonorId: string;
  donorDocOwnerUid: string;
  privateContactOwnerUid: string;
  districtId: string;
  upazilaId: string;
  consentPublicDirectory: boolean;
  consentContactWorkflow: boolean;
  consentVoluntaryNoPayment: boolean;
  consentVersion: string;
}

export interface TransactionEvaluationResult {
  allowed: boolean;
  code:
    | 'OK'
    | 'UNVERIFIED_EMAIL'
    | 'INVALID_OPAQUE_ID'
    | 'UID_EXPOSED_IN_PUBLIC_ID'
    | 'DUPLICATE_DONOR_PROFILE'
    | 'OWNERSHIP_MISMATCH'
    | 'INVALID_GEOGRAPHY'
    | 'MISSING_CONSENT';
  updatedActiveDonorId?: string;
}

export function evaluateDonorRegistrationTransaction(
  attempt: DonorRegistrationTransactionAttempt
): TransactionEvaluationResult {
  if (!attempt.emailVerified) {
    return { allowed: false, code: 'UNVERIFIED_EMAIL' };
  }
  if (
    attempt.proposedPublicDonorId === attempt.authUid ||
    attempt.proposedPublicDonorId.includes(attempt.authUid)
  ) {
    return { allowed: false, code: 'UID_EXPOSED_IN_PUBLIC_ID' };
  }
  if (!isValidOpaqueDonorId(attempt.proposedPublicDonorId)) {
    return { allowed: false, code: 'INVALID_OPAQUE_ID' };
  }
  if (
    attempt.existingUserDoc &&
    attempt.existingUserDoc.activeDonorId !== null
  ) {
    // Write-once latch: activeDonorId can never be overwritten or reset once assigned
    return { allowed: false, code: 'DUPLICATE_DONOR_PROFILE' };
  }
  if (
    attempt.donorDocOwnerUid !== attempt.authUid ||
    attempt.privateContactOwnerUid !== attempt.authUid
  ) {
    return { allowed: false, code: 'OWNERSHIP_MISMATCH' };
  }
  if (!isValidDistrictUpazilaPair(attempt.districtId, attempt.upazilaId)) {
    return { allowed: false, code: 'INVALID_GEOGRAPHY' };
  }
  if (
    !attempt.consentPublicDirectory ||
    !attempt.consentContactWorkflow ||
    !attempt.consentVoluntaryNoPayment ||
    attempt.consentVersion !== '1.0'
  ) {
    return { allowed: false, code: 'MISSING_CONSENT' };
  }

  return {
    allowed: true,
    code: 'OK',
    updatedActiveDonorId: attempt.proposedPublicDonorId,
  };
}

/**
 * 2. ASIA/DHAKA APPLICATION QUOTA & OPTIONAL PACIFIC TIME KEYS
 * Application AI quota resets daily at Midnight Bangladesh Standard Time (Asia/Dhaka, UTC+6).
 * Firestore Spark Free Tier resets daily at Midnight Pacific Time (America/Los_Angeles).
 */
export function getDhakaQuotaDateKey(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `bd_${formatter.format(now)}`;
}

export function getPacificQuotaDateKey(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `pt_${formatter.format(now)}`;
}

/**
 * 3. AI QUOTA LEDGER, FENCING TOKENS & IDEMPOTENCY STATE MACHINE
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuidV4IdempotencyKey(key: string): boolean {
  return typeof key === 'string' && UUID_V4_REGEX.test(key.trim());
}

export function computePayloadFingerprint(payload: {
  uid: string;
  endpoint: string;
  prompt: string;
  imageSize?: string;
  aspectRatio?: string;
  mode?: string;
}): string {
  const canonical = JSON.stringify({
    uid: payload.uid,
    endpoint: payload.endpoint,
    prompt: payload.prompt.trim(),
    imageSize: payload.imageSize || '1K',
    aspectRatio: payload.aspectRatio || '16:9',
    mode: payload.mode || 'create',
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export interface QuotaLedgerState {
  reserved: number;
  completed: number;
  released: number;
  uncertain: number;
  limit: number;
}

export type IdempotencyRecordState =
  | 'RESERVED'
  | 'COMPLETED'
  | 'RELEASED'
  | 'UNCERTAIN';

export type DispatchStatus = 'NOT_DISPATCHED' | 'DISPATCHING';

export interface AiIdempotencyRecord {
  idempotencyKey: string;
  uid: string;
  dateKey: string;
  payloadHash: string;
  state: IdempotencyRecordState;
  dispatchStatus: DispatchStatus;
  fencingToken: number;
  leaseExpiresAtMs: number;
  cachedResponseMeta?: {
    model: string;
    imageSize: string;
    aspectRatio: string;
    checksumSha256?: string;
    fallbackStudioRender?: boolean;
  };
}

export function getConsumedSlots(ledger: QuotaLedgerState): number {
  return ledger.reserved + ledger.completed + ledger.uncertain;
}

/**
 * Strictly validates ledger counters before any transition.
 * Never uses Math.max(0, reserved - 1) to hide inconsistent state.
 */
export function assertValidLedger(
  ledger: QuotaLedgerState,
  requireReservedSlot = false
): void {
  if (
    !Number.isInteger(ledger.reserved) ||
    !Number.isInteger(ledger.completed) ||
    !Number.isInteger(ledger.released) ||
    !Number.isInteger(ledger.uncertain) ||
    ledger.reserved < 0 ||
    ledger.completed < 0 ||
    ledger.released < 0 ||
    ledger.uncertain < 0
  ) {
    throw new Error('LEDGER_INTEGRITY_VIOLATION: Negative or non-integer counter detected.');
  }
  if (requireReservedSlot && ledger.reserved < 1) {
    throw new Error(
      `LEDGER_INTEGRITY_VIOLATION: Expected reserved >= 1 before finalization, found reserved=${ledger.reserved}.`
    );
  }
}

export interface QuotaReservationResult {
  status:
    | 'RESERVED_NEW'
    | 'REPLAY_COMPLETED'
    | 'REJECT_PAYLOAD_MISMATCH_422'
    | 'REJECT_IN_FLIGHT_409'
    | 'REJECT_UNCERTAIN_OUTCOME_409'
    | 'REJECT_GLOBAL_QUOTA_429'
    | 'REJECT_USER_QUOTA_429';
  fencingToken?: number;
  record?: AiIdempotencyRecord;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
}

export function reserveAiQuotaSlot(params: {
  idempotencyKey: string;
  uid: string;
  dateKey: string;
  payloadHash: string;
  nowMs: number;
  leaseDurationMs?: number;
  existingRecord: AiIdempotencyRecord | null;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
}): QuotaReservationResult {
  const {
    idempotencyKey,
    uid,
    dateKey,
    payloadHash,
    nowMs,
    leaseDurationMs = 45_000,
    existingRecord,
  } = params;

  const globalLedger = { ...params.globalLedger };
  const userLedger = { ...params.userLedger };

  assertValidLedger(globalLedger, false);
  assertValidLedger(userLedger, false);

  if (existingRecord) {
    if (
      existingRecord.payloadHash !== payloadHash ||
      existingRecord.uid !== uid
    ) {
      return {
        status: 'REJECT_PAYLOAD_MISMATCH_422',
        globalLedger,
        userLedger,
      };
    }

    if (existingRecord.state === 'COMPLETED') {
      return {
        status: 'REPLAY_COMPLETED',
        record: existingRecord,
        globalLedger,
        userLedger,
      };
    }

    if (existingRecord.state === 'UNCERTAIN') {
      return {
        status: 'REJECT_UNCERTAIN_OUTCOME_409',
        record: existingRecord,
        globalLedger,
        userLedger,
      };
    }

    if (existingRecord.state === 'RESERVED') {
      if (existingRecord.leaseExpiresAtMs > nowMs) {
        return {
          status: 'REJECT_IN_FLIGHT_409',
          record: existingRecord,
          globalLedger,
          userLedger,
        };
      }
      // Lease expired while RESERVED -> reconcile first
      const reconciled = reconcileExpiredAiLease({
        record: existingRecord,
        globalLedger,
        userLedger,
        nowMs,
      });
      if (reconciled.record.state === 'UNCERTAIN') {
        return {
          status: 'REJECT_UNCERTAIN_OUTCOME_409',
          record: reconciled.record,
          globalLedger: reconciled.globalLedger,
          userLedger: reconciled.userLedger,
        };
      }
      // If it was NOT_DISPATCHED and reconciled to RELEASED, fall through to re-reserve
      globalLedger.reserved = reconciled.globalLedger.reserved;
      globalLedger.released = reconciled.globalLedger.released;
      userLedger.reserved = reconciled.userLedger.reserved;
      userLedger.released = reconciled.userLedger.released;
    }
  }

  if (getConsumedSlots(globalLedger) >= globalLedger.limit) {
    return {
      status: 'REJECT_GLOBAL_QUOTA_429',
      globalLedger,
      userLedger,
    };
  }

  if (getConsumedSlots(userLedger) >= userLedger.limit) {
    return {
      status: 'REJECT_USER_QUOTA_429',
      globalLedger,
      userLedger,
    };
  }

  const nextFencingToken = (existingRecord?.fencingToken ?? 0) + 1;
  globalLedger.reserved += 1;
  userLedger.reserved += 1;

  const newRecord: AiIdempotencyRecord = {
    idempotencyKey,
    uid,
    dateKey,
    payloadHash,
    state: 'RESERVED',
    dispatchStatus: 'NOT_DISPATCHED',
    fencingToken: nextFencingToken,
    leaseExpiresAtMs: nowMs + leaseDurationMs,
  };

  return {
    status: 'RESERVED_NEW',
    fencingToken: nextFencingToken,
    record: newRecord,
    globalLedger,
    userLedger,
  };
}

export function markAiDispatching(
  record: AiIdempotencyRecord,
  fencingToken: number
): AiIdempotencyRecord {
  if (record.state !== 'RESERVED') {
    throw new Error(`Cannot mark DISPATCHING from state ${record.state}`);
  }
  if (record.fencingToken !== fencingToken) {
    throw new Error('FENCING_TOKEN_MISMATCH');
  }
  return {
    ...record,
    dispatchStatus: 'DISPATCHING',
  };
}

export type FinalizeOutcome =
  | { type: 'SUCCESS'; meta: NonNullable<AiIdempotencyRecord['cachedResponseMeta']> }
  | { type: 'PRE_DISPATCH_ABORT' }
  | { type: 'DETERMINISTIC_GATEWAY_REJECT'; httpStatus: 400 | 401 | 403 | 429 }
  | { type: 'POST_DISPATCH_TIMEOUT_OR_5XX' };

export function finalizeAiQuotaSlot(params: {
  record: AiIdempotencyRecord;
  fencingToken: number;
  outcome: FinalizeOutcome;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
}): {
  record: AiIdempotencyRecord;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
} {
  const { record, fencingToken, outcome } = params;
  if (record.fencingToken !== fencingToken) {
    throw new Error('FENCING_TOKEN_MISMATCH: Stale worker cannot finalize slot.');
  }
  if (record.state !== 'RESERVED') {
    throw new Error(`INVALID_STATE_TRANSITION: Record already in ${record.state}.`);
  }

  // Strict precondition: reserved >= 1 on both ledgers (never clamp silently)
  assertValidLedger(params.globalLedger, true);
  assertValidLedger(params.userLedger, true);

  const globalLedger = { ...params.globalLedger };
  const userLedger = { ...params.userLedger };

  if (outcome.type === 'SUCCESS') {
    globalLedger.reserved -= 1;
    globalLedger.completed += 1;
    userLedger.reserved -= 1;
    userLedger.completed += 1;
    return {
      record: {
        ...record,
        state: 'COMPLETED',
        cachedResponseMeta: outcome.meta,
      },
      globalLedger,
      userLedger,
    };
  }

  if (
    outcome.type === 'PRE_DISPATCH_ABORT' ||
    outcome.type === 'DETERMINISTIC_GATEWAY_REJECT'
  ) {
    if (
      outcome.type === 'PRE_DISPATCH_ABORT' &&
      record.dispatchStatus === 'DISPATCHING'
    ) {
      throw new Error(
        'Cannot claim PRE_DISPATCH_ABORT after dispatchStatus became DISPATCHING.'
      );
    }
    globalLedger.reserved -= 1;
    globalLedger.released += 1;
    userLedger.reserved -= 1;
    userLedger.released += 1;
    return {
      record: {
        ...record,
        state: 'RELEASED',
      },
      globalLedger,
      userLedger,
    };
  }

  // Post-dispatch timeout, network drop, or 5xx -> transition to UNCERTAIN (retains consumed slot)
  globalLedger.reserved -= 1;
  globalLedger.uncertain += 1;
  userLedger.reserved -= 1;
  userLedger.uncertain += 1;
  return {
    record: {
      ...record,
      state: 'UNCERTAIN',
    },
    globalLedger,
    userLedger,
  };
}

export function reconcileExpiredAiLease(params: {
  record: AiIdempotencyRecord;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
  nowMs: number;
}): {
  record: AiIdempotencyRecord;
  globalLedger: QuotaLedgerState;
  userLedger: QuotaLedgerState;
} {
  const { record, nowMs } = params;
  if (record.state !== 'RESERVED' || record.leaseExpiresAtMs > nowMs) {
    throw new Error('Lease is not eligible for expiry reconciliation.');
  }

  assertValidLedger(params.globalLedger, true);
  assertValidLedger(params.userLedger, true);

  const globalLedger = { ...params.globalLedger };
  const userLedger = { ...params.userLedger };

  if (record.dispatchStatus === 'NOT_DISPATCHED') {
    globalLedger.reserved -= 1;
    globalLedger.released += 1;
    userLedger.reserved -= 1;
    userLedger.released += 1;
    return {
      record: {
        ...record,
        state: 'RELEASED',
        fencingToken: record.fencingToken + 1,
      },
      globalLedger,
      userLedger,
    };
  }

  globalLedger.reserved -= 1;
  globalLedger.uncertain += 1;
  userLedger.reserved -= 1;
  userLedger.uncertain += 1;
  return {
    record: {
      ...record,
      state: 'UNCERTAIN',
      fencingToken: record.fencingToken + 1,
    },
    globalLedger,
    userLedger,
  };
}

/**
 * 4. DONOR PRIVACY & 24-HOUR CONTACT MEDIATION EVALUATOR
 */
export interface ApprovedContactShareDoc {
  contactRequestId: string;
  publicDonorId: string;
  requesterId: string;
  mode: 'mediated_callback' | 'direct_on_approval';
  expiresAtMs: number;
  revoked: boolean;
}

export interface LiveDonorConsentSnapshot {
  publicDonorId: string;
  isPubliclyListed: boolean;
  consentContactWorkflow: boolean;
}

export function evaluateContactShareAccess(params: {
  authUid: string;
  shareDoc: ApprovedContactShareDoc;
  liveDonorDoc: LiveDonorConsentSnapshot | null;
  nowMs: number;
}): { allowed: boolean; reason: string } {
  const { authUid, shareDoc, liveDonorDoc, nowMs } = params;

  if (shareDoc.requesterId !== authUid) {
    return { allowed: false, reason: 'NOT_AUTHORIZED_REQUESTER' };
  }
  if (shareDoc.mode === 'mediated_callback') {
    return {
      allowed: false,
      reason: 'MODE_A_MEDIATED_CALLBACK_NEVER_EXPOSES_DONOR_PHONE',
    };
  }
  if (shareDoc.revoked) {
    return { allowed: false, reason: 'SHARE_EXPLICITLY_REVOKED' };
  }
  if (nowMs >= shareDoc.expiresAtMs) {
    return { allowed: false, reason: 'SHARE_TTL_24H_EXPIRED' };
  }
  if (
    !liveDonorDoc ||
    !liveDonorDoc.isPubliclyListed ||
    !liveDonorDoc.consentContactWorkflow
  ) {
    return { allowed: false, reason: 'DONOR_CONSENT_WITHDRAWN_LIVE_CHECK' };
  }

  return { allowed: true, reason: 'ALLOWED_MODE_B_ACTIVE_WINDOW' };
}

/**
 * 5. NON-DESTRUCTIVE BACKUP RESTORE DRY-RUN DIFF & 15-DOC BATCH CHUNKER
 */
export interface RestoreDryRunSummary {
  mode: 'merge_missing_only';
  totalInBackup: number;
  missingIdsToInsert: string[];
  existingIdsSkipped: string[];
  batches: string[][];
}

export function computeRestoreDryRunDiff(params: {
  backupDocIds: string[];
  existingCloudDocIds: Set<string>;
  maxBatchSize?: number;
}): RestoreDryRunSummary {
  const { backupDocIds, existingCloudDocIds, maxBatchSize = 15 } = params;
  const safeBatchLimit = Math.min(Math.max(1, maxBatchSize), 15);
  const missingIdsToInsert: string[] = [];
  const existingIdsSkipped: string[] = [];

  for (const id of backupDocIds) {
    if (existingCloudDocIds.has(id)) {
      existingIdsSkipped.push(id);
    } else {
      missingIdsToInsert.push(id);
    }
  }

  const batches: string[][] = [];
  for (let i = 0; i < missingIdsToInsert.length; i += safeBatchLimit) {
    batches.push(missingIdsToInsert.slice(i, i + safeBatchLimit));
  }

  return {
    mode: 'merge_missing_only',
    totalInBackup: backupDocIds.length,
    missingIdsToInsert,
    existingIdsSkipped,
    batches,
  };
}
