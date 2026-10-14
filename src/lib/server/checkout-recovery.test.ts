import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

import {
  checkoutRecoveryEnabled,
  checkoutRecoveryParams,
  handleCheckoutSessionExpired,
  isTransientRecoveryOutcome,
  recoverySendLedger,
  recoverySendRowId,
} from './checkout-recovery';
import { STALE_CLAIM_MS } from './stripe-webhook-idempotency';

/** In-memory stand-in for the `stripe_webhook_events` delegate (unique id, P2002 on clash). */
function memoryClaimTable() {
  const rows = new Map<string, { processedAt: Date | null; createdAt: Date }>();
  return {
    rows,
    delegate: {
      async create({ data }: { data: { id: string; type: string } }) {
        if (rows.has(data.id)) throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        rows.set(data.id, { processedAt: null, createdAt: new Date() });
        return {};
      },
      async findUnique({ where }: { where: { id: string } }) {
        return rows.get(where.id) ?? null;
      },
      async update({ where, data }: { where: { id: string }; data: { processedAt: Date } }) {
        const row = rows.get(where.id);
        if (!row) throw Object.assign(new Error('Not found'), { code: 'P2025' });
        row.processedAt = data.processedAt;
        return {};
      },
      async delete({ where }: { where: { id: string } }) {
        if (!rows.delete(where.id)) throw Object.assign(new Error('Not found'), { code: 'P2025' });
        return {};
      },
    },
  };
}

const ON = { CHECKOUT_RECOVERY_ENABLED: 'true' } as NodeJS.ProcessEnv;
const OFF = {} as NodeJS.ProcessEnv;

function expiredSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    object: 'checkout.session',
    status: 'expired',
    customer_email: 'buyer@example.com',
    customer_details: null,
    metadata: { source: 'carsi-next-local-checkout', course_slug: 'water-damage-essentials' },
    after_expiration: {
      recovery: {
        enabled: true,
        allow_promotion_codes: false,
        expires_at: 1,
        url: 'https://pay.stripe.com/recover/cs_test_1',
      },
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

function deps(env: NodeJS.ProcessEnv, optedOut = false) {
  const send = vi.fn().mockResolvedValue({ sent: true });
  const table = memoryClaimTable();
  return {
    send,
    table,
    deps: {
      ledger: recoverySendLedger(table.delegate),
      env,
      appOrigin: 'https://carsi.example',
      isOptedOut: vi.fn().mockResolvedValue(optedOut),
      courseTitle: vi.fn().mockResolvedValue('Water Damage Restoration — Essentials'),
      send,
    },
  };
}

describe('checkout recovery flag', () => {
  it('defaults OFF and accepts the usual truthy spellings', () => {
    expect(checkoutRecoveryEnabled(OFF)).toBe(false);
    expect(checkoutRecoveryEnabled({ CHECKOUT_RECOVERY_ENABLED: 'false' } as NodeJS.ProcessEnv)).toBe(false);
    for (const v of ['true', '1', 'yes', 'on', ' TRUE ']) {
      expect(checkoutRecoveryEnabled({ CHECKOUT_RECOVERY_ENABLED: v } as NodeJS.ProcessEnv)).toBe(true);
    }
  });

  it('adds no session params while off, and recovery (without promo codes) when on', () => {
    expect(checkoutRecoveryParams(OFF)).toEqual({});
    expect(checkoutRecoveryParams(ON)).toEqual({
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: false } },
    });
  });

  it('both checkout creators spread the recovery params into the session', () => {
    for (const file of [
      'src/lib/server/local-course-checkout.ts',
      'app/api/lms/subscription/checkout/route.ts',
    ]) {
      expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain('...checkoutRecoveryParams()');
    }
  });

  it('the webhook routes checkout.session.expired to the handler', () => {
    const route = readFileSync(join(process.cwd(), 'app/api/lms/webhooks/stripe/route.ts'), 'utf8');
    expect(route).toMatch(/event\.type === 'checkout\.session\.expired'[\s\S]{0,200}handleCheckoutSessionExpired/);
  });
});

describe('handleCheckoutSessionExpired', () => {
  it('sends nothing while the flag is off', async () => {
    const { deps: d, send } = deps(OFF);
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('disabled');
    expect(send).not.toHaveBeenCalled();
    expect(d.isOptedOut).not.toHaveBeenCalled();
  });

  it('sends one recovery email for an expired course session when on', async () => {
    const { deps: d, send } = deps(ON);
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      to: 'buyer@example.com',
      itemName: '"Water Damage Restoration — Essentials"',
      recoveryUrl: 'https://pay.stripe.com/recover/cs_test_1',
      appOrigin: 'https://carsi.example',
    });
  });

  it('names the membership for a membership session', async () => {
    const { deps: d, send } = deps(ON);
    const session = expiredSession({ metadata: { source: 'carsi-pro-annual', plan: 'pro_annual' } });
    expect(await handleCheckoutSessionExpired(session, d)).toBe('sent');
    expect(send.mock.calls[0][0].itemName).toBe('your CARSI yearly membership');
  });

  it('ignores sessions CARSI does not recover (coaching, roadshow, unknown)', async () => {
    const { deps: d, send } = deps(ON);
    for (const source of ['carsi-business-coaching', 'carsi-ccw-roadshow', undefined]) {
      const session = expiredSession({ metadata: source ? { source } : {} });
      expect(await handleCheckoutSessionExpired(session, d)).toBe('not_recoverable');
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing without a recovery URL or a buyer email, or to an opted-out user', async () => {
    const a = deps(ON);
    expect(
      await handleCheckoutSessionExpired(expiredSession({ after_expiration: null }), a.deps)
    ).toBe('no_recovery_url');
    expect(
      await handleCheckoutSessionExpired(expiredSession({ customer_email: null }), a.deps)
    ).toBe('no_email');
    expect(a.send).not.toHaveBeenCalled();

    const b = deps(ON, true);
    expect(await handleCheckoutSessionExpired(expiredSession(), b.deps)).toBe('opted_out');
    expect(b.send).not.toHaveBeenCalled();
  });

  it('a provider failure is transient, releases the send record, and the retry sends', async () => {
    const { deps: d, send, table } = deps(ON);
    send.mockResolvedValueOnce({ sent: false, reason: 'provider_error' });
    const first = await handleCheckoutSessionExpired(expiredSession(), d);
    expect(first).toBe('send_failed');
    expect(isTransientRecoveryOutcome(first)).toBe(true);
    expect(table.rows.size).toBe(0);
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('sent');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('a thrown send is treated like a failed one', async () => {
    const { deps: d, send, table } = deps(ON);
    send.mockRejectedValueOnce(new Error('socket hang up'));
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('send_failed');
    expect(table.rows.size).toBe(0);
  });

  it('unconfigured email is a permanent no-op, not a retry loop', async () => {
    const { deps: d, send } = deps(ON);
    send.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    const outcome = await handleCheckoutSessionExpired(expiredSession(), d);
    expect(outcome).toBe('not_configured');
    expect(isTransientRecoveryOutcome(outcome)).toBe(false);
  });

  it('sends at most once per Checkout Session, whatever event carries it', async () => {
    const { deps: d, send, table } = deps(ON);
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('sent');
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('already_sent');
    expect(send).toHaveBeenCalledTimes(1);
    expect(table.rows.get(recoverySendRowId('cs_test_1'))?.processedAt).toBeInstanceOf(Date);
  });

  it('a recent unmarked claim is in flight (retry); a stale one is possibly sent (never resent)', async () => {
    const { deps: d, send, table } = deps(ON);
    table.rows.set(recoverySendRowId('cs_test_1'), { processedAt: null, createdAt: new Date() });
    const inFlight = await handleCheckoutSessionExpired(expiredSession(), d);
    expect(inFlight).toBe('in_flight');
    expect(isTransientRecoveryOutcome(inFlight)).toBe(true);

    table.rows.set(recoverySendRowId('cs_test_1'), {
      processedAt: null,
      createdAt: new Date(Date.now() - STALE_CLAIM_MS - 1000),
    });
    const stale = await handleCheckoutSessionExpired(expiredSession(), d);
    expect(stale).toBe('possibly_sent');
    expect(isTransientRecoveryOutcome(stale)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
