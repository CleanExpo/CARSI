import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/prisma';

const publishedWhere = {
  OR: [
    { isPublished: true },
    { status: { equals: 'published', mode: 'insensitive' as const } },
  ],
};

const MAX_CONTEXT_CHARS = 14_000;

/**
 * Plain-text catalog snippet for the public chat assistant (OpenAI system context).
 * Cached briefly to avoid hammering Postgres on every chat message.
 */
export async function getAssistantCourseContextText(): Promise<string> {
  if (!process.env.DATABASE_URL?.trim()) {
    return 'No course database is configured. Direct users to carsi.com.au/courses for the public catalogue.';
  }

  const cached = unstable_cache(
    async () => {
      const rows = await prisma.lmsCourse.findMany({
        where: publishedWhere,
        orderBy: { updatedAt: 'desc' },
        take: 250,
        select: {
          slug: true,
          title: true,
          shortDescription: true,
          category: true,
          iicrcDiscipline: true,
          priceAud: true,
          isFree: true,
          _count: { select: { modules: true } },
        },
      });

      if (rows.length === 0) {
        return 'There are currently no published courses in the database.';
      }

      const lines = rows.map((r) => {
        const price =
          r.isFree || Number(r.priceAud) <= 0 ? 'Free' : `AUD ${Number(r.priceAud).toFixed(2)}`;
        const cat = r.category?.trim() || 'General';
        const disc = r.iicrcDiscipline?.trim() || '—';
        const short = r.shortDescription?.replace(/\s+/g, ' ').trim().slice(0, 220) || '';
        return `- slug:${r.slug} | ${r.title} | ${price} | ${cat} | IICRC:${disc} | modules:${r._count.modules}${short ? ` | ${short}` : ''}`;
      });

      let text = `Published CARSI catalogue (${rows.length} courses). Use only this list for course titles, prices, categories, and slugs. If a course is not listed, say you are not sure and suggest browsing /courses.\n\n${lines.join('\n')}`;
      if (text.length > MAX_CONTEXT_CHARS) {
        text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n…(truncated)`;
      }
      return text;
    },
    ['ai-assistant-course-context-v2'],
    { revalidate: 120, tags: ['lms-courses-public'] }
  );

  return cached();
}

export function getAssistantDisplayName(): string {
  return (
    process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME?.trim() ||
    process.env.AI_ASSISTANT_NAME?.trim() ||
    'Claire'
  );
}

export function getAssistantTagline(): string {
  return (
    process.env.NEXT_PUBLIC_AI_ASSISTANT_TAGLINE?.trim() ||
    'Your CARSI professional learning guide'
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}$/i;

const MAX_FOCUS_DESC_CHARS = 2_800;

function stripHtmlToPlain(input: string, maxLen: number): string {
  const plain = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

function metaTextField(meta: unknown, keys: string[]): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const o = meta as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v)) {
      const parts = v.filter((x) => typeof x === 'string').map((x) => (x as string).trim()).filter(Boolean);
      if (parts.length) return parts.join('; ');
    }
  }
  return null;
}

/**
 * Rich, structured focus for the page the learner is on (course marketing, learn shell, or lesson).
 * Returned text is injected into the chat system prompt; keep it factual from DB fields only.
 */
export async function getAssistantPageFocusContext(
  courseSlugRaw: string | undefined,
  lessonIdRaw: string | undefined
): Promise<string | null> {
  let courseSlug = courseSlugRaw?.trim();
  const lessonId = lessonIdRaw?.trim();

  if (!courseSlug && !lessonId) return null;
  if (lessonId && !UUID_RE.test(lessonId)) return null;

  if (!process.env.DATABASE_URL?.trim()) return null;

  if (!courseSlug && lessonId) {
    const row = await prisma.lmsLesson.findFirst({
      where: { id: lessonId },
      select: { module: { select: { course: { select: { slug: true } } } } },
    });
    courseSlug = row?.module.course.slug ?? undefined;
  }

  if (!courseSlug || !SLUG_RE.test(courseSlug)) return null;

  const course = await prisma.lmsCourse.findFirst({
    where: { slug: courseSlug, ...publishedWhere },
    select: {
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      level: true,
      category: true,
      iicrcDiscipline: true,
      cecHours: true,
      durationHours: true,
      meta: true,
      tags: true,
      _count: { select: { modules: true } },
    },
  });

  if (!course) return null;

  let lessonBlock = '';
  if (lessonId) {
    const lesson = await prisma.lmsLesson.findFirst({
      where: { id: lessonId },
      select: {
        title: true,
        contentType: true,
        orderIndex: true,
        module: {
          select: {
            title: true,
            orderIndex: true,
            course: { select: { slug: true } },
          },
        },
      },
    });

    if (lesson && lesson.module.course.slug === course.slug) {
      const modNum = lesson.module.orderIndex + 1;
      const lesNum = lesson.orderIndex + 1;
      lessonBlock = `
Current lesson (the learner has this lesson open in the player):
- Lesson title: ${lesson.title}
- Module ${modNum}: ${lesson.module.title}
- Lesson position in module: ${lesNum}
- Content format: ${lesson.contentType}
When they say "this lesson", "here", or "this page", stay scoped to this module/lesson. Do not invent facts from lesson body text (not provided); use course-level outcomes/CEC and general pedagogy.`;
    }
  }

  if (!lessonBlock && lessonId) {
    lessonBlock =
      '\n(A lesson id was sent but did not match this published course — ignore lesson scope.)';
  } else if (!lessonId) {
    lessonBlock = `
The learner is in this course's context (overview, curriculum, or enrolment) but not a specific lesson — answer at course level unless they name a topic.`;
  }

  const outcomes =
    metaTextField(course.meta, ['learning_outcomes', 'outcomes', 'objectives', 'learning_objectives']) ||
    null;
  const prerequisites =
    metaTextField(course.meta, [
      'prerequisites',
      'prerequisite',
      'recommended_prior',
      'prior_learning',
      'entry_requirements',
    ]) || null;

  let tagsLine: string | null = null;
  if (Array.isArray(course.tags)) {
    const t = course.tags.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean);
    if (t.length) tagsLine = t.join(', ');
  }

  const overview = course.description
    ? stripHtmlToPlain(course.description, MAX_FOCUS_DESC_CHARS)
    : '';
  const short = course.shortDescription?.replace(/\s+/g, ' ').trim() || '';

  const cec = course.cecHours != null ? Number(course.cecHours) : null;
  const dur = course.durationHours != null ? Number(course.durationHours) : null;

  const lines: string[] = [
    'CURRENT PAGE FOCUS — use this first for questions about "this course", "this lesson", or "here".',
    `Still use the catalogue block below for other courses, comparisons, and slug-level facts.`,
    `Course title: ${course.title}`,
    `Catalogue slug: ${course.slug}`,
    `Public course page: /courses/${course.slug}`,
    `Learner player URL pattern: /dashboard/learn/${course.slug}?lesson=<lessonId>`,
    `IICRC discipline (course record): ${course.iicrcDiscipline?.trim() || '—'}`,
    cec != null && !Number.isNaN(cec)
      ? `IICRC CEC hours (course record): ${cec}`
      : 'IICRC CEC hours: not set on this course record',
    dur != null && !Number.isNaN(dur)
      ? `Catalog duration (hours, if set): ${dur}`
      : null,
    course.level?.trim() ? `Level: ${course.level.trim()}` : null,
    course.category?.trim() ? `Category: ${course.category.trim()}` : null,
    tagsLine ? `Tags: ${tagsLine}` : null,
    `Published module count: ${course._count.modules}`,
    short ? `Short summary: ${short}` : null,
    overview ? `Description / outcomes excerpt (plain text, from DB): ${overview}` : null,
    outcomes ? `Structured outcomes (from course meta JSON if present): ${outcomes}` : null,
    prerequisites ? `Prerequisites / prior learning (from course meta JSON if present): ${prerequisites}` : null,
    lessonBlock.trim(),
  ].filter((x): x is string => Boolean(x));

  return lines.join('\n');
}
