const COURSE_BLOCK_HEAD = /^COURSE (\d+) OF (\d+)$/i;
const MODULE_HEAD = /^MODULE (\d+)$/i;
const COVERED_LINE = /what you have covered in this course/i;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

function parseAudFromCourseBlock(block: string[]): number {
  for (let j = 0; j < Math.min(6, block.length); j += 1) {
    const line = block[j]!;
    const m =
      line.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
      line.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return Number.parseFloat(m[1]!);
  }
  return 0;
}

function findMarketingCourseStarts(paras: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < paras.length; i += 1) {
    if (COURSE_BLOCK_HEAD.test(paras[i]!)) out.push(i);
  }
  return out;
}

export type MarketingBusinessParsedModule = {
  title: string;
  bodyText: string;
};

export type MarketingBusinessParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  overviewParagraphs: string[];
  modules: MarketingBusinessParsedModule[];
};

/**
 * Parse CARSI Marketing & Business 6-course compendium (.docx paragraphs).
 * Blocks start at `COURSE N OF M`; modules use `MODULE N` plus the following subtitle line when present.
 */
export function parseMarketingBusinessCompendium(paras: string[]): MarketingBusinessParsedCourse[] {
  const starts = findMarketingCourseStarts(paras);
  if (starts.length === 0) {
    throw new Error('No Marketing & Business course sections found (expected COURSE N OF M).');
  }

  const courses: MarketingBusinessParsedCourse[] = [];

  for (let ci = 0; ci < starts.length; ci += 1) {
    const from = starts[ci]!;
    const to = starts[ci + 1] ?? paras.length;
    const block = paras.slice(from, to);

    const title = block[1]?.trim();
    if (!title) continue;

    const priceAud = parseAudFromCourseBlock(block);

    let overviewIdx = block.findIndex((l) => l === 'Course Overview');
    if (overviewIdx < 0) overviewIdx = 2;
    else overviewIdx += 1;

    let i = overviewIdx;
    const overviewParagraphs: string[] = [];
    while (i < block.length && !MODULE_HEAD.test(block[i]!)) {
      overviewParagraphs.push(block[i]!);
      i += 1;
    }

    const modules: MarketingBusinessParsedModule[] = [];
    while (i < block.length && MODULE_HEAD.test(block[i]!)) {
      const modLabel = block[i]!;
      i += 1;
      const titleParts = [modLabel];
      if (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !COVERED_LINE.test(block[i]!)
      ) {
        titleParts.push(block[i]!);
        i += 1;
      }
      const modTitle = titleParts.join(' — ');

      const bodyParas: string[] = [];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !COVERED_LINE.test(block[i]!)
      ) {
        bodyParas.push(block[i]!);
        i += 1;
      }
      modules.push({
        title: modTitle,
        bodyText: bodyParas.join('\n\n'),
      });
    }

    if (i < block.length) {
      const rest = block.slice(i);
      const head = rest[0]?.trim() ?? '';
      const useHead = head.length > 0 && head.length <= 100;
      modules.push({
        title: useHead ? head : 'Supplementary content',
        bodyText: useHead ? rest.slice(1).join('\n\n') : rest.join('\n\n'),
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
