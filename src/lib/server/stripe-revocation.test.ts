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

const { revokeEnrollmentsByPaymentReference } = await import('./stripe-revocation');

beforeEach(() => {
  mock.updateMany.mockReset();
});

describe('revokeEnrollmentsByPaymentReference', () => {
  it('revokes matching non-revoked enrolments, clearing certificateIssuedAt AND completedAt', async () => {
    mock.updateMany.mockResolvedValueOnce({ count: 2 });
    const res = await revokeEnrollmentsByPaymentReference('  cs_test_123  ', 'refunded');
    expect(res).toEqual({ revoked: 2 });
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: { paymentReference: 'cs_test_123', status: { not: 'revoked' } },
      data: { status: 'revoked', certificateIssuedAt: null, completedAt: null },
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
});
