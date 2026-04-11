/**
 * For every `lms_courses` row with status `draft`, load the matching Woo export row from
 * `data/wordpress-export/courses.json` (or WP_EXPORT_COURSES_PATH) and write a combined JSON report.
 *
 * Output (gitignored under wordpress-export/*): `data/wordpress-export/draft-courses-dump.json`
 * Override: DRAFT_DUMP_OUT=/abs/path.json
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run db:export-draft-courses-wp
 */
import 'dotenv/config';

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';
import {
  readWpExportCoursesJsonOrThrow,
  resolveWpExportCoursesJsonPath,
} from '../src/lib/seed/wp-export-courses-json';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');

type WpExportRow = Record<string, unknown> & { slug: string };

function wpRowBySlug(wpJson: string): Map<string, WpExportRow> {
  const rows = JSON.parse(wpJson) as WpExportRow[];
  const map = new Map<string, WpExportRow>();
  for (const r of rows) {
    if (r?.slug && typeof r.slug === 'string') {
      map.set(r.slug.trim().toLowerCase(), r);
    }
  }
  return map;
}

function serializeLmsCourse(
  c: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    shortDescription: string | null;
    thumbnailUrl: string | null;
    instructorId: string;
    status: string;
    priceAud: { toString(): string };
    isFree: boolean;
    durationHours: number | null;
    level: string | null;
    category: string | null;
    tags: unknown;
    iicrcDiscipline: string | null;
    cecHours: number | null;
    meta: unknown;
    isPublished: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    instructor: { id: string; email: string; fullName: string | null } | null;
    modules: Array<{
      id: string;
      title: string;
      orderIndex: number;
      _count: { lessons: number };
    }>;
  }
) {
  const lessonTotal = c.modules.reduce((acc, m) => acc + m._count.lessons, 0);
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    short_description: c.shortDescription,
    thumbnail_url: c.thumbnailUrl,
    instructor_id: c.instructorId,
    instructor: c.instructor
      ? {
          id: c.instructor.id,
          email: c.instructor.email,
          full_name: c.instructor.fullName,
        }
      : null,
    status: c.status,
    price_aud: c.priceAud.toString(),
    is_free: c.isFree,
    duration_hours: c.durationHours,
    level: c.level,
    category: c.category,
    tags: c.tags,
    iicrc_discipline: c.iicrcDiscipline,
    cec_hours: c.cecHours,
    meta: c.meta,
    is_published: c.isPublished,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    curriculum_summary: {
      module_count: c.modules.length,
      lesson_count: lessonTotal,
      modules: c.modules.map((m) => ({
        id: m.id,
        title: m.title,
        order_index: m.orderIndex,
        lesson_count: m._count.lessons,
      })),
    },
  };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const wpResolvedPath = resolveWpExportCoursesJsonPath(APP_ROOT);
  const wpRaw = readWpExportCoursesJsonOrThrow(APP_ROOT);
  const wpMap = wpRowBySlug(wpRaw);

  const drafts = await prisma.lmsCourse.findMany({
    where: { status: { equals: 'draft', mode: 'insensitive' } },
    orderBy: { slug: 'asc' },
    include: {
      instructor: { select: { id: true, email: true, fullName: true } },
      modules: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  let matched = 0;
  const courses = drafts.map((c) => {
    const wp = wpMap.get(c.slug.trim().toLowerCase()) ?? null;
    if (wp) matched += 1;
    return {
      slug: c.slug,
      lms: serializeLmsCourse(c),
      wordpress_export: wp,
      wordpress_export_match: wp ? 'slug' : null,
    };
  });

  const outPath =
    process.env.DRAFT_DUMP_OUT?.trim() || join(APP_ROOT, 'data', 'wordpress-export', 'draft-courses-dump.json');

  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: {
      wordpress_export_courses_json: wpResolvedPath,
      draft_status_filter: 'lms_courses.status equals draft (case-insensitive)',
    },
    summary: {
      draft_courses_in_database: drafts.length,
      matched_rows_in_courses_json: matched,
      no_wordpress_export_row: drafts.length - matched,
    },
    courses,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log('\n--- Draft courses + WordPress export dump ---\n');
  console.log(`Written: ${outPath}`);
  console.log(`Draft rows in DB: ${drafts.length}`);
  console.log(`Matched in courses.json (by slug): ${matched}`);
  console.log(`No courses.json row for slug: ${drafts.length - matched}\n`);

  if (drafts.length === 0) {
    console.log('No draft courses in lms_courses.');
    return;
  }

  console.log('Courses (slug | DB title | WP export? | modules | lessons):\n');
  for (const c of drafts) {
    const wp = wpMap.get(c.slug.trim().toLowerCase());
    const modCount = c.modules.length;
    const lesCount = c.modules.reduce((a, m) => a + m._count.lessons, 0);
    const wpTitle = wp && typeof wp.title === 'string' ? wp.title : '—';
    console.log(
      `  • ${c.slug}\n    LMS: ${c.title}\n    WP:  ${wp ? `yes — ${wpTitle}` : 'no matching slug'}\n    Curriculum: ${modCount} module(s), ${lesCount} lesson(s)\n`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
