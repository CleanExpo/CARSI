import { afterEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
const retrieveMock = vi.fn();

// GP-773: a resolved Price must be the A$795 yearly AUD membership price.
const MATCHING = {
  active: true,
  currency: 'aud',
  unit_amount: 79_500,
  recurring: { interval: 'year', interval_count: 1 },
};

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    prices: { list: listMock, retrieve: retrieveMock },
  }),
}));

describe('resolveProAnnualPriceId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    listMock.mockReset();
    retrieveMock.mockReset();
  });

  it('prefers STRIPE_PRICE_PRO_ANNUAL env override', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    vi.stubEnv('STRIPE_PRICE_PRO_ANNUAL', 'price_env_override');
    retrieveMock.mockResolvedValue({ id: 'price_env_override', ...MATCHING });
    const { __resetSubscriptionPriceCache, resolveProAnnualPriceId } = await import(
      './subscription-price'
    );
    __resetSubscriptionPriceCache();
    await expect(resolveProAnnualPriceId()).resolves.toBe('price_env_override');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('resolves by lookup_key when env is unset', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    listMock.mockResolvedValue({ data: [{ id: 'price_lookup', ...MATCHING }] });
    const { __resetSubscriptionPriceCache, resolveProAnnualPriceId } = await import(
      './subscription-price'
    );
    __resetSubscriptionPriceCache();
    await expect(resolveProAnnualPriceId()).resolves.toBe('price_lookup');
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_keys: ['carsi_pro_annual'] }),
    );
  });

  it('returns null when Stripe is not configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const { __resetSubscriptionPriceCache, resolveProAnnualPriceId } = await import(
      './subscription-price'
    );
    __resetSubscriptionPriceCache();
    await expect(resolveProAnnualPriceId()).resolves.toBeNull();
  });
});
