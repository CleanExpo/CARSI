import { expect, test } from '@playwright/test';

test.describe('public first-run aliases', () => {
  test('/signup preserves a course return path through reload and browser history', async ({ page, request }) => {
    const query = '?next=%2Fcourses%2Fintro-test&utm_source=legacy-link';
    const response = await request.get(`/signup${query}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const destination = new URL(response.headers().location, response.url());
    expect(destination.pathname).toBe('/register');
    expect(destination.searchParams.get('next')).toBe('/courses/intro-test');
    expect(destination.searchParams.get('utm_source')).toBe('legacy-link');

    await page.goto('/login');
    await page.goto(`/signup${query}`);
    await expect(page).toHaveURL(/\/register\?/);
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('next')).toBe('/courses/intro-test');
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/register\?/);
  });

  test('/signup retains validation and a working sign-in escape', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByText('Full name must be at least 2 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('/onboarding reaches public learning pathways with a useful course CTA', async ({ page, request }) => {
    const response = await request.get('/onboarding?utm_source=legacy-link', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const destination = new URL(response.headers().location, response.url());
    expect(destination.pathname).toBe('/pathways');
    expect(destination.searchParams.get('utm_source')).toBe('legacy-link');

    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/pathways$/);
    await expect(page.getByRole('heading', { name: 'A structured path, not a pile of courses' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Courses', exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/pathways$/);
    await page.getByRole('link', { name: 'Courses', exact: true }).first().click();
    await expect(page).toHaveURL(/\/courses$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/pathways$/);
  });
});
