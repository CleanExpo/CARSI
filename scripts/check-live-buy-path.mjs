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
 *     local origin (localhost, *.localhost, 127.x in any spelling such as 127.1 or 2130706433,
 *     0.0.0.0, [::1], or another private host).
 *   - QUICK-ENROL CARD (GP-674): each paid course page must show the quick-enrol card, found by
 *     its data attribute (QUICK_ENROL_CARD_SELECTOR, set in GuestEnrolForm.tsx). A missing card
 *     is a fault even when another email form (a newsletter) is still on the page.
 *   - CONTRAST: on each paid course page, every visible input and label in the quick-enrol card
 *     must have a text colour different from its effective background colour.
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
import { isEntryPoint } from './lib/is-entry-point.mjs';

const SITE = (process.env.CARSI_SITE || 'https://carsi.com.au').replace(/\/$/, '');

export const PUBLIC_PATHS = ['/', '/courses', '/pricing', '/subscribe', '/login', '/register'];
/** Paid course pages that carry the quick-enrol card (checked live 12 Oct 2026). */
export const PAID_COURSE_PATHS = [
  '/courses/introduction-to-improving-indoor-air-quality-after-water-damage',
  '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
  '/courses/job-safety-and-environmental-analysis-jsea-course',
];

/**
 * The quick-enrol card on a course page (GP-674). GuestEnrolForm.tsx puts this attribute on its
 * <form>, and GuestEnrolForm.test.tsx imports the name from here, so the two cannot drift.
 */
export const QUICK_ENROL_CARD_ATTR = 'data-quick-enrol-card';
export const QUICK_ENROL_CARD_SELECTOR = `form[${QUICK_ENROL_CARD_ATTR}]`;

const LOCAL_ORIGIN_RE =
  /(?<![\w.+-])(?:https?:)?(?:\/\/|\\\/\\\/)(?:(?:[a-z0-9-]+\.)*localhost\.?|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1?\])(?::\d+)?(?![\w.-])/gi;

/**
 * Any URL-like string: an optional http(s) scheme, `//` (or JSON-escaped `\/\/`), then the
 * authority as written, up to the first character that cannot be part of one.
 */
const URL_LIKE_RE =
  /(?<![\w.+-])(https?:)?(?:\/\/|\\\/\\\/)(\[[0-9a-f:.]+\](?::\d+)?|[^\s/\\?#"'`<>()[\]{},;&|^]+)/gi;

const HTML_QUOTE_ENTITY_RE = /&(?:quot|apos|#0*3[49]|#x0*2[27]);$/i;
const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';

/**
 * Whether a scheme-relative `//host` starting at `index` sits where a browser or parser reads a
 * URL: the whole text (a Location header), an attribute value (`=` then optional padding, an
 * optional quote, optional padding), a quoted string (JS, JSON, an `&quot;`-encoded data
 * attribute, CSS `@import "..."`), CSS `url(`, or a later srcset candidate after a comma.
 * JSON-escaped `\/\/` only ever appears inside a string, so it always counts.
 *
 * Anything else, above all a `//` that opens a script line comment or sits inside a CSS
 * comment, is not a link (GP-686 item 2). The walk back crosses only the whitespace run in
 * front of this match, so the whole scan stays linear however much padding a page carries
 * (GP-686 item 3: the old look-back was a fixed 16 characters).
 */
function inUrlPosition(s, index) {
  if (s.startsWith('\\/', index)) return true;
  let i = index - 1;
  while (i >= 0 && isSpace(s[i])) i -= 1;
  if (i < 0) return true;
  const c = s[i];
  if (c === '=' || c === ',') return true;
  if (c === '(') return /url$/i.test(s.slice(Math.max(0, i - 3), i));
  const entity = c === ';' && HTML_QUOTE_ENTITY_RE.exec(s.slice(Math.max(0, i - 9), i + 1));
  if (c !== '"' && c !== "'" && c !== '`' && !entity) return false;
  if (i === index - 1) return true;
  // Padding between a quote and the URL counts only inside an attribute value: `href=" //h"`.
  let j = i - (entity ? entity[0].length : 1);
  while (j >= 0 && isSpace(s[j])) j -= 1;
  return j >= 0 && s[j] === '=';
}

/**
 * Every local origin found in a piece of text (HTML or a Location header), as written.
 *
 * Two passes. The regex pass names localhost, *.localhost, dotted 127.x, 0.0.0.0 and [::1].
 * The parsed pass (GP-674) hands each URL-like string to the URL parser and judges the host it
 * resolves to with isPrivateHost, the same test the redirect and browser checks use, so short,
 * decimal and hex spellings (http://127.1:8080/, http://2130706433:8080/, //0x7f.1) and other
 * private ranges are caught. In both passes a scheme-relative string (`//127.1:8080`) is judged
 * only where inUrlPosition says a URL is read (`href="//2130706433/"`, `url(//h)`, `"//h"`), so
 * `//` text in a script or CSS comment is not a false LOCALHOST (GP-686), and always when the
 * caller passes `attributeValues: true` because every token in the text is a link.
 */
export function findLocalOrigins(text, { attributeValues = false } = {}) {
  if (!text) return [];
  const s = String(text);
  // A scheme makes a string a URL wherever it stands. A scheme-relative `//host` is a URL only
  // where a browser or parser reads one (GP-686): elsewhere it is a script or CSS comment.
  const isLink = (scheme, index) => scheme || attributeValues || inUrlPosition(s, index);
  const found = [];
  for (const m of s.matchAll(LOCAL_ORIGIN_RE)) {
    if (isLink(/^https?:/i.test(m[0]), m.index)) {
      found.push(m[0].toLowerCase().replace(/\\\//g, '/'));
    }
  }
  for (const m of s.matchAll(URL_LIKE_RE)) {
    const [, scheme, authority] = m;
    if (!isLink(scheme, m.index)) continue;
    let host;
    try {
      host = new URL(`http://${authority}/`).hostname;
    } catch {
      continue;
    }
    if (isPrivateHost(host)) found.push(`${scheme || ''}//${authority}`.toLowerCase());
  }
  return [...new Set(found)];
}

/** Parse "rgb(a, b, c)" / "rgba(a, b, c, x)" into [r, g, b, alpha]. */
export function parseRgb(value) {
  const m = /^\s*rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)\s*$/i.exec(
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

/**
 * Loopback, private, link-local and unspecified hosts. The URL parser has already normalised
 * short and decimal IPv4 forms (127.1, 2130706433) to dotted quads before this sees them.
 */
export function isPrivateHost(hostname) {
  const h = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (!h) return false;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (h.includes(':')) {
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) addresses carry an IPv4
    // address; the URL parser writes them as hex groups (::ffff:7f00:1). Judge the IPv4 inside.
    const embedded =
      /^::(?:ffff:)?(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/.exec(h);
    if (embedded) {
      if (embedded[1]) return isPrivateHost(embedded[1]);
      const hi = parseInt(embedded[2], 16);
      const lo = parseInt(embedded[3], 16);
      return isPrivateHost(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return (
      h === '::1' || h === '::' || /^f[cd][0-9a-f]{0,2}:/.test(h) || /^fe[89ab][0-9a-f]?:/.test(h)
    );
  }
  return false;
}

/**
 * The browser boundary. Any request off the audited site to a raw IP address is refused, in any
 * spelling, and so is any named private host (localhost, *.localhost). A public page has no
 * reason to load from a bare IP, and refusing the whole class ends the chase after spellings
 * (review rounds 1 and 2 each found one more). The URL parser has already normalised the host.
 * Known limit: a DNS name that resolves to a private address is not caught here.
 */
export function blockBrowserRequest(url, site) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.origin === new URL(site).origin) return false;
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const ipLiteral = h.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
  return ipLiteral || isPrivateHost(u.hostname);
}

/**
 * Decide a redirect BEFORE it is fetched. Same-origin hops are followed. A hop to a private or
 * loopback host is the GP-626 fault itself: report it and never request it. Any other off-site
 * hop is not followed and the audit cannot vouch for the page (exit 2).
 */
export function redirectDecision(location, current, site) {
  let next;
  try {
    next = new URL(location, current);
  } catch {
    return { follow: false, error: `unparseable redirect Location "${location}" from ${current}` };
  }
  if (next.origin === new URL(site).origin) return { follow: true, next: next.href };
  if (isPrivateHost(next.hostname) || findLocalOrigins(location).length) {
    return {
      follow: false,
      fault: `redirect to a private host ${next.origin} (Location: ${location}), not followed`,
    };
  }
  return { follow: false, error: `${current} redirected off-site to ${next.origin}; not followed` };
}

/** An audit that threw part-way: a fault already found still makes it red (1), else 2. */
export function failureSummary(error, faults) {
  if (faults.length) {
    return {
      code: 1,
      lines: [
        `✗ buy-path guard found ${faults.length} fault(s) on ${SITE} before it stopped (${error.message}):`,
        ...faults.map((f) => '  - ' + f),
      ],
    };
  }
  return { code: 2, lines: [`✗ buy-path guard could not audit ${SITE}: ${error.message}`] };
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
async function fetchPage(url, faults) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 6; i += 1) {
    const r = await fetchRaw(current);
    hops.push(r);
    if (r.status >= 300 && r.status < 400 && r.location) {
      const d = redirectDecision(r.location, current, SITE);
      if (d.fault) {
        faults.push(`LOCALHOST ${url}: ${d.fault}`);
        return { hops, finalBody: null, stopped: true };
      }
      if (!d.follow) throw new Error(d.error);
      current = d.next;
      continue;
    }
    if (r.status >= 400) throw new Error(`${url} returned HTTP ${r.status}`);
    return { hops, finalBody: r.body };
  }
  throw new Error(`${url} redirected more than 5 times`);
}

/** In the page: computed colours for each visible input/label in the visible quick-enrol card. */
function readFormColours(cardSelector) {
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
  const forms = [...document.querySelectorAll(cardSelector)].filter(visible);
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

export async function audit(faults = []) {
  const unjudged = [];
  let pagesRead = 0;
  let fieldsRead = 0;
  let redirectsRead = 0;

  for (const path of PUBLIC_PATHS.concat(PAID_COURSE_PATHS)) {
    const { hops, finalBody, stopped } = await fetchPage(SITE + path, faults);
    if (!finalBody && !stopped) throw new Error(`${path} returned an empty page`);
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
      // The browser never requests a raw IP or private host other than the audited site itself
      // (a local fixture is a loopback origin). Such a request is the fault: report it and abort
      // it, so the runner never reaches an internal service.
      let currentPath = '';
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (blockBrowserRequest(url, SITE)) {
          faults.push(
            `LOCALHOST ${currentPath} (${scheme}, browser request blocked): ${new URL(url).origin}`
          );
          return route.abort();
        }
        return route.continue();
      });
      for (const path of PAID_COURSE_PATHS) {
        currentPath = path;
        await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
        let cardShown = true;
        try {
          // The page can render a hidden duplicate card; wait for ANY visible one.
          await page.waitForFunction(
            (sel) =>
              [...document.querySelectorAll(sel)].some((el) => {
                const r = el.getBoundingClientRect();
                const st = getComputedStyle(el);
                return (
                  r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'
                );
              }),
            QUICK_ENROL_CARD_SELECTOR,
            { timeout: 20000 }
          );
        } catch {
          cardShown = false;
        }
        await page.waitForTimeout(500);
        const hrefs = await page.evaluate(() =>
          [...document.querySelectorAll('[href], [src], [action]')]
            .map(
              (el) => el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('action')
            )
            .join(' ')
        );
        for (const o of findLocalOrigins(hrefs, { attributeValues: true }))
          faults.push(`LOCALHOST ${path} (${scheme}, rendered): ${o}`);
        if (!cardShown) {
          // The page loaded (goto succeeded) but the buyer has no card to enrol with. Another
          // email form on the page does not count: that was the gap GP-674 closed.
          faults.push(
            `NO QUICK-ENROL CARD ${path} (${scheme}): no visible ${QUICK_ENROL_CARD_SELECTOR} within 20 s`
          );
          continue;
        }
        // The card must still ask for the buyer's email: checkout cannot start without it. The
        // field counts only if a buyer can see it: no hidden or transparent element from the field
        // up to the page, and some of it left after every ancestor that clips its overflow.
        const hasEmail = await page.evaluate(
          (sel) => {
            const usable = (el) => {
              const r = el.getBoundingClientRect();
              let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
              for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
                const st = getComputedStyle(n);
                if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0)
                  return false;
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
              return box.r - box.l > 0 && box.b - box.t > 0;
            };
            return [...document.querySelectorAll(sel)].some((card) =>
              [...card.querySelectorAll('input[type="email"], input[name*="email" i]')].some(usable)
            );
          },
          QUICK_ENROL_CARD_SELECTOR
        );
        if (!hasEmail) faults.push(`QUICK-ENROL CARD HAS NO EMAIL FIELD ${path} (${scheme})`);
        const fields = await page.evaluate(readFormColours, QUICK_ENROL_CARD_SELECTOR);
        if (fields.length === 0) faults.push(`QUICK-ENROL CARD HAS NO FIELDS ${path} (${scheme})`);
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
  const faults = [];
  let outcome;
  try {
    outcome = summarise(await audit(faults));
  } catch (e) {
    outcome = failureSummary(e, faults);
  }
  const { code, lines } = outcome;
  for (const line of lines) (code === 0 ? console.log : console.error)(line);
  process.exit(code);
}

if (isEntryPoint(import.meta.url)) main();
