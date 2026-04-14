/** @deprecated import from `@/lib/seed/docx-extract` */
export { extractDocxParagraphs } from '@/lib/seed/docx-extract';

export type AirQualityParsedModule = { title: string; bodyParagraphs: string[] };

export type AirQualityParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  overviewParagraphs: string[];
  modules: AirQualityParsedModule[];
};

const COURSE_HEADER = /^Course \d+:\s*(.+)$/;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

/**
 * Parse CARSI "AIR QUALITY COURSES" compendium: one block per `Course N:` section.
 * Any lines after the last `Module M:` in the final course become an extra module so nothing is dropped.
 */
export function parseAirQualityCompendium(paras: string[]): AirQualityParsedCourse[] {
  const starts: number[] = [];
  for (let i = 0; i < paras.length; i += 1) {
    if (COURSE_HEADER.test(paras[i]!)) starts.push(i);
  }
  if (starts.length === 0) {
    throw new Error('No "Course N:" sections found in document');
  }

  const courses: AirQualityParsedCourse[] = [];

  for (let ci = 0; ci < starts.length; ci += 1) {
    const from = starts[ci]!;
    const to = starts[ci + 1] ?? paras.length;
    const block = paras.slice(from, to);

    const hm = block[0]!.match(COURSE_HEADER);
    if (!hm) continue;
    const title = hm[1]!.trim();

    let i = 1;
    if (block[i]?.startsWith('Status:')) i += 1;

    let priceAud = 29;
    const priceLine = block[i];
    if (priceLine?.startsWith('Price:')) {
      const pm = priceLine.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (pm) priceAud = Number.parseFloat(pm[1]!);
      i += 1;
    }

    if (block[i] === 'Course Overview') i += 1;

    const overviewParagraphs: string[] = [];
    while (i < block.length && !/^Module \d+:/.test(block[i]!)) {
      overviewParagraphs.push(block[i]!);
      i += 1;
    }

    const modules: AirQualityParsedModule[] = [];
    while (i < block.length && /^Module \d+:/.test(block[i]!)) {
      const modTitle = block[i]!;
      i += 1;
      const bodyParagraphs: string[] = [];
      while (i < block.length && !/^Module \d+:/.test(block[i]!)) {
        // Shared compendium footer after the last numbered module — own LMS module
        if (block[i] === 'WHAT YOU WILL LEARN') break;
        bodyParagraphs.push(block[i]!);
        i += 1;
      }
      modules.push({ title: modTitle, bodyParagraphs });
    }

    if (i < block.length) {
      const rest = block.slice(i);
      const appendixTitle =
        rest[0] === 'WHAT YOU WILL LEARN'
          ? 'WHAT YOU WILL LEARN'
          : 'Additional content (from source document)';
      const appendixBody = rest[0] === 'WHAT YOU WILL LEARN' ? rest.slice(1) : rest;
      modules.push({
        title: appendixTitle,
        bodyParagraphs: appendixBody,
      });
    }

    courses.push({
      title,
      slug: slugify(title),
      priceAud,
      overviewParagraphs,
      modules,
    });
  }

  return courses;
}

export function paragraphsToLessonHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p) => {
      const esc = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      return `<p>${esc}</p>`;
    })
    .join('\n');
}
