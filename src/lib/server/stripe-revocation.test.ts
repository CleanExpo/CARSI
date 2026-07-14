import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * WS3 (P0-C) — the revocation writer. Proves a full refund / chargeback marks the
 * enrolment terminal AND clears the completion fuel (`completedAt`) that let a
 * later sync resurrect it.
 */
const mock = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: { lmsEnrollment: { updateMany: mock.updateMany } },
}));

const {
  revokeEnrollmentsByPaymentReference,
  reactivateDisputeWonEnrollmentsByPaymentReference,
  isDisputeWon,
} = await import('./stripe-revocation');

beforeEach(() => {
  mock.updateMany.mockReset();
});

describe('revokeEnrollmentsByPaymentReference', () => {
  it('revokes matching non-revoked enrolments, clearing certificateIssuedAt AND completedAt', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 2 });
    const res = await revokeEnrollmentsByPaymentReference('  cs_test_123  ', 'refunded');
    expect(res).toEqual({ revoked: 2 });
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: {
        paymentReference: 'cs_test_123',
        OR: [{ status: { not: 'revoked' } }, { revokedReason: 'disputed' }],
      },
      data: {
        status: 'revoked',
        certificateIssuedAt: null,
        completedAt: null,
        revokedReason: 'refunded',
      },
    });
  });

  it('is idempotent — a repeated webhook delivery matches nothing', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await revokeEnrollmentsByPaymentReference('cs_1', 'disputed')).toEqual({ revoked: 0 });
  });

  it('no-ops on a blank paymentReference without touching the database', async () => {
    expect(await revokeEnrollmentsByPaymentReference('   ', 'refunded')).toEqual({ revoked: 0 });
    expect(mock.updateMany).not.toHaveBeenCalled();
  });

  it('persists the revocation reason so a later dispute-won can be re-granted (disputed)', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    await revokeEnrollmentsByPaymentReference('cs_dispute_1', 'disputed');
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: { paymentReference: 'cs_dispute_1', status: { not: 'revoked' } },
      data: {
        status: 'revoked',
        certificateIssuedAt: null,
        completedAt: null,
        revokedReason: 'disputed',
      },
    });
  });

  it('a refund is terminal over a prior dispute — it also re-stamps an already dispute-revoked row as refunded so a dispute-won cannot re-grant it', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    await revokeEnrollmentsByPaymentReference('cs_refund_after_dispute', 'refunded');
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: {
        paymentReference: 'cs_refund_after_dispute',
        OR: [{ status: { not: 'revoked' } }, { revokedReason: 'disputed' }],
      },
      data: {
        status: 'revoked',
        certificateIssuedAt: null,
        completedAt: null,
        revokedReason: 'refunded',
      },
    });
  });
});

describe('reactivateDisputeWonEnrollmentsByPaymentReference', () => {
  it('reactivates ONLY revoked rows this dispute revoked, restoring access and clearing the reason', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await reactivateDisputeWonEnrollmentsByPaymentReference('  cs_won_1  ');
    expect(res).toEqual({ reactivated: 1 });
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: { paymentReference: 'cs_won_1', status: 'revoked', revokedReason: 'disputed' },
      data: { status: 'active', revokedReason: null },
    });
  });

  it('restores access only — never re-issues a certificate or resurrects completion (WS3 invariant)', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    await reactivateDisputeWonEnrollmentsByPaymentReference('cs_won_2');
    const arg = mock.updateMany.mock.calls[0][0];
    expect(arg.data).not.toHaveProperty('certificateIssuedAt');
    expect(arg.data).not.toHaveProperty('completedAt');
  });

  it('is idempotent — a re-delivered dispute-won matches nothing the second time', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await reactivateDisputeWonEnrollmentsByPaymentReference('cs_won_3')).toEqual({
      reactivated: 0,
    });
  });

  it('no-ops on a blank paymentReference without touching the database', async () => {
    expect(await reactivateDisputeWonEnrollmentsByPaymentReference('   ')).toEqual({
      reactivated: 0,
    });
    expect(mock.updateMany).not.toHaveBeenCalled();
  });
});

/**
 * Out-of-order Stripe delivery guard (mirrors subscription-store's statusEventAt
 * compare-and-set). Stripe delivers webhooks at-least-once and NOT in order. The
 * realistic hazard: `charge.dispute.created` 5xx's and is retried LATER, while
 * `charge.dispute.closed`(won) is delivered/processed in between. Without a guard
 * the retried `created` re-revokes a row the won-close already restored, and the
 * customer who WON their dispute stays locked out.
 *
 * When an `eventTimestamp` (the Stripe `event.created`) is supplied, a revoke
 * only applies if it is not stale (stored statusEventAt <= incoming), and stamps
 * statusEventAt; a reactivate flips disputed rows AND stamps still-active rows so
 * a later stale `created` cannot revoke them. Omitting the timestamp keeps the
 * exact legacy behaviour (proven by the suites above, which pass no timestamp).
 */
describe('revoke ordering guard (eventTimestamp)', () => {
  const T = new Date('2026-07-15T10:00:00.000Z');

  it('disputed revoke adds a not-stale guard and stamps statusEventAt', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    await revokeEnrollmentsByPaymentReference('cs_ord_1', 'disputed', T);
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: {
        paymentReference: 'cs_ord_1',
        AND: [
          { status: { not: 'revoked' } },
          { OR: [{ statusEventAt: null }, { statusEventAt: { lte: T } }] },
        ],
      },
      data: {
        status: 'revoked',
        certificateIssuedAt: null,
        completedAt: null,
        revokedReason: 'disputed',
        statusEventAt: T,
      },
    });
  });

  it('refunded revoke keeps the terminal OR AND adds the not-stale guard + stamp', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 });
    await revokeEnrollmentsByPaymentReference('cs_ord_2', 'refunded', T);
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: {
        paymentReference: 'cs_ord_2',
        AND: [
          { OR: [{ status: { not: 'revoked' } }, { revokedReason: 'disputed' }] },
          { OR: [{ statusEventAt: null }, { statusEventAt: { lte: T } }] },
        ],
      },
      data: {
        status: 'revoked',
        certificateIssuedAt: null,
        completedAt: null,
        revokedReason: 'refunded',
        statusEventAt: T,
      },
    });
  });
});

describe('reactivate ordering guard (eventTimestamp)', () => {
  const T = new Date('2026-07-15T11:00:00.000Z');

  it('flips disputed rows (not-stale) then stamps still-active rows so a stale created cannot revoke', async () => {
    mock.updateMany
      .mockResolvedValueOnce({ count: 1 }) // step A: flip disputed→active
      .mockResolvedValueOnce({ count: 2 }); // step B: stamp active rows
    const res = await reactivateDisputeWonEnrollmentsByPaymentReference('cs_ord_3', T);

    // reactivated count reflects ONLY the rows actually re-granted (step A).
    expect(res).toEqual({ reactivated: 1 });

    // Step A — flip disputed-revoked rows this dispute revoked, not-stale, stamp T.
    expect(mock.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        paymentReference: 'cs_ord_3',
        status: 'revoked',
        revokedReason: 'disputed',
        OR: [{ statusEventAt: null }, { statusEventAt: { lte: T } }],
      },
      data: { status: 'active', revokedReason: null, statusEventAt: T },
    });

    // Step B — stamp still-active rows (not yet revoked by a delayed created) with
    // T, so the retried stale created's not-stale guard (statusEventAt <= Tc) fails.
    expect(mock.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        paymentReference: 'cs_ord_3',
        status: 'active',
        OR: [{ statusEventAt: null }, { statusEventAt: { lt: T } }],
      },
      data: { statusEventAt: T },
    });
  });

  it('still restores access only — the flip never re-issues a certificate or resurrects completion', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await reactivateDisputeWonEnrollmentsByPaymentReference('cs_ord_4', T);
    const flipData = mock.updateMany.mock.calls[0][0].data;
    expect(flipData).not.toHaveProperty('certificateIssuedAt');
    expect(flipData).not.toHaveProperty('completedAt');
  });

  it('no-ops on a blank paymentReference without touching the database', async () => {
    expect(await reactivateDisputeWonEnrollmentsByPaymentReference('   ', T)).toEqual({
      reactivated: 0,
    });
    expect(mock.updateMany).not.toHaveBeenCalled();
  });
});

describe('isDisputeWon', () => {
  it('is true ONLY for a dispute won by the merchant', () => {
    expect(isDisputeWon('won')).toBe(true);
  });

  it('is false for every non-won close status (customer keeps their money back)', () => {
    for (const status of ['lost', 'warning_closed', 'under_review', 'needs_response', '', undefined]) {
      expect(isDisputeWon(status)).toBe(false);
    }
  });
});
