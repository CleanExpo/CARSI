/**
 * Accessibility gate — the one `COMPOUND_ENGINEERING_LOOP.md` has always mandated.
 *
 * That doc's Review stage requires `npm run test:a11y` whenever UI or markup changes. The script
 * did not exist and no axe spec existed anywhere in the repo, while `@axe-core/playwright` sat in
 * devDependencies unused. `docs/guides/TESTING_GUIDE.md` additionally described "50+ accessibility
 * tests" under `tests/accessibility/` in an `apps/web` workspace run via pnpm — no such directory,
 * no such workspace, and this repo uses npm. Documentation asserting coverage that was never built.
 *
 * Scope is deliberately the two public course surfaces the current work touches. Serious
 * violations only (wcag2a/wcag2aa, critical + serious impact) so the gate fails on real defects
 * rather than on advisory noise nobody will action.
 *
 * Unauthenticated by design — runs under the desktop-chromium project, needs no session, and is
 * safe to point at production via PLAYWRIGHT_BASE_URL.
 *
 * Usage:
 *   npm run test:a11y
 *   PLAYWRIGHT_BASE_URL=https://carsi.com.au npx playwright test e2e/a11y.spec.ts
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// Same seeded, published catalogue course the smoke suite uses, so this spec fails on a real
// accessibility regression rather than on a missing fixture.
const PUBLIC_COURSE_SLUG =
  'air-quality-and-odour-identification-and-deodorisation-essentials';

const TAGS = ['wcag2a', 'wcag2aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

async function blockingViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
}

/**
 * Block until every catalogue card has finished fading in.
 *
 * `CourseGrid` wraps each card in a `motion.div` with
 * `transition={{ duration: 0.4, delay: i * 0.05 }}`, so card 44 of the catalogue does not
 * finish until 2.6s and the last of 71 not until ~3.9s. `emulateMedia({ reducedMotion })`
 * does not suppress it: `CourseGrid` never calls `useReducedMotion()` and the app sets no
 * `MotionConfig`, so framer-motion animates regardless. The previous fixed 700ms sleep
 * therefore let axe measure the tail of the grid mid-fade and report partial opacity as
 * nine `color-contrast` violations — cards 44-47, foreground fading #3181c9 to #d3e4f4.
 *
 * Waiting for the real end state removes that false failure without weakening the gate: a
 * genuine contrast defect is still fully opaque when measured, and still fails.
 */
async function waitForCardsSettled(page: import('@playwright/test').Page) {
  await page.locator('article').first().waitFor({ state: 'attached' });
  await page.waitForFunction(
    () => {
      const articles = Array.from(document.querySelectorAll('article'));
      if (articles.length === 0) return false;
      return articles.every((article) => {
        let el: Element | null = article;
        while (el && el !== document.body) {
          if (Number.parseFloat(getComputedStyle(el).opacity) < 1) return false;
          el = el.parentElement;
        }
        return true;
      });
    },
    undefined,
    { timeout: 20_000 },
  );
}

/** Readable failure output — an id alone does not tell you what to fix. */
function describe(violations: Awaited<ReturnType<typeof blockingViolations>>) {
  return violations
    .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} node(s))\n  ${v.nodes[0]?.html ?? ''}`)
    .join('\n');
}

test.describe('a11y: public course surfaces', () => {
  test('course catalogue has no critical or serious violations', async ({ page }) => {
    // Cards fade in via framer-motion, staggered by index. axe measures computed colour,
    // so scanning mid-fade reads the tail of the grid at partial opacity and reports false
    // contrast failures. Wait for every card to reach full opacity so the scan sees the
    // real, static state. Reduced motion is still emulated for any component that honours it.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await waitForCardsSettled(page);
    const violations = await blockingViolations(page);
    expect(violations, describe(violations)).toEqual([]);
  });

  test('course detail page has no critical or serious violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/courses/${PUBLIC_COURSE_SLUG}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);
    const violations = await blockingViolations(page);
    expect(violations, describe(violations)).toEqual([]);
  });

  // Public forms are the highest-risk a11y surface and the original spec did not cover any.
  // /jobs/submit shipped with 13 fields carrying no htmlFor and no id — a screen-reader user
  // could not tell which label belonged to which control. The first version of this gate would
  // have passed that page untouched because it never visited it. Scope follows the defect.
  test('job submission form has no critical or serious violations', async ({ page }) => {
    await page.goto('/jobs/submit');
    await page.waitForLoadState('domcontentloaded');
    const violations = await blockingViolations(page);
    expect(violations, describe(violations)).toEqual([]);
  });

  // The credential JSON-LD is the machine-readable half of this page's trust story. Assert it is
  // actually emitted and parses, rather than trusting that it renders.
  test('course detail emits parseable Course JSON-LD', async ({ page }) => {
    await page.goto(`/courses/${PUBLIC_COURSE_SLUG}`);
    await page.waitForLoadState('domcontentloaded');

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);

    const parsed = blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
    const course = parsed.find((p) => p['@type'] === 'Course');
    expect(course, 'no Course JSON-LD node found').toBeDefined();
  });
});
