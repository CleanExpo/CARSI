/**
 * GP-740 — content checks for draft courses (data/courses/<slug>/v1-draft).
 *
 * The quiz-balance and source checks look at layout and cited domains. These rules read what
 * a course SAYS, so a wrong exposure-limit date, a workplace limit used as a home clearance
 * level, an unsourced health claim or a pasted standard passage is caught before SME review.
 *
 * Each rule is a narrow, named pattern with a planted example in the test. It is a filter, not
 * a guarantee: a pass does not replace the SME or instructor sign-off on the content.
 *
 * Exposure-limit facts the rules encode (sources opened 21/11/2026):
 * - WorkSafe Queensland: 15 transition substances, including softwood dust and Portland
 *   cement, keep their old limits until 1 December 2029; diesel particulate matter carries an
 *   interim 0.1 mg/m³ TWA through that transition.
 *   https://www.worksafe.qld.gov.au/safety-and-prevention/hazards/hazardous-exposures/workplace-exposure-limits
 * - Safe Work Australia: the reduced benzene limit (0.2 ppm 8-hour TWA) takes effect on
 *   1 June 2027.
 *   https://www.safeworkaustralia.gov.au/media-centre/news/reduced-workplace-exposure-limit-benzene-take-effect-1-june-2027
 */
import { htmlToText, splitSentences } from './html-extract';
import { scanTextForStandardExcerpt } from './standards-excerpt';

export type DraftContentRule =
  | 'wel-date-unqualified'
  | 'qld-transition-date'
  | 'qld-dpm-interim'
  | 'benzene-date'
  | 'oel-as-home-level'
  | 'exposure-limit-incomplete'
  | 'unsourced-health-claim'
  | 'standard-excerpt';

export interface DraftContentHit {
  rule: DraftContentRule;
  where: string;
  message: string;
  sample: string;
}

/** One block of course text: a lesson body, a quiz question with its options, a markdown file. */
export interface DraftTextBlock {
  where: string;
  text: string;
  /** Lesson-level blocks are checked for sources; quiz items are not (they test, not teach). */
  kind: 'lesson' | 'quiz' | 'doc';
  /** Raw HTML/markdown, used to find links and a sources list. */
  raw?: string;
}

const EXPOSURE_LIMIT =
  /\b(?:workplace exposure limits?|WELs?|exposure standards?|occupational exposure limits?|OELs?|WES|time[- ]weighted average|TWA)\b/i;
const AU_WEL_START = /\b1\s+December\s+2026\b/i;
/**
 * The claim covers the limits in general: "all"/"every", or Australia with limits in the plural.
 * A sentence about one substance's limit is not that claim. ("Safe Work Australia" is a name.)
 */
const EVERY = /\b(?:all|every)\b/i;
const AUSTRALIA = /\bAustralia(?:n|'s)?\b/i;
const LIMITS_PLURAL = /\b(?:workplace exposure limits|exposure limits|exposure standards|WELs)\b/i;
const SWA_NAME = /\bSafe Work Australia\b/gi;
const QUALIFIER =
  /\b(?:except|unless|transition|Queensland|Qld|Victoria|Vic|2029|most jurisdictions|apart from|other than|some (?:states|jurisdictions))\b/i;
const QUEENSLAND = /\b(?:Queensland|Qld|WorkSafe Queensland)\b/i;
const QLD_TRANSITION_SUBSTANCE = /\b(?:softwood dust|Portland cement)\b/i;
const YEAR_2027 = /\b2027\b/;
const DPM = /\bdiesel (?:particulate|exhaust)(?: matter)?\b|\bDPM\b/i;
const DPM_INTERIM = /\b0\.1\s*mg\s*\/\s*m(?:³|3)(?!\d)/i;
const BENZENE = /\bbenzene\b/i;
const BENZENE_RIGHT_DATE = /\b1\s+June\s+2027\b/i;
const ANY_2027_DATE =
  /\b(?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+2027\b/gi;
const HOME_CONTEXT =
  /\b(?:homes?|houses?|residential|residences?|dwellings?|occupants?|famil(?:y|ies)|child(?:ren)?|pets?|re-?occupancy|clearance|safe to (?:return|re-?enter|occupy))\b/i;
const AS_THRESHOLD =
  /\b(?:as (?:a|the) (?:clearance|safe|pass|target|threshold|benchmark|guide)|to (?:clear|pass|declare)|below which|is safe for|safe level for|clearance (?:level|limit|criterion|criteria|threshold))\b/i;
const NEGATION =
  /\b(?:not|never|no|isn['’]t|aren['’]t|cannot|can['’]t|don['’]t|doesn['’]t|do not|does not|must not|should not|without)\b/i;
const LIMIT_VALUE =
  /\b\d+(?:\.\d+)?\s*(?:ppm\b|mg\s*\/\s*m(?:³|3)(?!\d)|f\s*\/\s*mL\b|fibres?\s*\/\s*mL\b)/i;
const JURISDICTION =
  /\b(?:Australia(?:n)?|national|Safe Work Australia|SWA|Commonwealth|Queensland|Qld|Victoria|Vic|New South Wales|NSW|South Australia|SA|Western Australia|WA|Tasmania|Tas|Northern Territory|NT|ACT|New Zealand|NZ|WorkSafe(?: NZ| New Zealand)?)\b/;
const EFFECTIVE_DATE = /\b(?:19|20)\d{2}\b/;
const HEALTH_CLAIM =
  /\b(?:causes?|caused by|linked to|associated with|increases? (?:the )?risk|carcinogen(?:ic)?|cancer|asthma|respiratory (?:illness|disease|symptoms)|allergic|toxic(?:ity)?|mycotoxins?|lung disease|health effects?)\b/i;
const SOURCES_HEADING = /\bSources?\b(?: for this lesson)?\s*:?/i;
const LINK = /https?:\/\/[^\s"'<>)]+/i;

function sample(s: string): string {
  return s.length > 200 ? `${s.slice(0, 197)}...` : s;
}

/** Sentence-level rules for exposure limits. */
function scanSentences(
  where: string,
  text: string,
  kind: DraftTextBlock['kind'],
  hits: DraftContentHit[]
): void {
  const sentences = splitSentences(text);
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    // Context for "carried in the same passage": this sentence and its neighbours.
    const near = [sentences[i - 1] ?? '', s, sentences[i + 1] ?? ''].join(' ');

    if (
      EXPOSURE_LIMIT.test(s) &&
      AU_WEL_START.test(s) &&
      (EVERY.test(s) || (AUSTRALIA.test(s.replace(SWA_NAME, '')) && LIMITS_PLURAL.test(s))) &&
      !QUALIFIER.test(near)
    ) {
      hits.push({
        rule: 'wel-date-unqualified',
        where,
        message:
          'Dates the new workplace exposure limits to 1 December 2026 with no qualifier. ' +
          'Queensland and Victoria keep 15 transition substances on old limits to 1 December 2029.',
        sample: sample(s),
      });
    }

    if (QUEENSLAND.test(near) && QLD_TRANSITION_SUBSTANCE.test(s) && YEAR_2027.test(s)) {
      hits.push({
        rule: 'qld-transition-date',
        where,
        message:
          'Gives softwood dust or Portland cement a 2027 date for Queensland. WorkSafe Queensland ' +
          'lists both among the 15 transition substances to 1 December 2029.',
        sample: sample(s),
      });
    }

    if (QUEENSLAND.test(s) && DPM.test(s) && !DPM_INTERIM.test(near)) {
      hits.push({
        rule: 'qld-dpm-interim',
        where,
        message:
          'Mentions Queensland diesel particulate matter without its interim 0.1 mg/m³ TWA ' +
          'through the transition to 1 December 2029.',
        sample: sample(s),
      });
    }

    if (BENZENE.test(s)) {
      const dates = s.match(ANY_2027_DATE) ?? [];
      if (dates.some((d) => !BENZENE_RIGHT_DATE.test(d))) {
        hits.push({
          rule: 'benzene-date',
          where,
          message:
            'Dates the reduced benzene limit to something other than 1 June 2027 ' +
            '(0.2 ppm 8-hour TWA, Safe Work Australia).',
          sample: sample(s),
        });
      }
    }

    if (
      EXPOSURE_LIMIT.test(s) &&
      HOME_CONTEXT.test(s) &&
      AS_THRESHOLD.test(s) &&
      !NEGATION.test(s)
    ) {
      hits.push({
        rule: 'oel-as-home-level',
        where,
        message:
          'Uses a workplace exposure limit as a home, pet or clearance level. Workplace limits ' +
          'are set for healthy adult workers over a working shift, not for occupants.',
        sample: sample(s),
      });
    }

    // Quiz options deliberately carry wrong figures as distractors, so this rule reads teaching
    // text only.
    if (kind !== 'quiz' && EXPOSURE_LIMIT.test(s) && LIMIT_VALUE.test(s)) {
      const missing: string[] = [];
      if (!JURISDICTION.test(near)) missing.push('jurisdiction');
      if (!EFFECTIVE_DATE.test(near)) missing.push('effective date');
      if (missing.length > 0) {
        hits.push({
          rule: 'exposure-limit-incomplete',
          where,
          message: `States an exposure-limit figure without its ${missing.join(' and ')}.`,
          sample: sample(s),
        });
      }
    }
  }
}

/** True when a lesson carries any source: a link or a "Sources" list. */
function hasSource(block: DraftTextBlock): boolean {
  const raw = block.raw ?? block.text;
  return LINK.test(raw) || SOURCES_HEADING.test(htmlToText(raw));
}

/** Check one block. */
export function scanDraftBlock(block: DraftTextBlock): DraftContentHit[] {
  const hits: DraftContentHit[] = [];
  scanSentences(block.where, block.text, block.kind, hits);

  if (block.kind === 'lesson' && !hasSource(block)) {
    const claim = splitSentences(block.text).find((s) => HEALTH_CLAIM.test(s));
    if (claim) {
      hits.push({
        rule: 'unsourced-health-claim',
        where: block.where,
        message: 'Makes a health or scientific claim, and the lesson cites no source.',
        sample: sample(claim),
      });
    }
  }

  const excerpt = scanTextForStandardExcerpt(block.text, block.where);
  if (excerpt) {
    hits.push({
      rule: 'standard-excerpt',
      where: block.where,
      message: excerpt.reason,
      sample: excerpt.sample,
    });
  }
  return hits;
}

/** Scan many blocks. */
export function scanDraftBlocks(blocks: DraftTextBlock[]): DraftContentHit[] {
  return blocks.flatMap(scanDraftBlock);
}
