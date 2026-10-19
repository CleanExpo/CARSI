import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Review r2/r3 guard (19/10/2026): the recovered NeoSan Labs legacy lessons carried
 * US efficacy marketing CARSI cannot substantiate in Australia. Any product safety,
 * health, toxicity, environmental, disposal, efficacy, speed, residue or regulatory
 * claim may only appear in this course as an attributed manufacturer statement with
 * a claim-level, dated source in the same content block
 * ("NeoSan Labs states ... (source: <url>, checked dd/mm/yyyy)").
 */
interface Lesson {
  title: string;
  contentBody?: string | null;
}
interface Course {
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  meta?: Record<string, unknown>;
  modules: { lessons: Lesson[] }[];
}

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8'),
  ) as { courses: Course[] }
).courses;
const course = catalogue.find(
  (entry) => entry.slug === 'neosan-labs-product-training',
);

const CLAIM_PATTERN = new RegExp(
  [
    'hospital[- ]grade',
    'non[- ]?toxic|nontoxic',
    'non[- ]?mutagenic',
    'non[- ]?carcinogenic',
    'safe for (humans|animals|plants|pets|children)',
    'no harmful residue',
    '(landfill|sewer)[- ]safe',
    '\\b(kills?|eliminates?|destroys?|eradicates?)\\b',
    '\\bproven\\b',
    '99[.,]9{2,}\\s*(?:%|per\\s?cent)?',
    // review r5 additions
    'prevent\\w* the spread',
    'stay healthy',
    'control\\w* allergens',
    'guarantee\\w*',
    '100\\s?%',
    // review r6 additions: toxicology + environmental-fate assertions
    '\\bcancers?\\b',
    '\\bcarcinogens?\\b',
    '\\bmutagens?\\b',
    '\\breproductive\\b',
    '\\bendocrine\\b',
    '\\btoxic(?!ological)(?:ity)?\\b',
    '\\bpoison\\w*\\b',
    'allergen-causing',
    'asthma-causing',
    '\\bbiodegradab\\w*',
    '\\bpersistent\\b',
    '\\bbioaccumulat\\w*',
    '\\baquatic\\b',
    'eco-friendly',
    '\\bgreen\\b',
  ].join('|'),
  'i',
);
const ATTRIBUTED = /NeoSan Labs states/i;
const SOURCED = /\(?\s*source:\s*https?:\/\//i;
const DATED = /checked\s+\d{1,2}\/\d{1,2}\/\d{4}/;
// r6/r7: an SDS-direction phrase makes no assertion of its own. Strip ONLY the
// direction phrase from the block, then evaluate the remainder normally — a
// whole-block exemption would let "non-toxic …; check SDS sections 2…" through.
// Non-global const for test(); the strip uses a fresh global literal per call —
// a shared /g regex makes .test() stateful via lastIndex and can hide misses.
const SDS_DIRECTION_PHRASE =
  /(check|see)\s+(the\s+)?SDS\s+sections?\s+2[^.]*\.?/i;

function evaluateBlock(block: string): boolean {
  const stripped = block.replace(
    /(check|see)\s+(the\s+)?SDS\s+sections?\s+2[^.]*\.?/gi,
    ' ',
  );
  if (!CLAIM_PATTERN.test(stripped)) return false;
  return !(
    ATTRIBUTED.test(stripped) &&
    SOURCED.test(stripped) &&
    DATED.test(stripped)
  );
}

function unattributedClaims(blocks: string[]): string[] {
  return blocks.filter(evaluateBlock);
}

describe('NeoSan Labs course claim compliance (review r2/r3)', () => {
  it('the course exists in the catalogue', () => {
    expect(course).toBeDefined();
  });

  it('carries no efficacy, safety, residue or disposal claim without an attributed, dated citation in the same block', () => {
    const blocks: string[] = [];
    for (const module of course!.modules) {
      for (const lesson of module.lessons) {
        blocks.push(
          ...(lesson.contentBody ?? '').split(/<\/(?:p|li|h[1-6]|ul|ol)>/),
        );
      }
    }
    blocks.push(course!.description ?? '', course!.shortDescription ?? '');
    expect(unattributedClaims(blocks)).toEqual([]);
  });

  it('planted controls: every banned pattern is caught when unattributed', () => {
    const controls = [
      '<p>Hospital-grade sterilisation.</p>',
      '<p>This product is non-toxic.</p>',
      '<p>Proven to be non-mutagenic and non-carcinogenic.</p>',
      '<p>Safe for humans, animals, and plants.</p>',
      '<p>Leaves no harmful residue behind.</p>',
      '<p>Renders everything landfill and sewer safe.</p>',
      '<p>Kills bacteria on contact.</p>',
      '<p>Eliminates 99.99999% of germs.</p>',
      '<p>Destroys mould spores.</p>',
      '<p>Eradicates viruses.</p>',
      // review r5 controls
      '<p>They prevent the spread of infectious disease.</p>',
      '<p>Helping us to stay healthy.</p>',
      '<p>Control allergens, such as dust and mould.</p>',
      '<p>We guarantee results.</p>',
      '<p>100% effective against germs.</p>',
      // review r6 controls: toxicology + environmental-fate assertions
      '<p>Degradation products are known to cause cancer.</p>',
      '<p>This surfactant contains a carcinogen.</p>',
      '<p>No mutagens are created when it degrades.</p>',
      '<p>It causes reproductive problems.</p>',
      '<p>A known endocrine disruptor.</p>',
      '<p>The toxicity of cationic surfactants is the biggest.</p>',
      '<p>Label the container POISON.</p>',
      '<p>An allergen-causing residue.</p>',
      '<p>Asthma-causing dust is removed.</p>',
      '<p>Fully biodegradable surfactants.</p>',
      '<p>Persistent in the environment.</p>',
      '<p>Not bioaccumulative.</p>',
      '<p>Aquatic toxicity is low.</p>',
      '<p>An eco-friendly formula.</p>',
      '<p>A green cleaning product.</p>',
    ];
    expect(unattributedClaims(controls)).toHaveLength(controls.length);
  });

  it('planted control: a block that is only the SDS direction passes (r6)', () => {
    const direction = [
      '<p>For this product&rsquo;s hazards and environmental information, check ' +
        'SDS sections 2 (hazard identification), 11 (toxicological information) ' +
        'and 12 (ecological information).</p>',
    ];
    expect(unattributedClaims(direction)).toEqual([]);
  });

  it('planted control: claims riding on an SDS-direction phrase are still flagged (r7)', () => {
    // The exact loophole sentence from review r7: stripping must remove only
    // the direction phrase, not exempt the whole block.
    const loophole = [
      '<p>This product is non-toxic, biodegradable and safe for pets; check ' +
        'SDS sections 2, 11 and 12 for this product&rsquo;s hazards and ' +
        'environmental information.</p>',
    ];
    expect(unattributedClaims(loophole)).toHaveLength(1);
  });

  it('planted control: an attributed, dated, sourced claim passes', () => {
    const attributed = [
      '<p>NeoSan Labs states a 7-log (99.99999%) kill rate in its United States ' +
        'marketing (source: https://neosanlabs.com/, checked 19/10/2026).</p>',
    ];
    expect(unattributedClaims(attributed)).toEqual([]);
  });

  it('does not read as the product being Australian-made (review r4)', () => {
    // "…treatment system, Australian-produced…" reads as the PRODUCT (US-made)
    // being produced in Australia. The COURSE is Australian-produced; the
    // product is not. Guard the description fields against that phrasing.
    const fields = [
      course!.description ?? '',
      course!.shortDescription ?? '',
      ...Object.values(course!.meta ?? {}).map(String),
    ].join('\n');
    expect(fields).not.toMatch(/system,?\s+Australian-produced/i);
    expect(fields).not.toMatch(/product\w*,?\s+Australian-produced/i);
    // planted control: the original offending wording is caught
    const control =
      '... the NeoSan Labs two-part (A and B) treatment system, ' +
      'Australian-produced for professional restoration ...';
    expect(control).toMatch(/system,?\s+Australian-produced/i);
  });
});
