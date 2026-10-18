import { expect, test } from '@playwright/test';

/**
 * V4 — the "Bought separately" figure on /subscribe is the sum of the published paid course
 * prices, read from the same live catalogue /api/lms/courses serves. Any drift between the two
 * (a hard-coded figure, a stale cache, a free course counted, a dropped cent) fails here.
 */
test.describe('membership value anchor', () => {
  test('equals the sum of published paid course prices', async ({ page, request }) => {
    const res = await request.get('/api/lms/courses');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: { price_aud: number | string | null; is_free: boolean | null }[];
      total: number;
    };
    // The comparison is only meaningful against the complete catalogue.
    expect(body.items.length).toBe(body.total);

    const paid = body.items.filter((i) => !i.is_free && Number(i.price_aud) > 0);
    // Precondition: E2E runs against the seeded catalogue (db:seed-courses).
    expect(paid.length).toBeGreaterThan(0);
    const cents = paid.reduce((sum, i) => sum + Math.round(Number(i.price_aud) * 100), 0);
    const expected = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

    await page.goto('/subscribe');
    const anchor = page.locator('[data-membership-value-anchor]');
    await expect(anchor).toHaveCount(1);
    await expect(anchor.locator('[data-anchor-total]')).toHaveText(expected);
    await expect(anchor).toContainText(`for the ${paid.length} paid courses`);
  });
});
