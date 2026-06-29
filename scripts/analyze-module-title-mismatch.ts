/**
 * Find courses whose title claims 5/6 modules but DB has <=2 modules.
 * Maps slugs to likely seed source files.
 */
import 'dotenv/config';

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/lib/prisma';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DATA_SOURCES = [
  { file: 'data/CARSI_Specialty_Courses_Collection.txt', seedScript: 'scripts/seed-carsi-specialty-courses-collection-txt.ts' },
  { file: 'data/CONTENTS & SPECIALTY DRYING COURSES.txt', seedScript: 'scripts/seed-contents-specialty-drying-courses-txt.ts' },
  { file: 'data/contents_specialty_drying_courses.txt', seedScript: 'scripts/seed-contents-specialty-drying-courses-txt.ts' },
  { file: 'data/technology_inspection_tools_courses.txt', seedScript: 'scripts/seed-technology-inspection-tools-txt.ts' },
  { file: 'data/specialty_courses_resources.txt', seedScript: 'scripts/seed-specialty-courses-resources-txt.ts' },
  { file: 'data/water_damage_restoration_courses.txt', seedScript: 'scripts/seed-water-damage-txt.ts' },
  { file: 'data/seed/courses-catalog.json', seedScript: 'scripts/seed-courses-catalog.ts' },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function claimedModules(title: string): number | null {
  const m = title.match(/\|\s*(\d+)\s*Modules?\s*$/i) ?? title.match(/(\d+)\s*Modules?\s*$/i);
  return m ? Number(m[1]) : null;
}

function baseTitle(title: string): string {
  return title.split('|')[0]?.trim() ?? title;
}

function indexTxtCourses(path: string): Map<string, { title: string; moduleHeaders: number }> {
  const map = new Map<string, { title: string; moduleHeaders: number }>();
  if (!existsSync(path)) return map;
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  let currentTitle = '';
  let moduleCount = 0;

  const flush = () => {
    if (!currentTitle) return;
    const slug = slugify(currentTitle);
    map.set(slug, { title: currentTitle, moduleHeaders: moduleCount });
    const base = slugify(baseTitle(currentTitle));
    if (base !== slug) map.set(base, { title: currentTitle, moduleHeaders: moduleCount });
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^COURSE\s+\d+/i.test(t) || /^Course\s*#/i.test(t)) {
      flush();
      currentTitle = '';
      moduleCount = 0;
      continue;
    }
    if (/^MODULE\s+\d+:/i.test(t)) {
      moduleCount += 1;
      continue;
    }
    if (/^Price:/i.test(t) && !currentTitle) {
      // title usually on line before price in specialty collection
      continue;
    }
    if (
      currentTitle === '' &&
      t &&
      !/^={3,}/.test(t) &&
      !/^Price:/i.test(t) &&
      !/^Role:/i.test(t) &&
      !/^COURSE OVERVIEW/i.test(t)
    ) {
      // Heuristic: first substantive line after COURSE N
      if (t.length > 10 && !/^Total:/i.test(t)) currentTitle = t;
    }
    if (/^={10,}/.test(t) && currentTitle) {
      // end of course header block — keep title
    }
  }
  flush();
  return map;
}

async function main() {
  const sourceIndex = new Map<string, typeof DATA_SOURCES[number]>();
  for (const src of DATA_SOURCES) {
    const full = join(ROOT, src.file);
    const idx = indexTxtCourses(full);
    for (const [slug] of idx) {
      if (!sourceIndex.has(slug)) sourceIndex.set(slug, src);
    }
    if (existsSync(full)) {
      sourceIndex.set(`__file__:${src.file}`, src);
    }
  }

  const courses = await prisma.lmsCourse.findMany({
    orderBy: { slug: 'asc' },
    select: {
      slug: true,
      title: true,
      category: true,
      _count: { select: { modules: true } },
      modules: { select: { title: true }, orderBy: { orderIndex: 'asc' }, take: 3 },
    },
  });

  const mismatches = courses
    .map((c) => {
      const claimed = claimedModules(c.title);
      if (claimed !== 5 && claimed !== 6) return null;
      if (c._count.modules > 2) return null;
      const base = slugify(baseTitle(c.title));
      let source = sourceIndex.get(c.slug) ?? sourceIndex.get(base);
      if (!source) {
        for (const src of DATA_SOURCES) {
          const full = join(ROOT, src.file);
          if (!existsSync(full)) continue;
          const raw = readFileSync(full, 'utf8');
          if (raw.includes(baseTitle(c.title)) || raw.includes(c.title.split('|')[0]?.trim() ?? '')) {
            source = src;
            break;
          }
        }
      }
      const txtPath = source ? join(ROOT, source.file) : null;
      let txtModules: number | null = null;
      if (txtPath && existsSync(txtPath)) {
        const idx = indexTxtCourses(txtPath);
        txtModules = idx.get(c.slug)?.moduleHeaders ?? idx.get(base)?.moduleHeaders ?? null;
      }
      return {
        slug: c.slug,
        title: c.title,
        category: c.category,
        claimedModules: claimed,
        dbModules: c._count.modules,
        txtModulesInDataFile: txtModules,
        sampleModuleTitles: c.modules.map((m) => m.title),
        dataFile: source?.file ?? 'unknown (likely WordPress / manual import)',
        seedScript: source?.seedScript ?? 'scripts/seed-wordpress-export-courses.ts or admin',
      };
    })
    .filter(Boolean);

  console.log(JSON.stringify({ count: mismatches.length, courses: mismatches }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
