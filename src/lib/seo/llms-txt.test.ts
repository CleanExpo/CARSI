/**
 * /llms.txt is quoted by AI answer engines, so a stale path or an unsupported claim there
 * spreads. Every site path it lists must resolve to a real app route or public file.
 *
 * Since 18/10/2026 it is generated per request (app/llms.txt/route.ts) instead of being a
 * hand-maintained public file, which had drifted: a hand-picked 24-course "snapshot" from July
 * against 80 live courses, a contact email that disagreed with the Organization schema, and
 * event dates that had passed. The drift tests below feed a catalogue in and require the
 * exact facts out, so a hand-typed count, price or CEC figure cannot survive.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { CourseListItem } from '@/lib/course-list-item';
import { FLOOR_CARE_ONBOARDING_SLUG } from '@/lib/onboarding/enterprise';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';
import { getCecApprovalEntries, selectCurrentCecCourses } from '@/lib/seed/cec-approvals';
import {
  LLMS_MAX_CACHE_SECONDS,
  llmsTxtResponse,
  type LlmsCatalogueRead,
  type LlmsTxtDeps,
} from '@/lib/server/llms-txt-response';
import { ccwRoadshowEvents, type CcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

import { scanText as terminologyFindings } from '../../../scripts/check-iicrc-terminology.mjs';
import { evaluateContent as complianceFindings } from '../../../scripts/check-iicrc-compliance.mjs';
import { evaluate as standardsFindings } from '../../../scripts/check-standards-claims.mjs';

import { CARSI_ENTITY, postalAddressLine } from './carsi-entity';
import {
  buildLlmsTxt,
  formatAud,
  SOURCED_CLOSE,
  SOURCED_OPEN,
  type LlmsFacts,
  type SourcedValue,
} from './llms-txt';

const ROOT = process.cwd();
const NOW = new Date('2027-02-01T00:00:00.000Z'); // after the 2027-01-18 batch expired

const approved = getCecApprovalEntries().filter((e) => e.status === 'approved');
const current = approved.find((e) => new Date(e.expiresAt as string) > NOW)!;
const lapsed = approved.find((e) => new Date(e.expiresAt as string) <= NOW)!;
const unpublishedApproval = approved.find(
  (e) => e.slug !== current.slug && e.slug !== lapsed.slug
)!;

function course(slug: string, title: string, extra: Partial<CourseListItem> = {}): CourseListItem {
  return { id: slug, slug, title, price_aud: 29, is_free: false, ...extra };
}

const CATALOGUE: CourseListItem[] = [
  course('water-damage-essentials', 'Water Damage Restoration — Essentials', {
    is_free: true,
    price_aud: 0,
  }),
  course(current.slug, 'Current approval course'),
  course(lapsed.slug, 'Lapsed approval course', { price_aud: 24.5 }),
  course('mould-core', 'Mould Remediation — Core', { price_aud: 149 }),
  course(FLOOR_CARE_ONBOARDING_SLUG, 'Floor care onboarding'),
];

async function generate(
  read: Partial<LlmsCatalogueRead> | (() => Promise<LlmsCatalogueRead>) = {},
  subscriptions = true,
  extra: Partial<Pick<LlmsTxtDeps, 'now' | 'events'>> = {}
): Promise<Response> {
  const readCatalogue =
    typeof read === 'function'
      ? read
      : async () => ({
          items: read.items ?? CATALOGUE,
          count: read.count ?? (read.items ?? CATALOGUE).length,
        });
  return llmsTxtResponse({
    readCatalogue,
    subscriptionsEnabled: () => subscriptions,
    now: NOW,
    ...extra,
  });
}

const LLMS = buildLlmsTxt({
  courses: [{ slug: 'water-damage-essentials', title: 'Water Damage Restoration — Essentials' }],
  membership: {
    priceCents: 79500,
    available: true,
    terms: 'Access to all published courses for one learner for a year.',
  },
  cecCourses: [],
});

/** Child dirs of an app dir, looking through route groups like `(public)`. */
function childDirs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (/^\(.*\)$/.test(name)) out.push(...childDirs(full));
    else out.push(full);
  }
  return out;
}

function hasRouteFile(dir: string): boolean {
  return ['page.tsx', 'page.ts', 'route.ts'].some((f) => existsSync(join(dir, f)));
}

/**
 * True when `/a/{id}/b` matches an app route: a static segment matches its directory (else a
 * `[param]` directory), and `{x}` matches a `[param]` directory.
 */
export function siteRouteExists(path: string): boolean {
  const clean = path.split(/[?#]/)[0];
  if (existsSync(join(ROOT, 'public', clean))) return true;
  const segments = clean.split('/').filter(Boolean);
  let frontier = [join(ROOT, 'app')];
  for (const segment of segments) {
    const dynamic = /^\{.+\}$/.test(segment);
    frontier = frontier.flatMap((dir) => {
      const children = childDirs(dir);
      const name = (child: string) => child.split('/').pop() ?? '';
      const params = children.filter((child) => /^\[.+\]$/.test(name(child)));
      if (dynamic) return params;
      const exact = children.filter((child) => name(child) === segment);
      // A concrete value (e.g. a start-smart slug) is served by the dynamic segment.
      return exact.length > 0 ? exact : params;
    });
    if (frontier.length === 0) return false;
  }
  return segments.length === 0 ? true : frontier.some(hasRouteFile);
}

/** Paths from the "- /path — description" route list and "Method: GET /path" lines. */
function listedPaths(text: string): string[] {
  const fromList = Array.from(text.matchAll(/^- (\/[^\s—]*)\s+—/gm), (m) => m[1]);
  const fromMethods = Array.from(text.matchAll(/Method: (?:GET|POST) (\/\S+)/g), (m) => m[1]);
  return [...new Set([...fromList, ...fromMethods])];
}

describe('llms.txt', () => {
  it('the route checker can fail: an invented path is rejected', () => {
    expect(siteRouteExists('/credentials-made-up/{id}')).toBe(false);
    expect(siteRouteExists('/verify/credential/{id}')).toBe(true);
    expect(siteRouteExists('/carsi-citation-pack.json')).toBe(true);
  });

  it('lists only paths that exist', () => {
    const paths = listedPaths(LLMS);
    expect(paths.length).toBeGreaterThan(10);
    expect(paths.filter((p) => !siteRouteExists(p))).toEqual([]);
  });

  it('uses the current credential verification path', () => {
    expect(LLMS).not.toMatch(/\/credentials\/\{id\}/);
    expect(LLMS).toContain('/verify/credential/{id}');
  });

  it('lists the CEC hub', () => {
    expect(LLMS).toContain('/iicrc-cec-courses');
  });

  it('carries no unsupported superlative or stale price floor', () => {
    expect(LLMS).not.toMatch(/Australia['’]s leading/i);
    expect(LLMS).not.toMatch(/\bleading (online )?training/i);
    expect(LLMS).not.toMatch(/from \$20\b/);
    expect(LLMS).not.toMatch(/CARSI-awarded IICRC/i);
  });
});

describe('llms.txt is generated from its sources (drift)', () => {
  it('there is no static public/llms.txt shadowing the generated route', () => {
    expect(existsSync(join(ROOT, 'public', 'llms.txt'))).toBe(false);
    expect(existsSync(join(ROOT, 'app', 'llms.txt', 'route.ts'))).toBe(true);
  });

  it('lists every published course with a public page, exactly once, and counts them', async () => {
    const res = await generate();
    expect(res.status).toBe(200);
    const text = await res.text();
    const publicCourses = CATALOGUE.filter((c) => c.slug !== FLOOR_CARE_ONBOARDING_SLUG);
    expect(text).toContain(`- Published courses: ${publicCourses.length} (full list below).`);
    for (const c of publicCourses) {
      expect(text.split(`- [${c.title}](/courses/${c.slug})\n`).length - 1, c.slug).toBe(1);
    }
    expect(text).not.toContain(`/courses/${FLOOR_CARE_ONBOARDING_SLUG}`);
    expect(text).toContain('- Organisation onboarding programs: 1,');
  });

  it('a change in the catalogue changes the text (nothing is hand-typed)', async () => {
    const smaller = await (await generate({ items: CATALOGUE.slice(0, 2) })).text();
    expect(smaller).toContain('- Published courses: 2 (full list below).');
    expect(smaller).not.toContain('Mould Remediation — Core');
  });

  it('states the free count and cheapest paid price from the catalogue', async () => {
    const text = await (await generate()).text();
    expect(text).toContain('- 1 of the published courses are free.');
    expect(text).toContain('from $24.50 AUD per course');
  });

  it('states the yearly membership price and availability that /pricing uses', async () => {
    const tier = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual')!;
    const price = formatAud(tier.priceCents! / 100);
    const live = await (await generate({}, true)).text();
    expect(live).toContain(`- Yearly membership: ${price} per year`);
    const soon = await (await generate({}, false)).text();
    expect(soon).toContain(
      `- Yearly membership (${price} per year) is listed on /pricing as coming soon`
    );
    expect(
      buildLlmsTxt({
        courses: [],
        membership: {
          priceCents: 12345,
          available: true,
          terms: 'Access to all published courses for one learner for a year.',
        },
        cecCourses: [],
      })
    ).toContain('$123.45 AUD per year');
  });

  it('lists CEC hours only for published courses with an approval in force', async () => {
    const text = await (await generate()).text();
    const expected = selectCurrentCecCourses(CATALOGUE, NOW);
    expect(expected.map((c) => c.course.slug)).toEqual([current.slug]);
    expect(text).toContain(
      `- [Current approval course](/courses/${current.slug}) — ${current.approvedHours} CEC hour`
    );
    expect(text).toContain(`IICRC CEC approvals in force today: ${expected.length}.`);
    const cecSection = text.slice(
      text.indexOf('## IICRC CEC approvals'),
      text.indexOf('## About the IICRC')
    );
    expect(cecSection).not.toContain(lapsed.slug);
    expect(cecSection).not.toContain(unpublishedApproval.slug);
    const none = buildLlmsTxt({
      courses: [],
      membership: {
        priceCents: 1,
        available: false,
        terms: 'Access to all published courses for one learner for a year.',
      },
      cecCourses: [],
    });
    expect(none).toContain(
      'There are no IICRC CEC approvals in force for published CARSI courses today.'
    );
  });

  it.each([
    ['an empty catalogue', { items: [], count: 0 }],
    ['a partial read (count disagrees)', { items: CATALOGUE, count: CATALOGUE.length + 3 }],
  ])('fails closed with 503 on %s', async (_label, read) => {
    const res = await generate(read);
    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('fails closed with 503 when the catalogue read throws', async () => {
    const res = await generate(async () => {
      throw new Error('db down');
    });
    expect(res.status).toBe(503);
  });

  it('the generated text passes the terminology, compliance and standards-claim scanners', async () => {
    const text = await (await generate()).text();
    const lines = text.split('\n');
    expect(lines.flatMap((l) => terminologyFindings('public/llms.txt', l))).toEqual([]);
    expect(lines.flatMap((l) => standardsFindings(l))).toEqual([]);
    // Compliance flags specific CEC-hour figures; the registry-driven CEC list is the one
    // sanctioned place for them, so the prose around it is what is scanned here.
    const prose = buildLlmsTxt({
      courses: [
        { slug: 'water-damage-essentials', title: 'Water Damage Restoration — Essentials' },
      ],
      membership: {
        priceCents: 79500,
        available: true,
        terms: 'Access to all published courses for one learner for a year.',
      },
      cecCourses: [],
    });
    expect(complianceFindings('src/lib/seo/llms-txt.ts', prose)).toEqual([]);
  });
});

/** s-maxage from a Cache-Control header, or null for no-store / absent. */
function sMaxAge(header: string | null): number | null {
  const m = header?.match(/s-maxage=(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Review P1 (18/10/2026): the 200 was cached "s-maxage=3600, stale-while-revalidate=86400", so
 * a shared cache could keep advertising CEC hours for a day after an approval lapsed.
 */
describe('llms.txt cache never outlives a CEC approval or an event', () => {
  it('cache: a 200 has a bounded s-maxage and no stale serving', async () => {
    const res = await generate();
    const cc = res.headers.get('Cache-Control') ?? '';
    expect(cc).not.toMatch(/stale-while-revalidate|stale-if-error/);
    expect(sMaxAge(cc)).not.toBeNull();
    expect(sMaxAge(cc)!).toBeLessThanOrEqual(LLMS_MAX_CACHE_SECONDS);
  });

  it('cache: ends before the soonest listed CEC approval expires', async () => {
    const soonest = new Date(current.expiresAt as string);
    const res = await generate({}, true, { now: new Date(soonest.getTime() - 60_000) });
    const text = await res.text();
    expect(text).toContain(current.slug);
    const age = sMaxAge(res.headers.get('Cache-Control'));
    expect(age).not.toBeNull();
    expect(age!).toBeLessThan(60);
  });

  it('cache: no-store when an approval is about to lapse', async () => {
    const soonest = new Date(current.expiresAt as string);
    const res = await generate({}, true, { now: new Date(soonest.getTime() - 500) });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('cache: the 503 stays no-store', async () => {
    const res = await generate({ items: [], count: 0 });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

/**
 * Review P1 (18/10/2026): every response said the roadshow had "current dates" and "free entry
 * registration" while every event had ended and three of four were paid seats sold by CCW.
 */
describe('llms.txt events come from the event records', () => {
  const base = ccwRoadshowEvents[0];
  const ev = (over: Partial<CcwRoadshowEvent>): CcwRoadshowEvent => ({ ...base, ...over });
  const FUTURE_FREE = ev({
    slug: 'f1',
    title: 'Free Day - Melbourne',
    startDateIso: '2027-03-01T08:30:00+11:00',
    endDateIso: '2027-03-02T16:30:00+11:00',
    registration: 'free-token',
  });
  const FUTURE_PAID = ev({
    slug: 'p1',
    title: 'Paid Day - Brisbane',
    startDateIso: '2027-04-01T08:30:00+10:00',
    endDateIso: '2027-04-02T16:30:00+10:00',
    registration: 'external',
  });
  const PAST = ev({
    slug: 'old',
    title: 'Old Day - Sydney',
    startDateIso: '2027-01-10T08:30:00+11:00',
    endDateIso: '2027-01-11T16:30:00+11:00',
    registration: 'free-token',
  });

  it('event: with no upcoming event, no dates, no free-entry and no current-dates claim', async () => {
    const text = await (await generate({}, true, { events: [PAST] })).text();
    expect(text).not.toContain('## Upcoming events');
    expect(text).not.toMatch(/free entry/i);
    expect(text).not.toMatch(/current dates/i);
    expect(text).not.toContain('Old Day - Sydney');
    expect(text).toContain('- /events/ccw-roadshow — CARSI x CCW Business Growth Days event page');
  });

  it('event: the real event list on the review date (all ended) makes no event claim', async () => {
    const text = await (
      await generate({}, true, { now: new Date('2026-10-18T09:00:00+10:00') })
    ).text();
    expect(text).not.toContain('## Upcoming events');
    expect(text).not.toMatch(/free entry/i);
  });

  it('event: lists only upcoming events, each with its own registration terms', async () => {
    const text = await (
      await generate({}, true, { events: [PAST, FUTURE_PAID, FUTURE_FREE] })
    ).text();
    expect(text).toContain('## Upcoming events');
    expect(text).not.toContain('Old Day - Sydney');
    expect(text).toMatch(
      /- Free Day - Melbourne, [^\n]*: 2027-03-0\d to 2027-03-0\d\. Free entry: register on \/events\/ccw-roadshow/
    );
    expect(text).toMatch(
      /- Paid Day - Brisbane, [^\n]*Seats are paid and sold through Carpet Cleaners Warehouse, not on this site\./
    );
    expect(text).not.toMatch(/Paid Day - Brisbane[^\n]*Free entry/);
    expect(text.indexOf('Free Day - Melbourne')).toBeLessThan(text.indexOf('Paid Day - Brisbane'));
  });

  it('event: cache ends before the next event ends', async () => {
    const res = await generate({}, true, {
      events: [FUTURE_FREE],
      now: new Date(new Date(FUTURE_FREE.endDateIso).getTime() - 30_000),
    });
    expect(sMaxAge(res.headers.get('Cache-Control'))!).toBeLessThan(30);
  });
});

describe('llms.txt membership terms come from the pricing tier', () => {
  it('membership terms: the tier description is what llms.txt states, and a change reaches it', async () => {
    const tier = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual')!;
    expect(await (await generate({}, true)).text()).toContain(tier.description);
    const changed = 'Access to every published course for two learners for 18 months.';
    expect(
      buildLlmsTxt({
        courses: [],
        membership: { priceCents: 65000, available: true, terms: changed },
        cecCourses: [],
      })
    ).toContain(`$650 AUD per year (/pricing). ${changed}`);
  });
});

/**
 * Number provenance is structural (Codex review of 0c10f442). The earlier check stripped fixture
 * values from anywhere in the output, so "CARSI has 13 core pillars." passed when 13 happened to
 * be the course count, and "thirteen" was not a listed number word. Now:
 *   1. the template strings in llms-txt.ts carry no digits and no number words (parsed, not run);
 *   2. every value a template inserts is a sourced(value, key) call, never a bare expression;
 *   3. every sourced value equals the fixture value for its source key;
 *   4. with sourced values marked, nothing outside a marked span has a digit or a number word.
 */
const NUMBER_WORD =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen)\b/i;
const HAS_NUMBER = (t: string) => /\d/.test(t) || NUMBER_WORD.test(t);

/** Functions whose templates produce values that are then sourced (formatting, not copy). */
const VALUE_FORMATTERS = new Set(['formatAud', 'isoDate', 'makeSourcer']);
/** Locals that hold an already-sourced value. */
const SOURCED_LOCALS = new Set(['yearly', 'generated', 'email']);

function enclosingFunction(node: ts.Node): string | null {
  for (let a: ts.Node | undefined = node.parent; a; a = a.parent) {
    if (ts.isFunctionDeclaration(a) && a.name) return a.name.text;
  }
  return null;
}

/** Static template text and inserted expressions in a llms-txt.ts source. */
export function templateFindings(source: string): { staticNumbers: string[]; unsourced: string[] } {
  const sf = ts.createSourceFile('llms-txt.ts', source, ts.ScriptTarget.Latest, true);
  const staticNumbers: string[] = [];
  const unsourced: string[] = [];
  const isSourcedCall = (n: ts.Node) =>
    ts.isCallExpression(n) && n.expression.getText(sf) === 'sourced';
  const visit = (node: ts.Node) => {
    const fn = enclosingFunction(node);
    const inFormatter = fn !== null && VALUE_FORMATTERS.has(fn);
    if (
      !inFormatter &&
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node))
    ) {
      const p = node.parent;
      const skip =
        ts.isImportDeclaration(p) ||
        ts.isLiteralTypeNode(p) ||
        (ts.isCallExpression(p) && isSourcedCall(p) && p.arguments[1] === node);
      if (!skip && HAS_NUMBER(node.text)) staticNumbers.push(node.text.trim().slice(0, 90));
    }
    if (!inFormatter && ts.isTemplateSpan(node)) {
      const ex = node.expression;
      const ok =
        isSourcedCall(ex) ||
        (ts.isIdentifier(ex) && SOURCED_LOCALS.has(ex.text)) ||
        (ts.isConditionalExpression(ex) &&
          ts.isStringLiteral(ex.whenTrue) &&
          ts.isStringLiteral(ex.whenFalse));
      if (!ok) unsourced.push(ex.getText(sf));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { staticNumbers, unsourced };
}

const GENERATOR = join(process.cwd(), 'src', 'lib', 'seo', 'llms-txt.ts');

describe('llms.txt number provenance is structural', () => {
  const generatedAt = new Date('2031-01-01T00:00:00.000Z');
  const facts: LlmsFacts = {
    courses: 'ABCDEFGHIJKLM'
      .split('')
      .map((l) => ({ slug: `course-${l.toLowerCase()}`, title: `Course ${l}` })),
    onboardingProgramCount: 7,
    freeCourseCount: 5,
    minPaidCoursePriceAud: 61,
    membership: { priceCents: 79500, available: true, terms: 'Terms from the pricing tier.' },
    cecCourses: [
      {
        slug: 'course-a',
        title: 'Course A',
        approvedHours: 9,
        expiresAt: '2031-05-06T00:00:00.000Z',
      },
      {
        slug: 'course-b',
        title: 'Course B',
        approvedHours: 11,
        expiresAt: '2031-07-08T00:00:00.000Z',
      },
    ],
    events: [
      {
        title: 'Growth Day',
        venue: 'Venue Hall, Suburb QLD 4000',
        startDate: '2031-03-03',
        endDate: '2031-03-04',
        registration: 'free-token',
      },
    ],
    generatedAt,
  };

  /** What each source key may hold, from the fixture and the entity record. */
  const expected: Record<string, string[]> = {
    'catalogue.publishedCount': [String(facts.courses.length)],
    'catalogue.onboardingProgramCount': ['7'],
    'catalogue.freeCourseCount': ['5'],
    'catalogue.minPaidCoursePriceAud': [formatAud(61)],
    'catalogue.course.title': facts.courses.map((c) => c.title),
    'catalogue.course.slug': facts.courses.map((c) => c.slug),
    'pricing.membership.price': [formatAud(795)],
    'pricing.membership.terms': ['Terms from the pricing tier.'],
    'cec.count': ['2'],
    'cec.course.title': ['Course A', 'Course B'],
    'cec.course.slug': ['course-a', 'course-b'],
    'cec.course.approvedHours': ['9', '11'],
    'cec.course.expiresAt': ['2031-05-06', '2031-07-08'],
    'events.title': ['Growth Day'],
    'events.venue': ['Venue Hall, Suburb QLD 4000'],
    'events.startDate': ['2031-03-03'],
    'events.endDate': ['2031-03-04'],
    generatedAt: [generatedAt.toISOString()],
    'entity.name': [CARSI_ENTITY.name],
    'entity.description': [CARSI_ENTITY.description],
    'entity.email': [CARSI_ENTITY.email],
    'entity.address': [postalAddressLine()],
    'entity.url': [CARSI_ENTITY.url],
    'entity.legalName': [CARSI_ENTITY.legalName],
    'entity.sameAs.label': CARSI_ENTITY.sameAs.map((s) => s.label),
    'entity.sameAs.url': CARSI_ENTITY.sameAs.map((s) => s.url),
  };

  it('provenance: the checks fail on a hand-typed count, in words or in digits (controls)', () => {
    const planted = (sentence: string) =>
      readFileSync(GENERATOR, 'utf8').replace(
        "    '## What is CARSI?',\n",
        `    '## What is CARSI?',\n    '${sentence}',\n`
      );
    expect(templateFindings(planted('CARSI has thirteen core pillars.')).staticNumbers).toContain(
      'CARSI has thirteen core pillars.'
    );
    // 13 is also the fixture course count: a value match must not excuse it.
    expect(templateFindings(planted('CARSI has 13 core pillars.')).staticNumbers).toContain(
      'CARSI has 13 core pillars.'
    );
    const bare = readFileSync(GENERATOR, 'utf8').replace(
      "`- Published courses: ${sourced(facts.courses.length, 'catalogue.publishedCount')} (full list below).`",
      '`- Published courses: ${facts.courses.length} (full list below).`'
    );
    expect(templateFindings(bare).unsourced).toContain('facts.courses.length');
  });

  it('provenance: the generator templates carry no digits or number words', () => {
    expect(templateFindings(readFileSync(GENERATOR, 'utf8')).staticNumbers).toEqual([]);
  });

  it('provenance: every inserted value goes through sourced()', () => {
    expect(templateFindings(readFileSync(GENERATOR, 'utf8')).unsourced).toEqual([]);
  });

  it('provenance: every sourced value equals its source', () => {
    const trace: SourcedValue[] = [];
    buildLlmsTxt(facts, { trace });
    expect(trace.length).toBeGreaterThan(20);
    const wrong = trace.filter((t) => !(expected[t.source] ?? []).includes(t.value));
    expect(wrong).toEqual([]);
  });

  it('provenance: outside the sourced values, the generated text has no number', () => {
    const marked = buildLlmsTxt(facts, { mark: true });
    const rest = marked.replace(
      new RegExp(`${SOURCED_OPEN}[^${SOURCED_CLOSE}]*${SOURCED_CLOSE}`, 'g'),
      ' '
    );
    expect(rest.split('\n').filter(HAS_NUMBER)).toEqual([]);
    // the marks are test-only: production text carries none
    expect(buildLlmsTxt(facts)).not.toMatch(new RegExp(`[${SOURCED_OPEN}${SOURCED_CLOSE}]`));
  });
});
