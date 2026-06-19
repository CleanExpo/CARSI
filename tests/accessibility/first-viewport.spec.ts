import { expect, test } from '@playwright/test';

const ROUTES = [
  { path: '/', primary: /Browse courses|CARSI restoration training/i },
  { path: '/courses', primary: /Restoration Training Courses|Search courses/i },
  { path: '/pricing', primary: /pricing|membership|subscribe/i },
  { path: '/contact', primary: /contact|support|message/i },
  { path: '/login', primary: /Sign in|Email/i },
] as const;

for (const route of ROUTES) {
  test(`first viewport is useful: ${route.path}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toContainText(route.primary);
    await expect(page.locator('h1')).toHaveCount(1);

    const viewport = page.viewportSize();
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const offenders = [...document.querySelectorAll('body *')]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            className: String(el.getAttribute('class') || '').slice(0, 160),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((el) => el.width > 0 && (el.right > root.clientWidth + 1 || el.left < -1))
        .slice(0, 5);

      return {
        hasOverflow: root.scrollWidth > root.clientWidth + 1,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        offenders,
      };
    });
    expect(overflow, JSON.stringify(overflow, null, 2)).toMatchObject({ hasOverflow: false });

    const firstViewportText = await page.evaluate(() => {
      const maxY = window.innerHeight;
      return [...document.querySelectorAll('h1, h2, p, a, button, input')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < maxY && rect.width > 0 && rect.height > 0;
        })
        .map((el) => (el.textContent || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').trim())
        .join(' ');
    });

    expect(firstViewportText.trim().length).toBeGreaterThan(viewport && viewport.width < 500 ? 80 : 120);
  });
}
