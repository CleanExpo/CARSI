/** Full banner in the Word doc (uppercase SECTION — avoids matching the early TOC line 5). */
const SECTION_B_BANNER =
  /^SECTION B:\s*MICROBIAL, INFECTION CONTROL & HYGIENE COURSES\s*$/;
const COURSE_HEAD = /^Course (\d+):\s*(.+)$/i;
const MODULE_HEAD = /^Module \d+:/i;
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

function parseAudFromPriceLine(paras: string[], from: number): number {
  for (let j = from; j < Math.min(from + 6, paras.length); j += 1) {
    const line = paras[j]!;
    const m =
      line.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
      line.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (m) return Number.parseFloat(m[1]!);
  }
  return 0;
}

export type MicrobialParsedModule = { title: string; bodyText: string };

export type MicrobialParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  overviewParagraphs: string[];
  modules: MicrobialParsedModule[];
};

/**
 * Parse Section B only from `Microbial.docx` (microbial / infection control / hygiene courses).
 * Uses `Course N: Title`, `Module N:`, and optional `WHAT YOU WILL LEARN` appendix before the series summary.
 */
export function parseMicrobialSectionBCompendium(paras: string[]): MicrobialParsedCourse[] {
  const sectionIdx = paras.findIndex((p) => SECTION_B_BANNER.test(p.trim()));
  if (sectionIdx < 0) {
    throw new Error(
      'Microbial Section B not found (expected SECTION B: MICROBIAL … HYGIENE COURSES).'
    );
  }

  const courseStarts: number[] = [];
  for (let i = sectionIdx + 1; i < paras.length; i += 1) {
    if (COURSE_HEAD.test(paras[i]!)) courseStarts.push(i);
  }

  if (courseStarts.length === 0) {
    throw new Error('No Course N: entries found after Microbial Section B banner.');
  }

  const courses: MicrobialParsedCourse[] = [];

  for (let ci = 0; ci < courseStarts.length; ci += 1) {
    const from = courseStarts[ci]!;
    const to = courseStarts[ci + 1] ?? paras.length;
    let block = paras.slice(from, to);

    const cm = block[0]!.match(COURSE_HEAD);
    const title = cm?.[2]?.trim();
    if (!title) continue;

    const priceAud = parseAudFromPriceLine(block, 1);

    let i = 1;
    while (
      i < block.length &&
      !/^Course Overview:?\s*/i.test(block[i]!) &&
      !MODULE_HEAD.test(block[i]!)
    ) {
      i += 1;
    }

    const overviewParagraphs: string[] = [];
    if (i < block.length && /^Course Overview:/i.test(block[i]!)) {
      const ov = block[i]!.replace(/^Course Overview:\s*/i, '').trim();
      if (ov) overviewParagraphs.push(ov);
      i += 1;
    } else if (i < block.length && /^Course Overview\s*$/i.test(block[i]!)) {
      i += 1;
      while (i < block.length && !MODULE_HEAD.test(block[i]!)) {
        overviewParagraphs.push(block[i]!);
        i += 1;
      }
    }

    const modules: MicrobialParsedModule[] = [];
    while (i < block.length && MODULE_HEAD.test(block[i]!)) {
      const modTitle = block[i]!.trim();
      i += 1;
      const bodyParas: string[] = [];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !COURSE_HEAD.test(block[i]!) &&
        !SERIES_TRAILER_HEAD.test(block[i]!)
      ) {
        bodyParas.push(block[i]!);
        i += 1;
      }
      modules.push({ title: modTitle, bodyText: bodyParas.join('\n\n') });
    }

    if (i < block.length && SERIES_TRAILER_HEAD.test(block[i]!)) {
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
