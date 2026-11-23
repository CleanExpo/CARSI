/**
 * The one owner of the IICRC claim shapes that more than one guard enforces.
 *
 * Plain JavaScript with no imports, so the Node guards (scripts/check-iicrc-compliance.mjs,
 * scripts/check-iicrc-terminology.mjs) and the vitest guard
 * (src/lib/iicrc/approved-provider-wording.test.tsx) all import the same patterns. Do not copy a
 * pattern into a guard: a copied rule drifts, and a drifted copy is how GP-599 and GP-586 escaped
 * (each guard had its own list of special cases, and the case the copy missed went live).
 *
 * Every pattern here is exported WITHOUT the `g` flag, so `.test()` carries no `lastIndex` state
 * between lines. A caller that needs every match builds its own copy: `new RegExp(re.source, 'gi')`.
 */

/**
 * GP-704: the retired provider wording. CARSI is an "IICRC Approved CEC Provider"
 * (src/lib/iicrc/approved-wording.ts); it is not accredited by anyone. Matches an "accredit" word
 * directly beside IICRC or CEC, "accredited provider", or "accredited" followed within four words by
 * IICRC or CEC ("accredited as an IICRC CEC provider", "accredited by the IICRC"). A negation in the
 * two words before "accredited" ("not accredited by the IICRC") is a true statement and passes.
 * Reverse forms are caught too: IICRC or CEC followed within three words by an "accredit" word ("the
 * IICRC has accredited", "IICRC CEC provider accreditation"), and "accreditation from/by the IICRC".
 * "nationally accredited" (VET qualifications) is a different claim and passes.
 */
export const RETIRED_PROVIDER_WORDING =
  /\b(?:IICRC|CECs?)[\s-]+accredit\w*|\baccredit\w*[\s-]+(?:IICRC|CECs?)\b|\baccredited[\s-]+provider\b|(?<!\b(?:not|never)(?:[\s-]+\w+)?[\s-]+)\baccredited(?:[\s-]+[\w'’]+){0,4}?[\s-]+(?:IICRC|CECs?)\b|\b(?:IICRC|CECs?)(?:[\s-]+[\w'’]+){0,3}?[\s-]+(?<!nationally[\s-]+)accredit\w*|\baccreditation[\s-]+(?:from|by|with)[\s-]+(?:the[\s-]+)?(?:IICRC|CECs?)\b/i;

/**
 * GP-771: an unqualified "accredited" claim about CARSI, with no IICRC or CEC named ("CARSI is fully
 * accredited."). The "accredit" word must be said OF CARSI (or "we" / "our courses") in one of four
 * shapes, with nothing between them except words from the closed lists below:
 *   1. attached: "CARSI accreditation", "CARSI's accreditation", "CARSI-accredited";
 *   2. a linking verb: "CARSI (courses) is/are/'s (an/fully/nationally/...) accredited",
 *      "we are / we're (an) accredited", "our courses are accredited";
 *   3. possession: "CARSI holds/has/earned (full/national) accreditation", "our accreditation";
 *   4. agent: "accredited by/through/with CARSI".
 * A negation ("CARSI is not accredited"), a question ("Is CARSI accredited?") and "accredited" about
 * another body ("a NATA-accredited laboratory") do not match.
 */
const SEP = '[\\s-]+';
const CARSI_THING =
  '(?:own[\\s-]+)?(?:courses?|training|programs?|programmes?|classes|designations?|credentials?|certificates?|qualifications?)';
const SUBJECT = `(?:CARSI(?:['’]s)?(?:${SEP}${CARSI_THING})?|we|our${SEP}${CARSI_THING})`;
const LINK = `(?:${SEP}(?:is|are|was|were|has${SEP}been|have${SEP}been|remains?|becomes?|became)|['’](?:s|re))`;
const MODIFIER =
  '(?:an?|the|now|also|fully|officially|nationally|internationally|formally|properly|independently|government|industry|and)';
export const CARSI_ACCREDITED_CLAIM = new RegExp(
  [
    `(?<!\\b(?:is|are|was|were|isn['’]t|aren['’]t|wasn['’]t)${SEP})\\bCARSI(?:['’]s)?${SEP}accredit\\w*`,
    `\\b${SUBJECT}${LINK}(?:${SEP}${MODIFIER})*${SEP}accredit\\w*`,
    `\\b(?:CARSI|we)${SEP}(?:holds?|has|have|gained|earned|received|achieved|obtained)${SEP}(?:(?:full|national|formal|official|government)${SEP})?accreditations?\\b`,
    `\\bour${SEP}accreditations?\\b`,
    `\\baccredit\\w*${SEP}(?:by|through|with)${SEP}CARSI\\b`,
  ].join('|'),
  'i'
);

/**
 * GP-586: CARSI, or its training, makes the learner certified. CARSI delivers IICRC CEC training and
 * issues CARSI designations; it certifies no one. The older "get certified" rule only knew a fixed
 * list of words between the verb and "certified", so "CARSI courses get you certified." passed.
 * These shapes name the grammar of the claim instead of its exact words:
 *   1. causative: get / make + the learner + certified ("get you certified", "makes your whole
 *      team IICRC certified"). "have" is left out: "Have you certified the installation?" is a
 *      question about a third-party sign-off, and "have your techs certified" is a known limit;
 *   2. certify with CARSI or its training as the subject ("CARSI certifies you", "This course
 *      certifies technicians", "our online training will certify your staff");
 *   3. the learner's future: "you will be certified", "you'll be fully certified", "you're now
 *      certified".
 * Not matched: a denial in the three words before the verb ("No CARSI course will get you
 * certified", "won't make you certified"), third-person facts ("technicians must be certified by
 * the IICRC", "a licensed gasfitter certifies the installation", "This unit certifies that an
 * operator can run the machine"), and holder framing ("if you are certified", "once certified").
 * Allowed by GRANT_ALLOW: a question that opens with an auxiliary ("Will a CARSI course make me
 * IICRC certified?", the honest FAQ form) and the route through an IICRC-approved school.
 */
const NEG = String.raw`(?<!\b(?:not|never|no|cannot|can['’]t|won['’]t)\s+(?:[\w'’]+\s+){0,3})(?<!n['’]t\s+(?:[\w'’]+\s+){0,3})`;
const PEOPLE = String.raw`(?:team|teams|staff|crew|crews|techs?|technicians?|people|employees?|workers?|operators?|cleaners?|learners?|students?|trainees?|apprentices?)`;
const LEARNER = String.raw`(?:you|me|us|them|yourself|(?:(?:your|our|the|whole|entire|every|each|all)\s+){0,2}(?:[\w-]+\s+){0,2}?${PEOPLE})`;
const CERT_MOD = String.raw`(?:(?:an?|fully|officially|properly|industry|professionally|now|also|then|quickly|online|IICRC)[\s-]+)*`;
const TRAINING = String.raw`(?:courses?|training|programs?|programmes?|classes|lessons?|modules?|designations?|workshops?)`;
const CERT_SUBJECT = String.raw`(?:CARSI(?:['’]s)?(?:\s+(?:[\w-]+\s+){0,2}?${TRAINING})?|we|our\s+(?:[\w-]+\s+){0,2}?${TRAINING}|(?:this|each|every|the|a)\s+(?:CARSI\s+)?(?:[\w-]+\s+){0,2}?${TRAINING})`;
const GRANT_SHAPES = [
  String.raw`\b(?:get|gets|getting|got|make|makes|making|made)\s+${LEARNER}\s+${CERT_MOD}certified\b`,
  String.raw`\b${CERT_SUBJECT}\s+(?:(?:will|can|also|then|now|quickly)\s+)*certif(?:y|ies)\s+${LEARNER}\b`,
  String.raw`\byou(?:['’]ll|\s+will|['’]re\s+now|\s+are\s+now)\s+(?:(?:also|then|now|soon)\s+)*(?:be\s+|become\s+)?${CERT_MOD}certified\b`,
];
export const CERTIFICATION_GRANT = new RegExp(`${NEG}(?:${GRANT_SHAPES.join('|')})`, 'i');

/** What excuses a CERTIFICATION_GRANT match. Each alternative contains a whole grant shape, so it can
 *  only overlap (excuse) the grant it belongs to, never another claim on the same line (GP-584). */
export const CERTIFICATION_GRANT_ALLOW = new RegExp(
  [
    // A question opening with an auxiliary: no word or comma before it, so "CARSI will get you
    // certified?" is not a question form, but "Will a CARSI course make me certified?" is.
    String.raw`(?<![\p{L}\p{N},]\s*)\b(?:does|do|did|will|would|can|could|should|is|are)\b[^.!?\n]{0,80}?(?:${GRANT_SHAPES.join('|')})[^.!?\n]{0,80}\?`,
    // The route through an IICRC-approved school or exam.
    String.raw`(?:${GRANT_SHAPES.join('|')})\s+(?:only\s+)?through\s+(?:an?\s+)?IICRC[\s-]*approved\s+(?:schools?|examinations?|exams?)\b`,
  ].join('|'),
  'iu'
);

/*
 * Where RETIRED_PROVIDER_WORDING and CARSI_ACCREDITED_CLAIM are not enforced. Moved here from
 * approved-provider-wording.test.tsx so the vitest guard and check:iicrc-compliance exempt exactly
 * the same files: two copies of an exemption list drift just as two copies of a rule do. The vitest
 * guard still proves each list only shrinks (a PENDING entry with no match left, or an exact path
 * that no longer needs its entry, fails that test).
 */

/**
 * Dated records of the past: audits, handoffs, session notes, specs, decision logs and applied
 * database migrations. They describe what was true or what was found then; rewriting them would
 * falsify the record. A path ending in "/" matches by prefix; any other path matches exactly.
 */
export const RETIRED_WORDING_HISTORICAL = [
  'docs/audit/',
  'docs/session-handoffs/',
  'docs/sessions/',
  'docs/plans/archive/',
  'docs/specs/',
  'docs/ai-demonstration/source-of-truth/history/',
  'docs/superpowers/specs/',
  'docs/agent-framework/GAP-BACKLOG-2026-08-07.md',
  'docs/agent-framework/PIPELINE.md',
  'docs/governance/BACKLOG.md',
  'docs/governance/DECISIONS.md',
  'docs/governance/GOAL.md',
  'docs/CONTENT_PARITY_AUDIT.md',
  'docs/runbooks/course-go-live.md',
  'docs/compliance/licence-inventory.csv',
  'prisma/migrations/',
  'db/ops/',
  'scripts/audit/',
];

/**
 * Detectors: guard scripts and tests that must spell the retired wording to catch it. None of them
 * is served. Exact paths only.
 */
export const RETIRED_WORDING_DETECTORS = [
  // Dated record that quotes the retired wording as its "before" text.
  'docs/governance/reports/gp-525-carpet-cec-reconciliation.md',
  // Header comment quotes the founder rule, which uses the retired phrase.
  'scripts/check-iicrc-scope.mjs',
  'scripts/check-iicrc-compliance.mjs',
  'scripts/check-iicrc-compliance.test.mjs',
  'scripts/check-iicrc-terminology.mjs',
  'scripts/check-iicrc-terminology.test.mjs',
  'scripts/check-live-catalogue.mjs',
  'scripts/check-live-catalogue.test.mjs',
  'scripts/check-live-courses-money-path.test.mjs',
  'scripts/check-live-guards.fixture-test.mjs',
  'scripts/licence-inventory.mjs',
  'scripts/probe-iicrc-guard-allows.mjs',
  'src/components/pricing/PricingTiers.test.tsx',
  'src/lib/course-kit/iicrc-phrases.test.ts',
  'src/lib/marketing/industry-faq-licence.test.ts',
  'src/lib/marketing/licence-copy-sweep.test.ts',
  'src/lib/marketing/licence-inventory.test.ts',
  'src/lib/marketing/public-claims-guard.test.ts',
  'src/lib/seo/neosan-claims.test.ts',
  'src/lib/server/public-catalogue-facts.branding.test.ts',
  // The vitest guard and this file: their pattern docs and controls spell the wording on purpose.
  'src/lib/iicrc/approved-provider-wording.test.tsx',
  'src/lib/iicrc/claim-rules.mjs',
];

/**
 * Files owned by another open change. The owner removes the wording; the vitest guard then fails
 * until the entry is deleted, so the list only shrinks. A prefix entry stays only while at least one
 * file under it still matches.
 */
export const RETIRED_WORDING_PENDING = {
  'data/seed/': 'GP-748 (PR #1205): seed copy; the founder runs the seed',
  'data/courses/': 'GP-748 (PR #1205): course research and drafts',
  'data/course-content/': 'GP-749: lesson content',
  'data/CARSI_Specialty_Courses_Collection.txt': 'GP-749: legacy course text',
  'docs/course-content/': 'GP-749: workshop course content',
};

/** The list entry that exempts `file` (a repo-relative path), or null. */
export function retiredWordingExemption(file) {
  const f = String(file).replace(/\\/g, '/');
  const keys = [
    ...RETIRED_WORDING_HISTORICAL,
    ...RETIRED_WORDING_DETECTORS,
    ...Object.keys(RETIRED_WORDING_PENDING),
  ];
  return keys.find((k) => (k.endsWith('/') ? f.startsWith(k) : f === k)) ?? null;
}
