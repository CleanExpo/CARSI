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

/** A stalled probe older than this no longer blocks a fresh attempt, so a query
 *  stuck on a half-open socket cannot pin readiness at "unhealthy" for ever. */
const STALE_PROBE_MS = 30_000;

/** The SELECT 1 currently running, shared by every caller (GP-693). */
let inFlight: { query: Promise<unknown>; startedAt: number } | null = null;

/**
 * Start a SELECT 1, or join the one already running. A caller that times out
 * stops waiting but the query keeps its pool slot until the driver answers, so
 * repeated health hits during a database stall must not each open a new query.
 * At most one probe query is outstanding per STALE_PROBE_MS.
 */
function sharedProbeQuery(): Promise<unknown> {
  const now = Date.now();
  if (inFlight && now - inFlight.startedAt < STALE_PROBE_MS) return inFlight.query;
  // Promise.resolve().then(...) turns a synchronous throw into a rejection and
  // gives Prisma's lazy promise a .then so the query actually runs.
  const query = Promise.resolve().then(() => prisma.$queryRaw`SELECT 1`);
  const entry = { query, startedAt: now };
  inFlight = entry;
  const clear = () => {
    if (inFlight === entry) inFlight = null;
  };
  query.then(clear, clear);
  return query;
}

/** Cheap DB reachability probe, bounded by a timeout. Maps any failure — including
 *  a hang — to `false`; never throws. Concurrent and repeated callers share one
 *  in-flight query (see sharedProbeQuery). */
export async function probeDatabase(timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('probeDatabase: timed out')), timeoutMs);
    });
    await Promise.race([sharedProbeQuery(), timeout]);
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
