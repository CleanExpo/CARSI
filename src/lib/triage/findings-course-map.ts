/**
 * BACKLOG #24 — the findings→course mapping pass of the weekly triage.
 *
 * The weekly triage is the session ENGINE.md describes: it reads the "Discoveries" sections at
 * the bottom of `docs/governance/BACKLOG.md` and turns them into rows. This pass adds one step to
 * it: for each new finding, which catalogue courses and lessons it may affect, and why. It does
 * not build a second triage (GOAL rule 4); it reads the triage's own input.
 *
 * What it is, and what it is not:
 * - A REVIEWABLE REPORT. It never edits a course, a lesson, the catalogue or the database. A
 *   course marked `noAiRewrite` (see `isAiRewriteLocked`) is reported as report-only, for
 *   founder/SME review.
 * - Deterministic keyword matching over CARSI's own catalogue (`data/seed/courses-catalog.json`).
 *   No AI, no network, no API key, metered or otherwise. Nothing is sent anywhere, so no standard
 *   text can reach an AI tool through it.
 * - It quotes no course or standard text: a reason names only the matched term and where it was
 *   found. It makes no claim about what any standard contains or omits; a "no course" result is a
 *   statement about CARSI's catalogue only.
 *
 * Answers are kept distinct: "not run (reason)" (the input or catalogue could not be read; exit 2)
 * is never reported as "no findings" (the input was read and held nothing new; exit 0).
 */
import { isAiRewriteLocked } from '@/lib/courses/ai-rewrite-lock';
import { isPublishedCourseStatus } from '@/lib/courses/course-status';
import type { CatalogCourse } from '@/lib/seed/courses-catalog-types';

export const DEFAULT_FINDINGS_PATH = 'docs/governance/BACKLOG.md';
export const DEFAULT_CATALOGUE_PATH = 'data/seed/courses-catalog.json';
/** The triage is weekly: by default a finding is "new" if dated within the last 7 days. */
export const DEFAULT_WINDOW_DAYS = 7;
const MAX_LESSONS_LISTED = 8;
/** Courses shown in full per finding; the rest are listed by slug so a broad finding stays readable. */
const MAX_COURSES_DETAILED = 10;

export type Finding = {
  id: string;
  title: string;
  body: string;
  /** ISO date (YYYY-MM-DD), or null when the source gives none. */
  date: string | null;
  source: string;
};

export type LessonMatch = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  reason: string;
};

export type CourseMatch = {
  slug: string;
  title: string;
  isPublished: boolean;
  /** `strong`: named, or the topic is in the course's own title/tags/summary. `lesson`: only lessons mention it. */
  strength: 'strong' | 'lesson';
  /** Ranking only: named course 100, topic in title 10, in tags/summary 5, per lesson 2 (title) or 1 (text). */
  score: number;
  reasons: string[];
  lessons: LessonMatch[];
  lessonsOmitted: number;
  noAiRewrite: boolean;
  action: string;
};

export type FindingResult = { finding: Finding; topics: string[]; matches: CourseMatch[] };

type Topic = { name: string; terms: string[]; exclude?: string[] };

/**
 * Restoration and cleaning topics, with the spellings a finding might use (AU first, US variants
 * so a pasted US source still maps). Deliberately specific: generic words ("water", "fire",
 * "hazard", "marketing", "AI") are left out because engineering findings use them in other senses.
 */
export const TOPICS: readonly Topic[] = [
  {
    name: 'Mould',
    terms: ['mould', 'mold', 'mildew', 'fungal', 'fungi', 'spore', 'microbial growth'],
  },
  {
    name: 'Water damage',
    terms: ['water damage', 'water loss', 'flood', 'flooding', 'burst pipe', 'water restoration'],
  },
  {
    name: 'Category 3 water',
    terms: ['category 3', 'cat 3', 'sewage', 'black water', 'blackwater', 'grey water'],
  },
  {
    name: 'Structural drying',
    terms: [
      'structural drying',
      'dehumidifier',
      'dehumidification',
      'air mover',
      'desiccant',
      'drying equipment',
    ],
  },
  {
    name: 'Psychrometry',
    terms: [
      'psychrometry',
      'psychrometric',
      'dew point',
      'relative humidity',
      'vapour pressure',
      'vapor pressure',
    ],
  },
  {
    name: 'Moisture measurement',
    terms: [
      'moisture meter',
      'moisture mapping',
      'moisture reading',
      'moisture content',
      'dry standard',
    ],
  },
  {
    name: 'Thermography',
    terms: ['thermography', 'thermal imaging', 'thermal camera', 'infrared camera'],
  },
  {
    name: 'Fire and smoke',
    terms: [
      'fire damage',
      'smoke damage',
      'smoke',
      'soot',
      'bushfire',
      'wildfire',
      'combustion residue',
    ],
    exclude: [
      'smoke test',
      'smoke check',
      'smoke run',
      'smoke of',
      'playwright smoke',
      'smoke job',
    ],
  },
  { name: 'Odour', terms: ['odour', 'odor', 'deodorisation', 'deodorization', 'malodour'] },
  { name: 'Ozone and hydroxyl', terms: ['ozone', 'hydroxyl'] },
  {
    name: 'Air filtration and containment',
    terms: ['air scrubber', 'afd', 'negative air', 'negative pressure', 'hepa', 'containment'],
  },
  {
    name: 'Indoor air quality',
    terms: ['indoor air quality', 'iaq', 'air quality', 'voc', 'particulate'],
  },
  { name: 'HVAC', terms: ['hvac', 'ductwork', 'air conditioning'] },
  { name: 'Asbestos', terms: ['asbestos'] },
  { name: 'Lead paint', terms: ['lead paint', 'lead based paint'] },
  {
    name: 'Biohazard and trauma',
    terms: [
      'biohazard',
      'trauma',
      'crime scene',
      'bloodborne',
      'sharps',
      'squalor',
      'hoarding',
      'decomposition',
    ],
  },
  {
    name: 'Clandestine drug labs',
    terms: ['clandestine', 'methamphetamine', 'meth residue', 'drug lab'],
  },
  { name: 'Avian influenza', terms: ['avian influenza', 'bird flu', 'h5n1'] },
  { name: 'Carpet and upholstery', terms: ['carpet', 'upholstery', 'rug'] },
  { name: 'Timber floors', terms: ['timber floor', 'hardwood floor', 'floorboard'] },
  { name: 'Floor care', terms: ['floor care', 'hard floor', 'vinyl floor', 'floor stripping'] },
  { name: 'Truckmount', terms: ['truckmount', 'truck mount'] },
  {
    name: 'PPE and respiratory protection',
    terms: ['ppe', 'respirator', 'respiratory protection', 'fit test', 'p2 mask'],
  },
  { name: 'WHS', terms: ['whs', 'work health and safety', 'safe work australia', 'worksafe'] },
  { name: 'UV and fluorescence', terms: ['ultraviolet', 'uv light', 'fluorescence'] },
  {
    name: 'Contents restoration',
    terms: ['contents restoration', 'pack out', 'pack-out', 'freeze drying', 'submerged items'],
  },
  { name: 'Antiques', terms: ['antique', 'fine furniture'] },
  {
    name: 'Estimating and claims',
    terms: ['estimating', 'insurance claim', 'scope of works', 'litigation', 'expert witness'],
  },
  {
    name: 'Antimicrobials',
    terms: ['antimicrobial', 'disinfectant', 'sanitiser', 'sanitizer', 'biocide'],
  },
  { name: 'Legionella', terms: ['legionella'] },
  { name: 'Asthma and allergy', terms: ['asthma', 'allergen', 'allergy'] },
  {
    name: 'Business growth',
    terms: [
      'google business profile',
      'social media',
      'sole trader',
      'speed to lead',
      'reviews and referrals',
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------------------------

function stripHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

/** Lower-case, hyphens and punctuation to single spaces, padded so phrase checks are word-bounded. */
function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

function termRegex(term: string): RegExp {
  const words = normalise(term)
    .trim()
    .split(' ')
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(` ${words.join(' ')}(?:s|es)? `);
}

const TOPIC_MATCHERS = TOPICS.map((topic) => ({
  topic,
  terms: topic.terms.map((term) => ({ term, re: termRegex(term) })),
  exclude: (topic.exclude ?? []).map((e) => normalise(e).trim()),
}));

type Matcher = (typeof TOPIC_MATCHERS)[number];

/** First term of the topic found in already-normalised text, after removing excluded phrases. */
function findTerm(m: Matcher, normalised: string): string | null {
  let text = normalised;
  for (const e of m.exclude) text = text.split(` ${e} `).join('  ');
  for (const { term, re } of m.terms) if (re.test(text)) return term;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------------------------

/** Decode the handful of entities the catalogue uses in titles, for display only. */
function decodeEntities(text: string): string {
  const named: Record<string, string> = {
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
  };
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Where the finding names this course: the bare slug, or a file named after it
 * (`<slug>-quiz.json`, `<slug>/…`). Returns the regex so the caller can blank the mention out
 * before topic matching — a slug such as `mould-remediation-fundamentals` would otherwise also
 * read as the topic "mould" and map the finding to every mould course.
 */
function slugMention(slug: string): RegExp {
  return new RegExp(
    `(^|[^a-z0-9-])${escapeRe(slug)}(?:-(?:quiz|signoff|reading-copy))?(?![a-z0-9]|-[a-z0-9])`,
    'gi'
  );
}

function tagsOf(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
}

/** Score weights: a named course outranks a topic in its title, which outranks tags/summary. */
const SCORE = { named: 100, title: 10, summary: 5, lessonTitle: 2, lessonText: 1 } as const;

/** Map each finding to the catalogue courses and lessons it may affect. Never mutates `catalogue`. */
export function mapFindingsToCourses(
  findings: Finding[],
  catalogue: readonly CatalogCourse[]
): FindingResult[] {
  const courseIndex = catalogue.map((course) => ({
    course,
    slugRe: slugMention(course.slug),
    title: normalise(course.title),
    summary: normalise(
      [
        course.slug.replace(/-/g, ' '),
        course.shortDescription ?? '',
        course.category ?? '',
        ...tagsOf(course.tags),
      ].join(' ')
    ),
    lessons: (course.modules ?? []).flatMap((mod) =>
      (mod.lessons ?? []).map((l) => ({
        lesson: l,
        moduleTitle: decodeEntities(mod.title),
        title: normalise(l.title ?? ''),
        body: normalise(stripHtml(l.contentBody)),
      }))
    ),
  }));

  return findings.map((finding) => {
    let raw = `${finding.title}\n${finding.body}`;
    const named = new Set<string>();
    for (const { course, slugRe } of courseIndex) {
      slugRe.lastIndex = 0;
      if (slugRe.test(raw)) {
        named.add(course.slug);
        slugRe.lastIndex = 0;
        raw = raw.replace(slugRe, '$1 ');
      }
    }
    const text = normalise(raw);
    const hits = TOPIC_MATCHERS.flatMap((m) => {
      const term = findTerm(m, text);
      return term ? [{ m, term }] : [];
    });

    const matches: CourseMatch[] = [];
    for (const { course, title, summary, lessons } of courseIndex) {
      const reasons: string[] = [];
      let score = 0;
      if (named.has(course.slug)) {
        reasons.push(`the finding names the course slug "${course.slug}"`);
        score += SCORE.named;
      }
      const lessonHits = new Map<string, LessonMatch & { weight: number }>();
      for (const { m, term } of hits) {
        const inTitle = findTerm(m, title);
        const inSummary = inTitle ? null : findTerm(m, summary);
        if (inTitle || inSummary) {
          reasons.push(
            `the finding mentions "${term}" (topic: ${m.topic.name}); the course ${inTitle ? 'title' : 'tags or summary'} mention "${inTitle ?? inSummary}"`
          );
          score += inTitle ? SCORE.title : SCORE.summary;
        }
        for (const l of lessons) {
          if (lessonHits.has(l.lesson.id)) continue;
          const lt = findTerm(m, l.title);
          const found = lt ?? findTerm(m, l.body);
          if (!found) continue;
          lessonHits.set(l.lesson.id, {
            lessonId: l.lesson.id,
            lessonTitle: decodeEntities(l.lesson.title),
            moduleTitle: l.moduleTitle,
            reason: `its ${lt ? 'title' : 'text'} mentions "${found}" (topic: ${m.topic.name})`,
            weight: lt ? SCORE.lessonTitle : SCORE.lessonText,
          });
        }
      }
      if (score === 0 && lessonHits.size === 0) continue;
      const strong = score > 0;
      if (!strong) {
        const topicNames = [...new Set(hits.map((h) => h.m.topic.name))].join(', ');
        reasons.push(
          `lessons in this course mention the finding's topic (${topicNames}); the course itself is not about it`
        );
      }
      const all = [...lessonHits.values()].sort((a, b) => b.weight - a.weight);
      score += all.reduce((sum, l) => sum + l.weight, 0);
      const locked = isAiRewriteLocked({ slug: course.slug, meta: course.meta });
      matches.push({
        slug: course.slug,
        title: decodeEntities(course.title),
        isPublished: isPublishedCourseStatus(course.status),
        strength: strong ? 'strong' : 'lesson',
        score,
        reasons,
        lessons: all.slice(0, MAX_LESSONS_LISTED).map(({ weight: _w, ...l }) => l),
        lessonsOmitted: Math.max(0, all.length - MAX_LESSONS_LISTED),
        noAiRewrite: locked,
        action: locked
          ? 'Report only — course is locked (noAiRewrite). No agent or AI edit; founder/SME review decides.'
          : 'Review whether this course needs updating. Nothing was changed automatically.',
      });
    }
    matches.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
    return { finding, topics: [...new Set(hits.map((h) => h.m.topic.name))], matches };
  });
}

// ---------------------------------------------------------------------------------------------
// Findings input
// ---------------------------------------------------------------------------------------------

type Parsed = { ok: true; findings: Finding[] } | { ok: false; reason: string };

const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const AU_DATE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

function dateIn(text: string): string | null {
  const iso = ISO_DATE.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const au = AU_DATE.exec(text);
  return au ? `${au[3]}-${au[2]}-${au[1]}` : null;
}

function titleOf(bullet: string): string {
  const bold = /\*\*(.+?)\*\*/.exec(bullet);
  if (bold) return bold[1].replace(/~~/g, '').trim();
  const plain = bullet.replace(/^\d{4}-\d{2}-\d{2}\s*·\s*/, '').trim();
  return plain.length > 120 ? `${plain.slice(0, 117)}…` : plain;
}

/**
 * Findings from the BACKLOG "Discoveries" sections: every top-level bullet from the first
 * heading containing "Discover" onward. Date = the bullet's leading date, else the nearest
 * dated heading above it.
 */
export function parseFindingsMarkdown(md: string, source: string): Parsed {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{2,3}\s.*discover/i.test(l));
  if (start < 0) return { ok: false, reason: `no "Discoveries" heading in ${source}` };

  const findings: Finding[] = [];
  let headingDate: string | null = null;
  let current: { lines: string[]; line: number; headingDate: string | null } | null = null;
  const flush = () => {
    if (!current) return;
    const first = current.lines[0].replace(/^-\s+/, '');
    const leading = /^(\d{4}-\d{2}-\d{2})\b/.exec(first);
    findings.push({
      id: `${source}:${current.line}`,
      title: titleOf(first),
      body: current.lines.join('\n'),
      date: leading ? leading[1] : current.headingDate,
      source,
    });
    current = null;
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) {
      flush();
      headingDate = dateIn(line) ?? (i === start ? null : headingDate);
      continue;
    }
    if (/^-\s+\S/.test(line)) {
      flush();
      current = { lines: [line], line: i + 1, headingDate };
      continue;
    }
    if (current && (/^\s+\S/.test(line) || line.trim() === '')) {
      if (line.trim() !== '') current.lines.push(line);
      continue;
    }
    flush();
  }
  flush();
  return { ok: true, findings };
}

/** JSON input: an array of `{ title, body?, date?, id? }`. */
export function parseFindingsJson(text: string, source: string): Parsed {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: `${source} is not valid JSON` };
  }
  const list = Array.isArray(data) ? data : (data as { findings?: unknown })?.findings;
  if (!Array.isArray(list))
    return { ok: false, reason: `${source} is not a JSON array of findings` };
  const findings: Finding[] = [];
  for (const [i, item] of list.entries()) {
    const f = item as Record<string, unknown>;
    if (!f || typeof f.title !== 'string' || !f.title.trim()) {
      return { ok: false, reason: `${source} entry ${i} has no "title"` };
    }
    findings.push({
      id: typeof f.id === 'string' ? f.id : `${source}:${i}`,
      title: f.title,
      body: typeof f.body === 'string' ? f.body : '',
      date: typeof f.date === 'string' ? dateIn(f.date) : null,
      source,
    });
  }
  return { ok: true, findings };
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------

export function formatReport(input: {
  results: FindingResult[];
  source: string;
  window: string;
  totalInSource: number;
  catalogueSize: number;
}): string[] {
  const { results, source, window, totalInSource, catalogueSize } = input;
  const mapped = results.filter((r) => r.matches.length > 0);
  const courses = new Set(mapped.flatMap((r) => r.matches.map((m) => m.slug)));
  const out: string[] = [
    '# Weekly triage — findings→course mapping (BACKLOG #24)',
    '',
    `Source: ${source} · window: ${window} · ${results.length} of ${totalInSource} findings in window · catalogue: ${catalogueSize} courses`,
    `Result: ${mapped.length} finding(s) map to ${courses.size} course(s); ${results.length - mapped.length} map to no course.`,
    '',
    '> Review only. Nothing was edited: no course, lesson, catalogue row or database record. Keyword',
    '> matching over the catalogue; no AI and no network. Courses marked noAiRewrite are report-only.',
    '> A "no course" line is about the CARSI catalogue only, never about what a standard contains.',
    '',
  ];
  for (const r of results) {
    out.push(`## ${r.finding.title}`);
    out.push(`_${r.finding.date ?? 'undated'} · ${r.finding.id}_`);
    if (r.matches.length === 0) {
      out.push('', '- Maps to no course in the catalogue.', '');
      continue;
    }
    out.push('');
    for (const m of r.matches.slice(0, MAX_COURSES_DETAILED)) {
      const flags = [
        m.isPublished ? 'published' : 'not published',
        m.strength === 'lesson' ? 'lower confidence' : null,
        m.noAiRewrite ? 'noAiRewrite' : null,
      ]
        .filter(Boolean)
        .join(', ');
      out.push(`- **${m.title}** (\`${m.slug}\`; ${flags})`);
      for (const reason of m.reasons) out.push(`  - Why: ${reason}.`);
      for (const l of m.lessons)
        out.push(`  - Lesson: ${l.moduleTitle} › ${l.lessonTitle} — ${l.reason}.`);
      if (m.lessonsOmitted > 0) out.push(`  - …and ${m.lessonsOmitted} more lesson(s).`);
      out.push(`  - Action: ${m.action}`);
    }
    const rest = r.matches.slice(MAX_COURSES_DETAILED);
    if (rest.length > 0) {
      const list = rest.map(
        (m) => `\`${m.slug}\`${m.noAiRewrite ? ' (noAiRewrite, report only)' : ''}`
      );
      out.push(`- Also related, lower score (${rest.length}): ${list.join(', ')}.`);
    }
    out.push('');
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// CLI entry (IO injected so tests need no filesystem)
// ---------------------------------------------------------------------------------------------

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function errName(e: unknown): string {
  return e instanceof Error ? e.message.split('\n')[0] : 'unknown error';
}

export function runFindingsCourseTriage(input: {
  args: string[];
  now: Date;
  readText: (path: string) => string;
  out: (line: string) => void;
}): number {
  const { args, now, readText, out } = input;
  const notRun = (reason: string) => {
    out(`Findings→course mapping: not run (${reason}).`);
    return 2;
  };

  const findingsPath = argValue(args, '--findings') ?? DEFAULT_FINDINGS_PATH;
  const cataloguePath = argValue(args, '--catalogue') ?? DEFAULT_CATALOGUE_PATH;
  const all = args.includes('--all');
  const sinceArg = argValue(args, '--since');
  if (sinceArg !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(sinceArg)) {
    return notRun(`--since must be YYYY-MM-DD, got "${sinceArg}"`);
  }
  const since =
    sinceArg ??
    new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  let findingsText: string;
  try {
    findingsText = readText(findingsPath);
  } catch (e) {
    return notRun(`could not read findings source ${findingsPath}: ${errName(e)}`);
  }
  const parsed = findingsPath.toLowerCase().endsWith('.json')
    ? parseFindingsJson(findingsText, findingsPath)
    : parseFindingsMarkdown(findingsText, findingsPath);
  if (!parsed.ok) return notRun(parsed.reason);

  let catalogue: CatalogCourse[];
  try {
    const data = JSON.parse(readText(cataloguePath)) as { courses?: unknown };
    if (!Array.isArray(data.courses))
      return notRun(`course catalogue ${cataloguePath} has no "courses" array`);
    catalogue = data.courses as CatalogCourse[];
  } catch (e) {
    return notRun(`could not read course catalogue ${cataloguePath}: ${errName(e)}`);
  }
  if (catalogue.length === 0) return notRun(`course catalogue ${cataloguePath} is empty`);

  // Undated findings are kept in the window: dropping them silently would hide a finding.
  const inWindow = all
    ? parsed.findings
    : parsed.findings.filter((f) => f.date === null || f.date >= since);
  const window = all ? 'all findings' : `dated on or after ${since} (undated findings included)`;
  if (inWindow.length === 0) {
    out(
      `Findings→course mapping: no findings in ${findingsPath} (${window}; ${parsed.findings.length} in the source overall). Nothing to map.`
    );
    return 0;
  }

  const results = mapFindingsToCourses(inWindow, catalogue);
  const report = formatReport({
    results,
    source: findingsPath,
    window,
    totalInSource: parsed.findings.length,
    catalogueSize: catalogue.length,
  });
  if (args.includes('--json')) {
    out(JSON.stringify({ status: 'ok', source: findingsPath, window, results }, null, 2));
  } else {
    for (const line of report) out(line);
  }
  return 0;
}
