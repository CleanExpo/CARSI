/**
 * Single source of truth for resolving JWT signing secrets.
 *
 * Edge-safe: uses only `process.env`, `TextEncoder`, and `console` so it can run
 * in middleware (Edge runtime) as well as Node. No Node-only or app imports.
 *
 * Security posture: in production a missing or weak secret THROWS, so the app
 * refuses to sign/verify with a known, forgeable value. Outside production it
 * falls back to an explicit insecure development value (with a loud warning).
 */

const MIN_SECRET_LENGTH = 32;

export function resolveJwtSecret(opts: {
  value: string | undefined;
  label: string;
  devFallback: string;
}): string {
  const { value, label, devFallback } = opts;

  if (value && value.length >= MIN_SECRET_LENGTH) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${label} must be set to a strong secret (at least ${MIN_SECRET_LENGTH} characters) in production.`,
    );
  }

  if (value && value.length > 0) {
    console.warn(
      `[auth] ${label} is shorter than ${MIN_SECRET_LENGTH} characters; allowed only outside production.`,
    );
    return value;
  }

  console.warn(
    `[auth] ${label} is not set; using an insecure development fallback. Set ${label} before deploying to production.`,
  );
  return devFallback;
}

export function getSessionSecretBytes(): Uint8Array {
  return new TextEncoder().encode(
    resolveJwtSecret({
      value: process.env.JWT_SECRET,
      label: 'JWT_SECRET',
      devFallback: 'development-only-change-jwt-secret-in-production',
    }),
  );
}

export function getAdminSecretBytes(): Uint8Array {
  return new TextEncoder().encode(
    resolveJwtSecret({
      value: process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET,
      label: 'ADMIN_JWT_SECRET/JWT_SECRET',
      devFallback: 'dev-admin-jwt-secret-change-me',
    }),
  );
}
