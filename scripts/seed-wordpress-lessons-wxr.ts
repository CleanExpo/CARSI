/**
 * Import LearnDash `sfwd-lessons` from a WordPress WXR export into `lms_modules` / `lms_lessons`
 * for courses previously seeded from `data/wordpress-export/courses.json` (WooCommerce products).
 *
 * Does not modify the 20 pilot courses from `data/seed/courses-catalog.json`.
 * Replaces existing modules/lessons for each target course (same pattern as `seed-courses-catalog.ts`).
 *
 * Maps lessons to LMS courses by LearnDash URL path `/courses/{ld-slug}/lessons/...` and resolves
 * that slug to a Woo product slug using the same href + prefix rules as `seed-wordpress-export-courses.ts`.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/seed-wordpress-lessons-wxr.ts
 *
 * Optional:
 *   WXR_PATH=...  — defaults to data/wordpress-export/carsi.WordPress.2026-04-05.xml
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';
import { isCoursesCatalogFile } from '../src/lib/seed/courses-catalog-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WP_EXPORT_PATH = join(__dirname, '..', 'data', 'wordpress-export', 'courses.json');
const CATALOG_PATH = join(__dirname, '..', 'data', 'seed', 'courses-catalog.json');
const DEFAULT_WXR = join(__dirname, '..', 'data', 'wordpress-export', 'carsi.WordPress.2026-04-05.xml');

const HREF_RE = /carsi\.com\.au\/courses\/([^/"']+)\//g;

type WpExportRow = {
  slug: string;
  title: string;
  description?: string;
  status?: string;
};

type ParsedLesson = {
  wpPostId: number;
  title: string;
  ldCourseSlug: string;
  menuOrder: number;
  encodedContent: string;
  sfwdMeta: string;
};

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugMatch(seedSlug: string, hrefSlug: string): boolean {
  const s = seedSlug.toLowerCase();
  const h = hrefSlug.toLowerCase();
  return s === h || h.startsWith(s) || s.startsWith(h);
}

function buildSeedExclusionWpSlugs(seedSlugs: string[], seedTitles: Set<string>): Set<string> {
  const exclude = new Set<string>();
  const raw = readFileSync(WP_EXPORT_PATH, 'utf8');
  const wp = JSON.parse(raw) as WpExportRow[];

  for (const c of wp) {
    if (seedTitles.has(normTitle(c.title))) {
      exclude.add(c.slug);
    }
    const desc = c.description ?? '';
    let m: RegExpExecArray | null;
    const re = new RegExp(HREF_RE.source, 'g');
    while ((m = re.exec(desc)) !== null) {
      const h = m[1].toLowerCase();
      for (const s of seedSlugs) {
        if (slugMatch(s, h)) exclude.add(c.slug);
      }
    }
  }

  exclude.add('introduction-to-monitoring-air-quality-on-the-job-site');
  exclude.add('introduction-to-monitoring-air-quality-job-site');
  return exclude;
}

function phpSerializedStringAfterKey(serialized: string, key: string): string | null {
  const marker = `${key}";s:`;
  const idx = serialized.indexOf(marker);
  if (idx === -1) return null;
  const rest = serialized.slice(idx + marker.length);
  const lenMatch = rest.match(/^(\d+):"/);
  if (!lenMatch) return null;
  const byteLen = parseInt(lenMatch[1], 10);
  const valueStart = lenMatch[0].length;
  const buf = Buffer.from(rest.slice(valueStart), 'utf8');
  if (buf.length < byteLen) return null;
  return buf.subarray(0, byteLen).toString('utf8');
}

function normalizeVideoUrl(raw: string): string {
  const trimmed = raw.trim();
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  return (srcMatch ? srcMatch[1] : trimmed).trim();
}

function firstYoutubeLikeFromHtml(html: string): string | null {
  const m = html.match(
    /https?:\/\/(?:www\.)?(?:youtu\.be\/[a-zA-Z0-9_-]+|youtube\.com\/(?:watch\?v=|embed\/)[a-zA-Z0-9_-]+)/i
  );
  return m ? m[0] : null;
}

function isHostedVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('youtu.be') || u.includes('youtube.com') || u.includes('vimeo.com');
}

function ldCourseSlugFromLink(link: string): string | null {
  const m = link.match(/\/courses\/([^/]+)\/lessons\//i);
  return m ? m[1].toLowerCase() : null;
}

function slugPairsMatch(wooSlug: string, ldPath: string): boolean {
  const w = wooSlug.toLowerCase();
  const l = ldPath.toLowerCase();
  if (w === l) return true;
  if (l.startsWith(`${w}-`)) return true;
  if (w.startsWith(`${l}-`)) return true;
  return false;
}

function wooCandidatesForLd(ldPath: string, publishedRows: WpExportRow[]): string[] {
  const l = ldPath.toLowerCase();
  const set = new Set<string>();
  for (const row of publishedRows) {
    const d = (row.description || '').toLowerCase();
    if (d.includes(`/courses/${l}/`) || d.includes(`courses/${l}/`)) {
      set.add(row.slug);
    }
    if (slugPairsMatch(row.slug, ldPath)) {
      set.add(row.slug);
    }
  }
  return [...set];
}

function pickWooSlug(candidates: string[], ldPath: string, dbHas: Set<string>): string | null {
  const hits = candidates.filter((c) => dbHas.has(c));
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];
  const exact = hits.find((h) => h.toLowerCase() === ldPath.toLowerCase());
  if (exact) return exact;
  return [...hits].sort((a, b) => a.length - b.length)[0];
}

const ITEM_RE = /\s*<item>\s*([\s\S]*?)\s*<\/item>/g;

function cdata(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`\\s*<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  return m ? m[1] : null;
}

function tagText(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`\\s*<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

function extractSfwdLessonsMeta(itemBlock: string): string | null {
  const metaRe =
    /\s*<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[_sfwd-lessons\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>\s*<\/wp:postmeta>/g;
  let m: RegExpExecArray | null;
  let best: string | null = null;
  while ((m = metaRe.exec(itemBlock)) !== null) {
    const v = m[1];
    if (v.includes('sfwd-lessons_course";i:')) best = v;
  }
  return best;
}

function parseLessonsFromWxr(xml: string): ParsedLesson[] {
  const byId = new Map<number, ParsedLesson>();
  let im: RegExpExecArray | null;
  while ((im = ITEM_RE.exec(xml)) !== null) {
    const block = im[1];
    const postType = cdata(block, 'wp:post_type');
    if (postType !== 'sfwd-lessons') continue;
    const status = cdata(block, 'wp:status');
    if (status !== 'publish') continue;

    const postIdStr = tagText(block, 'wp:post_id');
    const wpPostId = postIdStr ? parseInt(postIdStr, 10) : NaN;
    if (!Number.isFinite(wpPostId)) continue;

    const link = tagText(block, 'link') ?? '';
    const ldCourseSlug = ldCourseSlugFromLink(link);
    if (!ldCourseSlug) continue;

    const title = cdata(block, 'title')?.trim() || 'Lesson';
    const menuOrder = parseInt(tagText(block, 'wp:menu_order') || '0', 10) || 0;
    const encodedContent = cdata(block, 'content:encoded') ?? '';
    const sfwdMeta = extractSfwdLessonsMeta(block);
    if (!sfwdMeta) continue;

    if (!byId.has(wpPostId)) {
      byId.set(wpPostId, {
        wpPostId,
        title,
        ldCourseSlug,
        menuOrder,
        encodedContent,
        sfwdMeta,
      });
    }
  }
  return [...byId.values()];
}

function lessonBodyFromParsed(p: ParsedLesson): { contentType: string; contentBody: string | null } {
  const videoRaw =
    phpSerializedStringAfterKey(p.sfwdMeta, 'sfwd-lessons_lesson_video_url')?.trim() ?? '';
  const videoNorm = normalizeVideoUrl(videoRaw);
  const materials = phpSerializedStringAfterKey(p.sfwdMeta, 'sfwd-lessons_lesson_materials')?.trim() ?? '';

  const fromMeta =
    videoNorm && (isHostedVideoUrl(videoNorm) || videoNorm.startsWith('http')) ? videoNorm : '';
  const fromEmbed = firstYoutubeLikeFromHtml(p.encodedContent) || firstYoutubeLikeFromHtml(materials);
  const videoUrl = fromMeta || fromEmbed || '';

  if (videoUrl && (isHostedVideoUrl(videoUrl) || videoUrl.startsWith('http'))) {
    return { contentType: 'video', contentBody: normalizeVideoUrl(videoUrl) };
  }

  const textParts = [materials, p.encodedContent].filter((x) => x && x.trim());
  const body = textParts.join('\n\n').trim() || '<p></p>';
  return { contentType: 'text', contentBody: body };
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function deleteCourseCurriculum(tx: PrismaTx, courseId: string) {
  const modules = await tx.lmsModule.findMany({
    where: { courseId },
    select: { id: true },
  });
  const moduleIds = modules.map((m) => m.id);
  if (moduleIds.length === 0) return;

  const lessons = await tx.lmsLesson.findMany({
    where: { moduleId: { in: moduleIds } },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    await tx.lmsLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
  }

  await tx.lmsModule.deleteMany({ where: { courseId } });
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const wxrPath = process.env.WXR_PATH?.trim() || DEFAULT_WXR;
  const catalogRaw = readFileSync(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(catalogRaw) as unknown;
  if (!isCoursesCatalogFile(catalog)) {
    throw new Error(`Invalid ${CATALOG_PATH}`);
  }

  const seedSlugs = catalog.courses.map((c) => c.slug.trim().toLowerCase());
  const seedTitles = new Set(catalog.courses.map((c) => normTitle(c.title)));
  const excludeSlugs = buildSeedExclusionWpSlugs(seedSlugs, seedTitles);

  const wpRaw = readFileSync(WP_EXPORT_PATH, 'utf8');
  const wpRows = JSON.parse(wpRaw) as WpExportRow[];
  const publishedRows = wpRows.filter(
    (c) => !excludeSlugs.has(c.slug) && (c.status ?? '').trim().toLowerCase() === 'published'
  );
  const wpImportSlugs = new Set(publishedRows.map((r) => r.slug));

  const xml = readFileSync(wxrPath, 'utf8');
  const parsed = parseLessonsFromWxr(xml);
  console.log(`Parsed ${parsed.length} published sfwd-lessons from ${wxrPath}`);

  const dbCourses = await prisma.lmsCourse.findMany({
    where: { slug: { in: [...wpImportSlugs] } },
    select: { id: true, slug: true },
  });
  const dbSlugSet = new Set(dbCourses.map((c) => c.slug));
  const idBySlug = new Map(dbCourses.map((c) => [c.slug, c.id] as const));

  const grouped = new Map<string, ParsedLesson[]>();
  let skippedResolve = 0;
  for (const les of parsed) {
    const candidates = wooCandidatesForLd(les.ldCourseSlug, publishedRows);
    const wooSlug = pickWooSlug(candidates, les.ldCourseSlug, dbSlugSet);
    if (!wooSlug || !wpImportSlugs.has(wooSlug)) {
      skippedResolve += 1;
      continue;
    }
    const list = grouped.get(wooSlug) ?? [];
    list.push(les);
    grouped.set(wooSlug, list);
  }

  if (skippedResolve > 0) {
    console.log(`Skipped ${skippedResolve} lesson(s) (no matching published WP course in DB / import set).`);
  }

  let coursesUpdated = 0;
  let lessonsInserted = 0;

  for (const [wooSlug, lessons] of grouped) {
    if (seedSlugs.includes(wooSlug.toLowerCase())) continue;

    const courseId = idBySlug.get(wooSlug);
    if (!courseId) continue;

    lessons.sort((a, b) => {
      if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
      return a.wpPostId - b.wpPostId;
    });

    const moduleId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await deleteCourseCurriculum(tx, courseId);

      await tx.lmsModule.create({
        data: {
          id: moduleId,
          courseId,
          title: 'Lessons',
          orderIndex: 0,
          lessons: {
            create: lessons.map((les, idx) => {
              const { contentType, contentBody } = lessonBodyFromParsed(les);
              return {
                id: randomUUID(),
                title: les.title,
                contentType,
                contentBody,
                orderIndex: idx,
                isPreview: idx === 0,
                resources: Prisma.JsonNull,
              };
            }),
          },
        },
      });
    });

    coursesUpdated += 1;
    lessonsInserted += lessons.length;
    console.log(`Curriculum: ${wooSlug} — ${lessons.length} lesson(s)`);
  }

  console.log(
    `Done. Updated ${coursesUpdated} course(s), ${lessonsInserted} lesson(s). (Pilot catalog courses untouched.)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
