import { randomUUID } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import {
  courseWithCurriculum,
  DEFAULT_INSTRUCTOR_ID,
  ensureCatalogInstructor,
  type CourseWithCurriculum,
} from '@/lib/server/course-catalog-sync';

export type AdminModuleInput = {
  id?: string;
  title: string;
  textContent?: string;
  videoUrl?: string;
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
  modules: AdminModuleInput[];
};

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
  videoUrl?: string
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
  if (out.length === 0) {
    out.push({
      contentType: 'text',
      contentBody: `<p>${escapeHtml(moduleTitle)}</p>`,
      title: moduleTitle,
    });
  }
  return out;
}

async function syncModuleLessons(
  tx: Prisma.TransactionClient,
  moduleId: string,
  moduleTitle: string,
  textContent: string | undefined,
  videoUrl: string | undefined,
  existingLessons: { id: string; orderIndex: number }[],
  firstModule: boolean
) {
  const desired = buildDesiredLessons(moduleTitle, textContent, videoUrl);
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
}

export function courseToAdminDto(course: CourseWithCurriculum) {
  const { introVideoUrl, introThumbnailUrl } = readIntroVideoFromMeta(course.meta);
  const status = (course.status ?? '').toLowerCase();
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
    modules: course.modules.map((mod) => {
      const lessons = [...mod.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
      const text = lessons.find((l) => l.contentType === 'text');
      const video = lessons.find((l) => l.contentType === 'video');
      return {
        id: mod.id,
        title: mod.title,
        textContent: text?.contentBody ?? '',
        videoUrl: video?.contentBody ?? '',
        orderIndex: mod.orderIndex,
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

export type AdminListCoursesOptions = {
  status?: 'all' | 'draft' | 'published';
  /** Trimmed; title/slug contains, case-insensitive */
  q?: string;
  sort?: 'updated' | 'title' | 'modules';
};

function adminCoursesListWhere(options: AdminListCoursesOptions): Prisma.LmsCourseWhereInput {
  const status = options.status ?? 'all';
  const q = options.q?.trim();

  const parts: Prisma.LmsCourseWhereInput[] = [];

  if (status === 'published') {
    parts.push(publishedWhere);
  } else if (status === 'draft') {
    parts.push({ NOT: publishedWhere });
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
    where: adminCoursesListWhere(options),
    orderBy,
    include: {
      _count: { select: { modules: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    thumbnailUrl: c.thumbnailUrl,
    moduleCount: c._count.modules,
    isFree: c.isFree,
    priceAud: Number(c.priceAud),
    published: c.isPublished === true || String(c.status ?? '').toLowerCase() === 'published',
    updatedAt: c.updatedAt.toISOString(),
  }));
}

const BULK_STATUS_MAX_IDS = 200;

/**
 * Sets `status` and `isPublished` for many courses (admin catalogue management).
 */
export async function adminBulkSetCoursePublished(
  ids: string[],
  published: boolean
): Promise<{ count: number }> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return { count: 0 };
  if (unique.length > BULK_STATUS_MAX_IDS) {
    throw new Error('BULK_LIMIT');
  }

  const result = await prisma.lmsCourse.updateMany({
    where: { id: { in: unique } },
    data: {
      status: published ? 'published' : 'draft',
      isPublished: published,
    },
  });

  return { count: result.count };
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

  await prisma.$transaction(async (tx) => {
    await tx.lmsCourse.create({
      data: {
        id: courseId,
        slug,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        shortDescription: null,
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        meta: upsertIntroVideoInMeta(null, {
          introVideoUrl: input.introVideoUrl,
          introThumbnailUrl: input.introThumbnailUrl,
        }),
        instructorId: DEFAULT_INSTRUCTOR_ID,
        status: published ? 'published' : 'draft',
        priceAud,
        isFree: Boolean(input.isFree),
        level: null,
        category: null,
        isPublished: published,
      },
    });

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
      await syncModuleLessons(tx, moduleId, m.title, m.textContent, m.videoUrl, [], i === 0);
    }
  });

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

  await prisma.$transaction(async (tx) => {
    await tx.lmsCourse.update({
      where: { id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        thumbnailUrl: input.thumbnailUrl?.trim() || null,
        meta: upsertIntroVideoInMeta(existing.meta, {
          introVideoUrl: input.introVideoUrl,
          introThumbnailUrl: input.introThumbnailUrl,
        }),
        status: published ? 'published' : 'draft',
        priceAud,
        isFree: Boolean(input.isFree),
        isPublished: published,
      },
    });

    const existingById = new Map(existing.modules.map((m) => [m.id, m]));
    const keptIds = new Set<string>();

    for (let i = 0; i < modules.length; i += 1) {
      const m = modules[i];
      let moduleId: string;
      const prev = m.id && existingById.get(m.id);

      if (prev) {
        moduleId = prev.id;
        keptIds.add(moduleId);
        await tx.lmsModule.update({
          where: { id: moduleId },
          data: { title: m.title, orderIndex: i },
        });
        const lessons = await tx.lmsLesson.findMany({ where: { moduleId } });
        await syncModuleLessons(
          tx,
          moduleId,
          m.title,
          m.textContent,
          m.videoUrl,
          lessons.map((l) => ({ id: l.id, orderIndex: l.orderIndex })),
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
        await syncModuleLessons(tx, moduleId, m.title, m.textContent, m.videoUrl, [], i === 0);
      }
    }

    for (const mod of existing.modules) {
      if (!keptIds.has(mod.id)) {
        await tx.lmsModule.delete({ where: { id: mod.id } });
      }
    }
  });

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
