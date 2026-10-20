import { normalizeEnrollmentStatus } from '@/lib/server/learner-dashboard-data';
import { isRevokedStatus } from '@/lib/server/enrollment-access';
import { normalizePublicAssetUrl } from '@/lib/remote-image';
import { getApprovedCecHours, getCurrentCecApproval } from '@/lib/seed/cec-approvals';
import { prisma } from '@/lib/prisma';
import type {
  RenewalCourseSuggestion,
  RenewalSummaryPayload,
  RenewalTrackingMode,
} from '@/types/renewal';
import { RENEWAL_CEC_REQUIRED, RENEWAL_CYCLE_YEARS } from '@/types/renewal';

export type { RenewalCourseSuggestion, RenewalSummaryPayload, RenewalTrackingMode };
export { RENEWAL_CEC_REQUIRED };

const CYCLE_YEARS = RENEWAL_CYCLE_YEARS;
const URGENCY_DAYS = 90;

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
  return (
    String(c.status ?? '')
      .toLowerCase()
      .trim() === 'published'
  );
}

/**
 * CEC hours a completed course credits toward a learner's IICRC renewal.
 *
 * REGISTRY-ONLY, FAIL-CLOSED (licence-critical, GP-498). Renewal tracking derives CEC solely
 * from the founder-confirmed approvals registry (by slug). The stored `cecHours` column, `meta`
 * CEC keys, and a bare `iicrcDiscipline` (which previously defaulted to 1 "estimated" hour) are
 * WordPress-import pollution — never IICRC approval — and crediting them counted CEC toward a
 * learner's renewal for courses the IICRC never approved. No registry approval → 0 CEC, never a
 * derived or estimated value. Exported for the licence-gate regression test.
 */
export function resolveCecHoursFromCourse(course: {
  slug: string;
  cecHours?: unknown;
  meta?: unknown;
  iicrcDiscipline?: string | null;
}): { hours: number; estimated: boolean } {
  const approved = getApprovedCecHours(course.slug);
  return { hours: approved != null && approved > 0 ? approved : 0, estimated: false };
}

/**
 * Learner-visible copy for a suggested renewal course.
 *
 * REGISTRY-ONLY, FAIL-CLOSED (licence-critical, GP-498). A suggestion may only claim a course
 * "Adds CEC hours" / builds CEC when that course has registry-approved CEC hours. A bare
 * `iicrcDiscipline` is NOT approval — asserting an unapproved course earns IICRC CEC toward
 * renewal is a licence leak (the CEC-hours badge is separately gated to null). With the registry
 * empty every suggestion falls to the neutral, non-CEC-claiming copy.
 */
export function suggestionReason(args: {
  disc: string;
  earnedCec: number;
  approvedHours: number;
}): string {
  if (args.approvedHours > 0) {
    return args.earnedCec < 0.5
      ? `Adds ${args.disc} CEC hours — priority gap for your renewal mix.`
      : `Strengthen ${args.disc} — builds on ${args.earnedCec.toFixed(1)} CEC from your current period.`;
  }
  return `Relevant ${args.disc} training for your professional development.`;
}

export function isCompleteEnrollment(args: {
  status: string;
  allLessonsComplete: boolean;
}): boolean {
  // A revoked/refunded course credits NO CEC toward IICRC renewal (WS3 / P0-C,
  // AC-8). Revocation clears status + completedAt but leaves lesson-progress rows,
  // so `allLessonsComplete` alone would otherwise keep counting a refunded course.
  if (isRevokedStatus(args.status)) return false;
  return args.allLessonsComplete || normalizeEnrollmentStatus(args.status) === 'completed';
}

/**
 * Registry CEC hours for a completion, credited only when the approval was IN FORCE at that
 * moment: status approved, positive hours, approved on or before the completion, and the
 * completion before the approval lapsed (00:00 UTC on `expiresAt`). A course completed after
 * its approval expired, or before it was granted, earns no CEC. Fail-closed: an unreadable
 * `approvedAt` or `expiresAt` credits nothing.
 */
export function cecHoursInForceAt(slug: string, completedAt: Date): number {
  const entry = getCurrentCecApproval(slug, completedAt);
  if (!entry) return 0;
  const approvedAt = entry.approvedAt ? Date.parse(entry.approvedAt) : Number.NaN;
  if (!Number.isFinite(approvedAt) || completedAt.getTime() < approvedAt) return 0;
  return entry.approvedHours ?? 0;
}

/** One completed course, as the renewal summary counted it. */
export type CourseCompletionRecord = {
  slug: string;
  /**
   * The enrolment's own completion time (`LmsEnrollment.completedAt`, set once and preserved on
   * later syncs). Deliberately NOT the certificate date, which is re-stamped every time a
   * certificate is generated, and NOT a lesson's last-access time, which moves on a revisit:
   * either would pull an old course (and its CEC hours) into this year.
   */
  completedAt: Date | null;
  /** Whether a certificate exists. Its timestamp is a re-stampable mint time, so it never dates the course. */
  certificateIssuedAt: Date | null;
};

/** The "your year with CARSI" recap in the renewal reminder (V7). */
export type RenewalYearRecap = {
  coursesCompleted: number;
  certificatesIssued: number;
  /** CEC hours from the approvals registry only. 0 means no CEC line is shown. */
  approvedCecHours: number;
  suggestedCourses: RenewalCourseSuggestion[];
};

/**
 * Pure: count what the learner completed since `since`. CEC hours come ONLY from the approvals
 * registry (`resolveCecHoursFromCourse`), never from the stored course column (GP-498). A
 * completion with no known date is not counted, because it cannot be placed inside the year.
 * Certificates are counted for courses completed in the year, so re-generating an old
 * certificate (which re-stamps its date) does not add one.
 */
export function buildYearRecap(args: {
  completions: CourseCompletionRecord[];
  suggestedCourses: RenewalCourseSuggestion[];
  since: Date;
}): RenewalYearRecap {
  let coursesCompleted = 0;
  let certificatesIssued = 0;
  let approvedCecHours = 0;
  for (const c of args.completions) {
    if (!c.completedAt || c.completedAt < args.since) continue;
    coursesCompleted += 1;
    if (c.certificateIssuedAt) certificatesIssued += 1;
    approvedCecHours += cecHoursInForceAt(c.slug, c.completedAt);
  }
  return {
    coursesCompleted,
    certificatesIssued,
    approvedCecHours: Math.round(approvedCecHours * 100) / 100,
    suggestedCourses: args.suggestedCourses,
  };
}

export async function getRenewalSummaryForStudent(
  userId: string
): Promise<RenewalSummaryPayload | null> {
  return (await loadRenewalSummary(userId))?.summary ?? null;
}

/**
 * The learner's last 12 months for the renewal reminder, or null when it cannot be read (the
 * reminder then goes without a recap; it never blocks the renewal notice).
 */
export async function getRenewalYearRecapForStudent(
  userId: string,
  now: Date = new Date()
): Promise<RenewalYearRecap | null> {
  const loaded = await loadRenewalSummary(userId);
  if (!loaded) return null;
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  return buildYearRecap({
    completions: loaded.completions,
    suggestedCourses: loaded.summary.suggested_courses,
    since,
  });
}

async function loadRenewalSummary(
  userId: string
): Promise<{ summary: RenewalSummaryPayload; completions: CourseCompletionRecord[] } | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const user = await prisma.lmsUser.findUnique({
      where: { id: userId },
      select: {
        iicrcMemberNumber: true,
        iicrcExpiryDate: true,
        onboarding: true,
      },
    });

    const preferDisciplines = extractOnboardingDisciplines(user?.onboarding);

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
    const completions: CourseCompletionRecord[] = [];

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

      // Credit only while the approval was in force at completion. Dated by the enrolment's own
      // completion time (see CourseCompletionRecord); no known date credits nothing.
      const hours = e.completedAt ? cecHoursInForceAt(e.course.slug, e.completedAt) : 0;
      const discRaw = e.course.iicrcDiscipline?.trim() || 'General';
      const disc = discRaw.length > 0 ? discRaw : 'General';

      lifetimeCec += hours;
      byDiscLifetime[disc] = (byDiscLifetime[disc] ?? 0) + hours;

      // The renewal period and the year recap both date a course by the enrolment's own
      // completion time (see CourseCompletionRecord), the same date that credits the approval.
      // A certificate is re-stamped when regenerated and a lesson revisit moves its timestamp, so
      // neither may move an old completion into the current period (GP-655 review of 0974e6ae).
      const ts = e.completedAt;
      completions.push({
        slug: e.course.slug,
        completedAt: e.completedAt,
        certificateIssuedAt: e.certificateIssuedAt,
      });

      if (cycle && ts) {
        // A revocation or re-purchase clears completedAt but keeps lesson progress, so the next
        // sync re-dates old learning to now. Count it in the period only when every lesson the
        // learner completed was also completed inside the period; an undated, earlier or later
        // lesson fails closed (GP-655 reviews of 5b47a9a1 and c4f3d3a7). A lesson marked
        // incomplete also fails closed: un-marking old lessons must not clear the evidence
        // (review of 5284d027). Only a lesson with no progress at all, such as one added to the
        // course after the learner finished, is not evidence either way.
        const done = lessonIds.flatMap((id) => {
          const p = progressByLesson.get(id);
          if (!p) return [];
          return [p.completed === true ? p.completedAt : null];
        });
        const learnedInPeriod =
          done.length > 0 && done.every((at) => at != null && at >= cycle.start && at <= cycle.end);
        if (learnedInPeriod && ts >= cycle.start && ts <= cycle.end) {
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
      preferDisciplines,
      now,
    });

    const cycleStartIso = cycle ? cycle.start.toISOString() : null;
    const cycleEndIso = cycle ? cycle.end.toISOString() : null;

    const summary: RenewalSummaryPayload = {
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
      some_cecs_estimated: false,
      suggested_courses: suggested,
    };
    return { summary, completions };
  } catch (err) {
    console.error('[renewal-summary]', err);
    return null;
  }
}

function extractOnboardingDisciplines(onboarding: unknown): string[] {
  if (!onboarding || typeof onboarding !== 'object') return [];
  const raw = (onboarding as Record<string, unknown>).disciplines_held;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    const s = String(x).trim().toUpperCase();
    if (/^[A-Z]{2,5}$/.test(s)) out.push(s);
  }
  return [...new Set(out)];
}

async function pickSuggestedCourses(args: {
  enrolledSlugs: Set<string>;
  completedSlugs: Set<string>;
  byDisciplineEarned: Record<string, number>;
  /** From first-session onboarding — boosts matching catalogue rows for “Popular for you”. */
  preferDisciplines?: string[];
  /** A suggestion claims CEC only for an approval in force at this moment. */
  now: Date;
}): Promise<RenewalCourseSuggestion[]> {
  const prefer = new Set(
    (args.preferDisciplines ?? []).map((d) => d.trim().toUpperCase()).filter(Boolean)
  );
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
    const rh = cecHoursInForceAt(c.slug, args.now);
    const hours = rh > 0 ? rh : 0.25;
    const gapWeight = 1 / (1 + earned);
    const discUpper = disc.toUpperCase();
    const onboardingBoost =
      prefer.size > 0 && prefer.has(discUpper) ? 1.45 : prefer.size > 0 ? 0.92 : 1;
    const score = gapWeight * (hours + 0.5) * (disc === 'General' ? 0.85 : 1) * onboardingBoost;
    // GP-498: only claim a CEC benefit when this course has registry-approved CEC hours.
    const reason = suggestionReason({ disc, earnedCec: earned, approvedHours: rh });
    return { c, score, reason, disc, rh };
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
      cec_hours: s.rh > 0 ? s.rh : null,
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
          const h = cecHoursInForceAt(c.slug, args.now);
          return h > 0 ? h : null;
        })(),
        thumbnail_url: normalizePublicAssetUrl(c.thumbnailUrl),
        // GP-498: neutral copy — must not imply IICRC CEC benefit for an unapproved course.
        reason: 'Popular choice among CARSI learners.',
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
