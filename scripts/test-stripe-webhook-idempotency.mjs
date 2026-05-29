import assert from 'node:assert/strict';
import test from 'node:test';

import {
  claimStripeWebhookEvent,
  markStripeWebhookEventProcessed,
  releaseStripeWebhookEventClaim,
} from '../src/lib/server/stripe-webhook-idempotency.js';

function duplicateError() {
  return Object.assign(new Error('duplicate'), { code: 'P2002' });
}

function notFoundError() {
  return Object.assign(new Error('not found'), { code: 'P2025' });
}

test('claimStripeWebhookEvent creates a first-time event row', async () => {
  const calls = [];
  const delegate = {
    async create(args) {
      calls.push(args);
    },
  };

  const result = await claimStripeWebhookEvent(delegate, {
    id: 'evt_123',
    type: 'checkout.session.completed',
  });

  assert.deepEqual(result, { claimed: true });
  assert.deepEqual(calls, [
    {
      data: {
        id: 'evt_123',
        type: 'checkout.session.completed',
      },
    },
  ]);
});

test('claimStripeWebhookEvent reports duplicates without throwing', async () => {
  const delegate = {
    async create() {
      throw duplicateError();
    },
  };

  const result = await claimStripeWebhookEvent(delegate, {
    id: 'evt_123',
    type: 'checkout.session.completed',
  });

  assert.deepEqual(result, { claimed: false });
});

test('markStripeWebhookEventProcessed records the processed timestamp', async () => {
  const processedAt = new Date('2026-05-30T00:00:00.000Z');
  const calls = [];
  const delegate = {
    async update(args) {
      calls.push(args);
    },
  };

  await markStripeWebhookEventProcessed(delegate, 'evt_123', processedAt);

  assert.deepEqual(calls, [
    {
      where: { id: 'evt_123' },
      data: { processedAt },
    },
  ]);
});

test('releaseStripeWebhookEventClaim deletes the claim and ignores missing rows', async () => {
  const deleted = [];
  const delegate = {
    async delete(args) {
      deleted.push(args);
    },
  };

  await releaseStripeWebhookEventClaim(delegate, 'evt_123');
  assert.deepEqual(deleted, [{ where: { id: 'evt_123' } }]);

  await releaseStripeWebhookEventClaim(
    {
      async delete() {
        throw notFoundError();
      },
    },
    'evt_missing'
  );
});
