import { NextResponse } from 'next/server';

import { getLiveness } from '@/lib/server/health';

// Always run live — a health check that can be statically/edge cached would
// report a stale status and defeat the gate.
export const dynamic = 'force-dynamic';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: { ai: boolean };
  verification_system: {
    enabled: boolean;
    independent_verification: boolean;
    self_attestation_blocked: boolean;
  };
}

const startTime = Date.now();

/**
 * LIVENESS probe (WS2 / P0-B, AC-6). DigitalOcean's health_check polls this and
 * RESTARTS the instance on sustained failure, so it deliberately does NOT touch
 * the database — coupling liveness to a shared DB would turn a transient blip
 * into a self-inflicted restart storm. It verifies the AI provider config
 * (env-only, cannot flap). Deep DB readiness is at /api/health/ready. A
 * mis-provisioned deploy is caught earlier by the boot validator (instrumentation.ts).
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const liveness = getLiveness();

  const response: HealthResponse = {
    status: liveness.status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks: liveness.checks,
    verification_system: {
      enabled: true,
      independent_verification: true,
      self_attestation_blocked: true,
    },
  };

  return NextResponse.json(response, { status: liveness.httpStatus });
}
