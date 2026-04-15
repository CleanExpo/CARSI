const COURSE_HEAD = /^Course \d+(?:\s*\/\s*\d+)?:\s*(.+)$/i;
const MODULE_HEAD = /^Module \d+:/i;
const SECTION_HEAD = /^SECTION \d+:/i;
const DIVIDER = /^_+$/;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

function parsePriceAud(block: string[]): number {
  for (let i = 0; i < Math.min(8, block.length); i += 1) {
    const line = block[i]!;
    if (/free/i.test(line)) return 0;
    const m =
      line.match(/AUD\s*\$?\s*([0-9]+(?:\.[0-9]+)?)/i) ||
      line.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i);
    if (m) return Number.parseFloat(m[1]!);
  }
  return 0;
}

function parseIicrcDiscipline(block: string[]): string | null {
  for (let i = 0; i < Math.min(10, block.length); i += 1) {
    const line = block[i]!;
    const m = line.match(/IICRC:\s*([A-Z/ -]+)/i);
    if (m) return m[1]!.trim();
  }
  return null;
}

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  return t.length === 0 || DIVIDER.test(t) || /^carsi\.com\.au$/i.test(t) || /^Courses in this section:?$/i.test(t);
}

export type OdourSmokeParsedModule = { title: string; bodyText: string };

export type OdourSmokeParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  iicrcDiscipline: string | null;
  overviewParagraphs: string[];
  modules: OdourSmokeParsedModule[];
};

/**
 * Parse CARSI consolidated DOCX containing odour, smoke, psychrometry, and structural drying courses.
 * Supports both fully expanded module courses and compact "Course N: ... | ... | Modules: X" summaries.
 */
export function parseOdourSmokePsychroDryingCompendium(paras: string[]): OdourSmokeParsedCourse[] {
  const starts: number[] = [];
  for (let i = 0; i < paras.length; i += 1) {
    if (COURSE_HEAD.test(paras[i]!)) starts.push(i);
  }

  if (starts.length === 0) {
    throw new Error('No "Course N: Title" blocks found in CARSI_Odour_Smoke_Psychro_Drying.docx.');
  }

  const courses: OdourSmokeParsedCourse[] = [];

  for (let ci = 0; ci < starts.length; ci += 1) {
    const from = starts[ci]!;
    const to = starts[ci + 1] ?? paras.length;
    const block = paras.slice(from, to);

    const hm = block[0]!.match(COURSE_HEAD);
    const title = hm?.[1]?.trim();
    if (!title) continue;

    const priceAud = parsePriceAud(block);
    const isFree = priceAud <= 0;
    const iicrcDiscipline = parseIicrcDiscipline(block);

    let i = 1;
    // Skip metadata / list lines before overview or modules.
    while (
      i < block.length &&
      !/^Course Overview:/i.test(block[i]!) &&
      !/^Course Overview\s*$/i.test(block[i]!) &&
      !MODULE_HEAD.test(block[i]!) &&
      !/^Modules:/i.test(block[i]!)
    ) {
      i += 1;
    }

    const overviewParagraphs: string[] = [];
    if (i < block.length && /^Course Overview:/i.test(block[i]!)) {
      const inline = block[i]!.replace(/^Course Overview:\s*/i, '').trim();
      if (inline) overviewParagraphs.push(inline);
      i += 1;
    } else if (i < block.length && /^Course Overview\s*$/i.test(block[i]!)) {
      i += 1;
    }

    // Collect plain overview lines before modules begin.
    while (
      i < block.length &&
      !MODULE_HEAD.test(block[i]!) &&
      !/^Modules:/i.test(block[i]!) &&
      !SECTION_HEAD.test(block[i]!) &&
      !/^WHAT YOU WILL LEARN\b/i.test(block[i]!)
    ) {
      if (!isNoiseLine(block[i]!)) overviewParagraphs.push(block[i]!);
      i += 1;
    }

    const modules: OdourSmokeParsedModule[] = [];

    // Compact "Modules: ..." summary line becomes one lesson module.
    if (i < block.length && /^Modules:/i.test(block[i]!)) {
      const modLine = block[i]!;
      i += 1;
      const compactBody: string[] = [modLine];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !SECTION_HEAD.test(block[i]!) &&
        !/^WHAT YOU WILL LEARN\b/i.test(block[i]!)
      ) {
        if (!isNoiseLine(block[i]!)) compactBody.push(block[i]!);
        i += 1;
      }
      modules.push({
        title: 'Course modules and summary',
        bodyText: compactBody.join('\n\n').trim(),
      });
    }

    while (i < block.length && MODULE_HEAD.test(block[i]!)) {
      const modTitle = block[i]!.trim();
      i += 1;
      const body: string[] = [];
      while (
        i < block.length &&
        !MODULE_HEAD.test(block[i]!) &&
        !SECTION_HEAD.test(block[i]!) &&
        !/^WHAT YOU WILL LEARN\b/i.test(block[i]!)
      ) {
        if (!isNoiseLine(block[i]!)) body.push(block[i]!);
        i += 1;
      }
      modules.push({ title: modTitle, bodyText: body.join('\n\n').trim() });
    }

    if (i < block.length) {
      const rest = block.slice(i).filter((p) => !isNoiseLine(p));
      if (rest.length > 0) {
        const head = rest[0]!;
        const useHead = head.length <= 120;
        modules.push({
          title: useHead ? head : 'Supplementary content',
          bodyText: useHead ? rest.slice(1).join('\n\n').trim() : rest.join('\n\n').trim(),
        });
      }
    }

    courses.push({
      title,
      slug: slugify(title),
      priceAud,
      isFree,
      iicrcDiscipline,
      overviewParagraphs,
      modules,
    });
  }

  return courses;
}
