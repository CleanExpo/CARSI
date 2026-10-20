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
import { bannedRules, scanFile, scanText } from './check-iicrc-terminology.mjs';
import { IICRC_CODES } from './iicrc-codes.mjs';

const F = 'app/(public)/fixture/page.tsx';

const MUST_BLOCK = [
  // Codes beyond the original eight, one per family (review of f37d2116): the shared IICRC list.
  ['repair certification code + training', 'Enrol in RRT training today'],
  ['commercial carpet maintenance code + courses', 'Browse CCMT courses'],
  ['upholstery code + modifier + course', 'UFT online course for upholstery crews'],
  ['health and safety code + module', 'HST training module for site crews'],
  ['master designation + pathway', 'Book the MWR pathway'],
  ['drying specialist after IICRC', 'IICRC CDS course for drying crews'],
  ['new codes in a list', 'RRT, CCMT and UFT courses'],
  // Closed-list course modifiers between the code and the offering (review of 47921544).
  ['acronym, one modifier, offering', 'Enrol in WRT online training today'],
  ['acronym, two modifiers, offering', 'ASD practical training module'],
  ['acronym, modifier, colon, offering', 'CCT refresher: course for floor-care crews'],
  ['acronym, two modifiers (hyphenated), offering', 'Book the FSRT self-paced intro course'],
  ['acronym, CEC modifier, offering', 'Browse AMRT CEC courses'],
  // Punctuation between the acronym and the offering (review of d25ce440): colon, slash, comma.
  ['acronym, colon, offering', 'WRT: training for plumbers'],
  ['acronym, slash, offering', 'WRT/course pathway'],
  ['acronym, comma, offering', 'ASD, training module'],
  ['acronym, spaced slash, offering', 'Book the CCT / courses bundle'],
  ['acronym, spaced colon, offering', 'FSRT : training for fire crews'],
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
  [
    "IICRC training sold as CARSI's",
    'IICRC training through CARSI lets you expand your service offering.',
  ],
  // CEC is fail-closed: data/seed/cec-approvals.json gates every course-level claim.
  [
    'course-level CEC claim',
    'Completing this training also earns IICRC Continuing Education Credits (CECs).',
  ],
  ['blunt CEC claim', 'Every course earns verified CECs.'],
  // Exemptions must not become laundering routes — each of these carries a permitted
  // construction AND a real claim on the same line.
  [
    'denial does not launder a claim',
    'It does not award CECs. Every CARSI course earns IICRC CECs.',
  ],
  [
    'question does not launder a claim',
    'Is it accredited? Our courses earn CECs toward your certification.',
  ],
  [
    'comment marker does not launder branding',
    '// note: WRT, ASD and AMRT courses for CARSI clients',
  ],
  [
    'scope note does not launder branding',
    '(IICRC CRT) — and our IICRC AMRT course for CARSI members.',
  ],
  // Codex round 2 (2026-08-07): four constructions the round-1 rules still could not see.
  // Each had live occurrences while the guard and its self-test both reported green.
  [
    'plus-separated acronym list',
    'description="WRT + ASD + FSRT training for data centre facility teams."',
  ],
  [
    'topic word steps around IICRC training',
    'IICRC restoration training for Australian data centres.',
  ],
  [
    'CEC eligibility claimed without the word CEC',
    'so this course counts toward maintaining a certification you already hold.',
  ],
  [
    'interpolation pushes the verb past the window',
    "`Published courses across ${d} restoration discipline${d === 1 ? '' : 's'} — each earning continuing education credits toward an IICRC certification`",
  ],
  [
    'IICRC-training rule is not whole-line allowed',
    'IICRC training through CARSI — CARSI is IICRC CEC Accredited',
  ],
  // The last two whole-line `allow`s, converted to `neutralise`. Both were latent rather
  // than live — the tree was already clean of them — but a compliant half must never
  // exempt a false half on the same line, which is how this file was bitten three times.
  [
    'a CEC token does not exempt a bare "IICRC courses" claim',
    'Enrol in our IICRC courses today — CARSI is IICRC CEC Accredited.',
  ],
  [
    'a third-person school mention does not exempt the claim beside it',
    'CARSI is an IICRC Approved School — certification is obtained through an IICRC approved school.',
  ],
  // Designation NAME rule (06/10/2026). The live title that shipped with no acronym in it:
  // the designation spelled out is still the designation.
  [
    'designation name in a course title (live 06/10/2026)',
    "title: 'Applied Structural Drying — Core Concepts',",
  ],
  [
    'designation name in a JSON title',
    '"title": "Introduction to Advanced Applied Structural Drying | CARSI",',
  ],
  ['designation name + course noun', 'Welcome to Carpet Cleaning Technician Fundamentals.'],
  [
    'designation name + course noun, ampersand form',
    'Fire & Smoke Restoration Technician course for crews',
  ],
  // Independent review 06/10/2026: hyphens between the designation words bypassed the rule.
  [
    'hyphenated designation name in a title (review P1)',
    'export const probe = { title: "Applied-Structural-Drying — Core Concepts" };',
  ],
  [
    'underscored designation name + course noun',
    'Carpet_Cleaning_Technician Fundamentals for new starters',
  ],
  ['spaced dash before the course noun', 'Applied Structural Drying - Core Concepts'],
  [
    'en-dash designation name in a title (review P1, round 2)',
    'export const probe = { title: "Applied\u2013Structural\u2013Drying \u2014 Core Concepts" };',
  ],
  [
    'registry title as the PREFIX of another title (review P1, round 2)',
    'export const probe = { title: "Introduction to Applied Structural Drying Masterclass" };',
  ],
  [
    'registry title + suffix copy (review P1, round 2)',
    '"title": "Introduction to Applied Structural Drying \u2014 Core Concepts",',
  ],
  [
    'registry title + "course" + more (review P1, round 3)',
    'export const probe = { title: "Introduction to Applied Structural Drying course Masterclass" };',
  ],
  [
    'registry title + "| CARSI" + more (review P1, round 3)',
    'export const probe = { title: "Introduction to Applied Structural Drying | CARSI Masterclass" };',
  ],
  [
    'registry title inside a sentence + course noun',
    '"q": "What does the Introduction to Applied Structural Drying course cover?",',
  ],
  [
    'registry title concatenated with a suffix (review P1, round 4)',
    "export const probe = { title: 'Introduction to Applied Structural Drying' + ' Masterclass' };",
  ],
  [
    'registry title + CARSI concatenated with a suffix (review P1, round 4)',
    "export const probe = { title: 'Introduction to Applied Structural Drying | CARSI' + ' Masterclass' };",
  ],
  [
    'designation split across concatenated pieces',
    "export const probe = { title: 'Applied ' + 'Structural Drying' };",
  ],
  [
    'commented join after a registry title (review P1, round 5)',
    "export const probe = { title: 'Introduction to Applied Structural Drying' /* join */ + ' Masterclass' };",
  ],
  [
    'commented join inside a designation (review P1, round 5)',
    "t = { title: 'Applied '/* x */ + 'Structural Drying — Core Concepts' };",
  ],
  [
    'prefix concatenated onto a registry title',
    "export const probe = { title: 'Advanced ' + 'Introduction to Applied Structural Drying' };",
  ],
  [
    'microbial designation name in a quiz title',
    '"title": "Applied Microbial Remediation: Mould Fundamentals — Knowledge Check",',
  ],
  // Single acronym naming training (18/10/2026). Every case below was live — in industry FAQ
  // JSON-LD or a CTA — while the guard reported green: the list rule needs two acronyms and
  // the designation rule needs an adjacent "IICRC" or "-aligned".
  ['acronym + courses (plumbing FAQ)', 'Most WRT courses take 8–12 hours of study.'],
  [
    'acronym + training (question form)',
    "question: 'What is WRT training and how does it help a plumbing business?',",
  ],
  [
    'acronym + parenthetical + training',
    'CRT (Carpet Cleaning Technician) training enables in-house staff.',
  ],
  [
    'acronym + training, mid-sentence',
    'ASD training complements this with structural moisture monitoring.',
  ],
  ['CARSI + acronym + courses (CTA)', 'Explore CARSI CCT courses'],
  ['acronym + course pathway', "topic: 'CARSI CCT course pathway',"],
  ['acronym + pathway', "label: 'Start the CCT pathway',"],
  ['acronym + capitalised Course', "title: 'IICRC-free WRT Course for crews'"],
  ['acronym + program', 'Our AMRT program for food facilities'],
  ['acronym + module', 'Finish the OCT module before the site visit.'],
  ['acronym + hyphen + training', 'FSRT-training for bushfire crews'],
  ['a nearby sentence does not launder it', 'We rarely use acronyms. WRT training for plumbers.'],
  // Review of fix/industry-faq-licence (18/10/2026): forms the first version missed.
  ['title-case acronym', 'Enrol in our Wrt training today.'],
  ['lower-case acronym', 'Enrol in our wrt training today.'],
  ['en dash', 'Book WRT\u2013training today.'],
  ['em dash', 'Book ASD\u2014courses this month.'],
  ['possessive', "Explore CARSI WRT's training."],
  ['curly possessive', 'Explore CARSI WRT\u2019s training.'],
  [
    '"never" exempts only its own sentence',
    'Never call it a WRT course — use CARSI. Book ASD training today.',
  ],
  // GP-654: the catalogue measured in IICRC disciplines. Each is the exact live string, 20/10/2026.
  [
    'counted disciplines in a template',
    "d > 0 ? `${d} IICRC discipline${d === 1 ? '' : 's'}` : 'x'",
  ],
  ['the core IICRC disciplines', "'the core IICRC disciplines';"],
  [
    'multiple IICRC disciplines',
    "d > 0 ? `${d} discipline${d === 1 ? '' : 's'}` : 'multiple IICRC disciplines';",
  ],
  ['stats label', "      label: 'IICRC Disciplines',"],
  ['share-image stat', "{ value: '7', label: 'IICRC Disciplines' },"],
  ['a literal count', 'Courses across 7 IICRC disciplines.'],
  ['coverage verb', 'Training that spans the IICRC disciplines.'],
  // Independent review of 6edff7f0: reversed order, element-separated counts, spelled numbers.
  ['reversed: disciplines covered by CARSI', 'IICRC disciplines covered by CARSI.'],
  ['reversed: disciplines taught at CARSI', 'Every one of the IICRC disciplines taught at CARSI.'],
  ['count inside a JSX element', 'CARSI covers <strong>7</strong> IICRC disciplines.'],
  ['IICRC inside a JSX element', 'CARSI covers 7 <span>IICRC</span> disciplines.'],
  ['spelled number past nine', 'CARSI covers ten IICRC disciplines.'],
  ['count with plus', 'Courses across 7+ IICRC disciplines.'],
  ['coverage verb before the learner wording', 'CARSI covers your IICRC disciplines.'],
  // Independent review of 3aec1af2: learner wording must not shelter a coverage claim.
  ['coverage + "all of your"', 'CARSI covers all of your IICRC disciplines.'],
  ['coverage + "you hold"', 'CARSI covers all IICRC disciplines you hold.'],
  ['coverage + "held by"', 'Our catalogue spans IICRC disciplines held by technicians.'],
  ['third-person catalogue mention', 'Browse courses by IICRC disciplines.'],
  // Independent review of 395315bc: a learner benefit is still a catalogue claim…
  ['learner benefit: at your pace', '<p>Explore seven IICRC disciplines at your pace.</p>'],
  ['learner benefit: your own pace', 'Master all IICRC disciplines at your own pace.'],
  ['learner benefit: you can study', 'You can study the IICRC disciplines online.'],
  ['learner benefit: possessive + benefit verb', 'Master your IICRC disciplines with us.'],
  ['learner benefit: no benefit verb, bare "you"', 'Seven IICRC disciplines, one login for you.'],
  // …and rendered whitespace is still a space.
  ['JSX space expression', '<p>CARSI covers 7 IICRC{" "}disciplines.</p>'],
  ['JSX single-quoted space', "<p>CARSI covers 7 IICRC{' '}disciplines.</p>"],
  ['JSX template space', '<p>CARSI covers 7 IICRC{` `}disciplines.</p>'],
  ['JSX escaped no-break space', '<p>CARSI covers 7 IICRC{"\\u00a0"}disciplines.</p>'],
  ['HTML &nbsp;', '<p>CARSI covers 7 IICRC&nbsp;disciplines.</p>'],
  ['HTML &#160;', '<p>CARSI covers 7 IICRC&#160;disciplines.</p>'],
  ['HTML &#xA0;', '<p>CARSI covers 7 IICRC&#xA0;disciplines.</p>'],
  ['literal no-break space', 'CARSI covers 7 IICRC\u00a0disciplines.'],
  ['narrow no-break space', 'CARSI covers 7 IICRC\u202fdisciplines.'],
  ['zero-width space inside the word', 'CARSI covers 7 IICRC disci\u200bplines.'],
  ['soft hyphen entity inside the word', 'CARSI covers 7 IICRC disci&shy;plines.'],
  ['JSX space before a counted singular', '<p>{d} IICRC{" "}discipline{d === 1 ? "" : "s"}</p>'],
  // Independent review of fd1890a8: only whole learner-data shapes are exempt…
  [
    'possessive + unlisted selling verb',
    '<p>Boost your IICRC disciplines with expert-led tuition.</p>',
  ],
  ['possessive + "advance"', 'Advance your IICRC disciplines with us.'],
  ['possessive + "perfect"', 'Perfect your IICRC disciplines with interactive tutorials.'],
  ['"you hold" + selling tail', 'Sharpen the IICRC disciplines you hold with expert tuition.'],
  ['selling question', 'Want to boost your IICRC disciplines?'],
  [
    'claim riding in front of an exempt question',
    "label: '7 IICRC disciplines', question: 'Which IICRC disciplines do you hold?'",
  ],
  [
    'comment marker is not an exemption (JSX text renders it)',
    '<p>// Boost your IICRC disciplines today.</p>',
  ],
  // …and anything between the words other than whitespace is banned.
  ['JSX escaped ordinary space', '<p>CARSI covers 7 IICRC{"\\u0020"}disciplines.</p>'],
  ['JSX \\x20', '<p>CARSI covers 7 IICRC{"\\x20"}disciplines.</p>'],
  ['JSX \\t', '<p>CARSI covers 7 IICRC{"\\t"}disciplines.</p>'],
  ['JSX \\u{20}', '<p>CARSI covers 7 IICRC{"\\u{20}"}disciplines.</p>'],
  ['HTML &Tab;', '<p>CARSI covers 7 IICRC&Tab;disciplines.</p>'],
  ['HTML &#9;', '<p>CARSI covers 7 IICRC&#9;disciplines.</p>'],
  ['HTML &#x20;', '<p>CARSI covers 7 IICRC&#x20;disciplines.</p>'],
  ['HTML &NewLine;', '<p>CARSI covers 7 IICRC&NewLine;disciplines.</p>'],
  ['unknown entity between the words', '<p>CARSI covers 7 IICRC&MadeUp;disciplines.</p>'],
  ['space variable', '<p>CARSI covers 7 IICRC{sp}disciplines.</p>'],
  ['String.fromCharCode', '<p>CARSI covers 7 IICRC{String.fromCharCode(32)}disciplines.</p>'],
  ['template interpolation', '`CARSI covers 7 IICRC${sp}disciplines.`'],
  ['two expressions', '<p>CARSI covers 7 IICRC{""}{" "}disciplines.</p>'],
  // Independent review of 17342ea9: a count, a separator and a computed plural ending.
  [
    'counted, fromCharCode, computed "s"',
    '<p>CARSI covers {7} IICRC{String.fromCharCode(32)}discipline{"s"}.</p>',
  ],
  [
    'counted, space variable, computed "s"',
    '<p>CARSI covers {count} IICRC{sp}discipline{plural}.</p>',
  ],
  ['counted, entity, computed "s"', '<p>CARSI covers 7 IICRC&#8199;discipline{"s"}.</p>'],
  ['counted, escaped em space', '<p>CARSI covers 7 IICRC{"\\u2003"}discipline{"s"}.</p>'],
  ['counted, figure-space entity', '<p>CARSI covers 7 IICRC&numsp;disciplines.</p>'],
  [
    'template: count, separator, computed ending',
    '`${n} IICRC${sp}discipline${n === 1 ? "" : "s"}`',
  ],
  ['plain space, computed ending', '<p>CARSI covers {n} IICRC discipline{n === 1 ? "" : "s"}.</p>'],
  ['count, separator before IICRC', '<p>CARSI covers {n}{sp}IICRC discipline.</p>'],
  [
    'count inside an element, separator after',
    'CARSI covers <b>7</b> IICRC{sp}discipline<span>s</span>',
  ],
];

const MUST_PASS = [
  // Ordinary words that share a short code stay allowed: no offering noun follows them.
  [
    'a technician holding stacked certifications (third-person)',
    'A **CCT + UFT + OCT** tech can clean, upholster and deodorise.',
  ],
  ['BMI as body mass index', 'Gym members can track BMI and body-fat trends.'],
  ['RFI as a request for information', 'Send an RFI before the tender closes.'],
  ['CPT as billing codes', 'CPT codes appear on the invoice.'],
  ['RCT as a randomised controlled trial', 'An RCT found the drying method worked.'],
  // Third-person facts with an open word between code and noun stay allowed (closed list only).
  ['holders completing training (third-person)', 'WRT holders completing training'],
  [
    'technicians who hold the certification attend training',
    'technicians who hold WRT attend training',
  ],
  // Punctuation forms that name no CARSI offering stay allowed.
  ['month pair before training (October)', 'Sep/Oct training calendar for regional teams'],
  [
    'certification fact after a colon',
    'FSRT: an IICRC certification covering fire and smoke restoration.',
  ],
  ['code list in data, no offering noun', "certifications: ['WRT', 'ASD'],"],
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
  ['learner self-declares', 'Already IICRC certified'],
  // The one real shape the allow exists for: a person's credential list in the directory fixture.
  // Bare credential names only — anything with prose in it is caught by MUST_BLOCK above.
  ["person's credential list", "certifications: ['IICRC WRT', 'IICRC ASD', 'IICRC FSRT'],"],
  // The legacy WordPress URL slug — an identifier, not copy. Rewriting these breaks redirects.
  ['legacy import slug alone', "href: '/courses/water-iicrc-wrt'"],
  // Constructions that LOOK like the banned ones but are correct, each found live while
  // draining the Codex findings. A blanket rewrite mangled the first two before these
  // cases existed — one of them was the comment documenting this very rule.
  [
    'comment documenting the rule',
    '// (matched against course title/category), not by WRT/ASD/etc.',
  ],
  ['third-party requirement', "requirement: 'WRT and FSRT commonly required by adjusters'"],
  ['type doc naming the format', '  /** IICRC code (WRT/CRT/ASD/AMRT/FSRT/OCT/CCT) or null. */'],
  [
    'prompt that forbids the acronyms',
    '   (WRT/ASD/AMRT/FSRT/CCT/TCST) and never call it "[discipline]-aligned".',
  ],
  [
    "prerequisite naming the learner's own cert",
    '- Basic understanding (recommended: IICRC WRT certification or equivalent).',
  ],
  ['parenthesised scope note', '**colour repair / re-dyeing** (IICRC CRT), or refer.'],
  // Fail-closed copy and the code that enforces it must never be flagged.
  // Negative controls for the single-acronym naming rule (18/10/2026): the certification
  // named as a certification, a date abbreviation, the rule's own enforcement text, and
  // the IICRC's own course in the possessive.
  ['acronym named as a certification', 'FSRT is an IICRC certification covering smoke and soot.'],
  ['learner recertification', 'Your WRT recertification is due in March.'],
  ['date abbreviation is not the designation', 'Oct training day at the Bayswater warehouse.'],
  ['lowercase slug fragment', "href: '/courses/oct-training-2026'"],
  ['prompt forbidding the construction', 'Never call it a WRT course — use the CARSI designation.'],
  [
    'the IICRC naming its own course',
    "The IICRC's WRT course is taught only by IICRC-approved schools.",
  ],
  ['plain-English subject', 'Water damage restoration training for plumbers.'],
  ['month abbreviation, title case', 'Book the Oct training session early.'],
  ['month abbreviation, lower case', 'oct training calendar'],
  [
    'forbidding sentence on its own',
    'Never call it a WRT course; use the CARSI designation instead.',
  ],
  [
    'denial that a course carries CECs',
    'This course carries no IICRC CECs (pending IICRC approval).',
  ],
  ['the FAQ question itself', 'Is this course IICRC CEC accredited or does it award CECs?'],
  [
    'code describing the gate',
    '{/* assert this course earns CECs only when it has registry-approved hours */}',
  ],
  [
    'delete-guard test name',
    "  it('refuses to delete a course carrying CEC records', async () => {",
  ],
  ['third-person CEC definition', 'CEC (Continuing Education Credit): 1 CEC = 1 hour of learning.'],
  // Round-2 exemptions. The first two are the rule's own enforcement text — flagging them
  // would mean a rewrite deletes the instruction that enforces this rule.
  [
    'comment naming the school designation',
    '// an IICRC Registered-Training-School discipline acronym branding a CARSI course',
  ],
  [
    'prompt forbidding school acronyms',
    '3. NEVER brand the course with IICRC Registered-Training-School discipline acronyms',
  ],
  [
    'price comparison against IICRC-approved schools',
    'Compare that to $2,000–5,000 per person for face-to-face IICRC certification training at approved schools.',
  ],
  ['compliant CEC training phrasing', 'Enrol in our IICRC CEC training today.'],
  // The constructions those two neutralise spans exist to protect.
  ['spelled-out compliant course form', 'Enrol in our IICRC Continuing Education Credit courses.'],
  [
    'third-person certification route',
    'IICRC certification is obtained through an IICRC approved school and examination.',
  ],
  // The disclaimer itself names IICRC in a NEGATION — the opposite of a claim, and it ships
  // on every course page. If the guard ever blocks this, the product loses its honest framing.
  [
    'not-a-certification disclaimer',
    'A CARSI-issued credential — not an IICRC certification. CARSI is an IICRC CEC Accredited provider.',
  ],
  // PR #841: preserve approval gates, honest disclaimers and optimiser prohibitions.
  [
    'catalogue approval gate',
    'A CARSI course shows a CEC value only when that course has a recorded IICRC approval.',
  ],
  [
    'catalogue credential disclaimer',
    'CARSI courses carry CARSI Southern Hemisphere Restoration Designations. These are CARSI-issued credentials, not IICRC certifications.',
  ],
  [
    'pathway approval check and credential disclaimer',
    'CEC approval is course-specific. Check individual course pages for current approval details before planning certification renewal. Each pathway is a CARSI journey with CARSI-issued designations, not IICRC certifications.',
  ],
  [
    'optimiser forbids delivering certification and courses for the IICRC',
    'Never imply CARSI delivers certification or courses on behalf of the IICRC. If CEC is not in the source, do not add CEC hours.',
  ],
  [
    'optimiser forbids comma-separated acronym branding',
    'Never brand the course with IICRC discipline acronyms (WRT, ASD, AMRT, FSRT, CCT, TCST).',
  ],
  // Plain CARSI framing with no IICRC branding at all.
  ['CARSI own designation', 'Earns the CARSI Water Restoration Practitioner designation'],
  ['plain topic wording', 'CARSI water damage restoration training for Australian technicians'],
  // Designation NAME rule: the exact IICRC-approved CEC class titles (cec-approvals.json),
  // audience usage, and slugs are not course branding.
  ['IICRC-approved registry title', '"title": "Introduction to Applied Structural Drying",'],
  [
    'IICRC-approved registry title named in a question, no course noun',
    '"q": "What does Introduction to Applied Microbial Remediation cover?",',
  ],
  [
    'IICRC-approved registry title + repeated CARSI suffix',
    '"title": "Introduction to Applied Structural Drying | CARSI | CARSI",',
  ],
  [
    'IICRC-approved registry title + CARSI suffix',
    '"title": "Introduction to Applied Structural Drying | CARSI",',
  ],
  [
    'audience usage of a designation name',
    'This course is for water damage restoration technicians in Australia.',
  ],
  ['the renamed course title', "title: 'Structural Drying — Core Concepts',"],
  ['a hyphenated slug is the URL, audited live', '"courseSlug": "applied-structural-drying-core",'],
  [
    'a hyphenated slug + course noun is still a slug',
    'href="/courses/carpet-cleaning-technician-fundamentals"',
  ],
  // GP-654 negative controls: the learner's own disciplines and admin/instructor data labels.
  [
    'onboarding asks the learner',
    "question: 'Which IICRC disciplines do you hold or plan to work in? Select all that apply.',",
  ],
  ['contact form asks the learner', 'Mention your IICRC discipline if applicable.'],
  ['instructor form option', '<option value="">IICRC Discipline (optional)</option>'],
  ['admin analytics heading', 'title="By IICRC discipline"'],
  ['code comment naming the data', ' * an IICRC discipline code. Display names are anonymous.'],
  ['plain restoration disciplines', 'Courses across 7 restoration disciplines.'],
  [
    'learner: a quantity of their own disciplines',
    'Which of your seven IICRC disciplines need renewal?',
  ],
  ['learner: all the disciplines they hold', 'Select all IICRC disciplines you hold.'],
  [
    'onboarding question after another object key',
    "kind: 'multi', question: 'Which IICRC disciplines do you hold or plan to work in? Select all that apply.',",
  ],
  ['learner: disciplines due', 'Which of your IICRC disciplines are due?'],
  [
    'form prompt: choose the ones you hold',
    '<label>Choose the IICRC disciplines you currently hold.</label>',
  ],
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

// The CLI scans files line by line; scanFile also joins adjacent lines for cross-line rules.
const F_MULTI = 'app/(public)/fixture/page.tsx';
const MUST_BLOCK_FILE = [
  ['line break between acronym and training', 'Explore CARSI WRT\n            training today.'],
  ['line break before a hyphenated noun', 'Book the FSRT\n  -training cohort'],
  [
    'GP-654 JSX count split across a line break',
    'Earn a CARSI designation, with training that spans {disciplineCountLabel} IICRC\n            disciplines. Every certificate is issued with a verification record.',
  ],
  ['GP-654 count, IICRC and disciplines on three lines', '7\n<span>IICRC</span>\ndisciplines'],
  ['GP-654 JSX space expression on its own line', 'CARSI covers 7 IICRC\n{" "}\ndisciplines.'],
  [
    'GP-654 learner benefit across lines',
    '<p>\n  Explore seven IICRC disciplines\n  at your pace.\n</p>',
  ],
  // Review of d28bbcc0: five spellings React renders as "CARSI covers 7 IICRC disciplines."
  ['GP-654 quoted JSX literal', "<p>CARSI covers 7 IICRC{' disciplines'}.</p>"],
  ['GP-654 string join', "const lead = 'CARSI covers 7 IICRC ' + 'disciplines.';"],
  ['GP-654 letter entity', '<p>CARSI covers 7 IICR&#67; disciplines.</p>'],
  ['GP-654 hex letter entity', '<p>CARSI covers 7 IICRC &#x64;isciplines.</p>'],
  ['GP-654 word split by an element', '<p>CARSI covers 7 IICRC disci<span>plines</span>.</p>'],
  // Review of d42d3e99: routine markup and a commented join.
  [
    'GP-654 element with a long className',
    '<p>CARSI covers 7 IICRC <span className="font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg md:text-xl">disciplines</span>.</p>',
  ],
  ['GP-654 JSX fragment', '<p>CARSI covers 7 IICRC <>disciplines</>.</p>'],
  [
    'GP-654 join with a block comment',
    "const lead = 'CARSI covers 7 IICRC ' /* stat */ + 'disciplines.';",
  ],
  [
    'GP-654 join with a line comment',
    "const lead = 'CARSI covers 7 IICRC ' + // stat\n  'disciplines.';",
  ],
  // Review of 723bdce5: the rendered-text pass reads the parsed JSX and string joins.
  [
    'GP-654 arrow-function prop',
    '<p>CARSI covers 7 IICRC <span onClick={() => alert("details")}>disciplines</span>.</p>',
  ],
  [
    'GP-654 quoted > in an attribute',
    '<p>CARSI covers 7 IICRC <span title="Restoration > topics">disciplines</span>.</p>',
  ],
  [
    'GP-654 starred block comment in a join',
    "const copy = 'CARSI covers 7 IICRC ' /* ** topics ** */ + 'disciplines.';",
  ],
  [
    'GP-654 phrase spread over a long JSX tree',
    '<p>\n  CARSI covers\n  <strong>7</strong>\n  <em>\n    IICRC\n  </em>\n  {/* stat */}\n  <span className="x">\n    disciplines\n  </span>\n  .\n</p>',
  ],
  [
    'GP-654 explicit JSX space over five lines',
    '<p>\n  CARSI covers 7\n  <b>IICRC</b>\n  {" "}\n  disciplines.\n</p>',
  ],
  // Review of 0bb32ada: conditional copy renders one of its branches, and JSX passed as a prop
  // renders wherever the component puts it.
  [
    'GP-654 ternary string branch',
    "export const Copy = ({ expanded }) => <p>CARSI covers 7 IICRC {expanded ? 'disciplines' : 'topics'}.</p>;",
  ],
  [
    'GP-654 && element branch',
    'export const Copy = ({ open }) => <p>CARSI covers 7 IICRC {open && <strong>disciplines</strong>}.</p>;',
  ],
  [
    'GP-654 nested ternary element branch',
    "<p>CARSI covers 7 IICRC {a ? 'topics' : b ? <em>disciplines</em> : null}.</p>",
  ],
  ['GP-654 ?? fallback branch', "<p>CARSI covers 7 IICRC {label ?? 'disciplines'}.</p>"],
  [
    'GP-654 word split across two conditionals',
    "<p>CARSI covers 7 IICRC {a ? 'disci' : ''}{b ? 'plines' : ''}.</p>",
  ],
  [
    'GP-654 conditional inside a string join',
    "const lead = 'CARSI covers 7 IICRC ' + (wide ? 'disciplines.' : 'topics.');",
  ],
  [
    'GP-654 JSX fragment prop with a quoted >',
    'export const Copy = () => <Card title={<>CARSI covers 7 IICRC <span title="topics > details">disciplines</span>.</>} />;',
  ],
  [
    'GP-654 conditional JSX prop',
    "<Card title={wide ? <>CARSI covers 7 IICRC disciplines.</> : 'Restoration'} />",
  ],
  [
    'GP-654 phrase before many conditionals',
    `<p>CARSI covers 7 IICRC disciplines.${"{a ? 'x' : 'y'}".repeat(12)}</p>`,
  ],
  // Review of 818f619e: React drops whitespace at a JSX line break, words split across elements
  // escaped the substring prefilter, and template substitutions hid their branches.
  [
    'GP-654 word joined across a JSX line break',
    'export const Copy = () => <p>CARSI covers 7 IICRC disci\n<span>plines</span>.</p>;',
  ],
  [
    'GP-654 word split across elements with a quoted >',
    'export const Copy = () => <p>CARSI covers 7 IICRC dis<span title="Topics > details">ci</span>plines.</p>;',
  ],
  [
    'GP-654 word split into single letters',
    '<p>CARSI covers 7 IICRC d<b>i</b>s<b>c</b>i<b>p</b>lines.</p>',
  ],
  [
    'GP-654 character reference inside a split word',
    '<p>CARSI covers 7 IICRC dis<b>&#99;</b>iplines.</p>',
  ],
  [
    'GP-654 conditional inside a template substitution',
    "export const Copy = () => <p>{`CARSI covers 7 IICRC ${open ? 'disciplines' : 'topics'}.`}</p>;",
  ],
  // Review of c6c5a064: an empty element and an invisible character inside a split word.
  [
    'GP-654 word split by a <wbr />',
    'export const Copy = () => <p>CARSI covers 7 IICRC dis<wbr title="word > break" />ciplines.</p>;',
  ],
  [
    'GP-654 soft hyphen inside a split word',
    'export const Copy = () => <p>CARSI covers 7 IICRC disci<span title="subject > details">&shy;plines</span>.</p>;',
  ],
  [
    'GP-654 soft hyphen escape in a string literal beside an element',
    "export const Copy = () => <p>CARSI covers 7 IICRC <b>{'disci\\u00adplines'}</b>.</p>;",
  ],
  // Review of 42c32b79: a template outside JSX hid its branches.
  [
    'GP-654 conditional template assigned outside JSX',
    "const headline = `CARSI covers 7 IICRC ${expanded ? 'disciplines' : 'topics'}.`;\nexport const Copy = () => <p>{headline}</p>;",
  ],
  [
    'GP-654 conditional template in metadata',
    "export const metadata = { description: `CARSI covers 7 IICRC ${wide ? 'disciplines' : 'topics'}.` };",
  ],
  [
    'GP-654 conditional template as a branch',
    "const line = short ? 'CARSI' : `CARSI covers 7 IICRC ${wide ? 'disciplines' : 'topics'}.`;",
  ],
  // Review of 4414fcac: an escape inside a string outside JSX hid the space it renders.
  [
    'GP-654 escaped newline in a metadata string',
    'export const metadata = { description: "CARSI covers 7 IICRC\\ndisciplines." };',
  ],
  [
    'GP-654 escaped letter in a string',
    "const headline = 'CARSI covers 7 IICRC \\u0064isciplines.';",
  ],
  [
    'GP-654 escaped newline in a default parameter',
    "export function Hero({ line = 'CARSI covers 7 IICRC\\tdisciplines.' }) { return line; }",
  ],
  // Review of 190018fe: type-only wrappers read as unknown expressions.
  [
    'GP-654 cast literal inside a JSX word',
    "export const Copy = () => <p>CARSI covers 7 IICRC disci{'plines' as const}.</p>;",
  ],
  [
    'GP-654 cast literal in a template substitution',
    "export const metadata = { description: `CARSI covers 7 IICRC ${'disciplines' as const}.` };",
  ],
  [
    'GP-654 satisfies and non-null wrappers',
    "const a = `CARSI covers 7 IICRC ${('disciplines' satisfies string)}.`;\nconst b = `CARSI covers 7 IICRC ${label ? 'disciplines'! : 'topics'}.`;",
  ],
  [
    'GP-654 too many adjacent conditional variants fails closed',
    `<p>Restoration disciplines${"{a ? 'x' : 'y'}".repeat(12)}</p>`,
  ],
];
const MUST_PASS_FILE = [
  // Review of fd1890a8 (P2): a learner question wrapped over two lines.
  [
    'learner question across a line break',
    "question:\n  'Which IICRC disciplines do you hold\n  or plan to work in?',",
  ],
  ['a code on one line, an unrelated word on the next', "disciplines={['WRT']}\ntraining: true,"],
  ['plain subject across a break', 'Water damage restoration\ntraining for plumbers.'],
  // Review of 0bb32ada: the branches that render are checked, and only those.
  [
    'conditional whose branches render neither phrase',
    "<p>CARSI covers 7 restoration {wide ? 'disciplines' : 'topics'}.</p>",
  ],
  [
    'an attribute naming a discipline in a tree full of conditionals',
    `<div><Link href="/courses?discipline=CCT">Browse courses</Link>${"{a ? 'x' : 'y'}".repeat(12)}</div>`,
  ],
  [
    'conditional template whose branches render neither phrase',
    "const headline = `CARSI covers 7 restoration ${wide ? 'disciplines' : 'topics'}.`;",
  ],
  [
    'a word that only starts like the banned one, split across an element',
    '<p>CARSI covers IICRC dis<span>cussion</span> topics.</p>',
  ],
  [
    'a long page with conditionals spread through its copy',
    `<main>\n  <h1>Restoration disciplines</h1>\n${Array.from(
      { length: 20 },
      (_, i) =>
        `  <section>{show${i} && <Icon />}<h2>Module ${i}</h2>{open${i} ? 'Hands-on drying practice for site crews.' : 'Summary.'} <p>${'Extraction, drying and documentation for water-damaged homes. '.repeat(4)}</p></section>`
    ).join('\n')}\n</main>`,
  ],
];
for (const [name, src] of MUST_BLOCK_FILE) {
  if (scanFile(F_MULTI, src).length === 0) {
    console.error(`✖ MUST BLOCK (file) but passed: ${name}\n    ${JSON.stringify(src)}`);
    failed++;
  }
}
// Markdown renders emphasis and links as plain text (review of 723bdce5).
const F_MD = 'public/fixture/copy.md';
for (const [name, src, block] of [
  ['GP-654 Markdown emphasis', 'CARSI covers 7 **IICRC** disciplines.', true],
  [
    'GP-654 Markdown link text over two lines',
    'CARSI covers 7 [IICRC\ndisciplines](/about).',
    true,
  ],
  ['learner question in Markdown', 'Which **IICRC disciplines** do you hold?', false],
  ['GP-654 Markdown word split by emphasis', 'CARSI covers 7 IICRC dis**ci**plines.', true],
]) {
  if (scanFile(F_MD, src).length > 0 !== block) {
    console.error(
      `✖ ${block ? 'MUST BLOCK' : 'MUST PASS'} (markdown): ${name}\n    ${JSON.stringify(src)}`
    );
    failed++;
  }
}
// JSON strings are read as their decoded value (review of 190018fe).
const F_JSON = 'data/seo/fixture.json';
for (const [name, src, block] of [
  [
    'GP-654 escaped newline in SEO JSON',
    '{"description": "CARSI covers 7 IICRC\\ndisciplines."}',
    true,
  ],
  [
    'GP-654 escaped tab in SEO JSON',
    '{"description": "CARSI covers 7 IICRC\\tdisciplines."}',
    true,
  ],
  [
    'GP-654 escaped letter in SEO JSON',
    '{"description": "CARSI covers 7 IICRC \\u0064isciplines."}',
    true,
  ],
  [
    'restoration topics in SEO JSON',
    '{"description": "CARSI covers 7 restoration\\ndisciplines."}',
    false,
  ],
]) {
  if (scanFile(F_JSON, src).length > 0 !== block) {
    console.error(`✖ ${block ? 'MUST BLOCK' : 'MUST PASS'} (json): ${name}\n    ${src}`);
    failed++;
  }
}
for (const [name, src] of MUST_PASS_FILE) {
  const f = scanFile(F_MULTI, src);
  if (f.length > 0) {
    console.error(`✖ MUST PASS (file) but blocked: ${name}\n    ${f.join('\n    ')}`);
    failed++;
  }
}
// A learner question in a branch or a JSX prop renders as the whole question, so the rendered
// pass leaves it alone (the line joins judge these sources separately).
for (const [name, src] of [
  [
    'learner question in a conditional',
    "<p>{asked ? 'Which IICRC disciplines do you hold?' : 'Tell us about your work.'}</p>",
  ],
  [
    'learner question passed as a JSX prop',
    '<Field label={<>Which IICRC disciplines do you hold?</>} />',
  ],
]) {
  const f = scanFile(F_MULTI, src).filter((x) => x.includes('(rendered)'));
  if (f.length > 0) {
    console.error(`✖ MUST PASS (rendered) but blocked: ${name}\n    ${f.join('\n    ')}`);
    failed++;
  }
}

// Every code-bearing rule reads the shared list: built without a code, each fixture is missed;
// built from the full list, it is caught (review of f37d2116).
const LIST_FIXTURES = [
  ['list', F, 'Stack RRT + UFT skills on site', ['RRT', 'UFT']],
  ['single code + offering', F, 'Enrol in RRT training today', ['RRT']],
  ['IICRC + code', F, 'IICRC RRT for flooring crews', ['RRT']],
  ['code-aligned', F, 'An RRT-aligned flooring unit', ['RRT']],
  ['seed discipline', 'data/seed/x.json', '"iicrcDiscipline": "RRT"', ['RRT']],
];
for (const [name, file, src, drop] of LIST_FIXTURES) {
  const reduced = bannedRules(IICRC_CODES.filter((c) => !drop.includes(c)).join('|'));
  if (scanText(file, src).length === 0) {
    console.error(`✖ shared list: full list misses ${name}\n    ${src}`);
    failed++;
  }
  if (scanText(file, src, reduced).length > 0) {
    console.error(
      `✖ shared list: rules built without ${drop.join('/')} still catch ${name} (not reading the list)\n    ${src}`
    );
    failed++;
  }
}

// GP-654 rule on a long near-miss line: bounded quantifiers keep it linear (review of 6edff7f0
// measured ~257ms for 10,000 digits before the digit run was bounded).
// Timed on this rule alone: the older CEC-claim rule has its own long-line cost (~200ms here).
{
  const longLine = `${'9'.repeat(10000)} X IICRC disciplines`;
  const catalogueRule = bannedRules().filter((r) =>
    r.message.startsWith('Do not measure the CARSI catalogue')
  );
  if (catalogueRule.length !== 1) {
    console.error('✖ GP-654 catalogue rule not found exactly once');
    failed++;
  }
  // GP-654 round 5: the learner-data shapes, separator and whitespace normalisers on long lines.
  const adversarial = [
    longLine,
    `${"__a: 'b', ".repeat(1000)}Which IICRC disciplines do you hold x`,
    `${'IICRC{x}'.repeat(1200)} disciplines`,
    // Review of 17342ea9 (P2): repeated separators after one IICRC, and after counts.
    `IICRC${'{}'.repeat(10000)}x`,
    `7 ${'{}'.repeat(10000)}x`,
    `${'{1}'.repeat(5000)} IICRC x`,
    `IICRC${'&nbsp;'.repeat(1500)}x disciplines`,
    `{"${'\\u0020'.repeat(1500)}x"} IICRC disciplines`,
    `${'Which of your '.repeat(700)}IICRC disciplines need renewal x`,
    // Review of d42d3e99: the wider tag and commented-join normalisers.
    `<a${'x'.repeat(20000)} IICRC disciplines`,
    `${'<a '.repeat(6000)}IICRC x`,
    `${"'a' /* ".repeat(2500)}+ 'IICRC x'`,
    // Review of 723bdce5 (P2): a learner-question prefix followed by trailing whitespace.
    `Which IICRC disciplines do you hold${' '.repeat(20000)}x`,
  ];
  for (const line of adversarial) {
    const t0 = performance.now();
    scanText(F, line, catalogueRule);
    const ms = performance.now() - t0;
    if (ms > 100) {
      console.error(
        `✖ long near-miss line took ${ms.toFixed(0)}ms (> 100ms): ${line.slice(0, 40)}…`
      );
      failed++;
    }
  }
}

// The acronym-training rule covers public surfaces; docs/ plans are reviewed on their own branch.
const DOCS_LINE =
  'Retarget warm leads from Start Smart and CCT course enquiries if consent allows.';
if (scanText(F, DOCS_LINE).length === 0) {
  console.error(`✖ MUST BLOCK on a public surface but passed:\n    ${DOCS_LINE}`);
  failed++;
}
if (scanFile('docs/marketing/x.md', DOCS_LINE).length > 0) {
  console.error(`✖ MUST PASS in docs/ but blocked:\n    ${DOCS_LINE}`);
  failed++;
}

if (failed > 0) {
  console.error(`\n✖ IICRC terminology guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(
  `✓ IICRC terminology guard self-test passed (${MUST_BLOCK.length + MUST_BLOCK_FILE.length} block, ${MUST_PASS.length + MUST_PASS_FILE.length} pass).`
);
process.exit(0);
