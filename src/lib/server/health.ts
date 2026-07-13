/**
 * Health checks (WS2 / P0-B, AC-6) — deliberately split into liveness vs readiness.
 *
 * DigitalOcean App Platform uses ONE health_check block as both the deploy gate
 * AND the runtime liveness probe: sustained failure RESTARTS the instance. So the
 * probe DO polls (`/api/health`) must be a shallow *liveness* check — it must NOT
 * depend on the database, or a transient DB blip (failover / pool exhaustion)
 * would restart every instance at once and amplify a survivable event into a full
 * outage. Deep *readiness* (DB reachable + AI configured) lives at
 * `/api/health/ready` for CI / monitoring, where a 503 informs but never restarts.
 *
 * A mis-provisioned deploy (the original "Margot" outage) is still caught: the
 * boot validator (instrumentation.ts / boot-env.ts) refuses to start in
 * production when a required secret is missing, so the server never serves.
 */
import { resolveOpenRouterConfig } from '@/lib/openrouter/provider';
import { prisma } from '@/lib/prisma';

/** Bound the DB probe so a hung connection can't stall a readiness response. */
const PROBE_TIMEOUT_MS = 4_000;

export type HealthChecks = { db: boolean; ai: boolean };

export type HealthResult = {
  status: 'healthy' | 'unhealthy';
  httpStatus: 200 | 503;
  checks: HealthChecks;
};

export type LivenessResult = {
  status: 'healthy' | 'unhealthy';
  httpStatus: 200 | 503;
  checks: { ai: boolean };
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

/** Cheap DB reachability probe, bounded by a timeout. Maps any failure — including
 *  a hang — to `false`; never throws. */
export async function probeDatabase(timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('probeDatabase: timed out')), timeoutMs);
    });
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Liveness (the endpoint DigitalOcean's health_check polls): the process is up
 * and the AI provider is configured. Env-only, so it can NEVER flap on a DB
 * outage — that is the whole point of separating it from readiness.
 */
export function getLiveness(env: NodeJS.ProcessEnv = process.env): LivenessResult {
  const ai = resolveOpenRouterConfig(env).configured;
  return {
    status: ai ? 'healthy' : 'unhealthy',
    httpStatus: ai ? 200 : 503,
    checks: { ai },
  };
}

/** Readiness (CI / monitoring, NOT the DO restart probe): DB reachable + AI configured. */
export async function getHealth(env: NodeJS.ProcessEnv = process.env): Promise<HealthResult> {
  const dbOk = await probeDatabase();
  const aiConfigured = resolveOpenRouterConfig(env).configured;
  return computeHealth({ dbOk, aiConfigured });
}
