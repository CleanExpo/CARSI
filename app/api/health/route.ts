import { NextResponse } from 'next/server';

import { getHealth } from '@/lib/server/health';

// Always run live — a health check that can be statically cached (or cached at
// the edge) would report a stale 'healthy' 200 and defeat the deploy gate.
export const dynamic = 'force-dynamic';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: { db: boolean; ai: boolean };
  verification_system: {
    enabled: boolean;
    independent_verification: boolean;
    self_attestation_blocked: boolean;
  };
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  // Verify real dependencies (WS2 / P0-B, AC-6): DB reachable + AI provider
  // configured. Returns 503 unless both pass, so DigitalOcean's probe fails a
  // mis-provisioned deploy instead of waving through a silently-broken instance.
  const health = await getHealth();

  const response: HealthResponse = {
    status: health.status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    checks: health.checks,
    verification_system: {
      enabled: true,
      independent_verification: true,
      self_attestation_blocked: true,
    },
  };

  return NextResponse.json(response, { status: health.httpStatus });
}
