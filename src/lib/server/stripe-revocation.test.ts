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
