import type { AdminCatalogCourse } from '@/lib/admin/load-admin-catalog';
import { loadAdminCatalogFromXlsx } from '@/lib/admin/load-admin-catalog';
import { buildAdminCatalogFromSeed } from '@/lib/lms-seed-catalog';
import { prisma } from '@/lib/prisma';

export type AdminCatalogCourseOption = {
  slug: string;
  title: string;
  moduleCount: number;
};

export type AdminCatalogSource = {
  courses: AdminCatalogCourse[];
  catalogCourses: AdminCatalogCourseOption[];
  catalogBySlug: Map<string, AdminCatalogCourse>;
  catalogSlugs: string[];
  source: 'database' | 'workbook' | 'seed';
};

function mapDbRowToCatalogCourse(row: {
  slug: string;
  title: string;
  status: string;
  priceAud: unknown;
  isFree: boolean;
  iicrcDiscipline: string | null;
  category: string | null;
  modules: {
    title: string;
    lessons: { id: string; title: string }[];
  }[];
}): AdminCatalogCourse {
  const modules = row.modules.map((m, idx) => ({
    moduleNo: idx + 1,
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
  }));
  const lessonCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return {
    slug: row.slug.trim().toLowerCase(),
    title: row.title,
    status: row.status ?? 'draft',
    priceAud: Number(row.priceAud ?? 0),
    isFree: row.isFree,
    iicrcDiscipline: row.iicrcDiscipline,
    moduleCount: lessonCount > 0 ? lessonCount : modules.length,
    categories: row.category ? [row.category] : [],
    modules,
  };
}

async function loadCatalogFromDatabase(): Promise<AdminCatalogCourse[] | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  const rows = await prisma.lmsCourse.findMany({
    orderBy: { title: 'asc' },
    select: {
      slug: true,
      title: true,
      status: true,
      priceAud: true,
      isFree: true,
      iicrcDiscipline: true,
      category: true,
      modules: {
        orderBy: { orderIndex: 'asc' },
        select: {
          title: true,
          lessons: {
            orderBy: { orderIndex: 'asc' },
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (rows.length === 0) return null;
  return rows.map(mapDbRowToCatalogCourse);
}

async function loadCatalogFromWorkbookOrSeed(): Promise<{
  courses: AdminCatalogCourse[];
  source: 'workbook' | 'seed';
}> {
  try {
    const workbook = await loadAdminCatalogFromXlsx();
    return { courses: workbook.courses, source: 'workbook' };
  } catch (err) {
    console.error('[admin] workbook catalog load failed, using seed fallback', err);
    return { courses: buildAdminCatalogFromSeed().courses, source: 'seed' };
  }
}

/**
 * Admin enrollment UI + progress should follow courses saved in the LMS database when
 * present, so grant-by-slug matches what administrators see in the picker.
 */
export async function loadAdminCatalogSource(): Promise<AdminCatalogSource> {
  const dbCourses = await loadCatalogFromDatabase();
  if (dbCourses && dbCourses.length > 0) {
    const catalogBySlug = new Map(dbCourses.map((c) => [c.slug, c]));
    const catalogCourses = dbCourses
      .map((c) => ({ slug: c.slug, title: c.title, moduleCount: c.moduleCount }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return {
      courses: dbCourses,
      catalogCourses,
      catalogBySlug,
      catalogSlugs: dbCourses.map((c) => c.slug),
      source: 'database',
    };
  }

  const fallback = await loadCatalogFromWorkbookOrSeed();
  const catalogBySlug = new Map(fallback.courses.map((c) => [c.slug, c]));
  const catalogCourses = fallback.courses
    .map((c) => ({ slug: c.slug, title: c.title, moduleCount: c.moduleCount }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    courses: fallback.courses,
    catalogCourses,
    catalogBySlug,
    catalogSlugs: fallback.courses.map((c) => c.slug),
    source: fallback.source,
  };
}
