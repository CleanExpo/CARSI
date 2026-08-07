#!/usr/bin/env node
/**
 * Non-vacuity proof for the IICRC CEC terminology guard, with emphasis on the DESIGNATION rule
 * added 2026-08-07.
 *
 * That rule did not exist before, and the founder MUST it enforces (CLAUDE.md § "CARSI
 * designation rule", 2026-07-10 — CARSI courses are never branded with IICRC discipline
 * acronyms or described as "[discipline]-aligned") was therefore enforced by NOTHING. Adding it
 * surfaced 44 live violations across 14 files, including Google Ads keyword targets bidding on
 * `[IICRC WRT certification]`. A rule that expensive must be provably able to fire.
 *
 * The allow-cases matter as much as the block-cases: every one is a phrasing CLAUDE.md
 * explicitly permits, and a guard that blocks them would be turned off within a week.
 */
import { scanText } from './check-iicrc-terminology.mjs';

const F = 'app/(public)/fixture/page.tsx';

const MUST_BLOCK = [
  // Designation rule — the acronym branding a CARSI course.
  ['IICRC + discipline acronym', 'IICRC WRT training for Australian technicians'],
  ['acronym list form', 'IICRC AMRT, CRT, and WRT CEC courses for park teams'],
  ['discipline-aligned', 'An ASD-aligned drying course for contractors'],
  ['IICRC-aligned catalogue', 'IICRC-aligned course catalogue'],
  ['aligned, capitalised', 'IICRC-Aligned training for hotels'],
  // Pre-existing selling-phrase rules must still fire.
  ['get IICRC certified', 'Get IICRC certified fast with CARSI'],
  ['bare IICRC course', 'Enrol in our IICRC course today'],
  ['bare IICRC Accredited', 'CARSI is an IICRC Accredited provider'],
  ['IICRC endorsement', 'CARSI is endorsed by the IICRC'],
  ['IICRC Approved School', 'CARSI is an IICRC Approved School'],
  ['COACH8 brand exclusion', 'brought to you by COACH8'],
  // The `certifications:` allow must not become a bypass. It was briefly written as a bare
  // `\bcertifications\s*:`, which let ANY line carrying that key escape the whole designation
  // rule — including one branding a CARSI course. Both shapes below must stay blocked.
  [
    'certifications key does not launder course branding',
    'const a = { certifications: "IICRC WRT course for CARSI students" };',
  ],
  [
    'prose inside a certifications array is still branding',
    "const b = { certifications: ['IICRC WRT course for CARSI students'] };",
  ],
  // Same class, the legacy-slug branch: a permitted token must not exempt the whole line.
  [
    'legacy slug does not launder branding beside it',
    'title: "IICRC WRT course for CARSI students", slug: "x-iicrc-wrt"',
  ],
  [
    'valid credential list does not launder branding beside it',
    "certifications: ['IICRC WRT'], tagline: 'IICRC ASD-aligned CARSI course'",
  ],
  // Codex round 1 (2026-08-07): three constructions the rules could not see, each with a
  // live instance at the time. A bare acronym LIST matched neither the "IICRC <acronym>"
  // branch nor the "<acronym>-aligned" branch.
  ['bare acronym list brands a CARSI course', 'WRT, CCT, AMRT — all online, all self-paced.'],
  ['acronym list with ampersand', 'disciplineList="WRT, CRT, ASD & OCT"'],
  ['IICRC training sold as CARSI\'s', 'IICRC training through CARSI lets you expand your service offering.'],
  // CEC is fail-closed: data/seed/cec-approvals.json gates every course-level claim.
  ['course-level CEC claim', 'Completing this training also earns IICRC Continuing Education Credits (CECs).'],
  ['blunt CEC claim', 'Every course earns verified CECs.'],
  // Exemptions must not become laundering routes — each of these carries a permitted
  // construction AND a real claim on the same line.
  ['denial does not launder a claim', 'It does not award CECs. Every CARSI course earns IICRC CECs.'],
  ['question does not launder a claim', 'Is it accredited? Our courses earn CECs toward your certification.'],
  ['comment marker does not launder branding', '// note: WRT, ASD and AMRT courses for CARSI clients'],
  ['scope note does not launder branding', '(IICRC CRT) — and our IICRC AMRT course for CARSI members.'],
  // Codex round 2 (2026-08-07): four constructions the round-1 rules still could not see.
  // Each had live occurrences while the guard and its self-test both reported green.
  ['plus-separated acronym list', 'description="WRT + ASD + FSRT training for data centre facility teams."'],
  ['topic word steps around IICRC training', 'IICRC restoration training for Australian data centres.'],
  ['CEC eligibility claimed without the word CEC', 'so this course counts toward maintaining a certification you already hold.'],
  [
    'interpolation pushes the verb past the window',
    "`Published courses across ${d} restoration discipline${d === 1 ? '' : 's'} — each earning continuing education credits toward an IICRC certification`",
  ],
  ['IICRC-training rule is not whole-line allowed', 'IICRC training through CARSI — CARSI is IICRC CEC Accredited'],
];

const MUST_PASS = [
  // The permitted provider-level phrasing — CARSI's actual standing.
  ['IICRC CEC course', 'Enrol in our IICRC CEC course'],
  ['IICRC CEC Accredited', 'CARSI is an IICRC CEC Accredited provider'],
  ['IICRC CEC Accredited courses', 'IICRC CEC Accredited courses online, 24/7'],
  // Nominative third-person facts about the IICRC's own certification — explicitly allowed.
  [
    'third-person certification route',
    'IICRC certification is obtained through an IICRC-approved school and examination.',
  ],
  [
    'nominative acronym fact',
    'FSRT is an IICRC certification covering fire and smoke restoration.',
  ],
  // A PERSON's own credential — allowed ("a student's own recert / member number").
  ['person holds a certification', 'IICRC-certified staff demonstrate compliance'],
  ['learner self-declares', "Already IICRC certified"],
  // The one real shape the allow exists for: a person's credential list in the directory fixture.
  // Bare credential names only — anything with prose in it is caught by MUST_BLOCK above.
  [
    "person's credential list",
    "certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC FSRT'],",
  ],
  // The legacy WordPress URL slug — an identifier, not copy. Rewriting these breaks redirects.
  ['legacy import slug alone', "href: '/courses/water-iicrc-wrt'"],
  // Constructions that LOOK like the banned ones but are correct, each found live while
  // draining the Codex findings. A blanket rewrite mangled the first two before these
  // cases existed — one of them was the comment documenting this very rule.
  ['comment documenting the rule', '// (matched against course title/category), not by WRT/ASD/etc.'],
  ['third-party requirement', "requirement: 'WRT and FSRT commonly required by adjusters'"],
  ['type doc naming the format', '  /** IICRC code (WRT/CRT/ASD/AMRT/FSRT/OCT/CCT) or null. */'],
  ['prompt that forbids the acronyms', '   (WRT/ASD/AMRT/FSRT/CCT/TCST) and never call it "[discipline]-aligned".'],
  ['prerequisite naming the learner\'s own cert', '- Basic understanding (recommended: IICRC WRT certification or equivalent).'],
  ['parenthesised scope note', '**colour repair / re-dyeing** (IICRC CRT), or refer.'],
  // Fail-closed copy and the code that enforces it must never be flagged.
  ['denial that a course carries CECs', 'This course carries no IICRC CECs (pending IICRC approval).'],
  ['the FAQ question itself', 'Is this course IICRC CEC accredited or does it award CECs?'],
  ['code describing the gate', '{/* assert this course earns CECs only when it has registry-approved hours */}'],
  ['delete-guard test name', "  it('refuses to delete a course carrying CEC records', async () => {"],
  ['third-person CEC definition', 'CEC (Continuing Education Credit): 1 CEC = 1 hour of learning.'],
  // Round-2 exemptions. The first two are the rule's own enforcement text — flagging them
  // would mean a rewrite deletes the instruction that enforces this rule.
  ['comment naming the school designation', '// an IICRC Registered-Training-School discipline acronym branding a CARSI course'],
  ['prompt forbidding school acronyms', '3. NEVER brand the course with IICRC Registered-Training-School discipline acronyms'],
  [
    'price comparison against IICRC-approved schools',
    'Compare that to $2,000–5,000 per person for face-to-face IICRC certification training at approved schools.',
  ],
  ['compliant CEC training phrasing', 'Enrol in our IICRC CEC training today.'],
  // The disclaimer itself names IICRC in a NEGATION — the opposite of a claim, and it ships
  // on every course page. If the guard ever blocks this, the product loses its honest framing.
  [
    'not-a-certification disclaimer',
    'A CARSI-issued credential — not an IICRC certification. CARSI is an IICRC CEC Accredited provider.',
  ],
  // Plain CARSI framing with no IICRC branding at all.
  ['CARSI own designation', 'Earns the CARSI Water Restoration Practitioner designation'],
  ['plain topic wording', 'CARSI water damage restoration training for Australian technicians'],
];

let failed = 0;

for (const [name, src] of MUST_BLOCK) {
  if (scanText(F, src).length === 0) {
    console.error(`✖ MUST BLOCK but passed: ${name}\n    ${src}`);
    failed++;
  }
}

for (const [name, src] of MUST_PASS) {
  const f = scanText(F, src);
  if (f.length > 0) {
    console.error(`✖ MUST PASS but blocked: ${name}\n    ${src}\n    ${f.join('\n    ')}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n✖ IICRC terminology guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(
  `✓ IICRC terminology guard self-test passed (${MUST_BLOCK.length} block, ${MUST_PASS.length} pass).`
);
process.exit(0);
