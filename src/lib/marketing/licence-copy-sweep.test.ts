/**
 * Licence and Australian Consumer Law sweep over every public copy surface, not only FAQ arrays.
 * Independent review of fix/industry-faq-licence (18/10/2026) found the same defects live outside
 * the FAQs: acronym-named bundles and add-ons ("CRT Carpet Restoration + CCT Commercial Carpet
 * + OCT Odour Control … seeking IICRC credentials"), customer-journey copy ("Start with WRT"),
 * meta keywords naming a course by its code plus "CEC" (plumbing), unsold carpet-repair offers in shared industry data,
 * the catalogue topic list and outbound marketing docs, plumbing cards claiming certification lets
 * plumbers "legally" perform and invoice the work and a $2,500–$15,000 per-job range, and a CEC
 * statement covering a vehicle course with no IICRC approval.
 *
 * Scope is source text, line by line. JSX text split across elements, string concatenation, HTML
 * entities and zero-width characters are out of scope here: the rendered-text scan owned by
 * feat/designations-live covers them.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const ACRONYMS = 'WRT ASD AMRT FSRT CCT CRT OCT TCST RRT'.split(' ');
const ACRONYM = new RegExp(`\\b(?:${ACRONYMS.join('|')})\\b`);
const A = ACRONYMS.join('|');

function walk(dir: string, keep: (f: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

const notTest = (f: string) => !/\.test\.[tj]sx?$/.test(f);

/**
 * Every public surface whose text reaches a customer: rendered pages and shared copy. docs/ plans
 * are reviewed on fix/marketing-docs-licence and stay covered by check:iicrc-compliance.
 */
export function copySurfaces(): string[] {
  return [
    ...walk(join(ROOT, 'app', '(public)', 'industries'), (f) => f.endsWith('.tsx') && notTest(f)),
    join(ROOT, 'app', '(public)', 'courses', 'page.tsx'),
    ...walk(join(ROOT, 'src', 'components', 'industries'), (f) => /\.tsx?$/.test(f) && notTest(f)),
    ...walk(join(ROOT, 'src', 'lib', 'marketing'), (f) => /\.ts$/.test(f) && notTest(f)),
    join(ROOT, 'src', 'lib', 'customer-journey-loop.ts'),
    join(ROOT, 'src', 'lib', 'server', 'public-catalogue-facts.ts'),
    join(ROOT, 'src', 'lib', 'server', 'onboarding-pathway.ts'),
    join(ROOT, 'src', 'components', 'lms', 'diagrams', 'IICRCDisciplineMap.tsx'),
    ...walk(
      join(ROOT, 'public'),
      (f) => /\.(md|txt)$/.test(f) || f.endsWith('start-smart-readiness.json')
    ),
  ].filter((f) => existsSync(f));
}

/** Third-person references to the IICRC's own certifications, and data that is not copy. */
const ACRONYM_ALLOWED = new RegExp(
  [
    'IICRC certifications?',
    'is an IICRC certification',
    'obtained (?:only )?through',
    'required by',
    'approved by the IICRC',
    `\\|\\s*(?:${A})\\s*\\|`, // a markdown table cell naming the IICRC certification
    `IICRC [A-Z][A-Za-z ]+\\((?:${A})\\)`, // "IICRC Carpet Cleaning Technician (CCT)" source label
    `^\\s*['"]?(?:${A})['"]?\\s*:`, // object key: a code-to-label map
    `(?:^|[{,]\\s*)(?:code|id|value):\\s*['"](?:${A})['"]`, // chip / record code (data, not rendered)
    `(?:return|===)\\s*['"](?:${A})['"]`, // selection logic returning a code
    `\\[\\s*(?:['"](?:${A})['"]\\s*,?\\s*)+\\]`, // an array of codes (course selection data)
    `discipline=(?:${A})\\b`, // legacy URL parameter routed to a topic tab
    `\\{\\s*(?:${A}):\\s*['"](?:${A})['"]\\s*\\}`, // code-to-code routing map (data)
    'utm_campaign=',
  ].join('|')
);

const UNSOLD = /\bcarpet repair\b|\breinstall/i;
const UNSOLD_ALLOWED =
  /CARSI sells (?:no|neither)|removed|does not (?:sell|offer|cover)|\|\s*(?:RRT|CRT)\s*\|/i;

const CLAIMS: Array<[string, RegExp]> = [
  [
    'certification as a legal licence to perform or invoice',
    /legally[^.]{0,100}\b(?:perform|invoice)/i,
  ],
  [
    'unsourced per-job revenue range',
    /\$\s?\d[\d,]*\s*(?:to|–|-)\s*\$\s?\d[\d,]*[^.]{0,80}\b(?:per (?:job|call-out)|restoration jobs)/i,
  ],
  ['bundle sold as a route to IICRC credentials', /seeking IICRC credentials/i],
  ['unsourced module duration', /\b\d+\s*[-–]\s*\d+\s*hours?\b[^.]{0,30}\bmodules?\b/i],
  [
    'CEC accreditation covering the unapproved vehicle course',
    /IICRC CEC Accredited.{0,300}(?:vehicle drying|Drying Transportation and Vehicles)|(?:vehicle drying|Drying Transportation and Vehicles).{0,300}IICRC CEC Accredited/i,
  ],
  // review of 1f81b12a (data-centres, government-defence): unsourced guarantees and requirements
  ['unsourced cost of downtime', /\bcosts? (?:thousands|millions|hundreds of thousands)\b/i],
  [
    'response-time guarantee',
    /\b(?:respond|response|on site)\b[^.]{0,60}\bwithin (?:minutes|\d+\s*(?:minutes|hours))\b/i,
  ],
  ['third-party tier or standard compliance promised', /Uptime Institute|\btier compliance\b/i],
  [
    'AusTender presented as a compliance standard or certification requirement',
    /AusTender compliance|\bfor AusTender\b|AusTender[^.]{0,80}\b(?:lists?|requires?|mandates?)\b/i,
  ],
  [
    'unsourced prevalence or trend claim',
    /\b(?:the leading|the most common|number one|#1)\b[^.]{0,40}\bcauses?\b|\bincreasingly (?:listed|required)\b|\b(?:many|most|often)\b[^.]{0,80}\blists? IICRC certification\b/i,
  ],
  ['statutory compliance as a training outcome', /\bAct Compliance\b/],
  ['a platform or panel presented as listing IICRC certification', /\bLists IICRC certification\b/],
];

function copyLines(file: string): Array<[number, string]> {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line, i) => [i + 1, line] as [number, string])
    .filter(([, line]) => !/^\s*(?:\/\/|\*|\/\*)/.test(line)); // source comments are not copy
}

export function sweepProblems(file: string, lines: Array<[number, string]>): string[] {
  const problems: string[] = [];
  const isMap = file.endsWith('IICRCDisciplineMap.tsx'); // framed on /courses as the IICRC's own map
  for (const [n, line] of lines) {
    const where = `${relative(ROOT, file)}:${n}`;
    if (!isMap && ACRONYM.test(line) && !ACRONYM_ALLOWED.test(line))
      problems.push(`${where} acronym in copy: ${line.trim().slice(0, 120)}`);
    if (UNSOLD.test(line) && !UNSOLD_ALLOWED.test(line))
      problems.push(`${where} unsold training: ${line.trim().slice(0, 120)}`);
    for (const [name, re] of CLAIMS)
      if (re.test(line)) problems.push(`${where} ${name}: ${line.trim().slice(0, 120)}`);
  }
  return problems;
}

describe('licence copy sweep', () => {
  it('sweep: covers the surfaces the review found exposures on', () => {
    const surfaces = copySurfaces().map((f) => relative(ROOT, f));
    for (const f of [
      'app/(public)/industries/commercial-cleaning/page.tsx',
      'src/lib/marketing/industry-page-data.ts',
      'src/lib/customer-journey-loop.ts',
      'src/lib/marketing/start-smart.ts',
      'public/start-smart-readiness.json',
      'src/lib/server/public-catalogue-facts.ts',
      'app/(public)/industries/data-centres/page.tsx',
      'app/(public)/industries/government-defence/page.tsx',
    ])
      expect(surfaces).toContain(f);
    expect(surfaces.some((f) => f.startsWith('docs/'))).toBe(false);
  });

  it('sweep: each check fires on the copy it was written for', () => {
    const fx = (s: string) => sweepProblems('x.tsx', [[1, s]]);
    expect(
      fx('description="CRT Carpet Restoration + CCT Commercial Carpet + OCT Odour Control."')
    ).not.toEqual([]);
    expect(fx("'Start with WRT fundamentals, then add structural drying.',")).not.toEqual([]);
    expect(fx("addon: 'WRT',")).not.toEqual([]);
    expect(
      fx("'carpet repair, carpet cleaning and odour control credentials for insurance work',")
    ).not.toEqual([]);
    expect(fx('let plumbers legally perform — and invoice for — the full scope')).not.toEqual([]);
    expect(fx('jobs average $2,500–$15,000 per job')).not.toEqual([]);
    expect(fx('Perfect for cleaning contractors seeking IICRC credentials.')).not.toEqual([]);
    expect(fx('Minimal roster disruption — 2-4 hour self-paced modules.')).not.toEqual([]);
    // review of 1f81b12a: the live data-centres and government-defence lines
    expect(
      fx(
        "'Every minute of downtime costs thousands. Restoration training ensures your facility team can respond to water and fire events within minutes, protecting SLA commitments and Uptime Institute tier compliance.',"
      )
    ).toHaveLength(3);
    expect(
      fx(
        "'Restoration training for Australian councils, agencies and defence facilities. Mould remediation, water damage restoration, structural drying and fire & smoke restoration courses for AusTender compliance.',"
      )
    ).not.toEqual([]);
    expect(fx("requirement: 'Lists IICRC certification for pre-qualification',")).not.toEqual([]);
    expect(
      fx(
        "name: 'AusTender (Commonwealth)', requirement: 'Lists IICRC certification for pre-qualification',"
      )
    ).not.toEqual([]);
    expect(
      fx(
        "'CRAC unit leaks, overhead pipe bursts, and cooling failures are the leading non-power cause of data centre outages.'"
      )
    ).not.toEqual([]);
    expect(
      fx(
        "body: 'IICRC certification is increasingly listed on Commonwealth, state and local procurement panels.',"
      )
    ).not.toEqual([]);
    expect(fx("{ value: 'WHS', label: 'Act Compliance' },")).not.toEqual([]);
    expect(
      fx(
        "'IICRC CEC Accredited restoration courses: water damage, vehicle drying and odour control.'"
      )
    ).not.toEqual([]);
    expect(
      fx(
        "'IICRC CEC Accredited courses for transport operations. Water damage, vehicle drying and odour control courses.'"
      )
    ).not.toEqual([]);
  });

  it('sweep: allows third-person references and course-selection data', () => {
    const fx = (s: string) => sweepProblems('x.tsx', [[1, s]]);
    expect(fx("disciplines={['WRT', 'CRT', 'OCT']}")).toEqual([]);
    expect(fx("{ code: 'WRT', label: 'Water Damage', color: '#000' },")).toEqual([]);
    expect(fx("href: '/courses?discipline=CCT',")).toEqual([]);
    expect(fx('FSRT is an IICRC certification covering fire and smoke.')).toEqual([]);
    expect(fx("requirement: 'WRT and FSRT commonly required by adjusters',")).toEqual([]);
    expect(
      fx('| Water Restoration Technician | WRT | Foundation for water damage work. |')
    ).toEqual([]);
    expect(fx("CRT: 'Colour repair',")).toEqual([]);
    expect(fx("'AusTender restoration panel',")).toEqual([]);
    expect(fx('an AusTender search strategy.')).toEqual([]);
    expect(fx('Each agency sets its own tender criteria.')).toEqual([]);
  });

  it.each(copySurfaces().map((f) => [relative(ROOT, f), f]))('sweep: %s', (_name, file) => {
    expect(sweepProblems(file, copyLines(file))).toEqual([]);
  });
});

/** Topic words a discipline code's course selection actually covers. */
const CODE_TOPICS: Record<string, RegExp> = {
  WRT: /water|flood/i,
  ASD: /dry/i,
  AMRT: /mould|microbial|infection/i,
  FSRT: /fire|smoke/i,
  OCT: /odour/i,
  CCT: /carpet|cleaning/i,
  CRT: /carpet|cleaning|colour/i,
};

function industryPages(): Array<[string, string]> {
  const dir = join(ROOT, 'app', '(public)', 'industries');
  return readdirSync(dir)
    .filter((s) => existsSync(join(dir, s, 'page.tsx')))
    .map((s) => [s, readFileSync(join(dir, s, 'page.tsx'), 'utf8')]);
}

describe('recommended-course routing matches the copy', () => {
  /**
   * Review P1 (18/10/2026): the transport page relabelled its CRT chip and heading "vehicle
   * drying", but the recommendations still query courses by the CRT code, which can never
   * return the vehicle course. Labels and headings must describe what is selected.
   */
  it.each(industryPages())(
    'routing: %s chips and heading match the selected codes',
    (_slug, src) => {
      const problems: string[] = [];
      for (const m of src.matchAll(/\{\s*code:\s*'([A-Z]+)',\s*label:\s*'([^']+)'/g)) {
        const [, code, label] = m;
        if (CODE_TOPICS[code] && !CODE_TOPICS[code].test(label))
          problems.push(`chip ${code} labelled "${label}"`);
      }
      const codes = src.match(/disciplines=\{\[([^\]]*)\]\}/)?.[1].match(/[A-Z]+/g) ?? [];
      const heading = codes.length ? (src.match(/disciplineList="([^"]+)"/)?.[1] ?? '') : '';
      for (const topic of heading.split(/,\s*|\s+and\s+/).filter(Boolean)) {
        if (!codes.some((c) => CODE_TOPICS[c]?.test(topic)))
          problems.push(`heading topic "${topic}" not selected by ${codes.join('/')}`);
      }
      expect(problems).toEqual([]);
    }
  );
});

/** IICRC designation names: a chip may name the subject, never the designation. */
const DESIGNATION_NAME =
  /technician|applied structural drying|applied microbial remediation|water damage restoration|fire (?:&|and) smoke restoration|carpet (?:restoration|repair)|colour repair|commercial carpet maintenance/i;

describe('industry chips are plain-English topics', () => {
  it('chips: the check fires on real designation labels and allows topics', () => {
    expect(DESIGNATION_NAME.test('Carpet Cleaning Technician')).toBe(true);
    expect(DESIGNATION_NAME.test('Odour Control Technician')).toBe(true);
    expect(DESIGNATION_NAME.test('Applied Microbial Remediation')).toBe(true);
    expect(DESIGNATION_NAME.test('Carpet cleaning')).toBe(false);
    expect(DESIGNATION_NAME.test('Mould remediation')).toBe(false);
  });

  it.each(industryPages())(
    'chips: %s discipline labels are topics, not designations',
    (_slug, src) => {
      const labels = Array.from(
        src.matchAll(/\{\s*code:\s*'[A-Z]+',\s*label:\s*'([^']+)'/g),
        (m) => m[1]
      );
      expect(labels.filter((l) => DESIGNATION_NAME.test(l))).toEqual([]);
    }
  );
});

/** Counts, money and percentages. A stat may carry one only with a sourceHref. */
const NUMBER =
  /\$\d[\d.,]*\s?[BMK]?\b|\b\d{1,3}(?:,\d{3})+\+?|\b\d+(?:\.\d+)?\s?(?:M|K|million|billion)\b\+?|\b\d+%|\b\d{2,}\+|\bTier [IVX]+\+?|\bISO\s*\d{3,}/;
/** Copy implying CARSI awards IICRC credentials or certification. */
const IICRC_CREDENTIAL =
  /IICRC[- ](?:recognised|recognized|certified)|IICRC credentials?|Certified restoration training|IICRC CEC Accredited credentials|value:\s*'IICRC',\s*label:\s*'(?:Certified|Approved|Certification|Standards)'/i;

function statsObjects(src: string): string[] {
  const start = src.search(/const stats\s*=\s*\[/);
  if (start < 0) return [];
  let i = src.indexOf('[', start) + 1;
  let depth = 1;
  while (depth && i < src.length) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') depth--;
    i++;
  }
  return src.slice(start, i).match(/\{[^{}]*\}/g) ?? [];
}

export function numberProblems(src: string): string[] {
  const problems: string[] = [];
  for (const stat of statsObjects(src)) {
    const value = stat.match(/value:\s*'([^']*)'/)?.[1] ?? '';
    const label = stat.match(/label:\s*'([^']*)'/)?.[1] ?? '';
    if ((NUMBER.test(value) || NUMBER.test(label) || /^\d/.test(value)) && !/sourceHref/.test(stat))
      problems.push(`unsourced stat: ${value} ${label}`);
    if (IICRC_CREDENTIAL.test(stat.replace(/\s+/g, ' ')))
      problems.push(`stat implies IICRC credentials: ${value} ${label}`);
  }
  const body = src.replace(/const stats\s*=\s*\[[\s\S]*?\n\];/, '');
  for (const line of body.split('\n')) {
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line) || /color|#[0-9a-f]{3,6}/i.test(line)) continue;
    if (NUMBER.test(line)) problems.push(`unsourced number: ${line.trim().slice(0, 120)}`);
    if (IICRC_CREDENTIAL.test(line))
      problems.push(`implies IICRC credentials: ${line.trim().slice(0, 120)}`);
  }
  return problems;
}

describe('industry copy carries no unsourced numbers or IICRC-credential claims', () => {
  it('numbers: the checks fire on the live copy they were written for', () => {
    expect(
      numberProblems("const stats = [\n  { value: '2,800+', label: 'Caravan Parks (AUS)' },\n];")
    ).not.toEqual([]);
    expect(
      numberProblems("const stats = [\n  { value: '$8.6B', label: 'Industry Revenue' },\n];")
    ).not.toEqual([]);
    expect(
      numberProblems(
        "const stats = [\n  {\n    value: '2,590',\n    label: 'Homes',\n    sourceHref: 'https://x',\n  },\n];"
      )
    ).toEqual([]);
    expect(
      numberProblems('description="Australia\'s 2,800+ caravan parks face mould risk."')
    ).not.toEqual([]);
    expect(
      numberProblems('description="IICRC credentials satisfy AusTender pre-qualification."')
    ).not.toEqual([]);
    expect(numberProblems('description="with IICRC-recognised credentials."')).not.toEqual([]);
    expect(numberProblems("  { value: 'IICRC', label: 'Certified' },")).not.toEqual([]);
    expect(
      numberProblems("const stats = [\n  { value: 'IICRC', label: 'Certification' },\n];")
    ).not.toEqual([]);
    expect(
      numberProblems("const stats = [\n  { value: 'IICRC CEC', label: 'On approved courses' },\n];")
    ).toEqual([]);
    expect(
      numberProblems('description="Water damage restoration courses, studied online."')
    ).toEqual([]);
  });

  it.each(industryPages())('numbers: %s', (_slug, src) => {
    expect(numberProblems(src)).toEqual([]);
  });
});
