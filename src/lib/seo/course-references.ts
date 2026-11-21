/**
 * Public References block for course pages (BACKLOG #22).
 *
 * The evidence-layer template (.claude/skills/carsi-course-production/references/
 * evidence-layer-template.md §5) ends every teaching lesson with a
 * `<h3>Sources for this lesson</h3><ul>…</ul>` block generated from the course's evidence
 * ledger. This module reads that one shape and nothing else: a course's References list is
 * the de-duplicated union of its lessons' source lists, in lesson order.
 *
 * Fail-closed by construction:
 *   - a course with no "Sources for this lesson" block yields no references (the page renders
 *     no section, llms.txt lists nothing for it);
 *   - nothing is inferred — only `<li>` items inside the list that follows that heading count;
 *   - the "No external source is cited for this lesson" placeholder is not a reference;
 *   - a link is kept only when it is an absolute http(s) URL; anything else keeps its label and
 *     loses the link;
 *   - only the cited title (the anchor text, or a plain-text citation) and its read date leave
 *     the lesson. Any lesson prose after the anchor is dropped, so paid lesson content does not
 *     reach the public page.
 *
 * The page reads a committed index (data/seo/course-references.index.json) built from the seed
 * catalogue by scripts/build-course-references.ts; course-references.test.ts fails when the
 * index and the catalogue disagree.
 */

export type CourseReference = {
  /** Cited title, as the lesson's source list gives it (entities decoded, tags stripped). */
  label: string;
  /** Absolute http(s) URL, or null for a source cited by name only (e.g. a standard). */
  url: string | null;
  /** Most recent "Read dd/mm/yyyy" date across the lessons citing it, as written; or null. */
  readOn: string | null;
};

export type CourseReferencesEntry = {
  /** How many lessons carry a "Sources for this lesson" block. */
  lessonsWithSources: number;
  references: CourseReference[];
};

export type CourseReferencesIndex = Record<string, CourseReferencesEntry>;

/** Lesson shape as data/seed/courses-catalog.json stores it. */
export type CatalogueCourseForReferences = {
  slug: string;
  status?: string | null;
  isPublished?: boolean | null;
  modules?: { lessons?: { contentBody?: string | null }[] | null }[] | null;
};

const SOURCES_BLOCK_RE =
  /<h3[^>]*>\s*Sources for this lesson\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi;
const LI_RE = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const ANCHOR_RE = /<a\b[^>]*\bhref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/i;
const READ_RE = /\bRead\s+(\d{2}\/\d{2}\/\d{4})\b/;
const NO_SOURCE_RE = /^No external source is cited for this lesson\b/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  deg: '°',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function httpUrl(raw: string): string | null {
  const candidate = decodeEntities(raw).trim();
  try {
    const u = new URL(candidate);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The references one lesson body cites, in the order it lists them. */
export function extractLessonSources(html: string | null | undefined): CourseReference[] {
  if (!html) return [];
  const out: CourseReference[] = [];
  for (const block of html.matchAll(SOURCES_BLOCK_RE)) {
    for (const item of block[1].matchAll(LI_RE)) {
      const inner = item[1];
      const anchor = inner.match(ANCHOR_RE);
      const readOn = plainText(inner).match(READ_RE)?.[1] ?? null;
      if (anchor) {
        const label = plainText(anchor[2]);
        if (!label) continue;
        out.push({ label, url: httpUrl(anchor[1]), readOn });
        continue;
      }
      const label = plainText(inner);
      if (!label || NO_SOURCE_RE.test(label)) continue;
      out.push({ label, url: null, readOn });
    }
  }
  return out;
}

/** dd/mm/yyyy → sortable yyyymmdd. */
function dateKey(d: string): string {
  const [dd, mm, yyyy] = d.split('/');
  return `${yyyy}${mm}${dd}`;
}

function dedupeKey(ref: CourseReference): string {
  return ref.url ? `url:${ref.url}` : `name:${ref.label.toLowerCase()}`;
}

/** Whether a catalogue course is live (the course page only renders published courses). */
export function isPublishedCatalogueCourse(course: CatalogueCourseForReferences): boolean {
  return course.status === 'published' && course.isPublished !== false;
}

/**
 * A course's References list: every lesson's sources, first citation wins the label, the most
 * recent read date is kept. Null when no lesson cites anything.
 */
export function collectCourseReferences(
  course: CatalogueCourseForReferences
): CourseReferencesEntry | null {
  const byKey = new Map<string, CourseReference>();
  let lessonsWithSources = 0;
  for (const mod of course.modules ?? []) {
    for (const lesson of mod.lessons ?? []) {
      const body = lesson.contentBody ?? '';
      if (!/Sources for this lesson/i.test(body)) continue;
      lessonsWithSources += 1;
      for (const ref of extractLessonSources(body)) {
        const key = dedupeKey(ref);
        const seen = byKey.get(key);
        if (!seen) {
          byKey.set(key, { ...ref });
        } else if (ref.readOn && (!seen.readOn || dateKey(ref.readOn) > dateKey(seen.readOn))) {
          seen.readOn = ref.readOn;
        }
      }
    }
  }
  if (byKey.size === 0) return null;
  return { lessonsWithSources, references: [...byKey.values()] };
}

/** The index the page reads: published courses that cite at least one source, by slug. */
export function buildCourseReferencesIndex(
  courses: readonly CatalogueCourseForReferences[]
): CourseReferencesIndex {
  const index: CourseReferencesIndex = {};
  for (const course of [...courses].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!isPublishedCatalogueCourse(course)) continue;
    const entry = collectCourseReferences(course);
    if (entry) index[course.slug] = entry;
  }
  return index;
}
