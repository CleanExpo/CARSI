/**
 * Next.js 16 instrumentation hook — runs ONCE at server startup (not during
 * `next build`), in each runtime. We use it as the fail-loud boot gate (WS2 /
 * P0-B, AC-5): in production a mis-provisioned deploy (missing AI key / Stripe /
 * DB / JWT secret) throws here and the server refuses to start, so the deploy
 * fails fast at the health gate instead of serving a silently-broken instance —
 * the exact class of the original "Margot" outage.
 *
 * Guards:
 *  - NEXT_RUNTIME !== 'nodejs' → skip. register() also fires for the Edge
 *    middleware runtime, where process.env is limited and DB/Stripe/AI are
 *    irrelevant; those are Node-server concerns only.
 *  - validateRequiredEnv only THROWS when NODE_ENV === 'production'; in dev/CI it
 *    just warns, preserving the deliberate build/dev fallbacks.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateRequiredEnv } = await import('@/lib/server/boot-env');
  validateRequiredEnv();
}
