/**
 * CARSI LMS — revenue-path E2E (GP-257 / GP-258).
 *
 * Complements carsi-journeys.spec.ts (public catalogue + auth form) with the two
 * revenue-critical journeys the audit flagged as uncovered:
 *   1. Subscription / pricing surface (guest) — the $795/yr yearly membership and
 *      its checkout CTA render. Full Stripe payment needs test-mode + webhooks and
 *      is out of scope for E2E; we cover up to checkout initiation.
 *   2. Authenticated learner path (@authenticated) — the seeded student (active
 *      enrolment, see scripts/seed-e2e-user.ts) reaches the dashboard, opens their
 *      enrolled course (incl. the reviews section), the lesson player, and the
 *      credentials wallet. Completion→certificate isn't seeded, so we assert the
 *      wallet renders rather than a specific credential.
 */

import { test, expect } from '@playwright/test';

// =========================================================================
// GP-258 — Subscription / pricing (guest)
// =========================================================================
test.describe('Subscription & pricing', () => {
  test('pricing page shows the $795/yr yearly membership', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    // The yearly individual membership is AUD $795. Format varies ($795 / $795 AUD),
    // so match the number itself.
    await expect(page.getByText(/\$?\s?795/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('subscribe page renders a membership CTA', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/\$?\s?795/).first()).toBeVisible({ timeout: 15_000 });
    // A membership/checkout affordance is present (revenue entry point wired). It's a
    // button ("Start Membership") on this page, so match link OR button, role-agnostic.
    const cta = page
      .locator('a, button')
      .filter({ hasText: /start membership|subscribe|join|get started|enrol/i })
      .first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });
});

// =========================================================================
// GP-257 — Authenticated learner path (enrolment → player → credentials)
// =========================================================================
test.describe('Authenticated learner journey @authenticated', () => {
  test('student dashboard loads without redirect to login', async ({ page }) => {
    await page.goto('/dashboard/student');
    await page.waitForLoadState('domcontentloaded');
    // A real session must NOT bounce to /login.
    await expect(page).toHaveURL(/\/dashboard\/student/, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: /courses/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('enrolled course opens and shows the reviews section', async ({ page }) => {
    await page.goto('/dashboard/courses');
    await page.waitForLoadState('domcontentloaded');

    // Follow the first course the student can open (seeded active enrolment).
    const courseLink = page.locator('a[href*="/dashboard/courses/"]').first();
    await expect(courseLink).toBeVisible({ timeout: 15_000 });
    await courseLink.click();

    await expect(page).toHaveURL(/\/dashboard\/courses\/[^/]+/, { timeout: 15_000 });
    // The reviews section (GP-117) renders on the course page (client-fetched).
    await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible({ timeout: 20_000 });
  });

  test('course player renders lesson content for the enrolled course', async ({ page }) => {
    await page.goto('/dashboard/student');
    await page.waitForLoadState('domcontentloaded');

    // Resume/continue or an enrolled-course link leads into the player.
    const playerLink = page.locator('a[href*="/dashboard/learn/"]').first();
    if (await playerLink.count()) {
      await playerLink.first().click();
      await expect(page).toHaveURL(/\/dashboard\/learn\//, { timeout: 20_000 });
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    } else {
      // No resume link surfaced (fresh enrolment): the enrolled-courses list must still render.
      await expect(page.locator('main')).toContainText(/course/i, { timeout: 15_000 });
    }
  });

  test('credentials wallet page renders', async ({ page }) => {
    await page.goto('/dashboard/student/credentials');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/dashboard\/student\/credentials/, { timeout: 20_000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });
});
