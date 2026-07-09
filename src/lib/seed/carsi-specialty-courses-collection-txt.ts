import { randomUUID } from 'node:crypto';

import { hoistObjectivesFirst } from '@/lib/seed/objectives-module';
import { sanitizeLearnerContent } from '@/lib/seed/sanitize-learner-content';

export type SpecialtyParsedModule = { title: string; bodyText: string };

export type SpecialtyParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  iicrcDiscipline: string | null;
  overviewParagraphs: string[];
  modules: SpecialtyParsedModule[];
};

const COURSE_HEAD = /^COURSE\s+(\d+)\s*$/i;
const MODULE_HEAD = /^MODULE\s+(\d+):\s*(.+)$/i;
const WHAT_YOU_LEARN = /^WHAT YOU WILL LEARN\b/i;

export function slugifySpecialtyCourseTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return base || `course-${randomUUID().slice(0, 8)}`;
}

export function specialtyCourseBaseTitle(title: string): string {
  return title.split('|')[0]?.trim() ?? title.trim();
}

function parsePriceLine(line: string): {
  priceAud: number;
  isFree: boolean;
  iicrcDiscipline: string | null;
} {
  const t = line.trim();
  const free = /Price:\s*Free\b/i.test(t);
  const n = t.match(/Price:\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i);
  const priceAud = free ? 0 : n ? Number.parseFloat(n[1] ?? '0') : 0;
  const d = t.match(/IICRC:\s*([A-Z0-9/,\s-]+)/i);
  return {
    priceAud,
    isFree: free || priceAud === 0,
    iicrcDiscipline: d?.[1]?.trim() ?? null,
  };
}

function isDivider(line: string): boolean {
  return /^={10,}\s*$/.test(line.trim());
}

/** Parse `data/CARSI_Specialty_Courses_Collection.txt` course blocks. */
export function parseSpecialtyCoursesCollectionTxt(raw: string): SpecialtyParsedCourse[] {
  const lines = raw.split(/\r?\n/);
  const courses: SpecialtyParsedCourse[] = [];
  let i = 0;

  while (i < lines.length) {
    const head = lines[i]?.trim() ?? '';
    if (!COURSE_HEAD.test(head)) {
      i += 1;
      continue;
    }

    i += 1;
    while (i < lines.length && lines[i].trim() === '') i += 1;
    const title = (lines[i] ?? '').trim();
    i += 1;
    const priceLine = (lines[i] ?? '').trim();
    i += 1;
    if (/^Role:/i.test(lines[i] ?? '')) i += 1;

    const meta = parsePriceLine(priceLine);

    while (i < lines.length && !/^COURSE OVERVIEW\s*$/i.test(lines[i].trim())) i += 1;
    if (i >= lines.length) break;
    i += 1;

    const overviewParagraphs: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (COURSE_HEAD.test(t) || MODULE_HEAD.test(t) || WHAT_YOU_LEARN.test(t)) break;
      if (!isDivider(t) && t !== '') overviewParagraphs.push(lines[i]);
      i += 1;
    }

    const modules: SpecialtyParsedModule[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (COURSE_HEAD.test(t)) break;

      const mm = t.match(MODULE_HEAD);
      if (mm) {
        const moduleTitle = `MODULE ${mm[1]}: ${mm[2]}`.trim();
        i += 1;
        const body: string[] = [];
        while (i < lines.length) {
          const x = lines[i].trim();
          if (COURSE_HEAD.test(x) || MODULE_HEAD.test(x) || WHAT_YOU_LEARN.test(x)) break;
          if (!isDivider(x) && x !== '') body.push(lines[i]);
          i += 1;
        }
        modules.push({ title: moduleTitle, bodyText: body.join('\n\n').trim() });
        continue;
      }

      if (WHAT_YOU_LEARN.test(t)) {
        i += 1;
        const body: string[] = [];
        while (i < lines.length) {
          const x = lines[i].trim();
          if (COURSE_HEAD.test(x)) break;
          if (!isDivider(x) && x !== '') body.push(lines[i]);
          i += 1;
        }
        if (body.length > 0) {
          modules.push({
            title: 'WHAT YOU WILL LEARN',
            bodyText: body.join('\n\n').trim(),
          });
        }
        continue;
      }

      i += 1;
    }

    if (title) {
      courses.push({
        title,
        slug: slugifySpecialtyCourseTitle(title),
        priceAud: meta.priceAud,
        isFree: meta.isFree,
        iicrcDiscipline: meta.iicrcDiscipline,
        overviewParagraphs,
        // GP-434: the source doc places WHAT YOU WILL LEARN last; learners see objectives first.
        modules: hoistObjectivesFirst(modules),
      });
    }
  }
  return courses.map((c) => ({
    ...c,
    overviewParagraphs: c.overviewParagraphs
      .map((p) => sanitizeLearnerContent(p) ?? '')
      .filter(Boolean),
    modules: c.modules.map((m) => ({
      ...m,
      bodyText: sanitizeLearnerContent(m.bodyText) ?? '',
    })),
  }));
}
