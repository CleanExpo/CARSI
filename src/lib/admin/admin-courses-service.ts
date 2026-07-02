import { randomUUID } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { isCecExcludedSlug } from '@/lib/seed/cec-professional-assignments';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';
import {
  courseWithCurriculum,
  DEFAULT_INSTRUCTOR_ID,
  ensureCatalogInstructor,
  type CourseWithCurriculum,
} from '@/lib/server/course-catalog-sync';

/** Interactive tx default is 5s; remote Postgres + many modules/lessons exceeds that (P2028). */
const ADMIN_COURSE_WRITE_TX_OPTIONS = {
  maxWait: 15_000,
  timeout: 120_000,
} as const;

export type AdminQuizQuestionInput = {
  questionText: string;
  options: string[];
  correctIndex: number;
  points?: number;
};

export type AdminModuleQuizInput = {
  id?: string;
  title?: string;
  passPercentage?: number;
  attemptsAllowed?: number;
  questions: AdminQuizQuestionInput[];
};

export type AdminModuleInput = {
  id?: string;
  title: string;
  textContent?: string;
  videoUrl?: string;
  /**
   * Optional module knowledge-check quiz. When present, a `quiz` lesson is created in the
   * module and wired to an `LmsQuiz` (+ questions) so it renders in the player AND counts
   * toward the course completion gate (`allCourseQuizzesPassed`). Omit for no quiz.
   */
  quiz?: AdminModuleQuizInput;
};

export type AdminCourseWriteInput = {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  introVideoUrl?: string;
  introThumbnailUrl?: string;
  slug?: string;
  isFree: boolean;
  priceAud: number;
  published: boolean;
  cecHours?: number | null;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
  level?: string | null;
  modules: AdminModuleInput[];
};

function parseOptionalHours(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (raw === undefined || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseOptionalTrimmedString(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t ? t : null;
}

/**
 * Parse a module quiz from request input. Returns a validated quiz (only well-formed
 * questions kept — text present, ≥2 options, correctIndex in range), or undefined if there
 * is no quiz or nothing valid. Lenient by design so a malformed quiz never rejects the whole
 * course write.
 */
export function parseModuleQuiz(raw: unknown): AdminModuleQuizInput | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const q = raw as Record<string, unknown>;
  const questionsRaw = Array.isArray(q.questions) ? q.questions : [];
  const questions: AdminQuizQuestionInput[] = [];
  for (const row of questionsRaw) {
    if (!row || typeof row !== 'object') continue;
    const qq = row as Record<string, unknown>;
    const questionText = typeof qq.questionText === 'string' ? qq.questionText.trim() : '';
    const options = Array.isArray(qq.options)
      ? qq.options
          .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
          .map((o) => o.trim())
      : [];
    const correctIndex = typeof qq.correctIndex === 'number' ? qq.correctIndex : -1;
    if (!questionText || options.length < 2) continue;
    if (correctIndex < 0 || correctIndex >= options.length) continue;
    const points = typeof qq.points === 'number' && qq.points > 0 ? qq.points : 1;
    questions.push({ questionText, options, correctIndex, points });
  }
  if (questions.length === 0) return undefined;
  return {
    id: typeof q.id === 'string' && q.id.trim() ? q.id.trim() : undefined,
    title: typeof q.title === 'string' && q.title.trim() ? q.title.trim() : undefined,
    passPercentage:
      typeof q.passPercentage === 'number' && q.passPercentage > 0 && q.passPercentage <= 100
        ? q.passPercentage
        : undefined,
    attemptsAllowed:
      typeof q.attemptsAllowed === 'number' && q.attemptsAllowed > 0
        ? q.attemptsAllowed
        : undefined,
    questions,
  };
}

export function parseAdminCourseWriteBody(body: unknown): AdminCourseWriteInput | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) return null;

  const modulesRaw = Array.isArray(o.modules) ? o.modules : [];
  const modules = modulesRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const m = row as Record<string, unknown>;
      const modTitle = typeof m.title === 'string' ? m.title.trim() : '';
      if (!modTitle) return null;
      return {
        id: typeof m.id === 'string' && m.id.trim() ? m.id.trim() : undefined,
        title: modTitle,
        textContent: typeof m.textContent === 'string' ? m.textContent : undefined,
        videoUrl: typeof m.videoUrl === 'string' ? m.videoUrl : undefined,
        quiz: parseModuleQuiz(m.quiz),
      };
    })
    .filter(Boolean) as AdminCourseWriteInput['modules'];

  const priceRaw = o.priceAud;
  const priceAud =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw)
      ? priceRaw
      : typeof priceRaw === 'string'
        ? Number.parseFloat(priceRaw)
        : 0;

  return {
    title,
    description: typeof o.description === 'string' ? o.description : undefined,
    thumbnailUrl: typeof o.thumbnailUrl === 'string' ? o.thumbnailUrl : undefined,
    introVideoUrl: typeof o.introVideoUrl === 'string' ? o.introVideoUrl : undefined,
    introThumbnailUrl: typeof o.introThumbnailUrl === 'string' ? o.introThumbnailUrl : undefined,
    slug: typeof o.slug === 'string' ? o.slug : undefined,
    isFree: Boolean(o.isFree),
    priceAud: Number.isFinite(priceAud) ? priceAud : 0,
    published: Boolean(o.published),
    cecHours: parseOptionalHours(o.cecHours),
    durationHours: parseOptionalHours(o.durationHours),
    iicrcDiscipline: parseOptionalTrimmedString(o.iicrcDiscipline),
    level: parseOptionalTrimmedString(o.level),
    modules,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

async function uniqueSlug(preferred: string): Promise<string> {
  let candidate = preferred;
  for (let i = 0; i < 20; i += 1) {
    const clash = await prisma.lmsCourse.findUnique({ where: { slug: candidate } });
    if (!clash) return candidate;
    candidate = `${preferred}-${randomUUID().slice(0, 8)}`;
  }
  return `${preferred}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function looksLikeHtml(s: string) {
  return /<[a-z][\s\S]*>/i.test(s);
}

function plainTextToHtmlBlocks(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function normalizeModuleText(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  return looksLikeHtml(t) ? t : plainTextToHtmlBlocks(t);
}

function normalizeModules(modules: AdminModuleInput[]): AdminModuleInput[] {
  return modules
    .map((m) => ({
      id: m.id,
      title: m.title.trim(),
      textContent: normalizeModuleText(m.textContent),
      videoUrl: m.videoUrl?.trim() || undefined,
      quiz: m.quiz,
    }))
    .filter((m) => m.title.length > 0);
}

function normalizeOptionalString(raw?: string): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

function readIntroVideoFromMeta(meta: unknown): {
  introVideoUrl?: string;
  introThumbnailUrl?: string;
} {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const m = meta as Record<string, unknown>;
  const introVideoUrl = typeof m.introVideoUrl === 'string' ? m.introVideoUrl : undefined;
  const introThumbnailUrl =
    typeof m.introThumbnailUrl === 'string' ? m.introThumbnailUrl : undefined;
  return { introVideoUrl, introThumbnailUrl };
}

function upsertIntroVideoInMeta(
  existingMeta: unknown,
  input: Pick<AdminCourseWriteInput, 'introVideoUrl' | 'introThumbnailUrl'>
): Prisma.InputJsonValue | null {
  const base =
    existingMeta && typeof existingMeta === 'object' && !Array.isArray(existingMeta)
      ? { ...(existingMeta as Record<string, unknown>) }
      : {};

  const introVideoUrl = normalizeOptionalString(input.introVideoUrl);
  const introThumbnailUrl = normalizeOptionalString(input.introThumbnailUrl);

  if (introVideoUrl) base.introVideoUrl = introVideoUrl;
  else delete base.introVideoUrl;

  if (introThumbnailUrl) base.introThumbnailUrl = introThumbnailUrl;
  else delete base.introThumbnailUrl;

  const keys = Object.keys(base);
  return keys.length > 0 ? (base as Prisma.InputJsonValue) : null;
}

type LessonDesired = {
  contentType: string;
  contentBody: string | null;
  title: string;
};

function buildDesiredLessons(
  moduleTitle: string,
  textContent?: string,
  videoUrl?: string,
  quizId?: string
): LessonDesired[] {
  const out: LessonDesired[] = [];
  if (textContent) {
    out.push({
      contentType: 'text',
      contentBody: textContent,
      title: `${moduleTitle} — Reading`,
    });
  }
  if (videoUrl) {
    out.push({
      contentType: 'video',
      contentBody: videoUrl,
      title: `${moduleTitle} — Video`,
    });
  }
  if (quizId) {
    out.push({
      contentType: 'quiz',
      contentBody: quizId,
      title: `${moduleTitle} — Knowledge check`,
    });
  }
  if (out.length === 0) {
    out.push({
      contentType: 'text',
      contentBody: `<p>${escapeHtml(moduleTitle)}</p>`,
      title: moduleTitle,
    });
  }
  return out;
}

/**
 * Upsert a module's knowledge-check quiz (LmsQuiz + questions) and return its stable id.
 * Re-uses an existing quiz id (from the caller or the module's current quiz lesson) so
 * re-writes don't orphan quizzes or lose attempt history.
 */
async function writeModuleQuiz(
  tx: Prisma.TransactionClient,
  courseId: string,
  moduleTitle: string,
  quiz: AdminModuleQuizInput,
  existingQuizId?: string
): Promise<string> {
  const quizId = quiz.id ?? existingQuizId ?? randomUUID();
  const title = quiz.title ?? `${moduleTitle} — Knowledge check`;
  const passPercentage = quiz.passPercentage ?? 80;
  const attemptsAllowed = quiz.attemptsAllowed ?? 3;
  await tx.lmsQuiz.upsert({
    where: { id: quizId },
    create: { id: quizId, courseId, title, passPercentage, attemptsAllowed },
    update: { courseId, title, passPercentage, attemptsAllowed },
  });
  // Replace questions so re-writes stay in sync with the input.
  await tx.lmsQuizQuestion.deleteMany({ where: { quizId } });
  for (let i = 0; i < quiz.questions.length; i += 1) {
    const q = quiz.questions[i];
    await tx.lmsQuizQuestion.create({
      data: {
        quizId,
        questionText: q.questionText,
        options: q.options.map((text) => ({ text })),
        correctIndex: q.correctIndex,
        orderIndex: i,
        points: q.points ?? 1,
      },
    });
  }
  return quizId;
}

/**
 * Delete any LmsQuiz for the course no longer referenced by a module quiz lesson. Keeps the
 * completion gate consistent: `allCourseQuizzesPassed` counts LmsQuiz by courseId, so an
 * orphaned quiz (no lesson to attempt) would otherwise block completion forever. Cascades
 * remove the quiz's questions + attempts.
 */
async function pruneOrphanQuizzes(
  tx: Prisma.TransactionClient,
  courseId: string,
  keepQuizIds: string[]
): Promise<void> {
  await tx.lmsQuiz.deleteMany({
    where: {
      courseId,
      ...(keepQuizIds.length > 0 ? { id: { notIn: keepQuizIds } } : {}),
    },
  });
}

async function syncModuleLessons(
  tx: Prisma.TransactionClient,
  courseId: string,
  moduleId: string,
  moduleTitle: string,
  textContent: string | undefined,
  videoUrl: string | undefined,
  quiz: AdminModuleQuizInput | undefined,
  existingLessons: {
    id: string;
    orderIndex: number;
    contentType: string;
    contentBody: string | null;
  }[],
  firstModule: boolean
): Promise<string | null> {
  let quizId: string | null = null;
  if (quiz) {
    const existingQuizLesson = existingLessons.find((l) => l.contentType === 'quiz');
    quizId = await writeModuleQuiz(
      tx,
      courseId,
      moduleTitle,
      quiz,
      existingQuizLesson?.contentBody ?? undefined
    );
  }

  const desired = buildDesiredLessons(moduleTitle, textContent, videoUrl, quizId ?? undefined);
  const sortedExisting = [...existingLessons].sort((a, b) => a.orderIndex - b.orderIndex);

  for (let i = 0; i < desired.length; i += 1) {
    const d = desired[i];
    const ex = sortedExisting[i];
    const isPreview = firstModule && i === 0;
    if (ex) {
      await tx.lmsLesson.update({
        where: { id: ex.id },
        data: {
          title: d.title,
          contentType: d.contentType,
          contentBody: d.contentBody,
          orderIndex: i,
          isPreview,
        },
      });
    } else {
      await tx.lmsLesson.create({
        data: {
          id: randomUUID(),
          moduleId,
          title: d.title,
          contentType: d.contentType,
          contentBody: d.contentBody,
          orderIndex: i,
          isPreview,
        },
      });
    }
  }
  for (let j = desired.length; j < sortedExisting.length; j += 1) {
    await tx.lmsLesson.delete({ where: { id: sortedExisting[j].id } });
  }

  return quizId;
}

/** LmsQuizQuestion.options is stored as `{ text }[]` JSON; normalise back to plain strings. */
function quizOptionsToStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (o && typeof o === 'object' && typeof (o as { text?: unknown }).text === 'string') {
      return (o as { text: string }).text;
    }
    return String(o);
  });
}

export function courseToAdminDto(course: CourseWithCurriculum) {
  const { introVideoUrl, introThumbnailUrl } = readIntroVideoFromMeta(course.meta);
  const status = (course.status ?? '').toLowerCase();
  const resolved = resolveLmsCourseCecHours({
    slug: course.slug,
    cecHours: course.cecHours != null ? Number(course.cecHours) : null,
    shortDescription: course.shortDescription,
    description: course.description,
    meta: course.meta,
    durationHours: course.durationHours != null ? Number(course.durationHours) : null,
    iicrcDiscipline: course.iicrcDiscipline,
  });
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description ?? '',
    thumbnailUrl: course.thumbnailUrl ?? '',
    introVideoUrl,
    introThumbnailUrl,
    isFree: course.isFree,
    priceAud: Number(course.priceAud),
    published: course.isPublished === true || status === 'published',
    workflow_status: resolveCourseWorkflowStatus(course.status, course.isPublished),
    cecHours: course.cecHours != null ? String(course.cecHours) : null,
    durationHours: course.durationHours != null ? String(course.durationHours) : null,
    iicrcDiscipline: course.iicrcDiscipline,
    level: course.level,
    resolvedCecHours: resolved != null ? String(resolved) : null,
    cecMissing: !isCecExcludedSlug(course.slug) && resolved == null,
    cecExcluded: isCecExcludedSlug(course.slug),
    modules: course.modules.map((mod) => {
      const lessons = [...mod.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
      const text = lessons.find((l) => l.contentType === 'text');
      const video = lessons.find((l) => l.contentType === 'video');
      const quizLesson = lessons.find((l) => l.contentType === 'quiz');
      const quizRow = quizLesson?.contentBody
        ? course.quizzes.find((q) => q.id === quizLesson.contentBody)
        : undefined;
      const quiz = quizRow
        ? {
            id: quizRow.id,
            title: quizRow.title,
            passPercentage: quizRow.passPercentage,
            attemptsAllowed: quizRow.attemptsAllowed,
            questions: [...quizRow.questions]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((q) => ({
                questionText: q.questionText,
                options: quizOptionsToStrings(q.options),
                correctIndex: q.correctIndex,
                points: q.points,
              })),
          }
        : undefined;
      return {
        id: mod.id,
        title: mod.title,
        textContent: text?.contentBody ?? '',
        videoUrl: video?.contentBody ?? '',
        orderIndex: mod.orderIndex,
        ...(quiz ? { quiz } : {}),
      };
    }),
    updatedAt: course.updatedAt.toISOString(),
  };
}

/** Matches list cards: published if `isPublished` or status is published (case-insensitive). */
const publishedWhere: Prisma.LmsCourseWhereInput = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' } },
  ],
};

export type CourseWorkflowStatus = 'draft' | 'in_review' | 'published';

export function resolveCourseWorkflowStatus(
  status: string | null | undefined,
  isPublished: boolean | null | undefined
): CourseWorkflowStatus {
  const s = (status ?? '').toLowerCase();
  if (s === 'in_review') return 'in_review';
  if (isPublished === true || s === 'published') return 'published';
  return 'draft';
}

export type AdminListCoursesOptions = {
  status?: 'all' | 'draft' | 'in_review' | 'published';
  /** Trimmed; title/slug contains, case-insensitive */
  q?: string;
  sort?: 'updated' | 'title' | 'modules';
  /** When `missing`, only courses without resolvable CEC (excludes memberships/downloads). */
  cec?: 'all' | 'missing';
};

function adminCoursesListWhere(options: AdminListCoursesOptions): Prisma.LmsCourseWhereInput {
  const status = options.status ?? 'all';
  const q = options.q?.trim();

  const parts: Prisma.LmsCourseWhereInput[] = [];

  if (status === 'published') {
    parts.push(publishedWhere);
  } else if (status === 'draft') {
    parts.push({
      AND: [
        { NOT: publishedWhere },
        { NOT: { status: { equals: 'in_review', mode: 'insensitive' } } },
      ],
    });
  } else if (status === 'in_review') {
    parts.push({ status: { equals: 'in_review', mode: 'insensitive' } });
  }

  if (q) {
    parts.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export async function adminListCourses(options: AdminListCoursesOptions = {}) {
  const sort = options.sort ?? 'updated';

  let orderBy: Prisma.LmsCourseOrderByWithRelationInput | Prisma.LmsCourseOrderByWithRelationInput[];
  if (sort === 'title') {
    orderBy = { title: 'asc' };
  } else if (sort === 'modules') {
    orderBy = { modules: { _count: 'desc' } };
  } else {
    orderBy = { updatedAt: 'desc' };
  }

  const rows = await prisma.lmsCourse.findMany({
    // Defensive cap on the admin course list. Far above current catalogue size;
    // move to pagination if the catalogue ever approaches this.
    take: 1000,
    where: adminCoursesListWhere(options),
    orderBy,
    include: {
      _count: { select: { modules: true } },
    },
  });

  const mapped = rows.map((c) => {
    const resolved = resolveLmsCourseCecHours({
      slug: c.slug,
      cecHours: c.cecHours != null ? Number(c.cecHours) : null,
      shortDescription: c.shortDescription,
      description: c.description,
      meta: c.meta,
      durationHours: c.durationHours != null ? Number(c.durationHours) : null,
      iicrcDiscipline: c.iicrcDiscipline,
    });
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
      moduleCount: c._count.modules,
      isFree: c.isFree,
      priceAud: Number(c.priceAud),
      published: c.isPublished === true || String(c.status ?? '').toLowerCase() === 'published',
      workflow_status: resolveCourseWorkflowStatus(c.status, c.isPublished),
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      category: c.category,
      level: c.level,
      iicrcDiscipline: c.iicrcDiscipline,
      cecHours: c.cecHours != null ? String(c.cecHours) : null,
      durationHours: c.durationHours != null ? String(c.durationHours) : null,
      resolvedCecHours: resolved != null ? String(resolved) : null,
      cecMissing: !isCecExcludedSlug(c.slug) && resolved == null,
      cecExcluded: isCecExcludedSlug(c.slug),
    };
  });

  if (options.cec === 'missing') {
    return mapped.filter((c) => c.cecMissing);
  }
  return mapped;
}

export async function adminGetCourse(id: string): Promise<CourseWithCurriculum | null> {
  return prisma.lmsCourse.findUnique({
    where: { id },
    include: courseWithCurriculum,
  });
}

export async function adminCreateCourse(
  input: AdminCourseWriteInput
): Promise<CourseWithCurriculum> {
  const modules = normalizeModules(input.modules);
  if (modules.length === 0) {
    throw new Error('MODULES_REQUIRED');
  }

  await ensureCatalogInstructor();

  const slug = await uniqueSlug(slugify(input.slug?.trim() || input.title));
  const courseId = randomUUID();
  const priceAud = new Prisma.Decimal(Number.isFinite(input.priceAud) ? input.priceAud : 0);
  const published = Boolean(input.published);

  await prisma.$transaction(
    async (tx) => {
      await tx.lmsCourse.create({
        data: {
          id: courseId,
          slug,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          shortDescription: null,
          thumbnailUrl: input.thumbnailUrl?.trim() || null,
          meta:
            upsertIntroVideoInMeta(null, {
              introVideoUrl: input.introVideoUrl,
              introThumbnailUrl: input.introThumbnailUrl,
            }) ?? undefined,
          instructorId: DEFAULT_INSTRUCTOR_ID,
          status: published ? 'published' : 'draft',
          priceAud,
          isFree: Boolean(input.isFree),
          level: input.level?.trim() || null,
          category: null,
          cecHours: input.cecHours ?? null,
          durationHours: input.durationHours ?? null,
          iicrcDiscipline: input.iicrcDiscipline?.trim() || null,
          isPublished: published,
        },
      });

      const usedQuizIds: string[] = [];
      for (let i = 0; i < modules.length; i += 1) {
        const m = modules[i];
        const moduleId = randomUUID();
        await tx.lmsModule.create({
          data: {
            id: moduleId,
            courseId,
            title: m.title,
            orderIndex: i,
          },
        });
        const qid = await syncModuleLessons(
          tx,
          courseId,
          moduleId,
          m.title,
          m.textContent,
          m.videoUrl,
          m.quiz,
          [],
          i === 0
        );
        if (qid) usedQuizIds.push(qid);
      }
      await pruneOrphanQuizzes(tx, courseId, usedQuizIds);
    },
    ADMIN_COURSE_WRITE_TX_OPTIONS
  );

  return prisma.lmsCourse.findUniqueOrThrow({
    where: { id: courseId },
    include: courseWithCurriculum,
  });
}

export async function adminUpdateCourse(
  id: string,
  input: AdminCourseWriteInput
): Promise<CourseWithCurriculum> {
  const existing = await prisma.lmsCourse.findUnique({
    where: { id },
    include: courseWithCurriculum,
  });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const modules = normalizeModules(input.modules);
  if (modules.length === 0) {
    throw new Error('MODULES_REQUIRED');
  }

  const priceAud = new Prisma.Decimal(Number.isFinite(input.priceAud) ? input.priceAud : 0);
  const published = Boolean(input.published);

  await prisma.$transaction(
    async (tx) => {
      await tx.lmsCourse.update({
        where: { id },
        data: {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          thumbnailUrl: input.thumbnailUrl?.trim() || null,
          meta:
            upsertIntroVideoInMeta(existing.meta, {
              introVideoUrl: input.introVideoUrl,
              introThumbnailUrl: input.introThumbnailUrl,
            }) ?? undefined,
          status: published ? 'published' : 'draft',
          priceAud,
          isFree: Boolean(input.isFree),
          isPublished: published,
          ...(input.cecHours !== undefined ? { cecHours: input.cecHours } : {}),
          ...(input.durationHours !== undefined ? { durationHours: input.durationHours } : {}),
          ...(input.iicrcDiscipline !== undefined
            ? { iicrcDiscipline: input.iicrcDiscipline?.trim() || null }
            : {}),
          ...(input.level !== undefined ? { level: input.level?.trim() || null } : {}),
        },
      });

      const existingById = new Map(existing.modules.map((m) => [m.id, m]));
      const keptIds = new Set<string>();
      const usedQuizIds: string[] = [];

      for (let i = 0; i < modules.length; i += 1) {
        const m = modules[i];
        let moduleId: string;
        const prev = m.id && existingById.get(m.id);
        let qid: string | null;

        if (prev) {
          moduleId = prev.id;
          keptIds.add(moduleId);
          await tx.lmsModule.update({
            where: { id: moduleId },
            data: { title: m.title, orderIndex: i },
          });
          const lessons = await tx.lmsLesson.findMany({ where: { moduleId } });
          qid = await syncModuleLessons(
            tx,
            id,
            moduleId,
            m.title,
            m.textContent,
            m.videoUrl,
            m.quiz,
            lessons.map((l) => ({
              id: l.id,
              orderIndex: l.orderIndex,
              contentType: l.contentType,
              contentBody: l.contentBody,
            })),
            i === 0
          );
        } else {
          moduleId = randomUUID();
          await tx.lmsModule.create({
            data: {
              id: moduleId,
              courseId: id,
              title: m.title,
              orderIndex: i,
            },
          });
          qid = await syncModuleLessons(
            tx,
            id,
            moduleId,
            m.title,
            m.textContent,
            m.videoUrl,
            m.quiz,
            [],
            i === 0
          );
        }
        if (qid) usedQuizIds.push(qid);
      }

      for (const mod of existing.modules) {
        if (!keptIds.has(mod.id)) {
          await tx.lmsModule.delete({ where: { id: mod.id } });
        }
      }

      await pruneOrphanQuizzes(tx, id, usedQuizIds);
    },
    ADMIN_COURSE_WRITE_TX_OPTIONS
  );

  return prisma.lmsCourse.findUniqueOrThrow({
    where: { id },
    include: courseWithCurriculum,
  });
}

export async function adminDeleteCourse(id: string): Promise<void> {
  const existing = await prisma.lmsCourse.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }
  await prisma.lmsCourse.delete({ where: { id } });
}

export const ADMIN_BULK_PUBLICATION_MAX_IDS = 200;

/**
 * Set publication state for many courses (same rules as create/update: `status` + `isPublished`).
 */
export async function adminBulkSetCoursePublication(
  ids: string[],
  published: boolean
): Promise<number> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error('NO_IDS');
  }
  if (unique.length > ADMIN_BULK_PUBLICATION_MAX_IDS) {
    throw new Error('TOO_MANY_IDS');
  }

  const result = await prisma.lmsCourse.updateMany({
    where: { id: { in: unique } },
    data: {
      status: published ? 'published' : 'draft',
      isPublished: published,
    },
  });
  return result.count;
}

/**
 * Permanently delete many courses (cascade removes modules and lessons).
 */
export async function adminBulkDeleteCourses(ids: string[]): Promise<number> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error('NO_IDS');
  }
  if (unique.length > ADMIN_BULK_PUBLICATION_MAX_IDS) {
    throw new Error('TOO_MANY_IDS');
  }

  const result = await prisma.lmsCourse.deleteMany({
    where: { id: { in: unique } },
  });
  return result.count;
}

export async function adminTransitionCourseWorkflow(
  courseId: string,
  action: 'save_draft' | 'submit_review' | 'publish'
): Promise<CourseWorkflowStatus> {
  let status: string;
  let isPublished: boolean;
  switch (action) {
    case 'submit_review':
      status = 'in_review';
      isPublished = false;
      break;
    case 'publish':
      status = 'published';
      isPublished = true;
      break;
    default:
      status = 'draft';
      isPublished = false;
  }

  await prisma.lmsCourse.update({
    where: { id: courseId },
    data: { status, isPublished },
  });

  return resolveCourseWorkflowStatus(status, isPublished);
}
