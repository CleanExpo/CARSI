/**
 * Content-Security-Policy (Phase 9, 2026-06-29 audit).
 *
 * SSG-preserving design: nonces require per-request rendering, so a static page
 * cannot carry a nonce. We therefore use a STRICT policy (nonce, no
 * 'unsafe-inline') only on the already-dynamic authenticated app surface (where
 * learner PII / user content lives — the real XSS target), and a RELAXED policy
 * (keeps 'unsafe-inline') on the public/marketing pages so they stay statically
 * generated. Both keep 'self' + the host allowlist (no 'strict-dynamic'), so the
 * external /theme-init.js and Stripe/GA load in either mode.
 */
export function buildContentSecurityPolicy(opts: {
  nonce: string;
  isDev: boolean;
  appOrigin: string;
  strict: boolean;
}): string {
  const { nonce, isDev, appOrigin, strict } = opts;

  const scriptParts = [
    "script-src 'self'",
    strict ? `'nonce-${nonce}'` : "'unsafe-inline'",
    'https://js.stripe.com',
    'https://www.googletagmanager.com',
    'https://cdn.jsdelivr.net',
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];

  const connectParts = [
    "connect-src 'self'",
    appOrigin,
    'https://api.stripe.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    ...(isDev ? ['ws:', 'wss:', 'http://localhost:3000', 'http://127.0.0.1:3000'] : []),
  ];

  return [
    "default-src 'self'",
    scriptParts.join(' '),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    connectParts.join(' '),
    'frame-src https://js.stripe.com https://hooks.stripe.com',
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Path prefixes for the authenticated, already-dynamic app surface that gets the
 *  strict (no-'unsafe-inline') nonce CSP. Everything else stays relaxed + static. */
export const STRICT_CSP_PREFIXES = [
  '/dashboard',
  '/student',
  '/instructor',
  '/agents',
  '/tasks',
  '/admin',
];

export function isStrictCspPath(pathname: string): boolean {
  return STRICT_CSP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
