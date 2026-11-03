import { expect, test } from '@playwright/test';

/**
 * GP-591 — public stranger entry before account creation (pathways + catalogue).
 * Full enrol → lesson flow needs a published course slug in the target environment.
 */
test.describe('SPM CARSI first-run (GP-591)', () => {
  test('stranger can reach the catalogue from pathways without signing in', async ({ page }) => {
    await page.goto('/pathways');
    await expect(page.getByRole('heading', { name: 'A structured path, not a pile of courses' })).toBeVisible();
    await page.getByRole('link', { name: 'Courses', exact: true }).first().click();
    await expect(page).toHaveURL(/\/courses$/);
    await expect(page.getByRole('heading', { name: /courses/i }).first()).toBeVisible();
  });

  test('signup alias keeps course intent on register', async ({ page }) => {
    await page.goto('/signup?next=%2Fcourses');
    await expect(page).toHaveURL(/\/register\?.*next=%2Fcourses/);
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  });
});
