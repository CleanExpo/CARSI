/**
 * GP-785: the coaching and one-off onboarding checkouts reuse ONE Stripe Checkout Session on a
 * double-click or a retry, as "Buy course" does since GP-783.
 *
 * The fake below behaves like Stripe's idempotency layer: a request carrying a key it has seen
 * gets the stored session back; the same key with different parameters is refused, as Stripe
 * refuses it; a request with no key always opens a new session. On main these three helpers sent
 * no key, so every click opened its own session.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CreateOptions = { idempotencyKey?: string; maxNetworkRetries?: number } | undefined;

const stripe = vi.hoisted(() => {
  const state = {
    created: 0,
    byKey: new Map<string, { params: string; result: Promise<{ id: string; url: string }> }>(),
    calls: [] as { params: Record<string, unknown>; options: CreateOptions }[],
  };
  async function create(params: Record<string, unknown>, options?: CreateOptions) {
    state.calls.push({ params, options });
    const serialised = JSON.stringify(params);
    const key = options?.idempotencyKey;
    if (key) {
      const seen = state.byKey.get(key);
      if (seen) {
        if (seen.params !== serialised) {
          throw Object.assign(
            new Error('Keys for idempotent requests can only be used with the same parameters'),
            { type: 'StripeIdempotencyError' }
          );
        }
        return seen.result;
      }
    }
    const result = (async () => {
      await new Promise((r) => setTimeout(r, 5));
      state.created += 1;
      const id = `cs_test_${state.created}`;
      return { id, url: `https://checkout.stripe.test/${id}` };
    })();
    if (key) state.byKey.set(key, { params: serialised, result });
    return result;
  }
  return { state, create };
});

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: stripe.create } } }),
}));

const { createBusinessCoachingCheckoutSession } = await import('./business-coaching-checkout');
const { createCarsiCoachingMonthlyCheckoutSession } =
  await import('./carsi-coaching-monthly-checkout');
const { createOnboardingStripeCheckout } = await import('./onboarding-checkout');
const { COURSE_CHECKOUT_REPEAT_WINDOW_MS } = await import('./checkout-idempotency');

const NOW = new Date('2026-11-25T02:03:00.000Z');

function businessCoaching(
  over: Partial<Parameters<typeof createBusinessCoachingCheckoutSession>[0]> = {}
) {
  return createBusinessCoachingCheckoutSession({
    sessionSlug: '2026-11',
    packageId: 'owner',
    companyName: 'Acme Restoration',
    contactEmail: 'owner@acme.example.test',
    contactPhone: '0400 000 000',
    attendees: [{ fullName: 'Sam Owner' }],
    discussionTopic: 'Cash flow',
    appOrigin: 'https://carsi.example.test',
    ...over,
  }).then((r) => r.checkout_url);
}

function monthlyCoaching(
  over: Partial<Parameters<typeof createCarsiCoachingMonthlyCheckoutSession>[0]> = {}
) {
  return createCarsiCoachingMonthlyCheckoutSession({
    userId: 'user-1',
    contactEmail: 'owner@acme.example.test',
    contactName: 'Sam Owner',
    appOrigin: 'https://carsi.example.test',
    successUrl: 'https://carsi.example.test/ok',
    cancelUrl: 'https://carsi.example.test/cancel',
    ...over,
  }).then((r) => r.checkout_url);
}

function onboarding(over: Partial<Parameters<typeof createOnboardingStripeCheckout>[0]> = {}) {
  return createOnboardingStripeCheckout({
    slug: 'acme-onboarding',
    title: 'Acme onboarding',
    meta: null,
    customerEmail: 'owner@acme.example.test',
    studentId: 'user-1',
    successUrl: 'https://carsi.example.test/ok',
    cancelUrl: 'https://carsi.example.test/cancel',
    priceId: 'price_owner',
    ...over,
  }).then((r) => r.checkout_url);
}

const CHECKOUTS = [
  [
    'event business coaching',
    businessCoaching,
    () => businessCoaching({ companyName: 'Other Co' }),
  ],
  ['monthly coaching', monthlyCoaching, () => monthlyCoaching({ userId: 'user-2' })],
  ['one-off onboarding', onboarding, () => onboarding({ slug: 'other-onboarding' })],
] as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  stripe.state.created = 0;
  stripe.state.byKey.clear();
  stripe.state.calls = [];
});
afterEach(() => vi.useRealTimers());

describe.each(CHECKOUTS)('GP-785: %s checkout', (_label, same, different) => {
  it('a double-click (two identical requests) returns the same session', async () => {
    const first = await same();
    const second = await same();
    expect(second).toBe(first);
    expect(stripe.state.created).toBe(1);
  });

  it('two identical requests in flight at the same time return the same session', async () => {
    const [a, b] = await Promise.all([same(), same()]);
    expect(a).toBe(b);
    expect(stripe.state.created).toBe(1);
  });

  it('a different request gets its own session, never a refused key', async () => {
    const first = await same();
    const other = await different();
    expect(other).not.toBe(first);
    expect(stripe.state.created).toBe(2);
  });

  it('the same request after the repeat window gets a fresh session', async () => {
    const first = await same();
    vi.setSystemTime(new Date(NOW.getTime() + COURSE_CHECKOUT_REPEAT_WINDOW_MS));
    const later = await same();
    expect(later).not.toBe(first);
  });

  it('every call carries a key that names no buyer, and retries a key in use', async () => {
    await same();
    const { options } = stripe.state.calls[0];
    expect(options?.idempotencyKey).toMatch(/^carsi:[a-z-]+:[0-9a-f]{40}:\d+$/);
    expect(options?.idempotencyKey).not.toMatch(/acme|user-1|owner@/i);
    expect(options?.maxNetworkRetries).toBeGreaterThanOrEqual(4);
  });
});

describe('GP-785: each checkout kind has its own key space', () => {
  it('the three helpers never share a key prefix', async () => {
    await businessCoaching();
    await monthlyCoaching();
    await onboarding();
    const prefixes = stripe.state.calls.map((c) => c.options?.idempotencyKey?.split(':')[1]);
    expect(new Set(prefixes).size).toBe(3);
  });
});
