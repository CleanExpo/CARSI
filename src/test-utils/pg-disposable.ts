/**
 * The real-PostgreSQL suites (*.pg.test.ts) create and delete rows in shared tables (users,
 * courses, coach gap-map pathways). On a database anyone else writes to, their cleanup could
 * delete someone else's data, so they run ONLY against a throwaway database, and they enforce it:
 *
 *   - DATABASE_URL must point at a loopback host (localhost, 127.0.0.1 or ::1); CI's postgres
 *     service is reached on localhost; and
 *   - CARSI_PG_DISPOSABLE must be exactly "1", an explicit statement that this database is
 *     disposable (CI's test:pg step and the local docker run set it).
 *
 * Anything else is refused before a suite is collected (vitest.pg.config.ts globalSetup), and
 * each suite checks again before it opens a connection. With no DATABASE_URL at all the suites
 * skip on a laptop and refuse in CI, where they must run.
 */
export type PgEnv = Readonly<Record<string, string | undefined>>;

export type PgSuiteTarget = { runnable: boolean; refusal: string | null };

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

const REFUSING = 'Refusing to run the real-Postgres suites';

export function pgSuiteTarget(env: PgEnv): PgSuiteTarget {
  const url = env.DATABASE_URL?.trim() ?? '';
  if (!url) {
    return env.CI === 'true'
      ? {
          runnable: false,
          refusal: `${REFUSING}: CI=true but DATABASE_URL is not set. In CI these suites must run, not skip.`,
        }
      : { runnable: false, refusal: null };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { runnable: false, refusal: `${REFUSING}: DATABASE_URL is not a valid URL.` };
  }
  // Postgres clients honour host/hostaddr in the query string over the authority, so a loopback
  // authority proves nothing while either is present.
  const redirect = [...parsed.searchParams.keys()].some((k) =>
    ['host', 'hostaddr'].includes(k.toLowerCase())
  );
  if (redirect) {
    return {
      runnable: false,
      refusal: `${REFUSING}: DATABASE_URL sets host or hostaddr in its query string, which overrides the loopback host.`,
    };
  }
  const host = parsed.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    return {
      runnable: false,
      refusal: `${REFUSING}: DATABASE_URL host "${host || 'none'}" is not a loopback host. These suites write and delete shared rows, so they only run against a throwaway local database.`,
    };
  }
  if (env.CARSI_PG_DISPOSABLE !== '1') {
    return {
      runnable: false,
      refusal: `${REFUSING}: the database is not marked disposable. Set CARSI_PG_DISPOSABLE=1 only for a throwaway database nobody else writes to (CI's postgres service, or a local docker container).`,
    };
  }
  return { runnable: true, refusal: null };
}

/** Throws the refusal, if any. Used as the pg config's globalSetup, so it runs before collection. */
export function assertPgSuiteAllowed(env: PgEnv): void {
  const { refusal } = pgSuiteTarget(env);
  if (refusal) throw new Error(refusal);
}
