import { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import {
  SQL_XP_COURSE_SOURCE,
  SQL_XP_ELIGIBLE,
  SQL_XP_LESSON_SOURCE,
} from '@/lib/server/xp-eligibility';

/** XP aligned with internal CARSI gamification design (lesson / course completion). */
export const XP_LESSON_COMPLETE = 10;
export const XP_COURSE_COMPLETE = 100;

/** Per-student XP in GROUP BY — COUNT * literal avoids PostgreSQL `sum(unknown)` (42725). */
const SQL_LESSON_XP_TOTAL = Prisma.raw(`(COUNT(*)::bigint * ${XP_LESSON_COMPLETE}::bigint)`);
const SQL_COURSE_XP_TOTAL = Prisma.raw(`(COUNT(*)::bigint * ${XP_COURSE_COMPLETE}::bigint)`);

/**
 * Engagement labels only (GP-775). XP counts activity, not competence, so a level must never read
 * as a trade, occupational or qualification title.
 */
const LEVEL_TITLES = [
  'Getting started',
  'Building momentum',
  'Steady learner',
  'Consistent learner',
  'Dedicated learner',
  'Committed learner',
] as const;

const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000] as const;

export function levelTitleFromLifetimeXp(totalXp: number): {
  current_level: number;
  level_title: string;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  level = Math.min(Math.max(level, 1), 6);
  return {
    current_level: level,
    level_title: LEVEL_TITLES[level - 1] ?? LEVEL_TITLES[0],
  };
}

/** Short non-identifying label derived from account id (not reversible to PII). */
export function anonymousLeaderboardLabel(userId: string): string {
  const compact = userId.replace(/-/g, '');
  const suffix = compact.slice(-4).toUpperCase();
  return `Professional · ${suffix}`;
}

const DISPLAY_NAME_MAX = 48;

/**
 * The rule for a stored (legacy) leaderboard label, applied only when it is saved
 * (PATCH /api/lms/auth/me). The board never reads stored labels; it shows only the anonymous
 * label (founder ruling 22/11/2026). NFKC folds look-alike characters first, so a full-width or
 * small at sign (U+FF20, U+FE6B) is caught by the same '@' check as the ASCII one (GP-775 r1).
 */
export function sanitizeLeaderboardDisplayName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = raw
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]|\p{Cf}/gu, '')
    .trim();
  if (s.length === 0) return null;
  if (s.includes('@')) return null;
  if (s.length > DISPLAY_NAME_MAX) s = s.slice(0, DISPLAY_NAME_MAX).trim();
  return s.length > 0 ? s : null;
}

type MonthBounds = { start: Date; end: Date };

async function queryMonthBoundsSydney(): Promise<MonthBounds | null> {
  const rows = await prisma.$queryRaw<MonthBounds[]>`
    SELECT
      (date_trunc('month', (current_timestamp AT TIME ZONE 'Australia/Sydney')) AT TIME ZONE 'Australia/Sydney') AS start,
      ((date_trunc('month', (current_timestamp AT TIME ZONE 'Australia/Sydney')) + interval '1 month') AT TIME ZONE 'Australia/Sydney') AS end
  `;
  const row = rows[0];
  if (!row?.start || !row?.end) return null;
  return { start: row.start, end: row.end };
}

type IdXpRow = { student_id: string; xp: bigint | number };

function addXpRows(map: Map<string, number>, rows: IdXpRow[]): Map<string, number> {
  for (const r of rows) {
    const n = typeof r.xp === 'bigint' ? Number(r.xp) : r.xp;
    map.set(r.student_id, (map.get(r.student_id) ?? 0) + n);
  }
  return map;
}

/**
 * WHERE conditions shared by the lesson and course XP queries: the eligibility rule always, then
 * the optional period (on `dateColumn`) and course filter. One query per kind, so no branch can
 * leave the rule out.
 */
function xpConditions(
  dateColumn: Prisma.Sql,
  start: Date | null,
  end: Date | null,
  courseSlugs: readonly string[] | null
): Prisma.Sql {
  const parts: Prisma.Sql[] = [SQL_XP_ELIGIBLE];
  if (start != null && end != null) {
    parts.push(Prisma.sql`${dateColumn} >= ${start} AND ${dateColumn} < ${end}`);
  }
  if (courseSlugs) parts.push(Prisma.sql`c.slug IN (${Prisma.join(courseSlugs)})`);
  return Prisma.join(parts, ' AND ');
}

export async function lessonXpGrouped(
  start: Date | null,
  end: Date | null,
  courseSlugs: readonly string[] | null
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (courseSlugs && courseSlugs.length === 0) return map;

  const rows = await prisma.$queryRaw<IdXpRow[]>`
    SELECT lp.student_id::text AS student_id, ${SQL_LESSON_XP_TOTAL} AS xp
    FROM ${SQL_XP_LESSON_SOURCE}
    WHERE lp.completed = true
      AND ${xpConditions(Prisma.raw('lp.completed_at'), start, end, courseSlugs)}
    GROUP BY lp.student_id
  `;
  return addXpRows(map, rows);
}

export async function courseXpGrouped(
  start: Date | null,
  end: Date | null,
  courseSlugs: readonly string[] | null
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (courseSlugs && courseSlugs.length === 0) return map;

  const rows = await prisma.$queryRaw<IdXpRow[]>`
    SELECT e.student_id::text AS student_id, ${SQL_COURSE_XP_TOTAL} AS xp
    FROM ${SQL_XP_COURSE_SOURCE}
    WHERE e.completed_at IS NOT NULL
      AND ${xpConditions(Prisma.raw('e.completed_at'), start, end, courseSlugs)}
    GROUP BY e.student_id
  `;
  return addXpRows(map, rows);
}

export function mergeXpMaps(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const out = new Map(a);
  for (const [k, v] of b) {
    out.set(k, (out.get(k) ?? 0) + v);
  }
  return out;
}

export type LeaderboardPeriodRow = {
  rank: number;
  display_name: string;
  total_xp: number;
  current_level: number;
  level_title: string;
};

export async function getMonthlyLeaderboard(params: {
  /** Restrict to these courses (a CARSI designation's pathway), or null for all courses. */
  courseSlugs: readonly string[] | null;
  limit: number;
}): Promise<{
  period_label: string;
  period_timezone: string;
  start: Date;
  end: Date;
  items: LeaderboardPeriodRow[];
}> {
  const bounds = await queryMonthBoundsSydney();
  if (!bounds) {
    throw new Error('Could not resolve leaderboard month bounds from database');
  }

  const { start, end } = bounds;
  const period_label = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    month: 'long',
    year: 'numeric',
  }).format(start);

  const lesson = await lessonXpGrouped(start, end, params.courseSlugs);
  const course = await courseXpGrouped(start, end, params.courseSlugs);
  const periodTotals = mergeXpMaps(lesson, course);

  const withXp = [...periodTotals.entries()].filter(([, xp]) => xp > 0);
  const empty = {
    period_label,
    period_timezone: 'Australia/Sydney',
    start,
    end,
    items: [] as LeaderboardPeriodRow[],
  };
  if (withXp.length === 0) return empty;

  // Consent (GP-775): only learners who opted in are ranked. The column defaults to false, so a
  // learner who never chose is not on the board, and opting out removes them on the next read.
  // Filter before ranking and the limit, so excluded learners take no slot and leave no rank gap.
  // Founder ruling 22/11/2026, "Anonymous label only": an entry shows only the anonymous label, so
  // no name, chosen label or email is even read here.
  const users = await prisma.lmsUser.findMany({
    where: { id: { in: withXp.map(([id]) => id) }, leaderboardShowDisplayName: true },
    select: { id: true, leaderboardShowDisplayName: true },
  });
  const userMap = new Map(
    users.filter((u) => u.leaderboardShowDisplayName === true).map((u) => [u.id, u])
  );

  const sorted = withXp
    .filter(([id]) => userMap.has(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, params.limit);
  if (sorted.length === 0) return empty;

  const lifetimeLessonAll = await lessonXpGrouped(null, null, null);
  const lifetimeCourseAll = await courseXpGrouped(null, null, null);
  const lifetimeAllCourses = mergeXpMaps(lifetimeLessonAll, lifetimeCourseAll);

  const items: LeaderboardPeriodRow[] = sorted.map(([studentId, periodXp], index) => {
    const lifetime = lifetimeAllCourses.get(studentId) ?? periodXp;
    const { current_level, level_title } = levelTitleFromLifetimeXp(lifetime);
    return {
      rank: index + 1,
      display_name: anonymousLeaderboardLabel(studentId),
      total_xp: periodXp,
      current_level,
      level_title,
    };
  });

  return {
    period_label,
    period_timezone: 'Australia/Sydney',
    start,
    end,
    items,
  };
}

/** Sydney month label without hitting the DB (fallback when DATABASE_URL unset). */
export function leaderboardPeriodLabelNow(): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
