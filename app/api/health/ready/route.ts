import { NextResponse } from 'next/server';

import { getHealth } from '@/lib/server/health';

// Always run live — readiness must reflect the real current state.
export const dynamic = 'force-dynamic';

/**
 * READINESS probe (WS2 / P0-B, AC-6). Verifies real dependencies — the database
 * (SELECT 1) and the AI provider config — and returns 503 unless both pass. Use
 * this for CI / deploy verification and external monitoring.
 *
 * It is deliberately NOT the endpoint DigitalOcean's health_check polls: DO
 * restarts an instance on sustained probe failure, so gating restarts on shared-DB
 * reachability would amplify a transient DB blip into an outage. DO polls the
 * shallow liveness probe at /api/health instead.
 */
export async function GET(): Promise<NextResponse> {
  const health = await getHealth();
  return NextResponse.json(
    {
      status: health.status,
      timestamp: new Date().toISOString(),
      checks: health.checks,
    },
    { status: health.httpStatus },
  );
}
