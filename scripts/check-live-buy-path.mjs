#!/usr/bin/env node
/**
 * GP-638: live guard for the CARSI buying path.
 *
 * Two faults were found on 8 Oct 2026 and closed without evidence (GP-624, GP-626):
 *   1. the quick-enrol inputs on course pages rendered white text on a white field;
 *   2. production links (sign-out redirect, email Start link) pointed at localhost:8080.
 * This guard reads PRODUCTION and goes red if either comes back.
 *
 * Checks:
 *   - LOCALHOST: no public page's HTML, and no redirect from /api/auth/logout, may contain a
 *     local origin (localhost, *.localhost, 127.x, 0.0.0.0, [::1]).
 *   - CONTRAST: on each paid course page, every visible enrol-form input and its label must have
 *     a text colour different from its effective background colour.
 *
 * Exit 0 = clean and non-vacuous. Exit 1 = a fault was found. Exit 2 = could not audit
 * (network failure, zero forms/pages checked, or a colour the guard could not judge).
 * "I could not look" never reads as green.
 *
 * Colours: Tailwind v4 computes colours as oklch(), which a plain rgb() parser cannot read. The
 * page converts every computed colour to sRGB by painting it on a 1x1 canvas, and any colour that
 * still cannot be read is reported as UNJUDGED (exit 2), never as readable.
 *
 * Known limits (not checked): background images and gradients behind a field, and help or
 * error text under a field. Semi-transparent background layers and text colours ARE composited.
 *
 * Usage:
 *   node scripts/check-live-buy-path.mjs
 *   CARSI_SITE=https://staging.example node scripts/check-live-buy-path.mjs
 *   PW_CHROMIUM=/path/to/chromium node scripts/check-live-buy-path.mjs   # optional browser path
 */
import { pathToFileURL } from 'node:url';

const SITE = (process.env.CARSI_SITE || 'https://carsi.com.au').replace(/\/$/, '');

export const PUBLIC_PATHS = ['/', '/courses', '/pricing', '/subscribe', '/login', '/register'];
/** Paid course pages that carry the quick-enrol card (checked live 12 Oct 2026). */
export const PAID_COURSE_PATHS = [
  '/courses/introduction-to-improving-indoor-air-quality-after-water-damage',
  '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
  '/courses/job-safety-and-environmental-analysis-jsea-course',
];

const LOCAL_ORIGIN_RE =
  /(?<![\w.+-])(?:https?:)?(?:\/\/|\\\/\\\/)(?:(?:[a-z0-9-]+\.)*localhost\.?|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1?\])(?::\d+)?(?![\w.-])/gi;

/** Every local origin found in a piece of text (HTML or a Location header). */
export function findLocalOrigins(text) {
  if (!text) return [];
  return [
    ...new Set(
      (String(text).match(LOCAL_ORIGIN_RE) || []).map((m) => m.toLowerCase().replace(/\\\//g, '/'))
    ),
  ];
}

/** Parse "rgb(a, b, c)" / "rgba(a, b, c, x)" into [r, g, b, alpha]. */
export function parseRgb(value) {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/i.exec(
    String(value || '')
  );
  if (!m) return null;
  const alpha =
    m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), alpha];
}

/** WCAG relative luminance contrast ratio between two rgb strings; null if unparseable. */
export function contrastRatio(fg, bg) {
  const a = parseRgb(fg);
  const b = parseRgb(bg);
  if (!a || !b) return null;
  const lum = ([r, g, bl]) => {
    const ch = [r, g, bl].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * A form element is unreadable when its text and background are (nearly) the same colour.
 * Returns 'unreadable', 'readable', or 'unknown' when either colour cannot be parsed. 'unknown'
 * is never treated as readable: the audit fails closed on it (exit 2).
 */
export const MIN_CONTRAST = 1.5;
export function judgeContrast({ color, background }) {
  const fg = parseRgb(color);
  const bg = parseRgb(background);
  if (!fg || !bg) return 'unknown';
  // Composite the text colour over its background: rgba(0,0,0,0.05) on white is near-white.
  const a = Math.min(Math.max(fg[3], 0), 1);
  const landed = [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a)));
  const ratio = contrastRatio(`rgb(${landed.join(', ')})`, `rgb(${bg.slice(0, 3).join(', ')})`);
  return ratio < MIN_CONTRAST ? 'unreadable' : 'readable';
}
export function isUnreadable(colours) {
  return judgeContrast(colours) === 'unreadable';
}

/** Turn audit counts into an exit code and the lines to print. A real fault outranks the rest. */
export function summarise({ faults, unjudged, pagesRead, fieldsRead, redirectsRead }) {
  if (faults.length) {
    return {
      code: 1,
      lines: [
        `✗ buy-path guard found ${faults.length} fault(s) on ${SITE}:`,
        ...faults.map((f) => '  - ' + f),
        ...unjudged.map((u) => '  - (also could not judge) ' + u),
      ],
    };
  }
  if (unjudged.length) {
    return {
      code: 2,
      lines: [
        `✗ buy-path guard could not judge ${unjudged.length} colour(s) on ${SITE}; not a pass:`,
        ...unjudged.map((u) => '  - ' + u),
      ],
    };
  }
  if (pagesRead === 0 || fieldsRead === 0 || redirectsRead < 2) {
    return {
      code: 2,
      lines: [
        `✗ buy-path guard read ${pagesRead} pages, ${fieldsRead} form fields and ${redirectsRead} sign-out redirects: vacuous, not a pass.`,
      ],
    };
  }
  return {
    code: 0,
    lines: [
      `✓ buy-path guard passed on ${SITE}: ${pagesRead} pages, ${fieldsRead} enrol-form fields, ${redirectsRead} sign-out redirects (GET, POST) clean.`,
    ],
  };
}

const UA = { 'User-Agent': 'carsi-live-buy-path-guard' };

async function fetchRaw(url, init = {}) {
  const res = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    ...init,
    headers: { ...UA, ...(init.headers || {}) },
  });
  return { status: res.status, location: res.headers.get('location'), body: await res.text() };
}

/** Follow up to 5 redirects by hand so every Location on the way is scanned too. */
async function fetchPage(url) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 6; i += 1) {
    const r = await fetchRaw(current);
    hops.push(r);
    if (r.status >= 300 && r.status < 400 && r.location) {
      current = new URL(r.location, current).href;
      continue;
    }
    if (r.status >= 400) throw new Error(`${url} returned HTTP ${r.status}`);
    return { hops, finalBody: r.body };
  }
  throw new Error(`${url} redirected more than 5 times`);
}

/** In the page: computed colours for each visible input/label in a form that holds an email field. */
function readFormColours() {
  // Any CSS colour (oklch, lab, color(), named, hex, rgb) -> sRGB by painting it on a 1x1 canvas.
  // A value the canvas rejects leaves the sentinel fill in place and comes back as null.
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const parse = (c) => {
    if (!ctx || !c) return null;
    if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const sentinel = 'rgb(1, 2, 3)';
    ctx.fillStyle = sentinel;
    const before = ctx.fillStyle;
    ctx.fillStyle = c;
    if (ctx.fillStyle === before && !/^(rgb\(1, 2, 3\)|#010203)$/i.test(c)) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return { r, g, b, a: a / 255 };
  };
  const toRgba = (c) => {
    const p = parse(c);
    return p ? `rgba(${p.r}, ${p.g}, ${p.b}, ${Number(p.a.toFixed(3))})` : `UNREADABLE:${c}`;
  };
  // Composite every semi-transparent background layer from the page root up to the element,
  // so a faint tint over white is judged as the near-white it actually is.
  const effectiveBg = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.unshift(n);
    let base = { r: 255, g: 255, b: 255 };
    for (const n of chain) {
      const raw = getComputedStyle(n).backgroundColor;
      const c = parse(raw);
      // A layer the canvas cannot read makes the whole stack unknown, never silently white.
      if (!c) return `UNREADABLE:${raw}`;
      if (c.a === 0) continue;
      base = {
        r: c.r * c.a + base.r * (1 - c.a),
        g: c.g * c.a + base.g * (1 - c.a),
        b: c.b * c.a + base.b * (1 - c.a),
      };
    }
    return `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const forms = [...document.querySelectorAll('form')].filter((f) =>
    [...f.querySelectorAll('input[type="email"], input[name*="email" i]')].some(visible)
  );
  const out = [];
  for (const f of forms) {
    for (const el of f.querySelectorAll(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), label'
    )) {
      if (!visible(el)) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        name:
          el.getAttribute('name') || el.getAttribute('for') || el.textContent.trim().slice(0, 40),
        color: toRgba(getComputedStyle(el).color),
        placeholder:
          el.tagName === 'INPUT' && el.placeholder
            ? toRgba(getComputedStyle(el, '::placeholder').color)
            : null,
        background: effectiveBg(el),
      });
    }
  }
  return out;
}

export async function audit() {
  const faults = [];
  const unjudged = [];
  let pagesRead = 0;
  let fieldsRead = 0;
  let redirectsRead = 0;

  for (const path of PUBLIC_PATHS.concat(PAID_COURSE_PATHS)) {
    const { hops, finalBody } = await fetchPage(SITE + path);
    if (!finalBody) throw new Error(`${path} returned an empty page`);
    pagesRead += 1;
    for (const h of hops) {
      for (const o of findLocalOrigins(h.location)) faults.push(`LOCALHOST ${path} redirect: ${o}`);
      for (const o of findLocalOrigins(h.body)) faults.push(`LOCALHOST ${path}: ${o}`);
    }
  }

  // The real sign-out link is a GET; a browser form POST sends Accept: text/html. Both must
  // redirect, and the redirect must not be local. A 200 here means we checked nothing: exit 2.
  for (const [label, init] of [
    ['GET', { method: 'GET', headers: { Accept: 'text/html' } }],
    ['POST', { method: 'POST', headers: { Accept: 'text/html' } }],
  ]) {
    const r = await fetchRaw(SITE + '/api/auth/logout', init);
    if (!(r.status >= 300 && r.status < 400) || !r.location) {
      throw new Error(
        `sign-out ${label} answered HTTP ${r.status} with no redirect; cannot check it`
      );
    }
    redirectsRead += 1;
    for (const o of findLocalOrigins(r.location))
      faults.push(`LOCALHOST sign-out ${label} redirect: ${o}`);
  }

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
  );
  try {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({
        colorScheme: scheme,
        viewport: { width: 1366, height: 900 },
      });
      for (const path of PAID_COURSE_PATHS) {
        await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
        try {
          // The page renders a hidden duplicate email input; wait for ANY visible one.
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll('input[type="email"], input[name*="email" i]')].some(
                (el) => {
                  const r = el.getBoundingClientRect();
                  const st = getComputedStyle(el);
                  return (
                    r.width > 0 &&
                    r.height > 0 &&
                    st.visibility !== 'hidden' &&
                    st.display !== 'none'
                  );
                }
              ),
            null,
            { timeout: 20000 }
          );
        } catch {
          throw new Error(`no visible email field on ${path} (${scheme}) within 20 s`);
        }
        await page.waitForTimeout(500);
        const hrefs = await page.evaluate(() =>
          [...document.querySelectorAll('[href], [src], [action]')]
            .map(
              (el) => el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('action')
            )
            .join(' ')
        );
        for (const o of findLocalOrigins(hrefs))
          faults.push(`LOCALHOST ${path} (${scheme}, rendered): ${o}`);
        const fields = await page.evaluate(readFormColours);
        if (fields.length === 0) faults.push(`NO ENROL FORM ${path} (${scheme})`);
        fieldsRead += fields.length;
        for (const f of fields) {
          const pairs = [[f.tag, f.color]];
          if (f.placeholder) pairs.push(['placeholder', f.placeholder]);
          for (const [kind, color] of pairs) {
            const verdict = judgeContrast({ color, background: f.background });
            const where = `${path} (${scheme}) ${kind} "${f.name}": ${color} on ${f.background}`;
            if (verdict === 'unreadable') faults.push(`CONTRAST ${where}`);
            else if (verdict === 'unknown') unjudged.push(`UNJUDGED ${where}`);
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return { faults, unjudged, pagesRead, fieldsRead, redirectsRead };
}

async function main() {
  let result;
  try {
    result = await audit();
  } catch (e) {
    console.error(`✗ buy-path guard could not audit ${SITE}: ${e.message}`);
    process.exit(2);
  }
  const { code, lines } = summarise(result);
  for (const line of lines) (code === 0 ? console.log : console.error)(line);
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
