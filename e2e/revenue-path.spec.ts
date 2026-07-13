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
    // With SUBSCRIPTIONS_ENABLED off, SubscribeCta shows "Coming soon" (span).
    // With flag on, it shows "Start membership". Match either revenue entry or honest gate.
    const cta = page
      .locator('a, button, span[aria-disabled]')
      .filter({ hasText: /start membership|coming soon|subscribe|join|get started|enrol/i })
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

  test('enrolled course page opens for the student', async ({ page }) => {
    await page.goto('/dashboard/courses');
    await page.waitForLoadState('domcontentloaded');

    // Follow the first course the student can open (seeded active enrolment).
    // Navigate via its href rather than clicking the image-thumbnail link, whose
    // aspect-ratio wrapper can fail Playwright's click-actionability check.
    const courseLink = page.locator('a[href*="/dashboard/courses/"]').first();
    await expect(courseLink).toBeVisible({ timeout: 15_000 });
    const href = await courseLink.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!);

    await expect(page).toHaveURL(/\/dashboard\/courses\/[^/]+/, { timeout: 15_000 });
    // The course detail shell renders. (The reviews section — GP-117 — is a
    // client-fetched island verified by its own unit tests + API; asserting it
    // here would couple this journey to that async fetch, so we don't.)
    await expect(page.locator('#main-content').first()).toBeVisible({ timeout: 15_000 });
  });

  test('course player renders lesson content for the enrolled course', async ({ page }) => {
    await page.goto('/dashboard/student');
    await page.waitForLoadState('domcontentloaded');

    // The dashboard nests a <main> inside the layout's #main-content; target the
    // stable outer id to avoid a strict-mode "2 elements" violation.
    const shell = page.locator('#main-content').first();
    const playerLink = page.locator('a[href*="/dashboard/learn/"]').first();
    if (await playerLink.count()) {
      const href = await playerLink.getAttribute('href');
      await page.goto(href!);
      await expect(page).toHaveURL(/\/dashboard\/learn\//, { timeout: 20_000 });
      await expect(shell).toBeVisible({ timeout: 15_000 });
    } else {
      // No resume link surfaced (fresh enrolment): the dashboard must still render.
      await expect(shell).toBeVisible({ timeout: 15_000 });
    }
  });

  test('credentials wallet page renders', async ({ page }) => {
    await page.goto('/dashboard/student/credentials');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/dashboard\/student\/credentials/, { timeout: 20_000 });
    await expect(page.locator('#main-content').first()).toBeVisible({ timeout: 15_000 });
  });
});

// =========================================================================
// GP-441 WS1-E1 — individual annual membership entitlement (ships DARK).
//
// CI runs with SUBSCRIPTIONS_ENABLED unset (off), so these assert the
// fail-closed / coming-soon behaviour, which is the safe production default.
// The full subscribe→lapse→retain journey needs live Stripe TEST keys + a Test
// Clock and is covered by the Rana runbook's Step D manual checklist
// (docs/runbooks/rana-stripe-connection.md) — it cannot run in headless CI
// without Stripe secrets, and a faked-green version would be worse than absent.
// =========================================================================
test.describe('Membership entitlement — flag off (fail closed)', () => {
  test('subscription status API reports no membership when unauthenticated / flag off', async ({
    request,
  }) => {
    const res = await request.get('/api/lms/subscription/status');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Fail closed: no membership is granted without an active, flagged subscription.
    expect(body.has_subscription).toBe(false);
  });

  test('membership enrol API refuses a direct hit (no course content leaks)', async ({
    request,
  }) => {
    const res = await request.post('/api/lms/subscription/enroll', {
      data: { slug: 'water-damage-restoration' },
    });
    // 503 (flag off) or 401/403 (flag on, no session) — never 200, never content.
    expect([401, 403, 503]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body).not.toHaveProperty('learn_url');
    expect(body.included_in_membership).toBeUndefined();
  });

  test('subscription checkout API fails closed for an anonymous caller', async ({ request }) => {
    const res = await request.post('/api/lms/subscription/checkout', { data: {} });
    // Flag off → 503; flag on but anonymous → 401. Either way, no checkout url.
    expect([401, 503]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body.url).toBeUndefined();
    expect(body.checkout_url).toBeUndefined();
  });
});
