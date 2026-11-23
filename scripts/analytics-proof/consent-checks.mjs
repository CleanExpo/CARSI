/**
 * Pure check logic for the GP-731 consent proof (scripts/analytics-proof/consent-proof.mjs).
 *
 * Kept apart from the browser driver so the verdicts can be tested against fixture network logs
 * (scripts/analytics-proof/consent-checks.test.mjs) without building the site or launching a
 * browser.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const GOOGLE_HOST =
  /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|googlesyndication\.com)$/;
const GOOGLE_SITE = /^(?:[a-z0-9-]+\.)?google\.(?:com|[a-z]{2,3}|com?\.[a-z]{2})$/;

export function isGoogle(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return GOOGLE_HOST.test(host) || GOOGLE_SITE.test(host);
  } catch {
    return false;
  }
}

export function isLibrary(url) {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('googletagmanager.com') && u.pathname.startsWith('/gtag/');
  } catch {
    return false;
  }
}

/** Every event in a collection request: the URL fields merged with each body line. */
export function eventsOf(url, body) {
  const shared = Object.fromEntries(new URL(url).searchParams);
  const lines = (body || '').split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [shared];
  return lines.map((line) => ({ ...shared, ...Object.fromEntries(new URLSearchParams(line)) }));
}

/**
 * Each check has a status: "pass", "fail", "blocked" (the proof could not observe what it needs,
 * e.g. the library never loaded) or "skipped" (it depends on a blocked check, so a pass would be
 * vacuous). `pass` stays as a boolean for report.json readers and is true only for "pass".
 */
const result = (id, status, detail) => ({ id, status, pass: status === 'pass', detail });
const passFail = (id, ok, detail) => result(id, ok ? 'pass' : 'fail', detail);

export const LIBRARY_BLOCKED = 'library did not load';

/**
 * A library request counts only when the file actually arrived: no network error, a 2xx status
 * and a non-empty body. A request on its own proves nothing; in a verification run gtag.js was
 * refused by the proxy (net::ERR_TUNNEL_CONNECTION_FAILED) and the old check still passed.
 */
export function libraryLoaded(entry) {
  return (
    Boolean(entry.library) &&
    !entry.failure &&
    Number.isInteger(entry.status) &&
    entry.status >= 200 &&
    entry.status < 300 &&
    Number(entry.bodyBytes) > 0
  );
}

function describeLibrary(entry) {
  if (entry.failure) return `${entry.url} -> ${entry.failure}`;
  if (entry.status === undefined) return `${entry.url} -> no response recorded`;
  return `${entry.url} -> ${entry.status}, ${entry.bodyBytes ?? 0} byte(s)`;
}

/** A check that cannot be judged because the library never loaded. */
export function skipped(id) {
  return result(id, 'skipped', `not judged: ${LIBRARY_BLOCKED}, so a pass would be vacuous`);
}

/** B1-B4 from the Google requests recorded after "Accept analytics". */
export function evaluateAccept(accepted, expectedDl) {
  const libs = accepted.filter((r) => r.library);
  const collects = accepted.filter((r) => !r.library);
  const loaded = libs.filter(libraryLoaded);
  const b1Detail = `${loaded.length} of ${libs.length} library request(s) loaded: ${
    libs.map(describeLibrary).join(' | ') || 'none'
  }`;
  if (loaded.length === 0) {
    return [
      result('B1-library-after-accept', 'blocked', `BLOCKED: ${LIBRARY_BLOCKED}. ${b1Detail}`),
      skipped('B2-page-view-after-accept'),
      skipped('B3-address-scrubbed'),
      skipped('B4-no-personal-data-in-any-hit'),
    ];
  }
  const checks = [result('B1-library-after-accept', 'pass', b1Detail)];
  const pageViews = collects
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => e.en === 'page_view');
  checks.push(
    passFail(
      'B2-page-view-after-accept',
      pageViews.length > 0,
      `${pageViews.length} page_view event(s) left the browser`
    )
  );
  checks.push(
    passFail(
      'B3-address-scrubbed',
      pageViews.length > 0 && pageViews.every((e) => e.dl === expectedDl),
      `sent dl: ${JSON.stringify(pageViews.map((e) => e.dl))}; expected ${expectedDl}`
    )
  );
  const leaked = collects.filter((r) =>
    /jane|proof-token|example\.invalid|token=/i.test(decodeURIComponent(`${r.url} ${r.body}`))
  );
  checks.push(
    passFail(
      'B4-no-personal-data-in-any-hit',
      leaked.length === 0,
      `${leaked.length} hit(s) carrying the planted email/token`
    )
  );
  return checks;
}

/** C1 from the Google requests recorded while on the private page. */
export function evaluatePrivatePage(entries, { libraryLoaded: loaded }) {
  if (!loaded) return skipped('C1-no-hit-about-private-page');
  const privateHits = entries
    .filter((r) => !r.library)
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => (e.dl || '').includes('/login') || (e.dr || '').includes('/login'));
  return passFail(
    'C1-no-hit-about-private-page',
    privateHits.length === 0,
    `${privateHits.length} hit(s) about /login`
  );
}

/**
 * The run's outcome: exit code and the line printed last.
 *   0 every check passed;  1 a check failed;  2 the proof could not run;
 *   3 BLOCKED: the library did not load, so the accept-path checks could not be judged.
 * A real failure outranks BLOCKED, so a leak seen elsewhere is never hidden behind it.
 */
export function verdict(checks, error) {
  if (error) return { code: 2, label: `PROOF COULD NOT RUN: ${error}` };
  const count = (status) => checks.filter((c) => c.status === status).length;
  const n = `${count('pass')}/${checks.length} checks passed`;
  if (count('fail') > 0) return { code: 1, label: `PROOF FAILED: ${n}, ${count('fail')} failed` };
  if (count('blocked') > 0) {
    return {
      code: 3,
      label: `BLOCKED: ${LIBRARY_BLOCKED} (${count('blocked')} viewport(s)); ${count('skipped')} dependent check(s) not judged; ${n}`,
    };
  }
  if (checks.length === 0 || count('pass') !== checks.length) {
    return { code: 1, label: `PROOF FAILED: ${n}` };
  }
  return { code: 0, label: `PROOF PASSED: ${n}` };
}

/**
 * The build imports the generated Prisma client (src/generated/prisma, gitignored). Without it
 * `next build` fails deep in the output. Run `prisma generate` first and fail fast, with a
 * plain message, when it fails or writes no client.
 */
export function prismaPreflight(root, runGenerate) {
  const res = runGenerate();
  if (res.status !== 0) {
    return {
      ok: false,
      message: `prisma generate failed (exit ${res.status}); the build needs the generated client. Run \`npx prisma generate\` and retry.`,
    };
  }
  const client = join(root, 'src', 'generated', 'prisma', 'client.ts');
  if (!existsSync(client)) {
    return {
      ok: false,
      message: `prisma generate exited 0 but src/generated/prisma/client.ts is missing; check prisma/schema.prisma's generator output.`,
    };
  }
  return { ok: true, message: 'prisma generate: client present' };
}
