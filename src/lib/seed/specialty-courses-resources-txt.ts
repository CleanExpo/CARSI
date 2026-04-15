const COURSE_TITLE = /^COURSE TITLE:\s*(.+)$/i;
const RESOURCE = /^RESOURCE:\s*(.+)$/i;
const COURSE_SHORT = /^COURSE:\s*(.+)$/i;
const MEMBERSHIP = /^MEMBERSHIP:\s*(.+)$/i;
const MODULE_HEAD = /^MODULE (\d+):\s*(.*)$/i;
const SECTION_HEAD = /^SECTION \d+:/i;
const WHAT_YOU_LEARN = /^WHAT YOU WILL LEARN\b/i;
const DASH_RULE = /^-{3,}\s*$/;
const END_SUMMARY = /^SUMMARY OF ALL COURSES/i;
const END_DOC = /^END OF DOCUMENT\b/i;

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
    t.match(/Price:\s*\$?\s*([0-9,]+(?:\.[0-9]+)?)\s*AUD/i) ||
    t.match(/\$\s*([0-9,]+(?:\.[0-9]+)?)\s*AUD/i);
  if (m) return { priceAud: Number.parseFloat(m[1]!.replace(/,/g, '')), isFree: false };
  const split = t.match(/^Price:\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\||—)/i);
  if (split) return { priceAud: Number.parseFloat(split[1]!), isFree: false };
  return { priceAud: 0, isFree: false };
}

export type SpecialtyResourceParsedModule = { title: string; bodyText: string };

export type SpecialtyResourceParsedCourse = {
  title: string;
  slug: string;
  priceAud: number;
  isFree: boolean;
  /** course | resource | membership — informational only for seed category copy */
  kind: 'course' | 'resource' | 'membership';
  overviewParagraphs: string[];
  modules: SpecialtyResourceParsedModule[];
};

function isBlockStart(line: string): boolean {
  return (
    COURSE_TITLE.test(line) ||
    RESOURCE.test(line) ||
    COURSE_SHORT.test(line) ||
    MEMBERSHIP.test(line)
  );
}

function isStopLine(line: string): boolean {
  if (END_SUMMARY.test(line) || END_DOC.test(line)) return true;
  if (SECTION_HEAD.test(line)) return true;
  if (isBlockStart(line)) return true;
  return false;
}

function parseCourseTitleBlock(lines: string[], start: number): { course: SpecialtyResourceParsedCourse; nextI: number } | null {
  const m0 = lines[start]!.match(COURSE_TITLE);
  if (!m0) return null;
  const title = m0[1]!.trim();
  let i = start + 1;
  let priceAud = 0;
  let isFree = false;

  while (i < lines.length && !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) {
    const line = lines[i]!;
    if (/^Price:\s*/i.test(line)) {
      const p = parsePriceLine(line);
      priceAud = p.priceAud;
      isFree = p.isFree;
    }
    i += 1;
  }
  if (i >= lines.length || !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) return null;
  i += 1;
  while (i < lines.length && lines[i]!.trim() === '') i += 1;

  const overviewParagraphs: string[] = [];
  while (
    i < lines.length &&
    !DASH_RULE.test(lines[i]!) &&
    !MODULE_HEAD.test(lines[i]!) &&
    !isStopLine(lines[i]!)
  ) {
    const t = lines[i]!.trim();
    if (t) overviewParagraphs.push(lines[i]!);
    i += 1;
  }
  if (DASH_RULE.test(lines[i] ?? '')) i += 1;
  while (i < lines.length && lines[i]!.trim() === '') i += 1;

  const modules: SpecialtyResourceParsedModule[] = [];
  while (i < lines.length) {
    if (isStopLine(lines[i]!)) break;
    if (/^={10,}\s*$/.test(lines[i]!.trim())) {
      const peek = lines[i + 1] ?? '';
      if (SECTION_HEAD.test(peek) || peek.trim() === '') {
        break;
      }
      i += 1;
      continue;
    }

      const mm = lines[i]!.match(MODULE_HEAD);
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
          !WHAT_YOU_LEARN.test(lines[i]!) &&
          !isStopLine(lines[i]!)
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
        const ln = rest[j]!;
        if (isStopLine(ln) || /^={10,}\s*$/.test(ln.trim())) {
          end = j;
          break;
        }
      }
      const appendix = rest.slice(0, end);
      const head = appendix[0]?.trim() ?? '';
      const useHead = head.length > 0 && head.length <= 120;
      modules.push({
        title: useHead ? head : 'Supplementary content',
        bodyText: useHead ? appendix.slice(1).join('\n\n').trim() : appendix.join('\n\n').trim(),
      });
      i += end;
      continue;
    }

    i += 1;
  }

  return {
    course: {
      title,
      slug: slugify(title),
      priceAud,
      isFree,
      kind: 'course',
      overviewParagraphs,
      modules,
    },
    nextI: i,
  };
}

function parseOverviewResource(
  lines: string[],
  start: number,
  title: string,
  kind: 'resource' | 'membership'
): { course: SpecialtyResourceParsedCourse; nextI: number } | null {
  let i = start;
  let priceAud = 0;
  let isFree = false;

  while (
    i < lines.length &&
    !/^RESOURCE OVERVIEW\s*$/i.test(lines[i]!) &&
    !/^MEMBERSHIP OVERVIEW\s*$/i.test(lines[i]!)
  ) {
    const line = lines[i]!;
    if (/^Price:\s*/i.test(line)) {
      const p = parsePriceLine(line);
      priceAud = p.priceAud;
      isFree = p.isFree;
    }
    i += 1;
  }
  if (i >= lines.length) return null;

  i += 1;
  while (i < lines.length && lines[i]!.trim() === '') i += 1;

  const bodyLines: string[] = [];
  while (i < lines.length) {
    const line = lines[i]!;
    if (DASH_RULE.test(line)) {
      const peek = lines[i + 1] ?? '';
      if (isBlockStart(peek) || SECTION_HEAD.test(peek)) {
        i += 1;
        break;
      }
    }
    if (isBlockStart(line) || SECTION_HEAD.test(line)) break;
    if (END_SUMMARY.test(line) || END_DOC.test(line)) break;
    if (/^={10,}\s*$/.test(line.trim())) {
      const peek = lines[i + 1] ?? '';
      if (SECTION_HEAD.test(peek) || END_DOC.test(peek)) break;
    }
    bodyLines.push(line);
    i += 1;
  }

  const text = bodyLines.join('\n').trim();
  const overviewParagraphs = text ? [text] : [];

  return {
    course: {
      title,
      slug: slugify(title),
      priceAud,
      isFree,
      kind,
      overviewParagraphs,
      modules: [
        {
          title: `${kind === 'membership' ? 'Membership' : 'Resource'} — Reading`,
          bodyText: text,
        },
      ],
    },
    nextI: i,
  };
}

function parseCourseShortBlock(lines: string[], start: number): { course: SpecialtyResourceParsedCourse; nextI: number } | null {
  const m0 = lines[start]!.match(COURSE_SHORT);
  if (!m0) return null;
  const title = m0[1]!.trim();
  let i = start + 1;
  let priceAud = 0;
  let isFree = false;

  while (i < lines.length && !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) {
    const line = lines[i]!;
    if (/^Price:\s*/i.test(line)) {
      const p = parsePriceLine(line);
      priceAud = p.priceAud;
      isFree = p.isFree;
    }
    i += 1;
  }
  if (i >= lines.length || !/^COURSE OVERVIEW\s*$/i.test(lines[i]!)) return null;
  i += 1;
  while (i < lines.length && lines[i]!.trim() === '') i += 1;

  const bodyLines: string[] = [];
  while (i < lines.length) {
    const line = lines[i]!;
    if (MEMBERSHIP.test(line) || RESOURCE.test(line) || COURSE_TITLE.test(line) || COURSE_SHORT.test(line)) break;
    if (SECTION_HEAD.test(line)) break;
    if (END_SUMMARY.test(line) || END_DOC.test(line)) break;
    if (/^={10,}\s*$/.test(line.trim())) {
      const peek = lines[i + 1] ?? '';
      if (SECTION_HEAD.test(peek) || END_DOC.test(peek)) break;
    }
    bodyLines.push(line);
    i += 1;
  }

  const overviewParagraphs: string[] = [];
  const text = bodyLines.join('\n').trim();
  if (text) overviewParagraphs.push(text);

  return {
    course: {
      title,
      slug: slugify(title),
      priceAud,
      isFree,
      kind: 'course',
      overviewParagraphs,
      modules: [
        {
          title: 'Course overview — Reading',
          bodyText: text,
        },
      ],
    },
    nextI: i,
  };
}

/**
 * Parse `specialty_courses_resources.txt` — glass/duct courses with modules, resources, memberships, large-loss overview.
 */
export function parseSpecialtyCoursesResourcesTxt(text: string): SpecialtyResourceParsedCourse[] {
  const lines = text.split(/\r?\n/);
  const courses: SpecialtyResourceParsedCourse[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (END_SUMMARY.test(line) || END_DOC.test(line)) break;

    if (COURSE_TITLE.test(line)) {
      const parsed = parseCourseTitleBlock(lines, i);
      if (parsed) {
        courses.push(parsed.course);
        i = parsed.nextI;
        continue;
      }
    }

    if (RESOURCE.test(line)) {
      const m = line.match(RESOURCE)!;
      const title = m[1]!.trim();
      const parsed = parseOverviewResource(lines, i + 1, title, 'resource');
      if (parsed) {
        courses.push(parsed.course);
        i = parsed.nextI;
        continue;
      }
    }

    if (COURSE_SHORT.test(line) && !COURSE_TITLE.test(line)) {
      const parsed = parseCourseShortBlock(lines, i);
      if (parsed) {
        courses.push(parsed.course);
        i = parsed.nextI;
        continue;
      }
    }

    if (MEMBERSHIP.test(line)) {
      const m = line.match(MEMBERSHIP)!;
      const title = m[1]!.trim();
      const parsed = parseOverviewResource(lines, i + 1, title, 'membership');
      if (parsed) {
        courses.push(parsed.course);
        i = parsed.nextI;
        continue;
      }
    }

    i += 1;
  }

  return courses;
}
