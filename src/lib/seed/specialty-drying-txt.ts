const COURSE_HEAD = /^COURSE #(\d+)\s*$/i;
const MODULE_HEAD = /^Module (\d+):\s*(.*)$/i;
const DASH_RULE = /^-{10,}\s*$/;
const WHAT_YOU_LEARN = /^WHAT YOU WILL LEARN\b/i;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'course';
}

function parsePriceLine(line: string): { priceAud: number; isFree: boolean } {
  const t = line.trim();
  if (/^Price:\s*Free\s*$/i.test(t)) return { priceAud: 0, isFree: true };
  const m =
    t.match(/Price:\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
    t.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i);
  if (m) return { priceAud: Number.parseFloat(m[1]!), isFree: false };
  return { priceAud: 0, isFree: false };
}

export type SpecialtyDryingParsedModule = { title: string; bodyText: string };

export type SpecialtyDryingParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  overviewParagraphs: string[];
  modules: SpecialtyDryingParsedModule[];
};

/**
 * Parse `contents_specialty_drying_courses.txt` — `COURSE #N`, `Module K:`, dashed section dividers.
 */
export function parseSpecialtyDryingTxt(text: string): SpecialtyDryingParsedCourse[] {
  const lines = text.split(/\r?\n/);
  const courses: SpecialtyDryingParsedCourse[] = [];

  let i = 0;
  while (i < lines.length) {
    const hm = lines[i].match(COURSE_HEAD);
    if (!hm) {
      i += 1;
      continue;
    }

    i += 1;
    while (i < lines.length && lines[i]!.trim() === '') i += 1;

    let title = '';
    if (i < lines.length && !/^Price:\s*/i.test(lines[i]!) && !/^={3,}/.test(lines[i]!)) {
      title = lines[i]!.trim();
      i += 1;
    }

    let priceAud = 0;
    let isFree = false;
    while (i < lines.length && !/^={10,}/.test(lines[i]!) && !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) {
      if (/^Price:\s*/i.test(lines[i]!)) {
        const p = parsePriceLine(lines[i]!);
        priceAud = p.priceAud;
        isFree = p.isFree;
      }
      i += 1;
    }

    while (i < lines.length && /^={3,}/.test(lines[i]!)) i += 1;
    while (i < lines.length && lines[i]!.trim() === '') i += 1;

    if (i >= lines.length || !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) {
      continue;
    }
    i += 1;
    while (i < lines.length && lines[i]!.trim() === '') i += 1;

    const overviewParagraphs: string[] = [];
    while (
      i < lines.length &&
      !DASH_RULE.test(lines[i]!) &&
      !MODULE_HEAD.test(lines[i]!) &&
      !COURSE_HEAD.test(lines[i]!) &&
      !WHAT_YOU_LEARN.test(lines[i]!)
    ) {
      const t = lines[i]!.trim();
      if (t) overviewParagraphs.push(lines[i]!);
      i += 1;
    }

    if (DASH_RULE.test(lines[i] ?? '')) i += 1;
    while (i < lines.length && lines[i]!.trim() === '') i += 1;

    const modules: SpecialtyDryingParsedModule[] = [];

    while (i < lines.length) {
      if (COURSE_HEAD.test(lines[i]!)) break;
      if (/^={10,}.*CONSOLIDATED WHAT YOU WILL LEARN/i.test(lines[i]!)) break;
      if (/^END OF DOCUMENT/i.test(lines[i]!)) break;

      if (DASH_RULE.test(lines[i] ?? '')) {
        i += 1;
        continue;
      }

      const mm = lines[i].match(MODULE_HEAD);
      if (mm) {
        const modTitle = lines[i]!.trim();
        i += 1;
        if (DASH_RULE.test(lines[i] ?? '')) i += 1;
        const bodyLines: string[] = [];
        while (
          i < lines.length &&
          !DASH_RULE.test(lines[i]!) &&
          !MODULE_HEAD.test(lines[i]!) &&
          !COURSE_HEAD.test(lines[i]!) &&
          !WHAT_YOU_LEARN.test(lines[i]!)
        ) {
          bodyLines.push(lines[i]!);
          i += 1;
        }
        modules.push({ title: modTitle, bodyText: bodyLines.join('\n').trim() });
        continue;
      }

      if (WHAT_YOU_LEARN.test(lines[i]!)) {
        const rest = lines.slice(i);
        let end = rest.length;
        for (let j = 1; j < rest.length; j += 1) {
          if (COURSE_HEAD.test(rest[j]!) || /^={10,}.*CONSOLIDATED/i.test(rest[j]!)) {
            end = j;
            break;
          }
        }
        const appendix = rest.slice(0, end);
        const head = appendix[0]?.trim() ?? '';
        const useHead = head.length > 0 && head.length <= 100;
        modules.push({
          title: useHead ? head : 'Supplementary content',
          bodyText: useHead ? appendix.slice(1).join('\n\n').trim() : appendix.join('\n\n').trim(),
        });
        i += end;
        break;
      }

      i += 1;
    }

    if (title) {
      courses.push({
        title,
        slug: slugify(title),
        priceAud,
        isFree,
        overviewParagraphs,
        modules,
      });
    }
  }

  return courses;
}
