#!/usr/bin/env node
/**
 * GP-676: live check for the /courses money path (GP-639 job 4).
 *
 * GP-639 found the catalogue's first screen showing only free courses, with no route to the paid
 * IICRC CEC classes. PR #932 fixed what visitors see; this reads PRODUCTION every day and goes
 * red if either fault comes back:
 *
 *   1. FIRST SCREEN: the logged-out first screen of /courses (desktop 1366x900 and mobile
 *      390x844, scrolled to the top) shows no priced class AND no link to the CEC classes
 *      (/courses?discipline=iicrc-cec). Either one on screen is enough.
 *      "Seen" means inside the viewport after ancestor clipping, with no transparent or hidden
 *      ancestor; a price counts only as a whole badge label, not a "$29" inside a description.
 *   2. CEC LIST: /courses?discipline=iicrc-cec#catalogue opens a list that is not all CEC-approved
 *      classes. Every listed class must hold a current approval in data/seed/cec-approvals.json
 *      (the same test as isCecApprovalCurrent in src/lib/seed/cec-approvals.ts: status approved,
 *      hours above zero, expiresAt not yet reached). The list is read in full ("All" rows per
 *      page) and must match the page's own "N courses" counter, and the link must open the
 *      "IICRC CEC" tab.
 *
 * Requests from the audited pages to a raw IP or a private host are blocked and reported, as in
 * the buy-path guard.
 *
 * Only a subset rule: the registry also holds classes not on the LMS, so the counts never need
 * to match the registry.
 *
 * Exit 0 = clean and non-vacuous. Exit 1 = a fault was found. Exit 2 = could not audit (network,
 * a page that never rendered its course cards, a list it could not read in full). "I could not
 * look" never reads as green. Read-only: it loads public pages and changes nothing.
 *
 * Usage:
 *   node scripts/check-live-courses-money-path.mjs
 *   CARSI_SITE=https://staging.example node scripts/check-live-courses-money-path.mjs
 *   PW_CHROMIUM=/path/to/chromium node scripts/check-live-courses-money-path.mjs
 */
import { readFileSync } from 'node:fs';

import { blockBrowserRequest } from './check-live-buy-path.mjs';
import { isEntryPoint } from './lib/is-entry-point.mjs';

const SITE = (process.env.CARSI_SITE || 'https://carsi.com.au').replace(/\/$/, '');

export const CEC_PATH = '/courses?discipline=iicrc-cec#catalogue';
export const VIEWPORTS = [
  { label: 'desktop 1366x900', viewport: { width: 1366, height: 900 } },
  {
    label: 'mobile 390x844',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
];

/**
 * The amount in a whole price label ("$29", "A$ 49.50", "$29 AUD", "View · $1,250"), or null
 * when the text is free, absent, or only mentions a dollar amount among other words. A card's
 * link wraps its description too (seen live), so "$29" inside a sentence is not a price badge.
 */
export function pricedAud(text) {
  const m = /^\s*(?:View\s*·\s*)?A?\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s*AUD)?\s*$/.exec(
    String(text || '')
  );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** True when href opens the catalogue on the CEC tab, on the audited site. */
export function isCecLink(href, site) {
  let u;
  try {
    u = new URL(href, `${site}/courses`);
  } catch {
    return false;
  }
  return (
    u.origin === new URL(site).origin &&
    u.pathname.replace(/\/$/, '') === '/courses' &&
    (u.searchParams.get('discipline') || '').toLowerCase() === 'iicrc-cec'
  );
}

/** A link to one class: /courses/<slug>, not the catalogue itself. */
function isClassHref(href, site) {
  try {
    const u = new URL(href, `${site}/courses`);
    return u.origin === new URL(site).origin && /^\/courses\/[^/]+\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Rule 1 on what one first screen showed. */
export function judgeFirstScreen({ site, label, courseLinks, links }) {
  const pricedClasses = new Set(
    courseLinks
      .filter(
        (l) => isClassHref(l.href, site) && (l.labels || []).some((t) => pricedAud(t) !== null)
      )
      .map((l) => l.href)
  ).size;
  const cecLinks = links.filter((h) => isCecLink(h, site)).length;
  const fault =
    pricedClasses === 0 && cecLinks === 0
      ? `NO PRICED CLASS AND NO CEC LINK on the first screen of /courses (${label}): a visitor sees no class to buy and no route to the paid CEC classes`
      : null;
  return { fault, pricedClasses, cecLinks };
}

/** Slugs with an approval in force at `now` (mirrors isCecApprovalCurrent; fails closed). */
export function currentCecSlugs(registry, now = new Date()) {
  const out = new Set();
  for (const e of registry?.approvals || []) {
    if (!e || typeof e.slug !== 'string' || e.status !== 'approved') continue;
    const hours = e.approvedHours;
    if (!(typeof hours === 'number' && Number.isFinite(hours) && hours > 0)) continue;
    const expires = e.expiresAt ? Date.parse(e.expiresAt) : Number.NaN;
    if (Number.isFinite(expires) && now.getTime() < expires) out.add(e.slug.toLowerCase());
  }
  return out;
}

/** Rule 2 on what the CEC link opened. `error` means it could not be judged (exit 2). */
export function judgeCecList({ slugs, counter, activeTab, approved }) {
  const faults = [];
  if (activeTab !== 'IICRC CEC') {
    faults.push(
      `CEC LINK ${CEC_PATH} opened the "${activeTab || 'no'}" tab, not "IICRC CEC": the list shown is not the CEC classes`
    );
  }
  for (const slug of slugs) {
    if (!approved.has(slug.toLowerCase())) {
      faults.push(
        `NOT CEC-APPROVED /courses/${slug} is listed under ${CEC_PATH} but has no current approval in data/seed/cec-approvals.json`
      );
    }
  }
  let error = null;
  if (slugs.length === 0) error = `the CEC list at ${CEC_PATH} was empty`;
  else if (!Number.isInteger(counter))
    error = `could not read the "N courses" counter on ${CEC_PATH}`;
  else if (counter !== slugs.length)
    error = `read ${slugs.length} of ${counter} classes on ${CEC_PATH}; the list was not read in full`;
  return { faults, error };
}

/** Turn audit results into an exit code and the lines to print. A real fault outranks the rest. */
export function summarise({ faults, errors, screensRead, cecRead }) {
  if (faults.length) {
    return {
      code: 1,
      lines: [
        `✗ courses money-path check found ${faults.length} fault(s) on ${SITE}:`,
        ...faults.map((f) => '  - ' + f),
        ...errors.map((e) => '  - (also could not check) ' + e),
      ],
    };
  }
  if (errors.length || screensRead < VIEWPORTS.length || cecRead === 0) {
    return {
      code: 2,
      lines: [
        `✗ courses money-path check could not audit ${SITE} (${screensRead} of ${VIEWPORTS.length} first screens, ${cecRead} CEC classes read); not a pass:`,
        ...errors.map((e) => '  - ' + e),
      ],
    };
  }
  return {
    code: 0,
    lines: [
      `✓ courses money-path check passed on ${SITE}: ${screensRead} first screens show a priced class or the CEC link; ${cecRead} of ${cecRead} classes on the CEC tab are CEC-approved.`,
    ],
  };
}

const RESULTS = 'section[aria-label="Course results"] a[href^="/courses/"]';

/**
 * In the page: what the visitor can see without scrolling. An element counts only when some of
 * it is inside the viewport AFTER clipping by every ancestor that clips its overflow, and no
 * element on its ancestor chain is transparent, hidden or not displayed.
 */
function readFirstScreen() {
  const seen = (el) => {
    let box = el.getBoundingClientRect();
    box = { l: box.left, t: box.top, r: box.right, b: box.bottom };
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const st = getComputedStyle(n);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) {
        return false;
      }
      if (n !== el && (st.overflowX !== 'visible' || st.overflowY !== 'visible')) {
        const c = n.getBoundingClientRect();
        box = {
          l: Math.max(box.l, c.left),
          t: Math.max(box.t, c.top),
          r: Math.min(box.r, c.right),
          b: Math.min(box.b, c.bottom),
        };
      }
    }
    box = {
      l: Math.max(box.l, 0),
      t: Math.max(box.t, 0),
      r: Math.min(box.r, window.innerWidth),
      b: Math.min(box.b, window.innerHeight),
    };
    return box.r - box.l > 0 && box.b - box.t > 0;
  };
  const anchors = [...document.querySelectorAll('a[href]')].filter(seen);
  return {
    scrollY: window.scrollY,
    links: anchors.map((a) => a.getAttribute('href')),
    courseLinks: anchors
      .filter((a) => /^\/courses\/|\/\/[^/]+\/courses\//.test(a.getAttribute('href')))
      .map((a) => ({
        href: a.getAttribute('href'),
        // Each visible leaf element's own text: the price badge is one, the description another.
        labels: [...a.querySelectorAll('*')]
          .filter((e) => e.children.length === 0 && seen(e))
          .map((e) => e.textContent.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      })),
  };
}

/**
 * In the page: the active tab, the catalogue's own "N courses" counter and every class slug in
 * the results. The counter is the one NEAREST the results (searched outward from the results
 * section, ancestor by ancestor), so an unrelated count elsewhere on the page cannot stand in
 * for it (Codex review of #1033).
 */
function readCecList(resultsSelector) {
  const active = document.querySelector('[role="tab"][aria-selected="true"]');
  let counter = null;
  const section = document.querySelector('section[aria-label="Course results"]');
  for (let n = section && section.parentElement; n && counter === null; n = n.parentElement) {
    for (const el of n.querySelectorAll('span, p, div')) {
      if (el.children.length) continue;
      const m = /^\s*(\d+) courses?\s*$/.exec(el.textContent || '');
      if (m) {
        counter = Number(m[1]);
        break;
      }
    }
  }
  const slugs = [
    ...new Set(
      [...document.querySelectorAll(resultsSelector)].map((a) =>
        new URL(a.getAttribute('href'), location.href).pathname.replace(/^\/courses\/|\/$/g, '')
      )
    ),
  ];
  return { activeTab: active ? active.textContent.trim() : null, counter, slugs };
}

/**
 * The same browser boundary as the buy-path guard: a request off the audited site to a raw IP
 * or a named private host is reported as a fault and aborted, so the runner never reaches an
 * internal service from a public page.
 */
async function guardRequests(page, where, faults) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (blockBrowserRequest(url, SITE)) {
      faults.push(`LOCALHOST ${where} (browser request blocked): ${new URL(url).origin}`);
      return route.abort();
    }
    return route.continue();
  });
}

export async function audit(faults = [], errors = []) {
  const registry = JSON.parse(
    readFileSync(new URL('../data/seed/cec-approvals.json', import.meta.url), 'utf8')
  );
  const approved = currentCecSlugs(registry);
  let screensRead = 0;
  let cecRead = 0;

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
  );
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: vp.viewport,
        isMobile: Boolean(vp.isMobile),
        hasTouch: Boolean(vp.hasTouch),
      });
      try {
        await guardRequests(page, `/courses (${vp.label})`, faults);
        await page.goto(SITE + '/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
        // The cards are the sign the catalogue rendered; until then "nothing priced" means nothing.
        await page.waitForSelector(RESULTS, { timeout: 20000 });
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.scrollTo(0, 0));
        const shot = await page.evaluate(readFirstScreen);
        if (shot.scrollY !== 0)
          throw new Error(`page did not stay at the top (scrollY ${shot.scrollY})`);
        const r = judgeFirstScreen({ site: SITE, label: vp.label, ...shot });
        if (r.fault) faults.push(r.fault);
        screensRead += 1;
      } catch (e) {
        errors.push(`first screen of /courses (${vp.label}): ${e.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }

    const page = await browser.newPage({ viewport: VIEWPORTS[0].viewport });
    try {
      await guardRequests(page, CEC_PATH, faults);
      await page.goto(SITE + CEC_PATH, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector(RESULTS, { timeout: 20000 });
      // Show every row; a pager would otherwise hide all but the first 12. A choice made before
      // React hydrates is silently dropped (seen live: 12 of 27 read), so choose again until the
      // list matches its counter or 20 s pass. A list still short then is exit 2, never green.
      const rows = page.locator('select[aria-label="Rows per page"]');
      let list = await page.evaluate(readCecList, RESULTS);
      for (let i = 0; i < 20 && list.slugs.length !== list.counter; i += 1) {
        if (await rows.count()) await rows.first().selectOption('all');
        await page.waitForTimeout(1000);
        list = await page.evaluate(readCecList, RESULTS);
      }
      const r = judgeCecList({ ...list, approved });
      faults.push(...r.faults);
      if (r.error) errors.push(r.error);
      else cecRead = list.slugs.length;
    } catch (e) {
      errors.push(`CEC list ${CEC_PATH}: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return { faults, errors, screensRead, cecRead };
}

async function main() {
  const faults = [];
  const errors = [];
  let outcome;
  try {
    outcome = summarise(await audit(faults, errors));
  } catch (e) {
    outcome = summarise({ faults, errors: [...errors, e.message], screensRead: 0, cecRead: 0 });
  }
  const { code, lines } = outcome;
  for (const line of lines) (code === 0 ? console.log : console.error)(line);
  process.exit(code);
}

if (isEntryPoint(import.meta.url)) main();
