/**
 * Sentry error tracking for server paths (WS3 / GP-447 / GitHub #128):
 * payment (checkout + Stripe webhook), enrolment, and CEC-certificate routes.
 *
 * Cleanly no-ops when `SENTRY_DSN` is unset — `@sentry/node` is only imported
 * (dynamically) the first time a capture is actually attempted with a DSN
 * configured, so environments without Sentry pay no import/bundle cost on the
 * request path.
 *
 * Uses `@sentry/node` directly rather than `@sentry/nextjs`: we only need
 * manual `captureException` on specific API routes, not Next.js's automatic
 * request/middleware/route instrumentation or build-time `withSentryConfig`
 * wrapping — `@sentry/nextjs`'s package-level ESM re-export of
 * `@sentry/node`'s API was found to be unreliable outside webpack/Turbopack
 * bundling (verified: `import * as Sentry from '@sentry/nextjs'` under plain
 * Node resolved `captureException` as `undefined`), whereas `@sentry/node`
 * exposes it directly and consistently.
 */

type SentryModule = typeof import('@sentry/node');

let sentryModulePromise: Promise<SentryModule> | null = null;
let initialised = false;

function getDsn(): string | undefined {
  return process.env.SENTRY_DSN?.trim() || undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(getDsn());
}

async function loadSentry(): Promise<SentryModule | null> {
  const dsn = getDsn();
  if (!dsn) return null;

  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/node');
  }
  const Sentry = await sentryModulePromise;

  if (!initialised) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
    initialised = true;
  }

  return Sentry;
}

/**
 * Capture an error on a payment/enrolment/CEC-certificate server path. Never
 * throws — a Sentry outage or missing DSN must never affect the caller's
 * control flow (e.g. a webhook's retry/acknowledge decision).
 */
export async function captureServerError(
  error: unknown,
  context?: { route?: string; tags?: Record<string, string>; extra?: Record<string, unknown> },
): Promise<void> {
  try {
    const Sentry = await loadSentry();
    if (!Sentry) return;

    Sentry.captureException(error, {
      tags: { route: context?.route, ...context?.tags },
      extra: context?.extra,
    });
  } catch (captureError) {
    console.error('[sentry] failed to capture error', captureError);
  }
}
