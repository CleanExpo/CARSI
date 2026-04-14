const SECTION_BANNER = 'SAFETY & PPE COURSES';
const MODULE_HEAD = /^MODULE (\d+)$/i;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

function parseAudFromMetadata(paras: string[], startIdx: number): number {
  // Layout: ... Price, $29 AUD at startIdx+4, startIdx+5 typically
  for (let j = startIdx; j < Math.min(startIdx + 12, paras.length); j += 1) {
    const line = paras[j]!;
    const m =
      line.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
      line.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return Number.parseFloat(m[1]!);
  }
  return 0;
}

function findCourseSectionStarts(paras: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < paras.length - 2; i += 1) {
    if (paras[i] === SECTION_BANNER && paras[i + 2] === 'Course') {
      out.push(i);
    }
  }
  return out;
}

export type SafetyPpeParsedModule = {
  /** LMS module title (includes MODULE N and doc subtitle line when present). */
  title: string;
  /** Plain text only; paragraphs joined with blank lines — no HTML. */
  bodyText: string;
};

export type SafetyPpeParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  overviewParagraphs: string[];
  modules: SafetyPpeParsedModule[];
};

/**
 * Parse `CARSI` Safety & PPE compendium (.docx paragraphs).
 * Course blocks begin at `SAFETY & PPE COURSES` where the third line is `Course` (detail sections, not the table of contents).
 */
export function parseSafetyPpeCompendium(paras: string[]): SafetyPpeParsedCourse[] {
  const starts = findCourseSectionStarts(paras);
  if (starts.length === 0) {
    throw new Error('No Safety & PPE course sections found (expected SAFETY & PPE COURSES + Course metadata).');
  }

  const courses: SafetyPpeParsedCourse[] = [];

  for (let ci = 0; ci < starts.length; ci += 1) {
    const from = starts[ci]!;
    const to = starts[ci + 1] ?? paras.length;
    const block = paras.slice(from, to);

    const title = block[1]?.trim();
    if (!title) continue;

    const priceAud = parseAudFromMetadata(block, 0);

    let i = 2;
    while (i < block.length && block[i] !== 'Course Overview') {
      i += 1;
    }
    if (block[i] === 'Course Overview') i += 1;

    const overviewParagraphs: string[] = [];
    while (i < block.length && !MODULE_HEAD.test(block[i]!)) {
      overviewParagraphs.push(block[i]!);
      i += 1;
    }

    const modules: SafetyPpeParsedModule[] = [];
    while (i < block.length && MODULE_HEAD.test(block[i]!)) {
      const modLabel = block[i]!;
      i += 1;
      const titleParts = [modLabel];
      if (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        block[i] !== SECTION_BANNER
      ) {
        titleParts.push(block[i]!);
        i += 1;
      }
      const modTitle = titleParts.join(' — ');

      const bodyParas: string[] = [];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        block[i] !== SECTION_BANNER
      ) {
        bodyParas.push(block[i]!);
        i += 1;
      }
      modules.push({
        title: modTitle,
        bodyText: bodyParas.join('\n\n'),
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
