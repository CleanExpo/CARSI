import { describe, expect, it } from 'vitest';

import { claimStripeWebhookEvent, STALE_CLAIM_MS } from './stripe-webhook-idempotency';

function p2002() {
  const e = new Error('Unique constraint failed') as Error & { code?: string };
  e.code = 'P2002';
  return e;
}

function delegate(opts: {
  createThrows?: unknown;
  existing?: { processedAt: Date | null; createdAt: Date } | null;
}) {
  return {
    async create() {
      if (opts.createThrows) throw opts.createThrows;
      return {};
    },
    async findUnique() {
      return opts.existing ?? null;
    },
    async update() {
      return {};
    },
    async delete() {
      return {};
    },
  };
}

const event = { id: 'evt_1', type: 'charge.refunded' };
const NOW = new Date('2026-06-29T12:00:00Z');

describe('claimStripeWebhookEvent', () => {
  it('claims a fresh event (insert succeeds)', async () => {
    const r = await claimStripeWebhookEvent(delegate({}), event, NOW);
    expect(r).toEqual({ claimed: true });
  });

  it('rejects a genuinely-processed duplicate', async () => {
    const r = await claimStripeWebhookEvent(
      delegate({ createThrows: p2002(), existing: { processedAt: NOW, createdAt: NOW } }),
      event,
      NOW,
    );
    expect(r).toEqual({ claimed: false });
  });

  it('rejects a recent unprocessed claim (another worker in-flight)', async () => {
    const createdAt = new Date(NOW.getTime() - 30_000); // 30s ago, < TTL
    const r = await claimStripeWebhookEvent(
      delegate({ createThrows: p2002(), existing: { processedAt: null, createdAt } }),
      event,
      NOW,
    );
    expect(r).toEqual({ claimed: false });
  });

  it('reclaims a STALE unprocessed claim so the event is not dropped forever', async () => {
    const createdAt = new Date(NOW.getTime() - STALE_CLAIM_MS - 1000); // past TTL
    const r = await claimStripeWebhookEvent(
      delegate({ createThrows: p2002(), existing: { processedAt: null, createdAt } }),
      event,
      NOW,
    );
    expect(r).toEqual({ claimed: true });
  });

  it('rethrows non-P2002 errors', async () => {
    await expect(
      claimStripeWebhookEvent(delegate({ createThrows: new Error('boom') }), event, NOW),
    ).rejects.toThrow('boom');
  });
});
