import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 (b): admins can see the unfulfilled payments list; nobody else can.
 * The list reads the real ledger module over a fake `stripe_webhook_events` table.
 */

const h = vi.hoisted(() => ({
  session: null as { sub: string } | null,
  rows: [] as Array<{ id: string; type: string; processedAt: Date | null; createdAt: Date }>,
  findMany: vi.fn(),
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn(async () => h.session),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { stripeWebhookEvent: { findMany: h.findMany } },
}));

const { GET } = await import('../../../app/api/admin/unfulfilled-payments/route');

beforeEach(() => {
  h.session = null;
  h.findMany.mockReset();
  h.findMany.mockImplementation(
    async (args: { where: { id: { startsWith: string }; processedAt: null } }) =>
      h.rows.filter(
        (r) => r.id.startsWith(args.where.id.startsWith) && r.processedAt === args.where.processedAt,
      ),
  );
  h.rows = [
    {
      id: 'unfulfilled-payment:cs_test_open',
      type: 'unfulfilled:learner_unmatched',
      processedAt: null,
      createdAt: new Date('2026-11-21T10:00:00.000Z'),
    },
    {
      id: 'unfulfilled-payment:cs_test_done',
      type: 'unfulfilled:learner_unmatched',
      processedAt: new Date('2026-11-21T11:00:00.000Z'),
      createdAt: new Date('2026-11-21T09:00:00.000Z'),
    },
    {
      id: 'evt_test_ordinary_claim',
      type: 'checkout.session.completed',
      processedAt: null,
      createdAt: new Date('2026-11-21T08:00:00.000Z'),
    },
  ];
});

describe('GET /api/admin/unfulfilled-payments', () => {
  it('refuses a request without an admin session and reads nothing', async () => {
    const res = await GET();

    expect(res.status).toBe(401);
    expect(h.findMany).not.toHaveBeenCalled();
  });

  it('lists only unresolved unfulfilled payments for an admin', async () => {
    h.session = { sub: 'admin-1' };

    const res = await GET();
    const body = (await res.json()) as { payments: unknown[] };

    expect(res.status).toBe(200);
    expect(body.payments).toEqual([
      {
        stripeObjectId: 'cs_test_open',
        reason: 'learner_unmatched',
        firstSeenAt: '2026-11-21T10:00:00.000Z',
      },
    ]);
  });
});
