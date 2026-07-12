import { describe, expect, it } from 'vitest';

import {
  ACCESS_GRANTING_STATUSES,
  NO_ACCESS_STATUSES,
  isEnrolmentAccessAllowed,
  isRevokedStatus,
} from './enrollment-access';

/**
 * WS3 (P0-C) — the single fail-closed access predicate.
 *
 * lms_enrollments.status is free-text; only `active|completed|revoked` are ever
 * written today, but read gates historically defended against the never-written
 * `'cancelled'`, which a real refund (`'revoked'`) trivially passed. This predicate
 * is an ALLOW-SET: only `{active, completed}` grant access — every other, unknown,
 * or misspelt token DENIES, so a future status value fails closed.
 *
 * Pure + dependency-free (mirrors decideMembershipEntitlement / lms-completion).
 */
describe('isEnrolmentAccessAllowed', () => {
  it('allows the two access-granting statuses', () => {
    expect(isEnrolmentAccessAllowed('active')).toBe(true);
    expect(isEnrolmentAccessAllowed('completed')).toBe(true);
  });

  it('denies every no-access status (refund/chargeback family)', () => {
    for (const s of ['revoked', 'cancelled', 'canceled', 'refunded', 'disputed', 'chargeback']) {
      expect(isEnrolmentAccessAllowed(s)).toBe(false);
    }
  });

  it('fails closed on null / undefined / empty / unknown', () => {
    expect(isEnrolmentAccessAllowed(null)).toBe(false);
    expect(isEnrolmentAccessAllowed(undefined)).toBe(false);
    expect(isEnrolmentAccessAllowed('')).toBe(false);
    expect(isEnrolmentAccessAllowed('  ')).toBe(false);
    expect(isEnrolmentAccessAllowed('some-future-status')).toBe(false);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isEnrolmentAccessAllowed('  Active ')).toBe(true);
    expect(isEnrolmentAccessAllowed('COMPLETED')).toBe(true);
    expect(isEnrolmentAccessAllowed(' Revoked ')).toBe(false);
  });
});

describe('isRevokedStatus', () => {
  it('is true for every no-access spelling (incl. both cancelled/canceled)', () => {
    for (const s of NO_ACCESS_STATUSES) {
      expect(isRevokedStatus(s)).toBe(true);
      expect(isRevokedStatus(s.toUpperCase())).toBe(true);
    }
  });

  it('is false for the access-granting statuses and unknown/blank', () => {
    for (const s of ACCESS_GRANTING_STATUSES) expect(isRevokedStatus(s)).toBe(false);
    expect(isRevokedStatus(null)).toBe(false);
    expect(isRevokedStatus('')).toBe(false);
    expect(isRevokedStatus('some-future-status')).toBe(false);
  });

  it('is disjoint from the allow-set (no status is both)', () => {
    for (const s of NO_ACCESS_STATUSES) {
      expect(isEnrolmentAccessAllowed(s) && isRevokedStatus(s)).toBe(false);
    }
  });
});
