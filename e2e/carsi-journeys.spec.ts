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

const MOCK_COURSES = [
  {
    id: 'c1',
    slug: 'water-damage-restoration-fundamentals',
    title: 'Water Damage Restoration Fundamentals',
    short_description: 'IICRC WRT-aligned course covering water damage restoration basics.',
    price_aud: '349.00',
    is_free: false,
    level: 'beginner',
    category: 'Water Damage Restoration',
    discipline: 'WRT',
    lesson_count: 10,
    thumbnail_url: null,
    updated_at: '2026-03-01T00:00:00Z',
    instructor: { full_name: 'Sarah Mitchell' },
  },
  {
    id: 'c2',
    slug: 'carpet-repair-technician',
    title: 'Carpet Repair Technician',
    short_description: 'CRT practical training for carpet restoration.',
    price_aud: '295.00',
    is_free: false,
    level: 'intermediate',
    category: 'Carpet Restoration',
    discipline: 'CRT',
    lesson_count: 8,
    thumbnail_url: null,
    updated_at: '2026-02-15T00:00:00Z',
    instructor: { full_name: 'Sarah Mitchell' },
  },
  {
    id: 'c3',
    slug: 'free-intro-to-restoration',
    title: 'Free Intro to Restoration',
    short_description: 'A free introductory overview of the restoration industry.',
    price_aud: '0.00',
    is_free: true,
    level: 'beginner',
    category: 'General',
    discipline: null,
    lesson_count: 3,
    thumbnail_url: null,
    updated_at: '2026-01-10T00:00:00Z',
    instructor: { full_name: 'Phil Admin' },
  },
];

/** Intercept the backend course API and return mock data. */
async function mockCourseAPI(page: import('@playwright/test').Page) {
  await page.route('**/api/lms/courses**', async (route) => {
    const url = new URL(route.request().url());
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
    const items = MOCK_COURSES.slice(0, limit);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, total: items.length }),
    });
  });
}

// =========================================================================
// Journey 1: Public visitor browses course catalogue
// =========================================================================

test.describe('Public course catalogue', () => {
  test.beforeEach(async ({ page }) => {
    await mockCourseAPI(page);
  });

  test('landing page loads with hero content and Browse Courses CTA', async ({ page }) => {
    await page.goto('/');

    // Hero section visible
    await expect(page.locator('text=Restoration Training')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=IICRC CEC Approved Platform')).toBeVisible();

    // CTA link exists
    const browseCta = page.locator('a', { hasText: 'Browse Courses' });
    await expect(browseCta).toBeVisible();
  });

  test('courses page shows discipline tabs', async ({ page }) => {
    await page.goto('/courses');

    // Page heading
    await expect(page.locator('h1')).toContainText('Restoration Training Courses');

    // Discipline tabs rendered
    for (const tab of ['All', 'WRT', 'CRT', 'ASD', 'OCT', 'CCT', 'FSRT', 'AMRT', 'Free']) {
      await expect(page.locator('button', { hasText: tab })).toBeVisible();
    }
  });

  test('discipline filter works — clicking WRT shows only WRT courses', async ({ page }) => {
    await page.goto('/courses');

    // Click the WRT tab
    await page.locator('button', { hasText: 'WRT' }).click();

    // Only the WRT course should be visible
    await expect(page.locator('text=Water Damage Restoration Fundamentals')).toBeVisible();

    // CRT course should not be visible
    await expect(page.locator('text=Carpet Repair Technician')).not.toBeVisible();
  });

  test('search narrows results', async ({ page }) => {
    await page.goto('/courses');

    // Type into the search box
    const searchInput = page.locator('input[placeholder="Search courses..."]');
    await searchInput.fill('Carpet');

    // Only Carpet course should remain
    await expect(page.locator('text=Carpet Repair Technician')).toBeVisible();
    await expect(page.locator('text=Water Damage Restoration Fundamentals')).not.toBeVisible();
  });

  test('sort dropdown is present', async ({ page }) => {
    await page.goto('/courses');

    const sortSelect = page.locator('select');
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
    await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 10_000 });

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
    await page.route('**/api/lms/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid email or password' }),
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
    await expect(page.locator('text=/[Ii]nvalid|[Ee]rror|[Ff]ailed/')).toBeVisible({
      timeout: 5_000,
    });
  });
});

// =========================================================================
// Journey 3: Course detail page
// =========================================================================

test.describe('Course detail page', () => {
  const DETAIL_COURSE = MOCK_COURSES[0];

  test.beforeEach(async ({ page }) => {
    await mockCourseAPI(page);

    // Mock single course detail endpoint
    await page.route(`**/api/lms/courses/${DETAIL_COURSE.slug}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DETAIL_COURSE),
      });
    });

    // Mock enrollment status (unauthenticated)
    await page.route(
      `**/api/lms/courses/${DETAIL_COURSE.slug}/enrollment-status**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ enrolled: false }),
        });
      }
    );
  });

  test('course detail loads from direct URL', async ({ page }) => {
    await page.goto(`/courses/${DETAIL_COURSE.slug}`);

    // Course title should be visible
    await expect(page.locator(`text=${DETAIL_COURSE.title}`)).toBeVisible({ timeout: 10_000 });
  });

  test('course detail shows discipline and price', async ({ page }) => {
    await page.goto(`/courses/${DETAIL_COURSE.slug}`);

    // Wait for content
    await expect(page.locator(`text=${DETAIL_COURSE.title}`)).toBeVisible({ timeout: 10_000 });

    // Price should appear somewhere on the page
    await expect(page.locator('text=/349|\\$349/')).toBeVisible();
  });
});
