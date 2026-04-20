import { prisma } from '@/lib/prisma';

/** XP aligned with internal CARSI gamification design (lesson / course completion). */
export const XP_LESSON_COMPLETE = 10;
export const XP_COURSE_COMPLETE = 100;

const LEVEL_TITLES = [
  'Apprentice',
  'Trainee',
  'Technician',
  'Senior Technician',
  'Specialist',
  'Master Restorer',
] as const;

const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000] as const;

export function levelTitleFromLifetimeXp(totalXp: number): { current_level: number; level_title: string } {
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

export function sanitizeLeaderboardDisplayName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (s.length === 0) return null;
  if (s.includes('@')) return null;
  if (s.length > DISPLAY_NAME_MAX) s = s.slice(0, DISPLAY_NAME_MAX).trim();
  return s.length > 0 ? s : null;
}

export function publicLeaderboardDisplayName(
  userId: string,
  showName: boolean,
  storedName: string | null | undefined
): string {
  if (showName) {
    const cleaned = sanitizeLeaderboardDisplayName(storedName ?? null);
    if (cleaned) return cleaned;
  }
  return anonymousLeaderboardLabel(userId);
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

async function lessonXpGrouped(
  start: Date | null,
  end: Date | null,
  discipline: string | null
): Promise<Map<string, number>> {
  const hasPeriod = start != null && end != null;
  const map = new Map<string, number>();

  const addRows = (rows: IdXpRow[]) => {
    for (const r of rows) {
      const id = r.student_id;
      const n = typeof r.xp === 'bigint' ? Number(r.xp) : r.xp;
      map.set(id, (map.get(id) ?? 0) + n);
    }
  };

  if (hasPeriod && discipline) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT lp.student_id::text AS student_id, SUM(${XP_LESSON_COMPLETE})::bigint AS xp
      FROM lms_lesson_progress lp
      INNER JOIN lms_lessons l ON l.id = lp.lesson_id
      INNER JOIN lms_modules m ON m.id = l.module_id
      INNER JOIN lms_courses c ON c.id = m.course_id
      WHERE lp.completed = true
        AND lp.completed_at >= ${start}
        AND lp.completed_at < ${end}
        AND c.iicrc_discipline = ${discipline}
      GROUP BY lp.student_id
    `;
    addRows(rows);
  } else if (hasPeriod) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT lp.student_id::text AS student_id, SUM(${XP_LESSON_COMPLETE})::bigint AS xp
      FROM lms_lesson_progress lp
      INNER JOIN lms_lessons l ON l.id = lp.lesson_id
      INNER JOIN lms_modules m ON m.id = l.module_id
      INNER JOIN lms_courses c ON c.id = m.course_id
      WHERE lp.completed = true
        AND lp.completed_at >= ${start}
        AND lp.completed_at < ${end}
      GROUP BY lp.student_id
    `;
    addRows(rows);
  } else if (discipline) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT lp.student_id::text AS student_id, SUM(${XP_LESSON_COMPLETE})::bigint AS xp
      FROM lms_lesson_progress lp
      INNER JOIN lms_lessons l ON l.id = lp.lesson_id
      INNER JOIN lms_modules m ON m.id = l.module_id
      INNER JOIN lms_courses c ON c.id = m.course_id
      WHERE lp.completed = true
        AND c.iicrc_discipline = ${discipline}
      GROUP BY lp.student_id
    `;
    addRows(rows);
  } else {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT lp.student_id::text AS student_id, SUM(${XP_LESSON_COMPLETE})::bigint AS xp
      FROM lms_lesson_progress lp
      INNER JOIN lms_lessons l ON l.id = lp.lesson_id
      INNER JOIN lms_modules m ON m.id = l.module_id
      INNER JOIN lms_courses c ON c.id = m.course_id
      WHERE lp.completed = true
      GROUP BY lp.student_id
    `;
    addRows(rows);
  }

  return map;
}

async function courseXpGrouped(
  start: Date | null,
  end: Date | null,
  discipline: string | null
): Promise<Map<string, number>> {
  const hasPeriod = start != null && end != null;
  const map = new Map<string, number>();

  const addRows = (rows: IdXpRow[]) => {
    for (const r of rows) {
      const id = r.student_id;
      const n = typeof r.xp === 'bigint' ? Number(r.xp) : r.xp;
      map.set(id, (map.get(id) ?? 0) + n);
    }
  };

  if (hasPeriod && discipline) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT e.student_id::text AS student_id, SUM(${XP_COURSE_COMPLETE})::bigint AS xp
      FROM lms_enrollments e
      INNER JOIN lms_courses c ON c.id = e.course_id
      WHERE e.completed_at IS NOT NULL
        AND e.completed_at >= ${start}
        AND e.completed_at < ${end}
        AND c.iicrc_discipline = ${discipline}
      GROUP BY e.student_id
    `;
    addRows(rows);
  } else if (hasPeriod) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT e.student_id::text AS student_id, SUM(${XP_COURSE_COMPLETE})::bigint AS xp
      FROM lms_enrollments e
      INNER JOIN lms_courses c ON c.id = e.course_id
      WHERE e.completed_at IS NOT NULL
        AND e.completed_at >= ${start}
        AND e.completed_at < ${end}
      GROUP BY e.student_id
    `;
    addRows(rows);
  } else if (discipline) {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT e.student_id::text AS student_id, SUM(${XP_COURSE_COMPLETE})::bigint AS xp
      FROM lms_enrollments e
      INNER JOIN lms_courses c ON c.id = e.course_id
      WHERE e.completed_at IS NOT NULL
        AND c.iicrc_discipline = ${discipline}
      GROUP BY e.student_id
    `;
    addRows(rows);
  } else {
    const rows = await prisma.$queryRaw<IdXpRow[]>`
      SELECT e.student_id::text AS student_id, SUM(${XP_COURSE_COMPLETE})::bigint AS xp
      FROM lms_enrollments e
      INNER JOIN lms_courses c ON c.id = e.course_id
      WHERE e.completed_at IS NOT NULL
      GROUP BY e.student_id
    `;
    addRows(rows);
  }

  return map;
}

function mergeXpMaps(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
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
  discipline: string | null;
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

  const lesson = await lessonXpGrouped(start, end, params.discipline);
  const course = await courseXpGrouped(start, end, params.discipline);
  const periodTotals = mergeXpMaps(lesson, course);

  const sorted = [...periodTotals.entries()]
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, params.limit);

  const ids = sorted.map(([id]) => id);
  if (ids.length === 0) {
    return {
      period_label,
      period_timezone: 'Australia/Sydney',
      start,
      end,
      items: [],
    };
  }

  const users = await prisma.lmsUser.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      leaderboardShowDisplayName: true,
      leaderboardDisplayName: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const lifetimeLessonAll = await lessonXpGrouped(null, null, null);
  const lifetimeCourseAll = await courseXpGrouped(null, null, null);
  const lifetimeAllDisciplines = mergeXpMaps(lifetimeLessonAll, lifetimeCourseAll);

  const items: LeaderboardPeriodRow[] = sorted.map(([studentId, periodXp], index) => {
    const u = userMap.get(studentId);
    const displayName = publicLeaderboardDisplayName(
      studentId,
      u?.leaderboardShowDisplayName ?? false,
      u?.leaderboardDisplayName
    );
    const lifetime = lifetimeAllDisciplines.get(studentId) ?? periodXp;
    const { current_level, level_title } = levelTitleFromLifetimeXp(lifetime);
    return {
      rank: index + 1,
      display_name: displayName,
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
