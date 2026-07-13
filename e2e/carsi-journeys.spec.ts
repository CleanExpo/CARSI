/**
 * CARSI LMS — E2E journey tests (GP-164)
 *
 * Three user journeys:
 *   1. Public visitor browses the course catalogue
 *   2. Student authentication flow
 *   3. Course detail page from catalogue link
 *
 * These tests mock backend responses so they run without a live backend.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DETAIL_COURSE = {
  slug: 'wrt-water-damage-essentials',
  title: 'Water Damage Restoration — Essentials',
};

// =========================================================================
// Journey 1: Public visitor browses course catalogue
// =========================================================================

test.describe('Public course catalogue', () => {
  test('landing page loads with hero content and Browse courses CTA', async ({ page }) => {
    await page.goto('/');

    // Hero section visible
    const pageContent = page.locator('#main-content');
    await expect(pageContent).toContainText('Professional training that fits the workday.', {
      timeout: 10_000,
    });
    await expect(pageContent).toContainText('Self-paced IICRC CEC courses');

    // CTA link exists
    const browseCta = page.getByRole('link', { name: /^Browse courses$/i }).first();
    await expect(browseCta).toBeVisible();
  });

  test('courses page shows topic tabs', async ({ page }) => {
    await page.goto('/courses');

    // Page heading
    await expect(page.locator('h1')).toContainText('Restoration Training Courses');

    // Topic tabs rendered (de-IICRC: plain restoration topics, no discipline acronyms)
    for (const tab of ['All', 'Onboarding', 'Water Damage', 'Mould', 'Fire & Smoke', 'Cleaning', 'Free']) {
      await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('topic filter works — clicking Water Damage shows only water-damage courses', async ({
    page,
  }) => {
    await page.goto('/courses');

    const main = page.getByRole('main');

    // Default ("All") view lists every published course, including a non-water one
    // (the air-quality / odour essentials course). Assert it is present before
    // filtering so the post-filter "hidden" check below is meaningful.
    const nonWaterHeading = main
      .getByRole('heading', { name: /Air Quality and Odour/i })
      .first();
    await expect(nonWaterHeading).toBeVisible({ timeout: 10_000 });

    // Click the "Water Damage" topic tab (de-IICRC: topic tabs replace WRT/ASD/etc).
    const waterTab = page.getByRole('tab', { name: 'Water Damage', exact: true });
    await waterTab.click();
    await expect(waterTab).toHaveAttribute('aria-selected', 'true');

    // The water-damage course (matched by title/category) is shown and the
    // air-quality / odour course is filtered out — the topic tab narrows the set.
    await expect(main.getByRole('heading', { name: DETAIL_COURSE.title })).toBeVisible();
    await expect(nonWaterHeading).toBeHidden();
  });

  test('search narrows results', async ({ page }) => {
    await page.goto('/courses');

    // Type into the search box
    const searchInput = page.locator('input[placeholder="Search courses..."]');
    await searchInput.fill('Carpet');

    // Assert on a visible course CARD, not any text node — the tag-filter <select>
    // now contains a hidden "carpet cleaning" <option> that getByText would match first.
    await expect(
      page.locator('a[href*="/courses/"]').filter({ hasText: /Carpet/i }).first()
    ).toBeVisible();
    await expect(page.getByText(DETAIL_COURSE.title)).not.toBeVisible();
  });

  test('sort dropdown is present', async ({ page }) => {
    await page.goto('/courses');

    const sortSelect = page.getByRole('main').getByLabel('Sort courses by');
    await expect(sortSelect).toBeVisible();

    // Default option
    await expect(sortSelect).toHaveValue('updated');
  });
});

// =========================================================================
// Journey 2: Student authentication flow
// =========================================================================

test.describe('Student auth flow', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');

    // Heading
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10_000 });

    // Description
    await expect(
      page.locator('text=Enter your email and password to access your account')
    ).toBeVisible();

    // Sign up link
    await expect(page.locator('a', { hasText: 'Sign up' })).toBeVisible();

    // Forgot password link
    await expect(page.locator('a', { hasText: 'Forgot your password?' })).toBeVisible();
  });

  test('invalid credentials shows error', async ({ page }) => {
    // Mock login endpoint to return 401
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email or password' }),
      });
    });

    await page.goto('/login');

    // Fill in the email and password fields
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    // Wait for form to be interactive
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    await emailInput.fill('bad@test.com');
    await passwordInput.fill('wrongpassword');

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Error should appear
    await expect(page.locator('#login-error')).toBeVisible({
      timeout: 5_000,
    });
  });
});

// =========================================================================
// Journey 3: Course detail page
// =========================================================================

test.describe('Course detail page', () => {
  test('course detail loads from direct URL', async ({ page }) => {
    await page.goto(`/courses/${DETAIL_COURSE.slug}`);

    // Course title should be visible
    await expect(page.getByRole('heading', { level: 1, name: DETAIL_COURSE.title })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('course detail shows title and price', async ({ page }) => {
    await page.goto(`/courses/${DETAIL_COURSE.slug}`);

    // Wait for content
    await expect(page.getByRole('heading', { level: 1, name: DETAIL_COURSE.title })).toBeVisible({
      timeout: 10_000,
    });

    // Price is shown in the enrol panel (this WP-era course is free). Assert on the
    // outer main landmark's text so responsive duplicate/hidden copies don't flake.
    // `.first()` because the layout + page each render a #main-content <main>.
    await expect(page.getByRole('main').first()).toContainText(/Free|\$/i);
  });
});
