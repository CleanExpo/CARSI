import { expect, test } from '@playwright/test';

// The E2E database is seeded from data/seed/courses-catalog.json, which holds the course under
// its new slug only — the state production reaches once the approved data edit has run. The old
// designation-branded URL must answer with a real permanent redirect from the proxy, not a
// streamed page carrying a meta refresh.
test.describe('renamed designation course slugs', () => {
  test('the old URL 301s to the new one, keeping the query string', async ({ page, request }) => {
    const response = await request.get('/courses/wrt-water-damage-essentials?utm_source=legacy', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    const destination = new URL(response.headers().location, response.url());
    expect(destination.pathname).toBe('/courses/water-damage-essentials');
    expect(destination.searchParams.get('utm_source')).toBe('legacy');

    await page.goto('/courses/wrt-water-damage-essentials');
    await expect(page).toHaveURL(/\/courses\/water-damage-essentials$/);
  });

  test('a course that was never renamed is not redirected', async ({ request }) => {
    const response = await request.get('/courses/water-damage-essentials', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });
});
