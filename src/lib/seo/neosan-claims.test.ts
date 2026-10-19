import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NeoSan Labs course claim guard (review r14, extended for the course expansion, 19/10/2026).
 *
 * Fail-closed. Every clause of every lesson block must be one of:
 *   - cited: ends with "(source: <verified URL>, checked dd/mm/yyyy)", names the
 *     publisher of that URL in the same clause, and (for a product source) names
 *     the same product number as the source;
 *   - an instruction (starts with an imperative verb, or "If/When ..., <verb>");
 *   - a question;
 *   - course framing ("By the end of this lesson", "This course", ...);
 *   - inside a block labelled as CARSI's own words ("CARSI note:", "CARSI method:",
 *     "CARSI example:", "CARSI answer:", "Scenario:").
 * Separately, any clause matching CLAIM_PATTERN must itself be properly cited,
 * unless it is a prohibition ("Never write ...").
 *
 * Clauses split on ";", ": " and spaced dashes, so a citation on one clause cannot
 * clear a claim in another (r13 piggyback), and an SDS direction cannot swallow a
 * later claim (r13 SDS strip). A citation must END its clause, so a claim tacked on
 * after a citation is caught. Titles, tags, descriptions, meta and the quiz file are
 * scanned too (r13 meta scope).
 *
 * Limit, stated honestly: a regex cannot read meaning. A factual statement placed
 * BEFORE a valid citation in the same clause, or written as an instruction, passes
 * this guard; the end-to-end human/independent re-read is still required.
 */
interface Lesson {
  title: string;
  contentBody?: string | null;
}
interface Course {
  slug: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  tags?: string[];
  iicrcDiscipline?: string | null;
  cecHours?: number;
  meta?: Record<string, unknown>;
  modules: { title: string; lessons: Lesson[] }[];
}
interface QuizFile {
  courseSlug: string;
  quizzes: {
    title: string;
    questions: { questionText: string; options: string[]; correctIndex: number; explanation?: string }[];
  }[];
}

const ROOT = join(__dirname, '..', '..', '..');
const SLUG = 'neosan-labs-product-training';
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: Course[];
  }
).courses;
const course = catalogue.find((entry) => entry.slug === SLUG);
const quizFile = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seed', `${SLUG}.quizzes.json`), 'utf8'),
) as QuizFile;

const CCW = 'https://ccwonline.com.au/products/';
const CDN = 'https://cdn.shopify.com/s/files/1/2179/6391/files/';
const SWA = 'https://www.safeworkaustralia.gov.au';
type Publisher =
  | 'CCW'
  | 'SDS'
  | 'SWA'
  | 'WSNZ'
  | 'TGA'
  | 'NEOSAN'
  | 'IPC'
  | 'AGED'
  | 'NSWH'
  | 'QLDH'
  | 'AICIS'
  | 'PUBCHEM'
  | 'NTC'
  | 'BGA'
  | 'PIC';
/** URLs opened and checked against the cited facts on 19/10/2026. Nothing else may be cited or linked. */
const VERIFIED: Record<string, { publisher: Publisher; product?: string }> = {
  [`${CCW}neosan-labs-01-disinfectant-2-x-a-b`]: { publisher: 'CCW', product: '01' },
  [`${CCW}neosan-labs-02-air-detox-2-x-a-b`]: { publisher: 'CCW', product: '02' },
  [`${CCW}neosan-labs-03-carpet-2-x-a-b`]: { publisher: 'CCW', product: '03' },
  [`${CCW}neosan-labs-r04-a-b-4-pk`]: { publisher: 'CCW', product: '04' },
  [`${CDN}202103_SDS_NeoSanLabs_01_Disinfectant_Combined_USA_2021_En.pdf`]: { publisher: 'SDS', product: '01' },
  [`${CDN}202103_SDS_NeoSanLabs_02_AirDetox_Combined_USA_2021_En.pdf`]: { publisher: 'SDS', product: '02' },
  [`${CDN}202103_SDS_NeoSanLabs_03_Carpet_Combined_USA_2021_En.pdf`]: { publisher: 'SDS', product: '03' },
  [`${CDN}202103_SDS_NeoSanLabs_04_Restoration_Combined_USA_2021_En.pdf`]: { publisher: 'SDS', product: '04' },
  [`${SWA}/safety-topic/hazards/chemicals/safety-data-sheets`]: { publisher: 'SWA' },
  [`${SWA}/safety-topic/hazards/chemicals/safety-data-sheets/using-safety-data-sheets`]: { publisher: 'SWA' },
  [`${SWA}/safety-topic/hazards/chemicals/labelling-hazardous-chemicals/information-hazardous-chemical-labels`]: {
    publisher: 'SWA',
  },
  [`${SWA}/safety-topic/hazards/chemicals/hazardous-chemicals/whs-duties-related-hazardous-chemicals`]: {
    publisher: 'SWA',
  },
  [`${SWA}/safety-topic/hazards/chemicals/classifying-chemicals/classifying-chemicals-australia`]: {
    publisher: 'SWA',
  },
  [`${SWA}/safety-topic/managing-health-and-safety/identify-assess-and-control-hazards/managing-risks`]: {
    publisher: 'SWA',
  },
  [`${SWA}/safety-topic/managing-health-and-safety/personal-protective-equipment-ppe/how-personal-protective-equipment-helps-manage-risks`]:
    { publisher: 'SWA' },
  [`${SWA}/resources-and-publications/guidance-materials/understanding-safety-data-sheets-hazardous-chemicals`]: {
    publisher: 'SWA',
  },
  'https://www.worksafe.govt.nz/topic-and-industry/hazardous-substances/managing/safety-data-sheets/': {
    publisher: 'WSNZ',
  },
  'https://www.tga.gov.au/resources/artg': { publisher: 'TGA' },
  'https://ccwonline.com.au/blogs/news/chemical-dilution-ratio-calculator': { publisher: 'CCW' },
  'https://ccwonline.com.au/blogs/news/hydroforce-sprayer-dilutions-made-easy': { publisher: 'CCW' },
  // Course expansion sources, opened and checked 19/10/2026.
  'https://www.safeworkaustralia.gov.au/system/files/documents/1902/managing-risks-of-storing-chemicals-in-the-workplace_0.pdf': { publisher: 'SWA' },
  'https://www.tga.gov.au/resources/resource/guidance/regulation-cleaners-and-disinfectants-information-sponsors-and-manufacturers': { publisher: 'TGA' },
  'https://ccwonline.com.au/products/air-care-max-ulv-fogger-230v-50hz': { publisher: 'CCW' },
  'https://ccwonline.com.au/products/b-g-flex-a-lite-2600-ulv-fogger-230volt': { publisher: 'CCW' },
  'https://ccwonline.com.au/products/budget-commercial-sprayer-12ltr': { publisher: 'CCW' },
  'https://ccwonline.com.au/products/tcbs-the-countries-best-sprayer-12-ltr': { publisher: 'CCW' },
  'https://neosanlabs.com/about/': { publisher: 'NEOSAN' },
  'https://www.safetyandquality.gov.au/sites/default/files/2026-05/australian-guidelines-for-the-prevention-and-control-of-infection-in-healthcare.pdf': { publisher: 'IPC' },
  'https://www.safetyandquality.gov.au/sites/default/files/2024-08/the_aged_care_ipc_guide_-_chapter_6.pdf': { publisher: 'AGED' },
  'https://www1.health.nsw.gov.au/pds/ActivePDSDocuments/PD2023_018.pdf': { publisher: 'NSWH' },
  'https://www.health.qld.gov.au/publications/clinical-practice/guidelines-procedures/diseases-infection/governance/multi-resistant-organisms.pdf': { publisher: 'QLDH' },
  'https://www.industrialchemicals.gov.au/sites/default/files/Cationic%20surfactants_Human%20health%20tier%20II%20assessment.pdf': { publisher: 'AICIS' },
  'https://www.industrialchemicals.gov.au/sites/default/files/2022-06/EVA00071%20-%20Evaluation%20Statement%20-%2030%20June%202022.pdf': { publisher: 'AICIS' },
  'https://pubchem.ncbi.nlm.nih.gov/compound/784': { publisher: 'PUBCHEM' },
  'https://pubchem.ncbi.nlm.nih.gov/compound/3014024': { publisher: 'PUBCHEM' },
  'https://www.ntc.gov.au/codes-and-guidelines/australian-dangerous-goods-code': { publisher: 'NTC' },
  'https://business.gov.au/people/contractors/prepare-quotes': { publisher: 'BGA' },
  'https://www.poisonsinfo.nsw.gov.au/about': { publisher: 'PIC' },
};
const ATTRIBUTION: Record<Publisher, RegExp> = {
  CCW: /\bCCW\b|\bthe (?:0[1-4] )?(?:directions|listing)\b|\bNeoSan Labs (?:states?|position)\b/i,
  SDS: /\bSDS\b/,
  SWA: /\bSafe Work Australia\b/,
  WSNZ: /\bWorkSafe\b/,
  TGA: /\bTGA\b|\bARTG\b/,
  NEOSAN: /\bNeoSan Labs\b/,
  IPC: /\bnational IPC guidelines\b|\bNHMRC\b/,
  AGED: /\bAged Care IPC Guide\b/,
  NSWH: /\bNSW Health\b/,
  QLDH: /\bQueensland Health\b/,
  AICIS: /\bAICIS\b/,
  PUBCHEM: /\bPubChem\b/,
  NTC: /\bNTC\b|\bADG Code\b/,
  BGA: /\bbusiness\.gov\.au\b/,
  PIC: /\bPoisons Information Centre\b/,
};

const CLAIM_PATTERN = new RegExp(
  [
    // r2-r9 inventory (kept)
    'hospital[- ]grade',
    'non[- ]?toxic|nontoxic',
    'non[- ]?mutagenic',
    'non[- ]?carcinogenic',
    'safe for (?:humans|animals|plants|pets|children)',
    'no harmful residue',
    '(?:landfill|sewer)[- ]safe',
    '\\b(?:kills?|killing|eliminates?|destroys?|eradicates?)\\b',
    '\\bproven\\b',
    '99[.,]9{2,}\\s*(?:%|per\\s?cent)?',
    'prevent\\w* the spread',
    'stay healthy',
    'control\\w* allergens',
    'guarantee\\w*',
    '100\\s?%',
    '\\b\\d+\\s+times\\b',
    'times\\s+(?:the force|more|faster|better)',
    'wraps?\\s+around',
    'reverses?\\s+course',
    'hidden surfaces',
    'coverage[^.]{0,40}\\d+',
    '\\bcancers?\\b',
    '\\bcarcinogens?\\b',
    '\\bmutagens?\\b',
    '\\breproductive\\b',
    '\\bendocrine\\b',
    '\\btoxic(?!ological)(?:ity)?\\b',
    '\\bpoison\\w*\\b(?!\\s+(?:information|centre|center))',
    'allergen-causing',
    'asthma-causing',
    '\\bbiodegradab\\w*',
    '\\bpersistent\\b',
    '\\bbioaccumulat\\w*',
    '\\baquatic\\b',
    'eco-friendly',
    '\\bgreen\\b',
    // r13 coverage: disinfectant / sanitiser / germ / health claims
    '\\bdisinfect\\w*',
    '\\bsaniti[sz]\\w*',
    '\\bsteril[iy]\\w*',
    '\\bgerm\\w*',
    '\\banti(?:bacterial|microbial|viral|fungal)\\b',
    '\\bbacteri\\w*',
    '\\bvir(?:us|uses|al|icid\\w*)\\b',
    '\\bfungicid\\w*',
    '\\bpathogen\\w*',
    '\\bmould[- ]kill\\w*',
    '\\bhealth(?:ier|y)\\b',
    'health (?:benefits?|outcomes?)',
    '\\binfecti\\w*',
    '\\ballerg\\w*',
    '\\basthma\\b',
    '\\bhygien\\w*',
    'cleaner air|\\bpurif(?:ies|y|ied)\\b|purifying (?:the )?air|air quality',
    // r13 coverage: performance, safety and regulatory claims
    '\\bneutrali[sz]\\w*',
    '\\bdeodori[sz]\\w*',
    '\\bdissolv\\w*',
    '\\bremov\\w*\\s+(?:\\w+\\s+){0,2}(?:stains?|odours?|residue|soil)\\b',
    'will not reappear',
    '\\bno residue|residue[- ]free|leaves? nothing behind',
    '\\bcorros\\w*|low-corrosive',
    '\\bVOCs?\\b|formaldehyde',
    '\\befficien\\w*',
    'cost[- ]savings?',
    '\\bgreatly\\b',
    '\\bpowerful\\b',
    '\\beffective(?:ly|ness)?\\b',
    '\\bharmless\\b',
    '\\b(?:is|are|completely|totally|perfectly)\\s+safe\\b',
    '\\bsafe\\s+(?:for|to|around|on|with)\\b',
    'not (?:considered |classified as )?hazardous',
    '\\bharmful\\b',
    '(?:EPA|TGA|government)[- ](?:approved|registered)',
    'registered (?:disinfectant|product)',
  ].join('|'),
  'i',
);
/** Product training entry: the IICRC and CEC wording rule in CLAUDE.md is fail-closed here. */
const IICRC_CEC = /\bIICRC\b|\bCEC\b|accredit/i;
/** Self-attested compliance records are not evidence (r13 FALSE-COMPLIANCE-META). */
const SELF_ATTEST = /compliance pass|\bcompliant\b|passed (?:independent )?review|claim[- ]?boundary/i;

const IMPERATIVE = new Set(
  (
    'add allow always answer apply ask attach avoid bag block book bring brief calculate call carry check choose clean ' +
    'clear close collect combine compare confirm consult contain copy cover decide describe dilute do dispose ' +
    "don't drain empty enter extract file fill find fit flush fog follow give go identify inspect keep label " +
    'leave let list lock look make mark match measure mix move never note notify open photograph pick pack pass plan ' +
    'plug post pour practise pre-spray print put quote read recall record release remove repeat replace review rewrite ' +
    'rinse ring run say search seal set show shut sign spray start stop store switch take tell test time treat ' +
    'triple try turn use ventilate wait wear wipe write ' +
    // course expansion
    'agree attribute convert count divide get handle invoice multiply name prepare price report round schedule scope ' +
    'adjust calibrate change complete consider dry estimate fit-check include load lay offer point recommend refer secure send soak state talk unload visit update walk warn weigh work'
  ).split(' '),
);
const CONDITIONAL_LEAD = /^(?:if|when|before|after|once|until|while|unless|on|for|in)\b[^,]*,\s*(\S+)/i;
const FRAME = /^(?:By the end of this lesson|This course|This lesson|This module|Each lesson|Each module|In this course|On a real job|You will)\b/;
const LABEL = /^(?:CARSI (?:note|method|example|answer)|Scenario):/;
const PROHIBITION = /^(?:never|do not|don't)\s+(?:write|say|claim|promise|imply|tell|add|describe|present|call)\b/i;
/** Lessons allowed to show struck-through non-compliant wording as a rewrite exercise. */
const DEL_LESSONS = new Set([
  'What you can and cannot say in Australia',
  'Mixed practice: one job from start to finish',
]);
const CITE = /\(([^()]*?)\bsource:\s*(https?:\/\/[^\s,()]+),\s*checked\s+(\d{1,2}\/\d{1,2}\/\d{4})\)/g;
const DATE_OK = /^(?:0?[1-9]|[12]\d|3[01])\/(?:0?[1-9]|1[0-2])\/20\d\d$/;

interface Finding {
  where: string;
  reason: string;
  text: string;
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;|&lsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&sup2;/g, '²')
    .replace(/&times;/g, '×');
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(&•])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitClauses(sentence: string): string[] {
  return sentence
    .split(/;\s+|:\s+|\s+[—–]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function startsImperative(clause: string): boolean {
  const first = (clause.match(/^[\s"“(]*([A-Za-z’'-]+)/)?.[1] ?? '').toLowerCase().replace('’', "'");
  if (IMPERATIVE.has(first)) return true;
  const lead = clause.match(CONDITIONAL_LEAD);
  return Boolean(lead && IMPERATIVE.has(lead[1].toLowerCase().replace(/[^a-z'-]/g, '')));
}

interface Cite {
  prefix: string;
  url: string;
  date: string;
}

/** Evaluate one block of plain text (tags already stripped). */
function evaluateText(
  text: string,
  where: string,
  opts: { labelled?: boolean; heading?: boolean; claimsOnly?: boolean } = {},
): Finding[] {
  const out: Finding[] = [];
  const cites: Cite[] = [];
  const withMarks = decode(text).replace(CITE, (_m, prefix: string, url: string, date: string) => {
    cites.push({ prefix, url, date });
    return `⟦C${cites.length - 1}⟧`;
  });
  const labelled = opts.labelled || LABEL.test(withMarks.trim());
  for (const sentence of splitSentences(withMarks)) {
    for (const clause of splitClauses(sentence)) {
      if (clause === '[struck example]' || /^\[struck example\][.?!]?$/.test(clause)) continue;
      const marks = [...clause.matchAll(/⟦C(\d+)⟧/g)].map((m) => cites[Number(m[1])]);
      const bare = clause.replace(/⟦C\d+⟧/g, ' ');
      let cited = false;
      if (marks.length > 0) {
        const endsWithCite = /⟦C\d+⟧[\s.!?"”'’]*$/.test(clause);
        const products = [...bare.matchAll(/\b0[1-4]\b/g)].map((m) => m[0]);
        const problems: string[] = [];
        for (const c of marks) {
          const src = VERIFIED[c.url];
          if (!src) {
            problems.push(`unverified source ${c.url}`);
            continue;
          }
          if (!DATE_OK.test(c.date)) problems.push(`bad checked date ${c.date}`);
          if (!ATTRIBUTION[src.publisher].test(bare) && !ATTRIBUTION[src.publisher].test(c.prefix)) {
            problems.push(`citation not attributed to its publisher (${src.publisher})`);
          }
          if (src.product && products.length > 0) {
            if (src.publisher === 'SDS' && products.some((n) => n !== src.product)) {
              problems.push(`SDS for ${src.product} cited for product ${products.join('/')}`);
            }
            if (src.publisher === 'CCW' && !products.includes(src.product)) {
              problems.push(`CCW ${src.product} listing cited for product ${products.join('/')}`);
            }
          }
        }
        if (!endsWithCite) problems.push('citation does not end its clause');
        for (const reason of problems) out.push({ where, reason, text: clause });
        cited = problems.length === 0;
      }
      if (CLAIM_PATTERN.test(bare) && !cited && !PROHIBITION.test(bare.trim())) {
        out.push({ where, reason: 'claim without a valid claim-level citation', text: clause });
        continue;
      }
      if (opts.claimsOnly || opts.heading || labelled || cited) continue;
      const t = bare.trim();
      if (/\?["”]?$/.test(t) || FRAME.test(t) || startsImperative(t) || PROHIBITION.test(t)) continue;
      out.push({ where, reason: 'statement is not cited, instructional or labelled as CARSI’s own', text: clause });
    }
  }
  return out;
}

/** Evaluate a lesson body (HTML). */
function evaluateHtml(html: string, where: string): Finding[] {
  const out: Finding[] = [];
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!VERIFIED[m[1]]) out.push({ where, reason: `unverified link ${m[1]}`, text: m[0] });
  }
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    if (!/\starget="_blank"/.test(m[0]) || !/\srel="[^"]*\bnoopener\b[^"]*"/.test(m[0])) {
      out.push({ where, reason: 'link does not open in a new tab with rel="noopener"', text: m[0] });
    }
  }
  const BLOCK = /<(p|li|h[1-6]|summary)\b[^>]*>([\s\S]*?)<\/\1>/g;
  const leftover = html
    .replace(BLOCK, ' ')
    .replace(/<\/?(?:ul|ol|details)\b[^>]*>/g, ' ')
    .trim();
  if (leftover) out.push({ where, reason: 'text outside a p/li/heading block', text: leftover.slice(0, 120) });
  for (const m of html.matchAll(BLOCK)) {
    let inner = m[2];
    const dels = [...inner.matchAll(/<del>([\s\S]*?)<\/del>/g)];
    if (dels.length > 0) {
      const allowed = DEL_LESSONS.has(where.split(' :: ')[0]);
      for (const d of dels) {
        const words = d[1].trim().split(/\s+/).length;
        if (!allowed || words > 15) {
          out.push({ where, reason: 'struck-through example outside an allowed rewrite exercise', text: d[1] });
        }
      }
      if (allowed) inner = inner.replace(/<del>[\s\S]*?<\/del>/g, '[struck example]');
    }
    const text = inner.replace(/<[^>]+>/g, '');
    out.push(...evaluateText(text, where, { heading: /^h|summary/.test(m[1]) }));
  }
  return out;
}

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...stringsIn(v)]);
  }
  return [];
}

function evaluateCourse(c: Course): Finding[] {
  const out: Finding[] = [];
  const surface = [c.title, c.description ?? '', c.shortDescription ?? '', ...(c.tags ?? [])];
  for (const m of c.modules) {
    surface.push(m.title);
    for (const l of m.lessons) {
      surface.push(l.title);
      out.push(...evaluateHtml(l.contentBody ?? '', `${l.title} :: body`));
    }
  }
  for (const s of surface) out.push(...evaluateText(s, 'title/description/tags', { claimsOnly: true }));
  for (const s of stringsIn(c.meta ?? {})) {
    if (/^https?:\/\//.test(s)) {
      if (!VERIFIED[s] && !/^https:\/\/carsi\.com\.au\//.test(s)) {
        out.push({ where: 'meta', reason: `unverified source ${s}`, text: s });
      }
      continue;
    }
    out.push(...evaluateText(s, 'meta', { claimsOnly: true }));
    if (SELF_ATTEST.test(s)) out.push({ where: 'meta', reason: 'self-attested compliance', text: s });
  }
  const whole = JSON.stringify(c);
  const iicrc = whole.match(IICRC_CEC);
  if (iicrc) out.push({ where: 'course', reason: 'IICRC/CEC framing in a product course', text: iicrc[0] });
  if (c.iicrcDiscipline !== null) out.push({ where: 'course', reason: 'iicrcDiscipline must be null', text: '' });
  if (c.cecHours !== 0) out.push({ where: 'course', reason: 'cecHours must be 0', text: '' });
  return out;
}

/** Shortest period p (2 <= p <= n/2) with which answer positions repeat; 0 when none (as in
 * scripts/check-quiz-option-balance.mjs on feat/building-science-full-course). */
function answerCycle(positions: number[]): number {
  for (let p = 2; p <= Math.floor(positions.length / 2); p++) {
    if (positions.every((v, i) => i < p || v === positions[i - p])) return p;
  }
  return 0;
}

/** Teaching words: tags and "(… source: …)" citations stripped; punctuation-only tokens are not words. */
function teachingWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\([^()]*?source: [^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const TEACH_PARTS = ['Worked example', 'Try it', 'Recall from earlier', 'Takeaway'];

/** Course-expansion teach layout: 8+ modules, each ending in a cheat sheet; 30+ teaching lessons of
 * 700-1,100 teaching words with the full layout; exactly one primary source per lesson. */
function shapeFindings(
  modules: { title: string; lessons: { title: string; contentBody?: string | null }[] }[],
): string[] {
  const out: string[] = [];
  if (modules.length < 8) out.push('fewer than 8 modules');
  let teaching = 0;
  for (const m of modules) {
    const last = m.lessons[m.lessons.length - 1];
    if (!/cheat sheet/i.test(last?.title ?? '')) out.push(`${m.title}: last lesson is not a cheat sheet`);
    for (const l of m.lessons) {
      const body = l.contentBody ?? '';
      if (!body.includes('<h2>Your win</h2>')) out.push(`${l.title}: no Your win`);
      if (body.split('<h2>Primary source</h2>').length - 1 !== 1) out.push(`${l.title}: not exactly one Primary source`);
      if (/cheat sheet/i.test(l.title)) {
        if (!body.includes('<h2>Cheat sheet</h2>')) out.push(`${l.title}: no Cheat sheet`);
        continue;
      }
      teaching += 1;
      for (const part of TEACH_PARTS) if (!body.includes(`<h2>${part}</h2>`)) out.push(`${l.title}: no ${part}`);
      const words = teachingWords(body);
      if (words < 700 || words > 1100) out.push(`${l.title}: ${words} teaching words`);
    }
  }
  if (teaching < 30) out.push(`${teaching} teaching lessons, fewer than 30`);
  return out;
}

function evaluateQuiz(q: QuizFile): Finding[] {
  const out: Finding[] = [];
  for (const quiz of q.quizzes) {
    out.push(...evaluateText(quiz.title, 'quiz', { claimsOnly: true }));
    for (const question of quiz.questions) {
      const where = `quiz :: ${question.questionText}`;
      out.push(...evaluateText(question.questionText, where, { claimsOnly: true }));
      // Distractors are wrong by design; the correct answer must not carry a claim.
      out.push(...evaluateText(question.options[question.correctIndex] ?? '', where, { claimsOnly: true }));
      const words = question.options.map((o) => o.trim().split(/\s+/).length);
      const chars = question.options.map((o) => o.trim().length);
      if (new Set(words).size !== 1) out.push({ where, reason: `option word counts differ ${words}`, text: '' });
      if (Math.max(...chars) / Math.min(...chars) > 1.5) {
        out.push({ where, reason: `option lengths differ too much ${chars}`, text: '' });
      }
      if (question.options.some((o) => /[*_<>]/.test(o))) {
        out.push({ where, reason: 'formatting in an option', text: '' });
      }
      if (!question.explanation?.trim()) out.push({ where, reason: 'missing explanation', text: '' });
      else out.push(...evaluateText(question.explanation, `${where} :: explanation`, { claimsOnly: true }));
    }
    const positions = quiz.questions.map((x) => x.correctIndex);
    const width = Math.max(...quiz.questions.map((x) => x.options.length));
    const counts = Array.from({ length: width }, (_, i) => positions.filter((v) => v === i).length);
    if (positions.length >= 4 && Math.max(...counts) - Math.min(...counts) > 1) {
      out.push({ where: 'quiz', reason: `correct positions unbalanced ${counts}`, text: '' });
    }
    const cycle = answerCycle(positions);
    if (positions.length >= 4 && (new Set(positions).size === 1 || cycle)) {
      out.push({ where: 'quiz', reason: `correct positions repeat in a cycle of ${cycle || 1}`, text: '' });
    }
    if (JSON.stringify(quiz).match(IICRC_CEC)) out.push({ where: 'quiz', reason: 'IICRC/CEC framing', text: '' });
  }
  return out;
}

const reasons = (f: Finding[]) => f.map((x) => x.reason);
const ok = (html: string, title = 'Some lesson') => evaluateHtml(html, `${title} :: body`);

describe('NeoSan Labs course claim guard (review r14, course expansion)', () => {
  it('the course and its quiz file exist', () => {
    expect(course).toBeDefined();
    expect(quizFile.courseSlug).toBe(SLUG);
    expect(quizFile.quizzes[0].questions.length).toBeGreaterThanOrEqual(20);
  });

  it('the live course passes: every clause cited, instructional, a question, framing or labelled', () => {
    expect(evaluateCourse(course!)).toEqual([]);
  });

  it('the live quiz passes: no claims in correct answers or explanations, equal options, irregular positions', () => {
    expect(evaluateQuiz(quizFile)).toEqual([]);
  });

  it('teach-method shape: 8+ modules, 30+ teaching lessons of 700-1,100 words, the full lesson layout', () => {
    expect(shapeFindings(course!.modules)).toEqual([]);
  });

  it('planted controls (shape): short, long, incomplete and missing lessons are each caught', () => {
    // `words` is the total teaching-word count, headings included.
    const teach = (title: string, words: number, parts = TEACH_PARTS) => {
      const heads = ['Your win', 'Primary source', ...parts].map((x) => `<h2>${x}</h2>`).join('');
      return { title, contentBody: heads + `<p>${'word '.repeat(words - teachingWords(heads))}</p>` };
    };
    const sheet = { title: 'Module cheat sheet', contentBody: '<h2>Your win</h2><h2>Cheat sheet</h2><h2>Primary source</h2>' };
    const four = () => [teach('A', 700), teach('B', 700), teach('C', 700), teach('D', 700), sheet];
    const good = Array.from({ length: 8 }, (_, i) => ({ title: `M${i}`, lessons: four() }));
    expect(shapeFindings(good)).toEqual([]);
    expect(shapeFindings(good.slice(0, 7))).toContain('fewer than 8 modules');
    const swap = (lesson: { title: string; contentBody: string }) => [
      { ...good[0], lessons: [lesson, ...good[0].lessons.slice(1)] },
      ...good.slice(1),
    ];
    expect(shapeFindings(swap(teach('Short', 699)))).toContain('Short: 699 teaching words');
    expect(shapeFindings(swap(teach('Long', 1101)))).toContain('Long: 1101 teaching words');
    expect(shapeFindings(swap(teach('Gap', 800, ['Worked example', 'Try it', 'Takeaway'])))).toContain(
      'Gap: no Recall from earlier',
    );
    expect(shapeFindings([{ title: 'M', lessons: [teach('A', 700)] }, ...good.slice(1)])).toContain(
      'M: last lesson is not a cheat sheet',
    );
    const thin = good.map((m) => ({ ...m, lessons: [teach('A', 700), teach('B', 700), teach('C', 700), sheet] }));
    expect(shapeFindings(thin)).toContain('24 teaching lessons, fewer than 30');
  });

  it('planted control: the word counter ignores citations and markup', () => {
    expect(teachingWords('<p>Mix it (source: https://x.example, checked 19/10/2026).</p>')).toBe(2);
  });

  it('planted controls: every r2-r9 banned pattern is still flagged as a claim', () => {
    const controls = [
      'Hospital-grade sterilisation.',
      'This product is non-toxic.',
      'Proven to be non-mutagenic and non-carcinogenic.',
      'Safe for humans, animals, and plants.',
      'Leaves no harmful residue behind.',
      'Renders everything landfill and sewer safe.',
      'Kills bacteria on contact.',
      'Eliminates 99.99999% of germs.',
      'Destroys mould spores.',
      'Eradicates viruses.',
      'They prevent the spread of infectious disease.',
      'Helping us to stay healthy.',
      'Control allergens, such as dust and mould.',
      'We guarantee results.',
      '100% effective against germs.',
      'Charged particles have an attraction up to 75 times that of gravity.',
      'The spray is 3 times faster than wiping.',
      'Electrostatic droplets wrap around the target surface.',
      'The charge makes particles reverse course in mid-air.',
      'It coats hidden surfaces that wiping misses.',
      'This nozzle improves coverage by 40 percent.',
      'Degradation products are known to cause cancer.',
      'This surfactant contains a carcinogen.',
      'No mutagens are created when it degrades.',
      'It causes reproductive problems.',
      'A known endocrine disruptor.',
      'The toxicity of cationic surfactants is the biggest.',
      'Label the container POISON.',
      'An allergen-causing residue.',
      'Asthma-causing dust is removed.',
      'Fully biodegradable surfactants.',
      'Persistent in the environment.',
      'Not bioaccumulative.',
      'Aquatic toxicity is low.',
      'An eco-friendly formula.',
      'A green cleaning product.',
    ];
    for (const c of controls) {
      expect(reasons(ok(`<p>${c}</p>`)), c).toContain('claim without a valid claim-level citation');
    }
  });

  it('planted controls (r13 GUARD-COVERAGE): the missed sentences are now flagged', () => {
    for (const c of [
      'This can greatly improve efficiencies and cost savings.',
      'Hydrogen peroxide is a powerful disinfectant.',
      'NeoSan Labs 01 sanitises treated surfaces.',
      'It neutralises odours at a molecular level.',
    ]) {
      expect(reasons(ok(`<p>${c}</p>`)), c).toContain('claim without a valid claim-level citation');
    }
  });

  it('planted control: an uncited factual statement with no claim word is flagged', () => {
    expect(reasons(ok('<p>Part B is hydrogen peroxide.</p>'))).toEqual([
      'statement is not cited, instructional or labelled as CARSI’s own',
    ]);
  });

  it('planted control (r13 GUARD-SDS-STRIP): a claim after an SDS direction is flagged', () => {
    const f = ok('<p>Check SDS section 2: this product is non-toxic.</p>');
    expect(f).toHaveLength(1);
    expect(f[0].text).toContain('non-toxic');
    // r7 order still caught, and the bare direction still passes
    expect(ok('<p>This product is non-toxic, biodegradable and safe for pets; check SDS sections 2, 11 and 12.</p>'))
      .toHaveLength(1);
    expect(ok('<p>For this product’s hazards, check SDS sections 2, 11 and 12.</p>')).toEqual([]);
  });

  const CCW01 = `${CCW}neosan-labs-01-disinfectant-2-x-a-b`;
  const SDS01 = `${CDN}202103_SDS_NeoSanLabs_01_Disinfectant_Combined_USA_2021_En.pdf`;

  it('planted control (r13 GUARD-PIGGYBACK): a cited clause cannot clear a claim in another clause', () => {
    const semicolon = ok(
      `<p>NeoSan Labs states its products are sold in Australia (source: ${CCW01}, checked 19/10/2026); this product is non-toxic.</p>`,
    );
    expect(semicolon).toHaveLength(1);
    expect(semicolon[0].text).toContain('non-toxic');
    const sentence = ok(
      `<p>CCW lists 01 at 6.8 ml per square metre (source: ${CCW01}, checked 19/10/2026). It is non-toxic.</p>`,
    );
    expect(reasons(sentence)).toEqual(['claim without a valid claim-level citation']);
    const trailing = ok(
      `<p>CCW lists 01 at 6.8 ml per square metre (source: ${CCW01}, checked 19/10/2026), and it kills germs.</p>`,
    );
    expect(reasons(trailing)).toContain('citation does not end its clause');
    expect(reasons(trailing)).toContain('claim without a valid claim-level citation');
  });

  it('planted controls: wrong page, wrong publisher, wrong product and bad dates are flagged', () => {
    expect(reasons(ok('<p>NeoSan Labs states a 7-log kill rate (source: https://neosanlabs.com/, checked 19/10/2026).</p>')))
      .toContain('unverified source https://neosanlabs.com/');
    expect(reasons(ok(`<p>Safe Work Australia says gloves are needed (source: ${CCW01}, checked 19/10/2026).</p>`)))
      .toContain('citation not attributed to its publisher (CCW)');
    expect(reasons(ok(`<p>The 03 SDS lists nitrile gloves (source: ${SDS01}, checked 19/10/2026).</p>`)))
      .toContain('SDS for 01 cited for product 03');
    expect(reasons(ok(`<p>CCW lists 04 at 6.8 ml per square metre (source: ${CCW01}, checked 19/10/2026).</p>`)))
      .toContain('CCW 01 listing cited for product 04');
    expect(reasons(ok(`<p>CCW lists 01 at 6.8 ml per square metre (source: ${CCW01}, checked 32/13/2026).</p>`)))
      .toContain('bad checked date 32/13/2026');
    expect(reasons(ok('<p>Read <a href="https://neosanlabs.com/">the maker</a> first.</p>')))
      .toContain('unverified link https://neosanlabs.com/');
    expect(reasons(ok(`<p>Read <a href="${CCW01}">the listing</a> first.</p>`)))
      .toEqual(['link does not open in a new tab with rel="noopener"']);
    expect(reasons(ok(`<p>Read <a href="${CCW01}" target="_blank">the listing</a> first.</p>`)))
      .toEqual(['link does not open in a new tab with rel="noopener"']);
    expect(ok(`<p>Read <a href="${CCW01}" target="_blank" rel="noopener">the listing</a> first.</p>`)).toEqual([]);
  });

  it('positive controls: properly cited claims, instructions, questions, prohibitions and labels pass', () => {
    expect(ok(`<p>The 01 SDS states the product is harmful if inhaled (source: ${SDS01}, checked 19/10/2026).</p>`))
      .toEqual([]);
    expect(ok('<p>Wear the PPE from SDS section 8.</p><p>If the room is small, open a window.</p>')).toEqual([]);
    expect(ok('<p>Which product does CCW sell as an odour treatment only?</p>')).toEqual([]);
    expect(ok('<p>Never write that a NeoSan Labs product kills germs.</p>')).toEqual([]);
    expect(ok('<p>CARSI example: 27 m² × 6.8 ml/m² = 183.6 ml.</p>')).toEqual([]);
    expect(reasons(ok('<p>CARSI note: it kills germs.</p>'))).toEqual(['claim without a valid claim-level citation']);
  });

  it('planted controls: struck-through examples only in the rewrite lessons, and no loose text', () => {
    expect(ok('<p>Rewrite this: <del>It kills germs.</del></p>', 'What you can and cannot say in Australia'))
      .toEqual([]);
    expect(reasons(ok('<p>Rewrite this: <del>It kills germs.</del></p>', 'Calculate a fogging or spraying dose')))
      .toContain('struck-through example outside an allowed rewrite exercise');
    expect(reasons(ok('<ul>It kills germs.</ul>'))).toContain('text outside a p/li/heading block');
  });

  it('planted controls (r13 GUARD-META-SCOPE): meta, tags, titles and quiz are scanned', () => {
    const base = { ...course!, modules: [] };
    expect(reasons(evaluateCourse({ ...base, meta: { notIicrc: 'not IICRC CEC-accredited' } })))
      .toContain('IICRC/CEC framing in a product course');
    expect(reasons(evaluateCourse({ ...base, meta: { note: 'Compliance pass 19/10/2026 per review' } })))
      .toContain('self-attested compliance');
    expect(reasons(evaluateCourse({ ...base, meta: { note: 'Kills 99.99999% of germs' } })))
      .toContain('claim without a valid claim-level citation');
    expect(reasons(evaluateCourse({ ...base, meta: { src: ['https://neosanlabs.com/'] } })))
      .toContain('unverified source https://neosanlabs.com/');
    expect(reasons(evaluateCourse({ ...base, tags: ['disinfection'] })))
      .toContain('claim without a valid claim-level citation');
    expect(reasons(evaluateCourse({ ...base, cecHours: 2 }))).toContain('cecHours must be 0');
    expect(reasons(evaluateCourse({ ...base, iicrcDiscipline: 'WRT' }))).toContain('iicrcDiscipline must be null');
  });

  it('planted controls (teach rule): unequal quiz options and claims in the correct answer are flagged', () => {
    const quiz = (options: string[], correctIndex = 0): QuizFile => ({
      courseSlug: SLUG,
      quizzes: [{ title: 'Q', questions: [{ questionText: 'Which one?', options, correctIndex }] }],
    });
    expect(reasons(evaluateQuiz(quiz(['Twelve hours after mixing', 'One day', 'Two days', 'Three days']))))
      .toContain('option word counts differ 4,2,2,2');
    expect(reasons(evaluateQuiz(quiz(['Ab cd', 'Abcdefgh ijklmnop']))))
      .toContain('option lengths differ too much 5,17');
    expect(reasons(evaluateQuiz(quiz(['It kills germs', 'It cleans carpet']))))
      .toContain('claim without a valid claim-level citation');
    expect(reasons(evaluateQuiz(quiz(['It cleans carpet', 'It kills germs'])))).toEqual(['missing explanation']);
  });

  it('planted controls (teach rule): explanations are scanned and answer positions must be balanced and irregular', () => {
    const q = (correctIndex: number, explanation = 'Lesson 4.1 gives the rate.') => ({
      questionText: 'Which one?',
      options: ['Alpha one', 'Bravo two', 'Charlie three', 'Delta four'],
      correctIndex,
      explanation,
    });
    const file = (questions: ReturnType<typeof q>[]): QuizFile => ({ courseSlug: SLUG, quizzes: [{ title: 'Q', questions }] });
    const irregular = [2, 0, 3, 0, 1, 3, 2, 1, 0, 2, 3, 1].map((i) => q(i));
    expect(evaluateQuiz(file(irregular))).toEqual([]);
    expect(reasons(evaluateQuiz(file([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3].map((i) => q(i))))))
      .toContain('correct positions repeat in a cycle of 4');
    expect(reasons(evaluateQuiz(file([0, 0, 0, 0, 0, 0].map((i) => q(i))))))
      .toContain('correct positions unbalanced 6,0,0,0');
    expect(reasons(evaluateQuiz(file([2, 0, 3, 1, 2, 0, 3, 1].map((i) => q(i))))))
      .toContain('correct positions repeat in a cycle of 4');
    expect(reasons(evaluateQuiz(file([q(0, 'It kills germs.'), ...irregular.slice(1)]))))
      .toContain('claim without a valid claim-level citation');
  });

  it('does not read as the product being Australian-made (review r4)', () => {
    const fields = [
      course!.description ?? '',
      course!.shortDescription ?? '',
      ...stringsIn(course!.meta ?? {}),
    ].join('\n');
    expect(fields).not.toMatch(/system,?\s+Australian-produced/i);
    expect(fields).not.toMatch(/product\w*,?\s+Australian-produced/i);
    const control =
      '... the NeoSan Labs two-part (A and B) treatment system, Australian-produced for professional restoration ...';
    expect(control).toMatch(/system,?\s+Australian-produced/i);
  });
});
