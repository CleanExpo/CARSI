import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

import {
  checkoutRecoveryEnabled,
  checkoutRecoveryParams,
  handleCheckoutSessionExpired,
} from './checkout-recovery';

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
  return {
    send,
    deps: {
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

  it('reports a failed send', async () => {
    const { deps: d } = deps(ON);
    d.send.mockResolvedValueOnce({ sent: false, reason: 'not_configured' });
    expect(await handleCheckoutSessionExpired(expiredSession(), d)).toBe('send_failed');
  });
});
