/**
 * Pure check logic for the GP-731 consent proof (scripts/analytics-proof/consent-proof.mjs).
 *
 * Kept apart from the browser driver so the verdicts can be tested against fixture network logs
 * (scripts/analytics-proof/consent-checks.test.mjs) without building the site or launching a
 * browser.
 */

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

const result = (id, pass, detail) => ({ id, pass: Boolean(pass), detail });

/** B1-B4 from the Google requests recorded after "Accept analytics". */
export function evaluateAccept(accepted, expectedDl) {
  const libs = accepted.filter((r) => r.library);
  const collects = accepted.filter((r) => !r.library);
  const checks = [];
  checks.push(
    result(
      'B1-library-after-accept',
      libs.length > 0,
      `${libs.length} library request(s): ${libs.map((r) => r.url).join(' ')}`
    )
  );
  const pageViews = collects
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => e.en === 'page_view');
  checks.push(
    result(
      'B2-page-view-after-accept',
      pageViews.length > 0,
      `${pageViews.length} page_view event(s) left the browser`
    )
  );
  checks.push(
    result(
      'B3-address-scrubbed',
      pageViews.length > 0 && pageViews.every((e) => e.dl === expectedDl),
      `sent dl: ${JSON.stringify(pageViews.map((e) => e.dl))}; expected ${expectedDl}`
    )
  );
  const leaked = collects.filter((r) =>
    /jane|proof-token|example\.invalid|token=/i.test(decodeURIComponent(`${r.url} ${r.body}`))
  );
  checks.push(
    result(
      'B4-no-personal-data-in-any-hit',
      leaked.length === 0,
      `${leaked.length} hit(s) carrying the planted email/token`
    )
  );
  return checks;
}

/** C1 from the Google requests recorded while on the private page. */
export function evaluatePrivatePage(entries) {
  const privateHits = entries
    .filter((r) => !r.library)
    .flatMap((r) => eventsOf(r.url, r.body))
    .filter((e) => (e.dl || '').includes('/login') || (e.dr || '').includes('/login'));
  return result(
    'C1-no-hit-about-private-page',
    privateHits.length === 0,
    `${privateHits.length} hit(s) about /login`
  );
}

/** The run's outcome: exit code and the line printed last. */
export function verdict(checks, error) {
  if (error) return { code: 2, label: `PROOF COULD NOT RUN: ${error}` };
  const passed = checks.length > 0 && checks.every((c) => c.pass);
  const n = `${checks.filter((c) => c.pass).length}/${checks.length} checks`;
  return passed
    ? { code: 0, label: `PROOF PASSED: ${n}` }
    : { code: 1, label: `PROOF FAILED: ${n}` };
}
