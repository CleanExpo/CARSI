const COURSE_HEADER = /^COURSE (\d+) OF (\d+)\s*$/i;
const MODULE_HEAD = /^MODULE (\d+):\s*(.*)$/i;
const DASH_RULE = /^-{3,}\s*$/;
const WHAT_YOU_LEARN = /^WHAT YOU WILL LEARN\b/i;
const END_DOC = /^END OF WATER DAMAGE/i;
const END_DOC_GENERIC = /^END OF DOCUMENT\b/i;

function isEndDocLine(line: string): boolean {
  return END_DOC.test(line) || END_DOC_GENERIC.test(line);
}

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
  if (/^Price:\s*FREE\b/i.test(t)) return { priceAud: 0, isFree: true };
  const m =
    t.match(/Price:\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i) ||
    t.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*AUD/i);
  if (m) return { priceAud: Number.parseFloat(m[1]!), isFree: false };
  return { priceAud: 0, isFree: false };
}

export type WaterDamageParsedModule = { title: string; bodyText: string };

export type WaterDamageParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  /** From `IICRC Discipline:` line when present (e.g. WRT or WRT / ASD). */
  iicrcDiscipline: string | null;
  overviewParagraphs: string[];
  modules: WaterDamageParsedModule[];
};

/**
 * Parse `water_damage_restoration_courses.txt` and `CONTENTS & SPECIALTY DRYING COURSES.txt` —
 * `COURSE N OF M`, optional `Course Title:` or bare title line, `COURSE OVERVIEW`, `MODULE K:` sections.
 */
export function parseWaterDamageRestorationTxt(text: string): WaterDamageParsedCourse[] {
  const lines = text.split(/\r?\n/);
  const courses: WaterDamageParsedCourse[] = [];

  let i = 0;
  while (i < lines.length) {
    const hm = lines[i].match(COURSE_HEADER);
    if (!hm) {
      i += 1;
      continue;
    }

    i += 1;
    let title = '';
    let priceAud = 0;
    let isFree = false;
    let iicrcDiscipline: string | null = null;

    while (i < lines.length && !/^={10,}/.test(lines[i]!) && !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) {
      const line = lines[i]!;
      const tm = line.match(/^Course Title:\s*(.+)$/i);
      if (tm) title = tm[1]!.trim();
      if (/^Price:\s*/i.test(line)) {
        const p = parsePriceLine(line);
        priceAud = p.priceAud;
        isFree = p.isFree;
      }
      const dm = line.match(/^IICRC Discipline:\s*(.+)$/i);
      if (dm) iicrcDiscipline = dm[1]!.trim();
      if (
        !tm &&
        line.trim() &&
        !/^Price:\s*/i.test(line) &&
        !/^Course Number:\s*/i.test(line) &&
        !/^Total Modules:\s*/i.test(line) &&
        !/^IICRC Discipline:\s*/i.test(line) &&
        !/^Status:\s*/i.test(line)
      ) {
        if (!title) title = line.trim();
      }
      i += 1;
    }

    while (i < lines.length && /^={10,}/.test(lines[i]!)) i += 1;
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
      !COURSE_HEADER.test(lines[i]!)
    ) {
      const t = lines[i]!.trim();
      if (t && !isEndDocLine(t)) overviewParagraphs.push(lines[i]!);
      i += 1;
    }

    if (DASH_RULE.test(lines[i] ?? '')) i += 1;
    while (i < lines.length && lines[i]!.trim() === '') i += 1;

    const modules: WaterDamageParsedModule[] = [];

    while (i < lines.length) {
      if (COURSE_HEADER.test(lines[i]!)) break;
      if (isEndDocLine(lines[i]!)) break;
      if (/^={10,}.*END/i.test(lines[i]!)) break;

      if (/^={3,}\s*$/.test(lines[i]!.trim())) {
        i += 1;
        continue;
      }

      const mm = lines[i].match(MODULE_HEAD);
      if (mm) {
        const modTitle = lines[i]!.trim();
        i += 1;
        if (DASH_RULE.test(lines[i] ?? '')) i += 1;
        while (i < lines.length && lines[i]!.trim() === '') i += 1;
        const bodyLines: string[] = [];
        while (
          i < lines.length &&
          !DASH_RULE.test(lines[i]!) &&
          !MODULE_HEAD.test(lines[i]!) &&
          !COURSE_HEADER.test(lines[i]!) &&
          !WHAT_YOU_LEARN.test(lines[i]!)
        ) {
          bodyLines.push(lines[i]!);
          i += 1;
        }
        if (DASH_RULE.test(lines[i] ?? '')) i += 1;
        modules.push({ title: modTitle, bodyText: bodyLines.join('\n').trim() });
        continue;
      }

      if (WHAT_YOU_LEARN.test(lines[i]!)) {
        const rest = lines.slice(i);
        let end = rest.length;
        for (let j = 1; j < rest.length; j += 1) {
          if (COURSE_HEADER.test(rest[j]!) || isEndDocLine(rest[j]!)) {
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
        continue;
      }

      i += 1;
    }

    if (title) {
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
  }

  return courses;
}
