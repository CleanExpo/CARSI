/**
 * Live-site smoke: runs AFTER a production deploy, against https://carsi.com.au.
 *
 * Read-only by design. It only loads public pages and GETs /api/health: no sign-in, no
 * purchase, no form submit, no POST. Never add a step here that writes to the live site.
 *
 * Config: config/playwright.live.config.ts (desktop 1440x900 and phone 390x844).
 * Run: `npm run test:smoke:live`. Not part of `npm run test:e2e` (the name does not match
 * `*.spec.ts`), because it targets the live site rather than a local server.
 *
 * For every page it checks: HTTP 200, the key heading is visible, no console errors or
 * uncaught page errors, no broken images, the approved CARSI wordmark is shown, and (at phone
 * width) no horizontal scroll. A full-page screenshot of each page is saved for the artifact.
 */
import path from 'node:path';

import { expect, test, type Page, type TestInfo } from '@playwright/test';

/** The approved CARSI wordmark, served by src/components/landing/PublicLogo.tsx. */
const APPROVED_LOGO_PATH = '/logo/logo1.png';

interface PageExpectation {
  /** Short name used for the screenshot file. */
  name: string;
  heading: (page: Page) => ReturnType<Page['getByRole']>;
}

function screenshotPath(testInfo: TestInfo, name: string): string {
  const root = String(testInfo.config.metadata.screenshotDir ?? testInfo.outputDir);
  return path.join(root, testInfo.project.name, `${name}.png`);
}

/** Collect console errors and uncaught page errors from the moment this is called. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const where = message.location().url;
      errors.push(`console: ${message.text()}${where ? ` (${where})` : ''}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/**
 * Bring every laid-out image into view (so `loading="lazy"` images load, whatever element
 * scrolls), wait for them, then list every image that failed. An image that is not laid out
 * (display:none, e.g. a variant for the other viewport) never loads lazily and is skipped
 * unless the browser already tried it and it failed.
 */
async function brokenImages(page: Page): Promise<string[]> {
  const images = page.locator('img');
  const count = await images.count();
  for (let i = 0; i < count; i += 1) {
    const image = images.nth(i);
    if (await image.isVisible()) {
      await image.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => undefined);
    }
  }
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every((img) => {
          const box = img.getBoundingClientRect();
          return img.complete || box.width === 0 || box.height === 0;
        }),
      null,
      { timeout: 15_000 }
    )
    .catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => {
        const box = img.getBoundingClientRect();
        const laidOutImage = box.width > 0 && box.height > 0;
        const failed = img.complete && img.naturalWidth === 0;
        return failed || (laidOutImage && !img.complete);
      })
      .map((img) => `${img.currentSrc || img.src || '(no src)'} alt="${img.alt}"`)
  );
}

async function approvedLogoShown(page: Page, logoPath: string): Promise<boolean> {
  return page.evaluate((wanted) => {
    return Array.from(document.images).some((img) => {
      const src = decodeURIComponent(img.currentSrc || img.src || '');
      const box = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      return (
        src.includes(wanted) &&
        img.naturalWidth > 0 &&
        box.width > 0 &&
        box.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      );
    });
  }, logoPath);
}

async function checkPublicPage(
  page: Page,
  testInfo: TestInfo,
  url: string,
  expectation: PageExpectation
): Promise<void> {
  const errors = watchErrors(page);

  const response = await page.goto(url, { waitUntil: 'load' });
  expect(response, `${url}: no response`).not.toBeNull();
  expect(response!.status(), `${url}: HTTP status`).toBe(200);

  await expect(expectation.heading(page).first(), `${url}: key heading`).toBeVisible({
    timeout: 15_000,
  });

  const broken = await brokenImages(page);
  expect.soft(broken, `${url}: broken images`).toEqual([]);

  expect
    .soft(await approvedLogoShown(page, APPROVED_LOGO_PATH), `${url}: approved CARSI logo visible`)
    .toBe(true);

  if (testInfo.project.name.startsWith('phone')) {
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect
      .soft(widths.scroll, `${url}: horizontal scroll at phone width (client ${widths.client}px)`)
      .toBeLessThanOrEqual(widths.client);
  }

  await page.screenshot({ path: screenshotPath(testInfo, expectation.name), fullPage: true });

  // Errors are read last so late hydration errors are caught too.
  expect.soft(errors, `${url}: console or page errors`).toEqual([]);
}

test.describe('live smoke: public pages', () => {
  test('home', async ({ page }, testInfo) => {
    await checkPublicPage(page, testInfo, '/', {
      name: 'home',
      heading: (p) =>
        p.getByRole('heading', { level: 1, name: /Become the technician every job site trusts/i }),
    });
  });

  test('course catalogue', async ({ page }, testInfo) => {
    await checkPublicPage(page, testInfo, '/courses', {
      name: 'courses',
      heading: (p) => p.getByRole('heading', { level: 1 }),
    });
    await expect(page.locator('a[href^="/courses/"]').first()).toBeVisible();
  });

  test('a published course page', async ({ page }, testInfo) => {
    // Take the first course the live catalogue lists, so the check follows what is published
    // rather than a slug that may later be retired.
    const catalogue = await page.goto('/courses');
    expect(catalogue?.status(), '/courses: HTTP status').toBe(200);
    const hrefs = await page
      .locator('a[href^="/courses/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    const courseHref = hrefs.find((href) => /^\/courses\/[a-z0-9-]+$/.test(href));
    expect(courseHref, 'the live catalogue lists at least one course page').toBeTruthy();

    await checkPublicPage(page, testInfo, courseHref!, {
      name: 'course',
      heading: (p) => p.getByRole('heading', { level: 1 }),
    });
  });

  test('pricing', async ({ page }, testInfo) => {
    await checkPublicPage(page, testInfo, '/pricing', {
      name: 'pricing',
      heading: (p) => p.getByRole('heading', { level: 1, name: /Pricing/i }),
    });
  });

  test('login page renders (no sign-in)', async ({ page }, testInfo) => {
    await checkPublicPage(page, testInfo, '/login', {
      name: 'login',
      heading: (p) => p.getByRole('heading', { name: 'Sign in' }),
    });
  });
});

test.describe('live smoke: health', () => {
  test('/api/health reports healthy', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status(), '/api/health: HTTP status').toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    const expectedCommit = process.env.LIVE_SMOKE_EXPECT_COMMIT;
    if (expectedCommit) {
      expect(body.build?.commit, '/api/health: live build commit').toBe(expectedCommit);
    }
  });
});
