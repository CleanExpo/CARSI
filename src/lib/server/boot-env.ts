/**
 * Fail-loud boot env validation (WS2 / P0-B, AC-5).
 *
 * The original "Margot" outage was a mis-provisioned deploy — the container
 * booted without the AI key and only failed per-request with an opaque 504. This
 * validator, wired into `instrumentation.ts` (register()), makes a production
 * server REFUSE TO START when a required secret is missing, so the deploy fails
 * fast and visibly at the health gate instead of serving a silently-broken app.
 *
 * Posture mirrors resolveJwtSecret: throw in production, warn outside it. Pure +
 * dependency-injected (env param) so it is unit-testable without mutating
 * process.env, and safe to import from the Node instrumentation hook (never Edge).
 */
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * The required production env vars that are absent or invalid, by name. Empty
 * means the environment is fully provisioned.
 */
export function findMissingRequiredEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const missing: string[] = [];

  if (!env.DATABASE_URL?.trim()) missing.push('DATABASE_URL');
  if (!env.STRIPE_SECRET_KEY?.trim()) missing.push('STRIPE_SECRET_KEY');
  // Single source of truth for the AI provider of record — never ANTHROPIC_API_KEY.
  if (!resolveOpenRouterConfig(env).configured) missing.push('OPENROUTER_API_KEY');
  if ((env.JWT_SECRET ?? '').trim().length < MIN_JWT_SECRET_LENGTH) {
    missing.push(`JWT_SECRET (min ${MIN_JWT_SECRET_LENGTH} chars)`);
  }

  return missing;
}

/**
 * In production: THROW if any required var is missing (refuse to boot). Outside
 * production: warn and continue, preserving the deliberate dev/CI/build fallbacks
 * (prisma placeholder URL, Margot 503, dev JWT secret).
 */
export function validateRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = findMissingRequiredEnv(env);
  if (missing.length === 0) return;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      `[boot] Refusing to start: missing or invalid required production env: ${missing.join(', ')}`,
    );
  }

  console.warn(
    `[boot] Missing or invalid env (allowed only outside production): ${missing.join(', ')}`,
  );
}
