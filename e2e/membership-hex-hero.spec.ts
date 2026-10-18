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
    // The tiles are illustrative course-area images, never presented as individual courses.
    await expect(
      page.getByText('Each tile shows work the library covers.', { exact: false })
    ).toBeVisible();
    expect(await hero.innerText()).not.toMatch(/tile is a course/i);

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

    // WCAG 1.4.3: the CTA label must reach 4.5:1 against its rendered background.
    const ratio = await page.getByRole('link', { name: 'See the membership' }).evaluate((el) => {
      const lum = (css: string) => {
        const [r, g, b] = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
          const c = Number(v) / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const s = getComputedStyle(el);
      const [hi, lo] = [lum(s.color), lum(s.backgroundColor)].sort((a, b) => b - a);
      return (hi + 0.05) / (lo + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);

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
    // Motion is already off, so there is nothing to pause.
    await expect(page.getByRole('button', { name: /background motion/ })).toHaveCount(0);
  });

  test('the visitor can pause and resume the motion from the keyboard (WCAG 2.2.2)', async ({
    page,
  }) => {
    await page.goto('/subscribe');
    const hero = page.locator('section[aria-labelledby="membership-hero-title"]');
    await expect(hero).toHaveAttribute('data-hex-state', 'running', { timeout: 20_000 });
    const canvas = hero.locator('canvas');
    const frames = async () => Number(await canvas.getAttribute('data-hex-frames'));

    const pause = page.getByRole('button', { name: 'Pause background motion' });
    await pause.focus();
    await page.keyboard.press('Enter');
    await expect(hero).toHaveAttribute('data-hex-state', 'paused');
    const frozen = await frames();
    await page.waitForTimeout(800);
    expect(await frames()).toBeLessThanOrEqual(frozen + 1);

    await page.getByRole('button', { name: 'Play background motion' }).press('Enter');
    await expect(hero).toHaveAttribute('data-hex-state', 'running');
    await expect.poll(frames, { timeout: 5_000 }).toBeGreaterThan(frozen + 10);
  });

  test('turning on reduced motion mid-visit stops the floor at once', async ({ page }) => {
    await page.goto('/subscribe');
    const hero = page.locator('section[aria-labelledby="membership-hero-title"]');
    await expect(hero).toHaveAttribute('data-hex-state', 'running', { timeout: 20_000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(hero).toHaveAttribute('data-hex-state', 'static');
    const canvas = hero.locator('canvas');
    const frozen = Number(await canvas.getAttribute('data-hex-frames'));
    await page.waitForTimeout(800);
    expect(Number(await canvas.getAttribute('data-hex-frames'))).toBeLessThanOrEqual(frozen + 1);
  });
});
