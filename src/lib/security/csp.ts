/**
 * Content-Security-Policy with a per-request nonce (Phase 9, 2026-06-29 audit).
 *
 * Replaces the static `script-src 'unsafe-inline'` (which defeats CSP's XSS
 * containment) with `'nonce-<n>' 'strict-dynamic'`. strict-dynamic means modern
 * browsers trust only nonce'd scripts and whatever they load (so the old
 * js.stripe.com / googletagmanager host allowlist for script-src is no longer
 * needed — those are loaded by trusted, nonce'd scripts). style-src keeps
 * 'unsafe-inline' (lower risk; framework injects inline styles). connect-src
 * still lists the Stripe/GA hosts since strict-dynamic only governs script-src.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean, appOrigin: string): string {
  const scriptSrc = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(' ');

  const connectSrc = [
    "connect-src 'self'",
    appOrigin,
    'https://api.stripe.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    ...(isDev ? ['ws:', 'wss:', 'http://localhost:3000', 'http://127.0.0.1:3000'] : []),
  ].join(' ');

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    connectSrc,
    'frame-src https://js.stripe.com https://hooks.stripe.com',
    "frame-ancestors 'none'",
  ].join('; ');
}
