import { normalizeEnrollmentStatus } from '@/lib/server/learner-dashboard-data';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { prisma } from '@/lib/prisma';
import type {
  RenewalCourseSuggestion,
  RenewalSummaryPayload,
  RenewalTrackingMode,
} from '@/types/renewal';
import { RENEWAL_CEC_REQUIRED } from '@/types/renewal';

export type { RenewalCourseSuggestion, RenewalSummaryPayload, RenewalTrackingMode };
export { RENEWAL_CEC_REQUIRED };

const CYCLE_YEARS = 3;
const URGENCY_DAYS = 90;
const DEFAULT_CEC_WHEN_HOURS_MISSING = 1;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const n = Number(String((v as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function endOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function cycleBoundsFromExpiry(expiry: Date): { start: Date; end: Date } {
  const end = endOfUtcDay(expiry);
  const start = startOfUtcDay(new Date(end));
  start.setUTCFullYear(start.getUTCFullYear() - CYCLE_YEARS);
  return { start, end };
}

function isPublishedRow(c: { status: string; isPublished: boolean | null }): boolean {
  if (c.isPublished === true) return true;
  return String(c.status ?? '')
    .toLowerCase()
    .trim() === 'published';
}

function completionTimestamp(args: {
  certificateIssuedAt: Date | null;
  completedAt: Date | null;
  lessonIds: string[];
  progress: Map<
    string,
    { completed: boolean; completedAt: Date | null; lastAccessedAt: Date }
  >;
}): Date | null {
  if (args.certificateIssuedAt) return args.certificateIssuedAt;
  if (args.completedAt) return args.completedAt;
  let max: Date | null = null;
  for (const id of args.lessonIds) {
    const p = args.progress.get(id);
    if (!p?.completed) continue;
    const cand = p.completedAt ?? p.lastAccessedAt;
    if (cand && (!max || cand > max)) max = cand;
  }
  return max;
}

function resolveCecHoursFromCourse(course: {
  cecHours: unknown;
  meta: unknown;
  iicrcDiscipline: string | null;
}): { hours: number; estimated: boolean } {
  const direct = toNum(course.cecHours);
  if (direct !== null && direct > 0) {
    return { hours: direct, estimated: false };
  }
  if (direct === 0) {
    return { hours: 0, estimated: false };
  }
  if (course.meta && typeof course.meta === 'object' && course.meta !== null) {
    const m = course.meta as Record<string, unknown>;
    for (const key of ['cec_hours', 'cecHours', 'cec', 'CEC']) {
      const n = toNum(m[key]);
      if (n !== null && n > 0) return { hours: n, estimated: false };
    }
  }
  const disc = course.iicrcDiscipline?.trim();
  if (disc) {
    return { hours: DEFAULT_CEC_WHEN_HOURS_MISSING, estimated: true };
  }
  return { hours: 0, estimated: false };
}

function isCompleteEnrollment(args: {
  status: string;
  allLessonsComplete: boolean;
}): boolean {
  return (
    args.allLessonsComplete || normalizeEnrollmentStatus(args.status) === 'completed'
  );
}

export async function getRenewalSummaryForStudent(
  userId: string
): Promise<RenewalSummaryPayload | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const user = await prisma.lmsUser.findUnique({
      where: { id: userId },
      select: {
        iicrcMemberNumber: true,
        iicrcExpiryDate: true,
      },
    });

    const rows = await prisma.lmsEnrollment.findMany({
      where: { studentId: userId },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            shortDescription: true,
            thumbnailUrl: true,
            status: true,
            isPublished: true,
            cecHours: true,
            meta: true,
            iicrcDiscipline: true,
            modules: {
              select: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const allLessonIds = rows.flatMap((e) =>
      e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
    );

    const progressRows =
      allLessonIds.length === 0
        ? []
        : await prisma.lmsLessonProgress.findMany({
            where: { studentId: userId, lessonId: { in: allLessonIds } },
            select: {
              lessonId: true,
              completed: true,
              completedAt: true,
              lastAccessedAt: true,
            },
          });

    const progressByLesson = new Map(
      progressRows.map((p) => [
        p.lessonId,
        {
          completed: p.completed,
          completedAt: p.completedAt,
          lastAccessedAt: p.lastAccessedAt,
        },
      ])
    );

    const byDiscLifetime: Record<string, number> = {};
    const byDiscCycle: Record<string, number> = {};
    let lifetimeCec = 0;

    const expiry = user?.iicrcExpiryDate ?? null;
    const hasExpiry = Boolean(expiry);
    const cycle = hasExpiry ? cycleBoundsFromExpiry(expiry as Date) : null;

    const enrolledSlugs = new Set(rows.map((r) => r.course.slug));
    const completedSlugs = new Set<string>();
    let someCecsEstimated = false;

    for (const e of rows) {
      const lessonIds = e.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      let completedLessonCount = 0;
      for (const id of lessonIds) {
        if (progressByLesson.get(id)?.completed === true) completedLessonCount += 1;
      }
      const totalLessons = lessonIds.length;
      const allLessonsComplete = totalLessons > 0 && completedLessonCount >= totalLessons;

      if (!isCompleteEnrollment({ status: e.status, allLessonsComplete })) {
        continue;
      }

      completedSlugs.add(e.course.slug);

      const { hours, estimated } = resolveCecHoursFromCourse(e.course);
      if (estimated) someCecsEstimated = true;
      const discRaw = e.course.iicrcDiscipline?.trim() || 'General';
      const disc = discRaw.length > 0 ? discRaw : 'General';

      lifetimeCec += hours;
      byDiscLifetime[disc] = (byDiscLifetime[disc] ?? 0) + hours;

      const ts = completionTimestamp({
        certificateIssuedAt: e.certificateIssuedAt,
        completedAt: e.completedAt,
        lessonIds,
        progress: progressByLesson,
      });

      if (cycle && ts) {
        if (ts >= cycle.start && ts <= cycle.end) {
          byDiscCycle[disc] = (byDiscCycle[disc] ?? 0) + hours;
        }
      }
    }

    let cecInCycle: number;
    let trackingMode: RenewalTrackingMode;
    if (hasExpiry && cycle) {
      cecInCycle = Object.values(byDiscCycle).reduce((a, b) => a + b, 0);
      trackingMode = 'cycle';
    } else {
      cecInCycle = lifetimeCec;
      trackingMode = 'lifetime_no_expiry';
      Object.assign(byDiscCycle, byDiscLifetime);
    }

    const now = new Date();
    let daysUntil: number | null = null;
    let urgent = false;
    if (expiry) {
      const diffMs = startOfUtcDay(expiry as Date).getTime() - startOfUtcDay(now).getTime();
      daysUntil = Math.ceil(diffMs / 86400000);
      urgent = daysUntil <= URGENCY_DAYS;
    }

    const suggested = await pickSuggestedCourses({
      enrolledSlugs,
      completedSlugs,
      byDisciplineEarned: byDiscCycle,
    });

    const cycleStartIso = cycle ? cycle.start.toISOString() : null;
    const cycleEndIso = cycle ? cycle.end.toISOString() : null;

    return {
      tracking_mode: trackingMode,
      has_renewal_expiry: hasExpiry,
      renewal_expiry_date: expiry ? (expiry as Date).toISOString().slice(0, 10) : null,
      cycle_start: cycleStartIso,
      cycle_end: cycleEndIso,
      cec_required: RENEWAL_CEC_REQUIRED,
      cec_earned_in_cycle: Math.round(cecInCycle * 100) / 100,
      cec_earned_lifetime: Math.round(lifetimeCec * 100) / 100,
      by_discipline: byDiscCycle,
      by_discipline_lifetime: byDiscLifetime,
      days_until_expiry: daysUntil,
      renewal_urgent: urgent,
      iicrc_member_number: user?.iicrcMemberNumber ?? null,
      some_cecs_estimated: someCecsEstimated,
      suggested_courses: suggested,
    };
  } catch (err) {
    console.error('[renewal-summary]', err);
    return null;
  }
}

async function pickSuggestedCourses(args: {
  enrolledSlugs: Set<string>;
  completedSlugs: Set<string>;
  byDisciplineEarned: Record<string, number>;
}): Promise<RenewalCourseSuggestion[]> {
  const exclude = new Set([...args.enrolledSlugs, ...args.completedSlugs]);
  const slugFilter = exclude.size > 0 ? { slug: { notIn: Array.from(exclude) } } : {};

  const candidates = await prisma.lmsCourse.findMany({
    where: {
      ...slugFilter,
      OR: [{ isPublished: true }, { status: 'published' }],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      shortDescription: true,
      thumbnailUrl: true,
      cecHours: true,
      meta: true,
      iicrcDiscipline: true,
      status: true,
      isPublished: true,
    },
    take: 80,
    orderBy: { updatedAt: 'desc' },
  });

  const published = candidates.filter(isPublishedRow);
  if (published.length === 0) return [];

  const scored = published.map((c) => {
    const disc = c.iicrcDiscipline?.trim() || 'General';
    const earned = args.byDisciplineEarned[disc] ?? 0;
    const { hours: rh } = resolveCecHoursFromCourse(c);
    const hours = rh > 0 ? rh : 0.25;
    const gapWeight = 1 / (1 + earned);
    const score = gapWeight * (hours + 0.5) * (disc === 'General' ? 0.85 : 1);
    const reason =
      earned < 0.5
        ? `Adds ${disc} CEC hours — priority gap for your renewal mix.`
        : `Strengthen ${disc} — builds on ${earned.toFixed(1)} CEC from your current period.`;
    return { c, score, reason, disc };
  });

  scored.sort((a, b) => b.score - a.score);

  const out: RenewalCourseSuggestion[] = [];
  const used = new Set<string>();
  for (const s of scored) {
    if (out.length >= 3) break;
    const slug = s.c.slug;
    if (used.has(slug)) continue;
    used.add(slug);
    out.push({
      id: s.c.id,
      title: s.c.title,
      slug: s.c.slug,
      description: s.c.shortDescription ?? s.c.description,
      iicrc_discipline: s.c.iicrcDiscipline,
      cec_hours: (() => {
        const r = resolveCecHoursFromCourse(s.c);
        return r.hours > 0 ? r.hours : null;
      })(),
      thumbnail_url: normalizePublicAssetUrl(s.c.thumbnailUrl),
      reason: s.reason,
    });
  }

  if (out.length < 3) {
    const filler = published.filter((c) => !used.has(c.slug));
    for (const c of filler) {
      if (out.length >= 3) break;
      used.add(c.slug);
      out.push({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.shortDescription ?? c.description,
        iicrc_discipline: c.iicrcDiscipline,
        cec_hours: (() => {
          const r = resolveCecHoursFromCourse(c);
          return r.hours > 0 ? r.hours : null;
        })(),
        thumbnail_url: normalizePublicAssetUrl(c.thumbnailUrl),
        reason: 'Popular choice for IICRC continuing education.',
      });
    }
  }

  return out.slice(0, 3);
}

export async function getNextCourseRecommendationsForStudent(
  userId: string
): Promise<RenewalCourseSuggestion[]> {
  const full = await getRenewalSummaryForStudent(userId);
  return full?.suggested_courses ?? [];
}

