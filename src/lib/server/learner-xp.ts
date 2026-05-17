import { prisma } from '@/lib/prisma';
import {
  levelTitleFromLifetimeXp,
  lessonXpGrouped,
  courseXpGrouped,
  mergeXpMaps,
  XP_LESSON_COMPLETE,
  XP_COURSE_COMPLETE,
} from '@/lib/server/leaderboard-xp';

export type LearnerLevelPayload = {
  total_xp: number;
  current_level: number;
  level_title: string;
  current_streak: number;
  longest_streak: number;
  xp_to_next_level: number;
  total_cec_lifetime: number;
};

const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000] as const;

function xpToNextLevel(totalXp: number): number {
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (totalXp < threshold) {
      return threshold - totalXp;
    }
  }
  return 0;
}

/** Consecutive calendar days (Australia/Sydney) with at least one lesson completion. */
async function computeStreakDays(studentId: string): Promise<{ current: number; longest: number }> {
  const rows = await prisma.$queryRaw<{ day: Date }[]>`
    SELECT DISTINCT (lp.completed_at AT TIME ZONE 'Australia/Sydney')::date AS day
    FROM lms_lesson_progress lp
    WHERE lp.student_id = ${studentId}::uuid
      AND lp.completed = true
      AND lp.completed_at IS NOT NULL
    ORDER BY day DESC
  `;

  if (rows.length === 0) return { current: 0, longest: 0 };

  const dayMs = 24 * 60 * 60 * 1000;
  const days = rows.map((r) => {
    const d = r.day instanceof Date ? r.day : new Date(r.day);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });

  const todaySydney = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = todaySydney.split('-').map(Number);
  const todayStart = new Date(y, m - 1, d).getTime();

  let current = 0;
  let expected = todayStart;
  for (const day of days) {
    if (day === expected || (current === 0 && day === expected - dayMs)) {
      current += 1;
      expected = day - dayMs;
    } else if (current === 0 && day === todayStart - dayMs) {
      current = 1;
      expected = day - dayMs;
    } else {
      break;
    }
  }

  let longest = 0;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] - dayMs) {
      run += 1;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run, current);

  return { current, longest };
}

export async function getLearnerLevelPayload(studentId: string): Promise<LearnerLevelPayload> {
  const lesson = await lessonXpGrouped(null, null, null);
  const course = await courseXpGrouped(null, null, null);
  const merged = mergeXpMaps(lesson, course);
  const total_xp = merged.get(studentId) ?? 0;

  const { current_level, level_title } = levelTitleFromLifetimeXp(total_xp);
  const { current: current_streak, longest: longest_streak } = await computeStreakDays(studentId);

  const cecRows = await prisma.lmsEnrollment.findMany({
    where: { studentId, status: 'completed', completedAt: { not: null } },
    include: { course: { select: { cecHours: true } } },
  });
  const total_cec_lifetime = Math.round(
    cecRows.reduce((s, e) => s + Number(e.course.cecHours ?? 0), 0) * 100,
  ) / 100;

  return {
    total_xp,
    current_level,
    level_title,
    current_streak,
    longest_streak,
    xp_to_next_level: xpToNextLevel(total_xp) || XP_LESSON_COMPLETE,
    total_cec_lifetime,
  };
}

export { XP_LESSON_COMPLETE, XP_COURSE_COMPLETE };
