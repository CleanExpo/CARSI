import { prisma } from '@/lib/prisma';
import {
  courseHasPrerequisites,
  decidePrerequisiteAccess,
  parseCoursePrerequisites,
  prerequisiteBlockedMessage,
  type ExistingEnrolmentFacts,
  type ParsedCoursePrerequisites,
  type PrerequisiteCourseLink,
  type PrerequisiteDecision,
  type PrerequisiteFacts,
} from '@/lib/lms/course-prerequisites';

export type { PrerequisiteCourseLink } from '@/lib/lms/course-prerequisites';

/**
 * Server adapter for the course prerequisite gate (DECISIONS #41). The decision itself is
 * the pure `decidePrerequisiteAccess` in `src/lib/lms/course-prerequisites.ts`; this file
 * only loads the facts (prerequisite course rows + the learner's completed enrolments) and
 * shapes a learner-facing refusal. A course with no prerequisites costs zero queries here.
 */

export const PREREQUISITE_NOT_MET_CODE = 'prerequisite_not_met' as const;

export type PrerequisiteBlock = {
  code: typeof PREREQUISITE_NOT_MET_CODE;
  detail: string;
  /** Prerequisite courses still to complete, with titles + public links. */
  prerequisites: (PrerequisiteCourseLink & { href: string })[];
};

/** Thrown by `enrollStudentInCourse` when a new enrolment would skip a prerequisite. */
export class PrerequisiteNotMetError extends Error {
  readonly block: PrerequisiteBlock;
  constructor(block: PrerequisiteBlock) {
    super(block.detail);
    this.name = 'PrerequisiteNotMetError';
    this.block = block;
  }
}

export function isPrerequisiteNotMetError(e: unknown): e is PrerequisiteNotMetError {
  return e instanceof PrerequisiteNotMetError;
}

/** JSON body for a 403 refusal. */
export function prerequisiteBlockBody(block: PrerequisiteBlock) {
  return { detail: block.detail, code: block.code, prerequisites: block.prerequisites };
}

type LoadedFacts = PrerequisiteFacts & { titles: Map<string, string> };

async function loadPrerequisiteFacts(
  userId: string | null,
  parsed: ParsedCoursePrerequisites,
): Promise<LoadedFacts> {
  const slugs = parsed.prerequisites.map((p) => p.courseSlug);
  if (slugs.length === 0) {
    return { knownSlugs: new Set(), completedSlugs: new Set(), titles: new Map() };
  }
  // Any publish state: a prerequisite that is itself a draft still names a real course.
  // Bounded: slug is unique, so at most one row per declared prerequisite.
  const rows = await prisma.lmsCourse.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, title: true },
    take: slugs.length,
  });
  const knownSlugs = new Set(rows.map((r) => r.slug));
  const titles = new Map(rows.map((r) => [r.slug, r.title]));
  const completedSlugs = new Set<string>();
  if (userId && rows.length > 0) {
    const done = await prisma.lmsEnrollment.findMany({
      where: { studentId: userId, courseId: { in: rows.map((r) => r.id) }, status: 'completed' },
      select: { courseId: true },
      take: rows.length, // (studentId, courseId) is unique
    });
    const slugById = new Map(rows.map((r) => [r.id, r.slug]));
    for (const d of done) {
      const s = slugById.get(d.courseId);
      if (s) completedSlugs.add(s);
    }
  }
  return { knownSlugs, completedSlugs, titles };
}

function toBlock(
  decision: Extract<PrerequisiteDecision, { allowed: false }>,
  titles: Map<string, string>,
): PrerequisiteBlock {
  // Unknown or misconfigured prerequisites are a CARSI fault, not the learner's: do not
  // name a course that cannot be taken; the message points them to support instead.
  const links =
    decision.reason === 'not-met'
      ? decision.missing.map((p) => ({
          slug: p.courseSlug,
          title: titles.get(p.courseSlug) ?? p.courseSlug,
          href: `/courses/${encodeURIComponent(p.courseSlug)}`,
        }))
      : [];
  return { code: PREREQUISITE_NOT_MET_CODE, detail: prerequisiteBlockedMessage(links), prerequisites: links };
}

export type CourseForPrerequisites = { slug: string; meta: unknown };

/**
 * Admin status, or a thunk for it. Resolved only once a course is known to declare a
 * prerequisite, so the common no-prerequisite path never touches the session role.
 */
export type AdminFlag = boolean | (() => boolean);

function resolveAdmin(flag: AdminFlag): boolean {
  return typeof flag === 'function' ? flag() : flag;
}

/**
 * Decide whether `userId` may be given (or keep using) access to `course`.
 * Returns `null` when allowed, or the refusal to send. Logs a warning for a
 * misconfigured or unknown prerequisite (which fails closed).
 */
export async function findCoursePrerequisiteBlock(params: {
  userId: string | null;
  isAdmin: AdminFlag;
  course: CourseForPrerequisites;
  enrolment?: ExistingEnrolmentFacts | null;
}): Promise<PrerequisiteBlock | null> {
  const parsed = parseCoursePrerequisites(params.course.meta);
  if (!courseHasPrerequisites(parsed)) return null;
  const isAdmin = resolveAdmin(params.isAdmin);
  if (isAdmin) return null;

  const base = { parsed, isAdmin, enrolment: params.enrolment ?? null };
  // Exemptions (admin override, grandfathered, course completed) need no facts: if the
  // decision is already "allowed" with nothing known, skip the lookups.
  const noFacts = { knownSlugs: new Set<string>(), completedSlugs: new Set<string>() };
  if (decidePrerequisiteAccess({ ...base, facts: noFacts }).allowed) return null;

  const facts = await loadPrerequisiteFacts(params.userId, parsed);
  const decision = decidePrerequisiteAccess({ ...base, facts });
  if (decision.allowed) return null;
  if (decision.reason !== 'not-met') {
    console.warn('[course-prerequisites] failing closed on misconfigured prerequisite', {
      course: params.course.slug,
      reason: decision.reason,
      unknown: decision.unknown,
      configErrors: decision.configErrors,
    });
  }
  return toBlock(decision, facts.titles);
}

/**
 * Read-time gate for lesson / quiz routes, keyed by course id. One small query for the
 * course meta; nothing more unless the course actually declares a prerequisite.
 */
export async function findEnrolledCoursePrerequisiteBlock(params: {
  userId: string;
  isAdmin: AdminFlag;
  courseId: string;
}): Promise<PrerequisiteBlock | null> {
  const course = await prisma.lmsCourse.findUnique({
    where: { id: params.courseId },
    select: { slug: true, meta: true },
  });
  if (!course) return null; // the caller's own not-found / enrolment check handles this
  const parsed = parseCoursePrerequisites(course.meta);
  if (!courseHasPrerequisites(parsed)) return null;

  const enrolment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: params.userId, courseId: params.courseId } },
    select: { status: true, enrolledAt: true, paymentReference: true, prerequisiteGated: true },
  });
  return findCoursePrerequisiteBlock({
    userId: params.userId,
    isAdmin: params.isAdmin,
    course,
    // No row: decide as a new enrolment (the caller's enrolment check denies anyway).
    enrolment: enrolment ?? null,
  });
}

/** Read-time gate keyed by quiz id (the bound quiz-attempt path has no course id in hand). */
export async function findQuizPrerequisiteBlock(params: {
  userId: string;
  isAdmin: AdminFlag;
  quizId: string;
}): Promise<PrerequisiteBlock | null> {
  const quiz = await prisma.lmsQuiz.findUnique({
    where: { id: params.quizId },
    select: { courseId: true },
  });
  if (!quiz) return null; // the attempt path's own lookup returns its not-found
  return findEnrolledCoursePrerequisiteBlock({
    userId: params.userId,
    isAdmin: params.isAdmin,
    courseId: quiz.courseId,
  });
}

/**
 * Read-time gate keyed by lesson id, for routes that only have the lesson in hand (the
 * lesson checkpoint). An unknown lesson returns `null`: the caller's own lookup 404s.
 */
export async function findLessonPrerequisiteBlock(params: {
  userId: string;
  isAdmin: AdminFlag;
  lessonId: string;
}): Promise<PrerequisiteBlock | null> {
  const lesson = await prisma.lmsLesson.findUnique({
    where: { id: params.lessonId },
    select: { module: { select: { courseId: true } } },
  });
  if (!lesson) return null;
  return findEnrolledCoursePrerequisiteBlock({
    userId: params.userId,
    isAdmin: params.isAdmin,
    courseId: lesson.module.courseId,
  });
}

/**
 * The subset of `courseIds` whose content `userId` may read now, for list endpoints that
 * aggregate content across every enrolled course. One query for the course metas; a course
 * with a prerequisite then goes through the same per-course decision as the read routes
 * (grandfathering, admin bypass, fail-closed on misconfiguration all unchanged).
 */
export async function filterCoursesPassingPrerequisites(params: {
  userId: string;
  isAdmin: AdminFlag;
  courseIds: readonly string[];
}): Promise<Set<string>> {
  const ids = [...new Set(params.courseIds)];
  if (ids.length === 0) return new Set();
  const courses = await prisma.lmsCourse.findMany({
    where: { id: { in: ids } },
    select: { id: true, meta: true },
    take: ids.length,
  });
  const gated = new Set(
    courses.filter((c) => courseHasPrerequisites(parseCoursePrerequisites(c.meta))).map((c) => c.id),
  );
  const allowed = new Set(ids.filter((id) => !gated.has(id)));
  for (const courseId of gated) {
    const block = await findEnrolledCoursePrerequisiteBlock({
      userId: params.userId,
      isAdmin: params.isAdmin,
      courseId,
    });
    if (!block) allowed.add(courseId);
  }
  return allowed;
}

export type PrerequisiteLockedSeat = {
  course_slug: string;
  course_title: string;
  /** Prerequisite courses this member still has to complete. */
  prerequisites: (PrerequisiteCourseLink & { href: string })[];
};

/**
 * Team manager view: which members hold a seat that is still LOCKED by a prerequisite
 * (`prerequisite_gated` rows not yet unlocked by completing it). Only gated, live rows are
 * examined, so a team with no locked seats costs one query. Members are evaluated as
 * non-admins: this reports the seat's lock, not what an admin viewer could open.
 */
export async function listPrerequisiteLockedSeats(
  userIds: readonly string[],
  /** Only these courses (the team's own purchases), so a manager never sees a member's other enrolments. */
  courseSlugs: readonly string[],
): Promise<Map<string, PrerequisiteLockedSeat[]>> {
  const out = new Map<string, PrerequisiteLockedSeat[]>();
  const ids = [...new Set(userIds)];
  const slugs = [...new Set(courseSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (ids.length === 0 || slugs.length === 0) return out;
  const rows = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: { in: ids },
      course: { slug: { in: slugs } },
      prerequisiteGated: true,
      // Only a live, not-yet-completed seat can be waiting (completed is always allowed).
      status: 'active',
    },
    select: {
      studentId: true,
      status: true,
      enrolledAt: true,
      paymentReference: true,
      prerequisiteGated: true,
      course: { select: { slug: true, title: true, meta: true } },
    },
    take: 500,
  });
  for (const r of rows) {
    const block = await findCoursePrerequisiteBlock({
      userId: r.studentId,
      isAdmin: false,
      course: { slug: r.course.slug, meta: r.course.meta },
      enrolment: r,
    });
    if (!block) continue;
    const list = out.get(r.studentId) ?? [];
    list.push({ course_slug: r.course.slug, course_title: r.course.title, prerequisites: block.prerequisites });
    out.set(r.studentId, list);
  }
  return out;
}

/** Prerequisite courses (slug + title) for display on the public course page. */
export async function listCoursePrerequisiteLinks(meta: unknown): Promise<PrerequisiteCourseLink[]> {
  const parsed = parseCoursePrerequisites(meta);
  if (parsed.prerequisites.length === 0) return [];
  const rows = await prisma.lmsCourse.findMany({
    where: { slug: { in: parsed.prerequisites.map((p) => p.courseSlug) } },
    select: { slug: true, title: true },
    take: parsed.prerequisites.length,
  });
  const titles = new Map(rows.map((r) => [r.slug, r.title]));
  return parsed.prerequisites.map((p) => ({
    slug: p.courseSlug,
    title: titles.get(p.courseSlug) ?? p.courseSlug,
  }));
}
