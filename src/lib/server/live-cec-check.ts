import { planCecRemediation } from '@/lib/seed/cec-remediation';

/**
 * Live CEC compliance check — the shared core (GP-519).
 *
 * WHY THIS EXISTS AS A LIBRARY rather than living in the script: the guard has to run from
 * INSIDE the deployed app. GitHub's runners cannot reach the production database — the
 * DigitalOcean trusted-source list is two IPs plus `monkfish-app` — so a runner-side check
 * returns `P1008 SocketTimeout` and asserts nothing about production. Running it from an
 * authenticated cron route inside the app puts it on the right side of that allowlist.
 *
 * Both callers — `scripts/check-live-cec.ts` and `app/api/cron/live-cec-check/route.ts` —
 * call THIS function. Two implementations of the same rule would drift, and the route's own
 * tests would keep passing while the CLI told a different story.
 *
 * The check is READ-ONLY. It selects two columns and writes nothing.
 */

export type LiveCecDriftItem = {
  slug: string;
  /** What the database currently claims. `null` means no value stored. */
  current: number | null;
  /** What the approvals registry backs. `0` means no IICRC approval on record. */
  target: number;
};

export type LiveCecCheckResult = {
  scanned: number;
  /** Courses publishing CEC hours with NO approval — the licence exposure. */
  unapproved: LiveCecDriftItem[];
  /** Courses approved for CECs but showing the wrong number — under- or over-crediting. */
  wrongHours: LiveCecDriftItem[];
};

/**
 * The narrow slice of Prisma this needs. Declared structurally so a test can pass a fake
 * without a database, and so nothing here can accidentally reach a write method.
 */
export type LiveCecCourseReader = {
  lmsCourse: {
    findMany(args: { select: { slug: true; cecHours: true } }): Promise<
      Array<{ slug: string; cecHours: unknown }>
    >;
  };
};

/** True when the run found nothing to report. */
export function isClean(result: LiveCecCheckResult): boolean {
  return result.unapproved.length === 0 && result.wrongHours.length === 0;
}

/**
 * Read every course's stored CEC hours and compare against the approvals registry SSOT.
 *
 * Throws if the read fails. It does NOT catch and return an empty result: "I could not read
 * the database" and "the database is clean" produce identical output if you let them, and the
 * caller would render the first as the second. Callers must treat a throw as a failure to
 * assert, never as a pass.
 */
export async function runLiveCecCheck(db: LiveCecCourseReader): Promise<LiveCecCheckResult> {
  const courses = await db.lmsCourse.findMany({ select: { slug: true, cecHours: true } });

  const drift = planCecRemediation(
    courses.map((c) => ({
      slug: c.slug,
      current: c.cecHours == null ? null : Number(c.cecHours),
    })),
  );

  return {
    scanned: courses.length,
    unapproved: drift.filter((d) => d.target === 0),
    wrongHours: drift.filter((d) => d.target > 0),
  };
}

/** Human-readable lines, shared by the CLI and the HTTP body so both say the same thing. */
export function describeDrift(result: LiveCecCheckResult): string[] {
  const lines: string[] = [];
  for (const d of result.unapproved) {
    lines.push(`${d.slug}: shows ${d.current} CEC — no IICRC approval in the registry (should be 0)`);
  }
  for (const d of result.wrongHours) {
    lines.push(`${d.slug}: shows ${d.current} CEC — registry approves ${d.target}`);
  }
  return lines;
}
