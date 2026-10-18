import { expect, test } from '@playwright/test';

/**
 * The /subscribe sections below the plan in a real Chromium: one h1 on the page, topic cards land
 * on their catalogue tab, hover lift respects reduced motion, and the closing call returns to the plan.
 */
test.describe('membership landing sections', () => {
  test('topic cards reach their catalogue tab and the page keeps one h1', async ({ page }) => {
    await page.goto('/subscribe');
    await expect(page.locator('h1')).toHaveCount(1);
    // Whole rendered page: nothing the live catalogue cannot back (landing review r3).
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/advanced levels?/i);
    expect(text).not.toMatch(/upholster/i);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Inside the membership' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'How it works' })).toBeVisible();

    await page.locator('a[data-membership-topic="Mould"]').click();
    await expect(page).toHaveURL(/\/courses\?discipline=Mould$/);
    await expect(page.getByRole('tab', { name: 'Mould', selected: true })).toBeVisible();
  });

  test('the closing call returns to the plan', async ({ page }) => {
    await page.goto('/subscribe');
    await page.getByRole('link', { name: 'Back to the membership' }).click();
    await expect(page).toHaveURL(/#membership-plan$/);
    await expect(page.locator('#membership-plan')).toBeInViewport();
  });

  test('cards lift on hover, but not under reduced motion', async ({ page }) => {
    const card = page.locator('a[data-membership-topic="Water Damage"]');
    await page.goto('/subscribe');
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).translate)).not.toBe('none');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(0, 0);
    await card.hover();
    await page.waitForTimeout(300);
    expect(await card.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
  });
});
