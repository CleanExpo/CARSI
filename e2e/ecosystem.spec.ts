import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { ECOSYSTEM_PRODUCTS } from '../src/lib/ecosystem/products';
import { LEGACY_WORDPRESS_REDIRECTS } from '../src/lib/seo/legacy-wordpress-redirects';

/**
 * /ecosystem in a real Chromium, on whatever server PLAYWRIGHT_BASE_URL names (the Done recipe
 * runs a local production build on its own port, so this never tests another checkout's code).
 * Every navigation asserts a 200 first: /ecosystem 404s anywhere this change is absent.
 * Screenshots: test-results/ecosystem-shots/ecosystem-<width>.png.
 */
const WIDTHS = [375, 768, 1280] as const;

/**
 * Decorations that paint nothing over the region being measured, which axe's layout grid still
 * counts as overlapping it (reporting the text under them as "incomplete"):
 * - the floating chat's full-viewport drag-bounds layer (src/components/lms/FloatingChat.tsx:
 *   fixed, inset-0, aria-hidden, empty, transparent);
 * - aria-hidden, pointer-events-none decorations whose clipping (overflow: hidden) ancestor does
 *   not touch the region, e.g. the footer's glow at -top-44, which the footer clips.
 * Only those are hidden; anything that can paint over the region stays and is measured.
 */
async function hideNonPaintingOverlays(page: Page, region: string): Promise<number> {
  return page.evaluate((selector) => {
    const target = document.querySelector(selector)!.getBoundingClientRect();
    const meets = (r: DOMRect) =>
      r.left < target.right && r.right > target.left && r.top < target.bottom && r.bottom > target.top;
    let hidden = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body [aria-hidden="true"]'))) {
      const cs = getComputedStyle(el);
      if (cs.pointerEvents !== 'none' || (el.textContent ?? '').trim() !== '') continue;
      const fixedTransparentLayer =
        cs.position === 'fixed' &&
        el.childElementCount === 0 &&
        cs.backgroundColor === 'rgba(0, 0, 0, 0)' &&
        cs.backgroundImage === 'none' &&
        cs.boxShadow === 'none';
      let clip: HTMLElement | null = el.parentElement;
      while (clip && !/(hidden|clip)/.test(getComputedStyle(clip).overflow)) clip = clip.parentElement;
      const clippedAway = clip !== null && clip !== document.body && !meets(clip.getBoundingClientRect());
      if (fixedTransparentLayer || clippedAway) {
        el.style.display = 'none';
        hidden++;
      }
    }
    return hidden;
  }, region);
}

test.describe('ecosystem page', () => {
  for (const width of WIDTHS) {
    test(`renders five truthful cards cleanly at ${width}px`, async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number; __clsSupported: boolean };
        w.__cls = 0;
        w.__clsSupported = PerformanceObserver.supportedEntryTypes.includes('layout-shift');
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto('/ecosystem');
      expect(response?.status()).toBe(200);

      const cards = page.getByTestId('ecosystem-card');
      await expect(cards).toHaveCount(5);
      await expect(cards.locator('h2')).toHaveText(ECOSYSTEM_PRODUCTS.map((p) => p.name));
      await expect(page.locator('main')).toHaveCount(1);

      // Load every lazy logo by bringing each card into view, then check each one decoded.
      for (let i = 0; i < 5; i++) await cards.nth(i).scrollIntoViewIfNeeded();
      const images = page.locator('[data-testid="ecosystem-card"] img');
      await expect(images).toHaveCount(ECOSYSTEM_PRODUCTS.filter((p) => p.image).length);
      for (const img of await images.all()) {
        await expect
          .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
          .toBe(true);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const cls = await page.evaluate(() => {
        const w = window as unknown as { __cls: number; __clsSupported: boolean };
        return { value: w.__cls, supported: w.__clsSupported };
      });
      expect(cls.supported).toBe(true);
      expect(cls.value).toBeLessThan(0.1);

      // Contrast, region by region with each region on screen: axe reports text it cannot see
      // as "incomplete" (overlapped), and incomplete must be empty too, so nothing passes unmeasured.
      const regions = [
        '[data-testid="ecosystem-section"] > section:first-child',
        ...ECOSYSTEM_PRODUCTS.map((p) => `#ecosystem-${p.slug}`),
        'section[aria-labelledby="ecosystem-vision-heading"] h2',
        ...[1, 2, 3].map((n) => `section[aria-labelledby="ecosystem-vision-heading"] p:nth-of-type(${n})`),
        'section[aria-labelledby="ecosystem-vision-heading"] a[href="/contact"]',
      ];
      for (const region of regions) {
        await page.locator(region).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await hideNonPaintingOverlays(page, region);
        const axe = await new AxeBuilder({ page }).include(region).withRules(['color-contrast']).analyze();
        expect(axe.violations.map((v) => v.nodes.map((n) => n.target)), region).toEqual([]);
        expect(axe.incomplete.map((v) => v.nodes.map((n) => n.target)), region).toEqual([]);
        expect(axe.passes.length, `${region}: axe measured nothing`).toBeGreaterThan(0);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/ecosystem-shots/ecosystem-${width}.png`, fullPage: true });
    });
  }

  test('declares its own canonical and Open Graph URL, and is in the sitemap', async ({ page, request }) => {
    const response = await page.goto('/ecosystem');
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/ecosystem$/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/ecosystem$/);
    await expect(page.locator('a[href="/ecosystem"]')).toHaveCount(1); // footer entry link

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toMatch(/<loc>[^<]*\/ecosystem<\/loc>/);
  });
});

test.describe('legacy redirect', () => {
  const mapped = LEGACY_WORDPRESS_REDIRECTS.filter((r) => !r.source.includes(':'));

  for (const rule of mapped) {
    test(`${rule.source} answers 301 to ${rule.destination}`, async ({ request, baseURL }) => {
      const res = await request.get(rule.source, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers().location, baseURL).pathname).toBe(rule.destination);
    });

    test(`${rule.source}/ takes Next's 308 to the slashless path, then the 301`, async ({ request, baseURL }) => {
      const first = await request.get(`${rule.source}/`, { maxRedirects: 0 });
      expect(first.status()).toBe(308);
      const hop = new URL(first.headers().location, baseURL);
      expect(hop.pathname).toBe(rule.source);
      const second = await request.get(hop.pathname, { maxRedirects: 0 });
      expect(second.status()).toBe(301);
      expect(new URL(second.headers().location, baseURL).pathname).toBe(rule.destination);
    });
  }

  test('keeps the query string and adds no route parameter', async ({ request, baseURL }) => {
    const res = await request.get('/product/asbestos?utm_source=dr&x=1', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    const to = new URL(res.headers().location, baseURL);
    expect(to.pathname).toBe('/courses/introduction-to-asbestos-asbestos-awareness');
    expect(Object.fromEntries(to.searchParams)).toEqual({ utm_source: 'dr', x: '1' });
  });

  test('sends an unknown product to the catalogue, never a guessed course', async ({ request, baseURL }) => {
    for (const path of ['/product/some-retired-course', '/product/a/b']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(301);
      const to = new URL(res.headers().location, baseURL);
      expect(to.pathname, path).toBe('/courses');
      expect(to.searchParams.has('slug'), path).toBe(false);
    }
  });
});
