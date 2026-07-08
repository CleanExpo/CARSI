import { afterEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    prices: { list: listMock },
  }),
}));

describe('resolveProAnnualPriceId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    listMock.mockReset();
  });

  it('prefers STRIPE_PRICE_PRO_ANNUAL env override', async () => {
    vi.stubEnv('STRIPE_PRICE_PRO_ANNUAL', 'price_env_override');
    const { __resetSubscriptionPriceCache, resolveProAnnualPriceId } = await import(
      './subscription-price'
    );
    __resetSubscriptionPriceCache();
    await expect(resolveProAnnualPriceId()).resolves.toBe('price_env_override');
    expect(listMock).not.toHaveBeenCalled();
  });

  it('resolves by lookup_key when env is unset', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    listMock.mockResolvedValue({ data: [{ id: 'price_lookup' }] });
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
