import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { describeDrift, isClean, runLiveCecCheck } from '@/lib/server/live-cec-check';

/**
 * Live CEC compliance guard, run from INSIDE the app (GP-519).
 *
 * GitHub's runners cannot reach the production database — the DigitalOcean trusted-source
 * list is two IPs plus `monkfish-app` — so the previous runner-side check returned
 * `P1008 SocketTimeout` and asserted nothing. This route runs the same check from inside the
 * deployed app, which is on the right side of that allowlist. The scheduled workflow now only
 * needs HTTPS.
 *
 * STATUS CODES ARE THE CONTRACT, and they are chosen so the caller needs no body parsing.
 * `.github/workflows/live-cec-guard.yml` uses `curl --fail-with-body`, which fails on any
 * non-2xx — so ONLY a clean run may be 2xx:
 *
 *   200  clean — every course matches the approvals registry
 *   409  drift found — the check RAN and the DB is publishing unbacked CEC claims
 *   500  the check could NOT run (database unreachable, read threw)
 *   503  CRON_SECRET not configured        (from requireCron)
 *   401  missing/incorrect bearer token    (from requireCron)
 *
 * Returning 200 with `{ok:false}` on drift was considered and rejected: the existing cron
 * workflows use `curl -fsS`, which only trips on non-2xx, so a 200 would render a licence
 * violation as a green tick. That is precisely the failure class GP-519 was filed about, and
 * rebuilding it inside its own fix would be the worst possible outcome here.
 *
 * Read-only: selects two columns, writes nothing, refunds nothing, revokes nothing.
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  // Deliberately NOT the `{ok:true, reason:'no_database'}` shortcut used by the reminder
  // crons. For those, doing nothing is a safe no-op. For a licence guard, "I had no database
  // to check" is a failure to assert, and dressing it as success is the whole defect.
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'no_database', detail: 'DATABASE_URL is not set — the guard could not run.' },
      { status: 500 },
    );
  }

  let result;
  try {
    const { prisma } = await import('@/lib/prisma');
    result = await runLiveCecCheck(prisma as never);
  } catch (e) {
    // A read that failed must never render as a read that succeeded and found nothing.
    return NextResponse.json(
      {
        ok: false,
        error: 'check_failed',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }

  if (isClean(result)) {
    return NextResponse.json({ ok: true, scanned: result.scanned });
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'unapproved_cec_claims',
      scanned: result.scanned,
      unapproved: result.unapproved,
      wrongHours: result.wrongHours,
      // Same lines the CLI prints, so a red CI log is actionable without opening a database.
      detail: describeDrift(result),
      fix: 'Run scripts/clear-unapproved-cec-hours.ts against this DB, or add the genuine approval to data/seed/cec-approvals.json.',
    },
    { status: 409 },
  );
}
