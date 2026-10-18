import { expect, test } from '@playwright/test';

/**
 * The /subscribe hex-floor hero in a real Chromium: WebGL2 draws frames, the pointer disturbs
 * the flow field, reduced motion gets a still frame, and the CTA lands on the plan.
 */
test.describe('membership hex hero', () => {
  test('animates, reacts to the pointer and reaches the plan', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      // `next dev` only: the Reticle dev bridge (instrumentation-client.ts) retries a local
      // websocket that is absent outside an agent session. Production builds drop it.
      if (m.type() === 'error' && !m.text().includes('ws://localhost:4400/reticle')) {
        errors.push(m.text());
      }
    });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/subscribe');
    const hero = page.locator('section[aria-labelledby="membership-hero-title"]');
    await expect(hero).toHaveAttribute('data-hex-state', 'running', { timeout: 20_000 });
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Every course. One year. One login.');

    const canvas = hero.locator('canvas');
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-hex-frames')), { timeout: 10_000 })
      .toBeGreaterThan(20);

    // Pointer movement must add measurably more flow than the idle state.
    const before = Number(await canvas.getAttribute('data-hex-flow'));
    for (let i = 0; i < 30; i++) await page.mouse.move(300 + i * 25, 450 + Math.sin(i / 3) * 120);
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-hex-flow')), { timeout: 5_000 })
      .toBeGreaterThan(before + 5);

    await page.getByRole('link', { name: 'See the membership' }).click();
    await expect(page).toHaveURL(/#membership-plan$/);
    await expect(page.locator('#membership-plan')).toBeInViewport();
    await expect(page.getByRole('heading', { level: 2, name: 'Yearly membership' })).toBeVisible();

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('reduced motion draws one still frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/subscribe');
    const hero = page.locator('section[aria-labelledby="membership-hero-title"]');
    await expect(hero).toHaveAttribute('data-hex-state', 'static', { timeout: 20_000 });
    const canvas = hero.locator('canvas');
    const first = await canvas.getAttribute('data-hex-frames');
    await page.waitForTimeout(800);
    // Static mode redraws only on resize or when the atlas finishes loading, never per frame.
    expect(Number(await canvas.getAttribute('data-hex-frames'))).toBeLessThanOrEqual(
      Number(first) + 2
    );
  });
});
