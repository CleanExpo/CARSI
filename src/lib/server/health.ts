/**
 * Real health check (WS2 / P0-B, AC-6).
 *
 * DigitalOcean's health probe hits GET /api/health. It used to return a static
 * always-'healthy' 200 that verified nothing, so a deploy with a dead database or
 * a missing AI key still passed the gate. `getHealth()` now probes a real
 * dependency (a cheap `SELECT 1`) and the AI provider config, and returns 503
 * unless BOTH pass — so a broken deploy fails the gate instead of going live.
 *
 * The pure `computeHealth` aggregator is separated from the side-effecting
 * `probeDatabase` so the status/HTTP-code logic is trivially unit-testable.
 */
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { prisma } from '@/lib/prisma';

export type HealthChecks = { db: boolean; ai: boolean };

export type HealthResult = {
  status: 'healthy' | 'unhealthy';
  httpStatus: 200 | 503;
  checks: HealthChecks;
};

/** Pure: healthy (200) only when every dependency check passes; otherwise 503. */
export function computeHealth(input: { dbOk: boolean; aiConfigured: boolean }): HealthResult {
  const healthy = input.dbOk && input.aiConfigured;
  return {
    status: healthy ? 'healthy' : 'unhealthy',
    httpStatus: healthy ? 200 : 503,
    checks: { db: input.dbOk, ai: input.aiConfigured },
  };
}

/** Cheap DB reachability probe. Maps any failure to `false` — never throws. */
export async function probeDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Run the real dependency checks and aggregate them into a health result. */
export async function getHealth(env: NodeJS.ProcessEnv = process.env): Promise<HealthResult> {
  const dbOk = await probeDatabase();
  const aiConfigured = resolveOpenRouterConfig(env).configured;
  return computeHealth({ dbOk, aiConfigured });
}
