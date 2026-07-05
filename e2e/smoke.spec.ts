/**
 * Deploy smoke tests — GP-463
 *
 * A focused, FAST pre-production smoke suite: ~12 quick, unauthenticated checks
 * that a deploy is healthy. Each check is status + one key selector only — NO
 * auth flows, NO DB seeding, NO mocking. Those belong to the full E2E suite
 * (e2e/pre-production.spec.ts, e2e/carsi-journeys.spec.ts). This spec exists to
 * answer one question quickly: "did the deploy come up and are the public
 * surfaces reachable?"
 *
 * Discovered by playwright.config.ts testMatch (`e2e/**\/*.spec.ts`); runs under
 * the desktop-chromium project (grepInvert /@authenticated/), so it needs no
 * session. Filter to just this suite with `npm run test:smoke`.
 *
 * Usage:
 *   npm run test:smoke
 *   npx playwright test e2e/smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

// A real, published catalogue course (seeded; also used by the E2E suite). Its
// SSR detail page must render for an unauthenticated visitor.
const PUBLIC_COURSE_SLUG =
  'air-quality-and-odour-identification-and-deodorisation-essentials';

test.describe('smoke: deploy health', () => {
  // 1. Home renders and status is 200 + hero heading paints.
  test('home / returns 200 and renders the hero', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(
      page
        .getByRole('heading', {
          level: 1,
          name: /Professional training that fits the workday/i,
        })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // 2. Course catalogue renders with a course-card link.
  test('/courses catalogue renders', async ({ page }) => {
    const response = await page.goto('/courses');
    expect(response?.status()).toBe(200);

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a[href*="/courses/"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // 3. Subscribe page loads.
  test('/subscribe loads', async ({ page }) => {
    const response = await page.goto('/subscribe');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });

  // 4. Pricing page loads.
  test('/pricing loads', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });

  // 5. Contact page loads.
  test('/contact loads', async ({ page }) => {
    const response = await page.goto('/contact');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });

  // 6. Login page renders its form.
  test('/login renders the sign-in form', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);

    // "Sign in" is also the submit button label — target the heading (strict-safe).
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
      timeout: 10_000,
    });
  });

  // 7. robots.txt resolves 200 (served by app/robots.ts).
  test('robots.txt resolves with 200', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    // Standard robots directive present.
    expect(await response.text()).toContain('User-Agent');
  });

  // 8. sitemap.xml resolves 200 (served by app/sitemap.ts).
  test('sitemap.xml resolves with 200', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<urlset');
  });

  // 9. Health endpoint returns healthy.
  test('/api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  // 10. A public course detail page loads (SSR, unauthenticated).
  test('public course detail page loads', async ({ page }) => {
    const response = await page.goto(`/courses/${PUBLIC_COURSE_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // 11. H5 readiness campaign page loads.
  test('/avian-influenza-readiness loads', async ({ page }) => {
    const response = await page.goto('/avian-influenza-readiness');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // 12. Register page renders (public sign-up surface).
  test('/register renders', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });
});
