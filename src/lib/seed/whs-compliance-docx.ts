const COURSE_HEAD = /^COURSE #\d+:\s*(.+)$/i;
const MODULE_HEAD = /^Module \d+:/i;
/** Series-level trailer appended after the final course in the compendium (not part of the last module body). */
const SERIES_TRAILER_HEAD = /^WHAT YOU WILL LEARN\b/i;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

function parseAudFromPublishedLine(paras: string[], startIdx: number): number {
  for (let j = startIdx; j < Math.min(startIdx + 8, paras.length); j += 1) {
    const line = paras[j]!;
    const m =
      line.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
      line.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return Number.parseFloat(m[1]!);
  }
  return 0;
}

function findWhsCourseStarts(paras: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < paras.length; i += 1) {
    if (COURSE_HEAD.test(paras[i]!)) out.push(i);
  }
  return out;
}

export type WhsComplianceParsedModule = {
  title: string;
  bodyText: string;
};

export type WhsComplianceParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  overviewParagraphs: string[];
  modules: WhsComplianceParsedModule[];
};

/**
 * Parse CARSI WHS / Compliance compendium (.docx paragraphs).
 * Blocks start at `COURSE #NN: Title`; modules use `Module N: …` on one line.
 */
export function parseWhsComplianceCompendium(paras: string[]): WhsComplianceParsedCourse[] {
  const starts = findWhsCourseStarts(paras);
  if (starts.length === 0) {
    throw new Error('No WHS / Compliance course sections found (expected COURSE #NN: …).');
  }

  const courses: WhsComplianceParsedCourse[] = [];

  for (let ci = 0; ci < starts.length; ci += 1) {
    const from = starts[ci]!;
    const to = starts[ci + 1] ?? paras.length;
    const block = paras.slice(from, to);

    const titleMatch = block[0]!.match(COURSE_HEAD);
    const title = titleMatch?.[1]?.trim();
    if (!title) continue;

    const priceAud = parseAudFromPublishedLine(block, 1);

    let i = 2;
    const overviewParagraphs: string[] = [];
    while (i < block.length && !MODULE_HEAD.test(block[i]!)) {
      overviewParagraphs.push(block[i]!);
      i += 1;
    }

    const modules: WhsComplianceParsedModule[] = [];
    while (i < block.length && MODULE_HEAD.test(block[i]!)) {
      const modTitle = block[i]!;
      i += 1;
      const bodyParas: string[] = [];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !SERIES_TRAILER_HEAD.test(block[i]!)
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
