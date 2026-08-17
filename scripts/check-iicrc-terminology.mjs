#!/usr/bin/env node
/**
 * IICRC CEC terminology guard (Linear GP-451).
 *
 * Licence-critical: CARSI is accredited as an IICRC *CEC provider* (Continuing
 * Education Credit) — "IICRC CEC Accredited". CARSI is NOT accredited to
 * deliver IICRC courses or certification — that is obtained only through
 * IICRC-approved schools and examinations. Selling copy that implies CARSI
 * grants IICRC certification, or that IICRC accredits CARSI's courses
 * generally (rather than CARSI's CEC-provider standing specifically), can
 * cost the founder's licence to sell courses, so it is a release blocker.
 *
 * This scanner blocks the banned selling phrasings in source copy. It is
 * deliberately narrow: it flags only phrases that assert CARSI delivers IICRC
 * courses/certification/accreditation, and leaves legitimate copy untouched —
 * a student's own existing IICRC certification (recert reminders, member
 * number, CEC tracking), accurate "IICRC CEC Accredited" claims, and
 * third-person industry facts such as "IICRC certification is required for
 * insurance panels".
 *
 * CARSI DESIGNATION RULE (founder, 2026-07-10): CARSI issues its OWN
 * "CARSI Southern Hemisphere Restoration Designations" (e.g. "CARSI Water
 * Restoration Technician") — it does NOT brand its courses with IICRC
 * Registered-Training-School discipline designations. So the IICRC discipline
 * ACRONYMS (WRT/ASD/AMRT/FSRT/CCT/TCST) and the "[discipline]-aligned" framing
 * may NOT be used to name/brand a CARSI course, and iicrcDiscipline must be
 * null in seed data. Referencing a student's own IICRC discipline certification
 * remains fine; using an S-standard NOMINATIVELY (e.g. "ANSI/IICRC S500")
 * remains fine — only the "-aligned" designation framing is banned.
 *
 * Modes:
 *   node scripts/check-iicrc-terminology.mjs           # scan tracked source copy (CI + manual)
 *   node scripts/check-iicrc-terminology.mjs --staged   # scan STAGED additions only (pre-commit)
 *
 * Bypass a verified false positive: git commit --no-verify
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Banned selling/descriptive phrasings. Each must be something that implies
// CARSI itself delivers IICRC courses or IICRC certification.
const BANNED = [
  {
    // A LIST of two or more IICRC discipline acronyms. Found live in
    // docs/marketing/linkedin-campaign.md ("WRT, CCT, AMRT — all online...") and on the
    // hospitality industry page ("WRT, CRT, ASD and OCT courses"). Neither the
    // "IICRC <acronym>" branch nor the "<acronym>-aligned" branch matched, because the
    // acronyms sat in a bare comma list with no adjacent IICRC and no "aligned".
    // Two-or-more in a list is always branding — a genuine third-person reference names
    // ONE certification ("FSRT is an IICRC certification covering…").
    // `+` is in the separator set because 18 IndustryCTA descriptions used it — "WRT + ASD
    // + FSRT training" — and an earlier version of this rule listed only comma, ampersand,
    // "and" and slash. Enumerating separators is inherently leaky; anything that joins two
    // acronyms is a list.
    re: /\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b\s*(?:,|&|\+|,?\s+and\s+|\s*\/\s*)\s*\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b/i,
    // These runs are legitimate and must not be rewritten:
    //  - a source COMMENT or type doc describing the data format (`/** IICRC code (WRT/CRT…) */`);
    //  - an AI prompt line that exists to FORBID the acronyms — rewriting it would delete the
    //    instruction enforcing this very rule;
    //  - the LEARNER's own codes, which CLAUDE.md explicitly permits;
    //  - a third-person fact about IICRC's own certifications ("Standard technician
    //    certifications (WRT, ASD, AMRT, etc.) require 14 CEC hours").
    // Written as `neutralise` so the exempt span is deleted and the rest of the line still
    // tested — a comment marker must not launder branding sitting beside it.
    allow: null,
    // Exempt the CONSTRUCTION, never the comment marker. Marking whole `//` lines exempt
    // would let `// note: WRT, ASD and AMRT courses for CARSI clients` through — the same
    // whole-line laundering this file has already been bitten by twice.
    // Order matters: the `e.g.` enumeration is tried FIRST, because the broader patterns are
    // greedy enough to swallow the leading "e" of "e.g." and leave a residue that still trips
    // the rule. The bounded lengths keep each exemption to its own construction.
    neutralise:
      // Every quantifier here is BOUNDED. Earlier versions used greedy `.*` on both sides of
      // the "never call" alternatives inside a /g regex; a 10,000-character line ending in
      // "WRT, ASD" took ~9.6s to scan, which is a denial-of-service against CI on any
      // minified or generated file. Bounded spans keep it linear.
      /\be\.g\.[^*]{0,60}?(?=\)|\*\/)|[^\n]{0,120}\bnever\s+(?:call|brand|use|say)\b[^\n]{0,120}|[^\n]{0,120}\bdoes\s+not\s+brand\b[^\n]{0,120}|[^\n]{0,120}\bnot\s+by\s+(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)[/,][^\n]{0,120}|\b(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b[^.!?]{0,40}?\b(?:required|held|sought|requested)\s+by\b|\b(?:code|codes|certifications?)\b[^.!?(]{0,30}\([^)]*\)|\bIICRC\s+Discipline:[^`]{0,60}/gi,
    message:
      'Do not list IICRC discipline acronyms — a CARSI course carries its CARSI Southern Hemisphere designation. Reference at most one IICRC certification, third-person.',
  },
  {
    // "IICRC training" as something CARSI supplies. CARSI supplies IICRC CEC courses;
    // it does not supply IICRC training. Found live as "IICRC training through CARSI".
    // Adjacency was not enough: "IICRC restoration training" slipped past a rule that only
    // matched "IICRC training", on six public metadata and hero strings. Allow up to three
    // intervening words so a topic word cannot be used to step around it.
    re: /\bIICRC(?:[\s-]+\w+){0,3}[\s-]+training\b/i,
    allow: null,
    // `neutralise`, not `allow`. As a whole-line allow this let
    // "IICRC training through CARSI — CARSI is IICRC CEC Accredited" pass on the strength of
    // the compliant half; the exempt span must be deleted and the remainder still tested.
    neutralise: /\bIICRC[^.!?]{0,40}?training\s+at\s+(?:IICRC[\s-]+)?approved\s+schools?|\bIICRC[\s-]+Registered-Training-School\b|\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)\w*(?:[\s-]+\w+){0,3}[\s-]+training\b|\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)/gi,
    message:
      'CARSI does not deliver "IICRC training" — say "IICRC CEC course(s)". IICRC training comes from an IICRC-approved school.',
  },
  {
    // A course-level claim that CARSI courses EARN CECs. Licence-critical and
    // fail-closed: data/seed/cec-approvals.json is the SSOT and a course may only claim
    // CECs after per-course IICRC approval. At the time this rule was added the registry
    // held ZERO approvals while five public surfaces asserted the claim. Provider-level
    // standing ("CARSI is an IICRC CEC Accredited provider") is NOT this, and is allowed.
    // Window widened from 90 to 200: on the about page a `${d}` interpolation pushed
    // "earning" past the old bound, so the tracked-file scan stayed green on a sentence the
    // rendered page still asserted.
    // Second alternative added because the credential disclaimer never says "CEC" — it says
    // a course "counts toward maintaining a certification you already hold", which is the
    // same unapproved eligibility claim expressed without the trigger word.
    re: /\b(courses?|training|modules?|programmes?|programs?)\b[^.!]{0,200}?\b(earn|earns|earning|award|awards|awarding|carry|carries|carrying|count|counts|counting)\b[^.!?]{0,50}?\b(CECs?\b|continuing[\s-]+education[\s-]+credits?)|\b(?:this\s+)?courses?\b[^.!?]{0,60}?\bcounts?\s+toward(?:s)?\b[^.!?]{0,60}?\b(?:maintain|maintaining|renewing|recertif\w*)\b[^.!?]{0,40}?\bcertification\b/i,
    allow: null,
    // A DENIAL that a course awards CECs, and a QUESTION asking whether it does, are both
    // correct copy — the FAQ pair "Is this course IICRC CEC accredited or does it award
    // CECs?" / "No … it does not award CECs" is exactly the honest framing this rule exists
    // to protect. Written as `neutralise`, so a negated or interrogative sentence is deleted
    // and the REST of the line still tested; a whole-line `allow` would let one denial
    // launder a genuine claim sitting beside it.
    // Also exempt, by construction rather than by comment marker:
    //  - code describing the GATE itself ("assert this course earns CECs only when it has
    //    registry-approved hours", "refuse to hard-delete a course carrying filed CEC
    //    records") — this is the logic that enforces the rule, not a marketing claim;
    //  - a third-person definition of what a CEC is ("1 CEC = 1 hour of learning").
    neutralise:
      /[^.!?]*\b(?:not|never|cannot|isn't|doesn't|does\s+not)\b\s*(?:\w+\s+){0,2}?\b(?:earns?|earning|awards?|awarding|carr(?:y|ies|ying)|counts?|counting|confers?|accredit\w*|eligible|approved|grants?|toward)\b[^.!?]{0,40}?(?:CECs?\b|continuing[\s-]+education[\s-]+credits?)[^.!?]*[.!?]?|[^.!?]*\bno\s+(?:IICRC\s+)?(?:CECs?\b|continuing[\s-]+education[\s-]+credits?)[^.!?]*[.!?]?|[^.!?]*\w\?|[^.!?]*\b(?:assert\w*|exclude|refuses?|gate|gated|only\s+wh(?:en|ere)|filed)\b[^.!?]*?(?:CECs?\b|continuing[\s-]+education[\s-]+credits?)[^.!?]*|\b1\s+CEC\s*=[^.!?]*/gi,
    message:
      'Do not claim a CARSI course earns/awards IICRC CECs — that requires per-course IICRC approval recorded in data/seed/cec-approvals.json (currently the SSOT gates every claim). State CARSI\'s provider standing instead.',
  },
  {
    // "IICRC course" / "IICRC courses" — must be "IICRC CEC course(s)".
    re: /\bIICRC[\s-]+courses?\b/i,
    // ...unless it is already the compliant "IICRC CEC course(s)" or the spelled-out form.
    // `neutralise`, not `allow`. As a whole-line allow, ANY line containing "IICRC CEC"
    // exempted the whole rule, so "Enrol in our IICRC courses today — CARSI is IICRC CEC
    // Accredited" passed on the strength of its compliant half. Deleting only the compliant
    // span and re-testing the remainder leaves the bare "IICRC courses" visible.
    allow: null,
    neutralise: /\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)\w*(?:[\s-]+(?:Accredited|courses?))?/gi,
    message: 'Use "IICRC CEC course(s)", not "IICRC course(s)".',
  },
  {
    // "IICRC certification course(s)" / "IICRC certified course(s)".
    re: /\bIICRC[\s-]*(certification|certified)[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI does not deliver IICRC certification courses — say "IICRC CEC course(s)".',
  },
  {
    // "get/getting/become/be IICRC certified [with CARSI]" as a CARSI offering.
    re: /\b(get|getting|become|becoming|be|earn(?:ing)?)\s+IICRC[\s-]*certified\b/i,
    allow: null,
    message: 'CARSI does not make you "IICRC certified" — it delivers IICRC CEC courses.',
  },
  {
    // "get IICRC certified with CARSI" (explicit CARSI attribution).
    re: /IICRC[\s-]*certif\w*\s+with\s+CARSI/i,
    allow: null,
    message: 'Do not imply CARSI grants IICRC certification.',
  },
  {
    // Bare "IICRC Accredited" (no CEC in between) — must always be "IICRC CEC
    // Accredited". Note: this naturally does NOT match "IICRC CEC Accredited"
    // itself, since "CEC" breaks the [\s-]* adjacency between IICRC and Accredited.
    re: /\bIICRC[\s-]*Accredited\b/i,
    allow: null,
    message: 'Say "IICRC CEC Accredited", never bare "IICRC Accredited" — CARSI is accredited as a CEC provider, not accredited by IICRC generally.',
  },
  {
    // "IICRC-accredited course(s)" / "IICRC accredited course(s)" (no CEC) —
    // implies IICRC accredits the course/certification itself.
    re: /\bIICRC[\s-]*accredited[\s-]+courses?\b/i,
    allow: null,
    message: 'CARSI courses are not "IICRC-accredited" — say "IICRC CEC Accredited course(s)".',
  },
  {
    // "IICRC course(s) accredited/accreditation" (reversed word order).
    re: /\bIICRC[\s-]+courses?[\s-]+accredit\w*\b/i,
    allow: null,
    message: 'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".',
  },
  {
    // "IICRC Approved School" / "IICRC Approved Instructor" as a positive claim about
    // CARSI — Schools/Instructors are a different IICRC licence class CARSI does not hold.
    // Third-person facts ("certification is obtained through an IICRC-approved school")
    // are allowed via the preposition context.
    re: /\bIICRC[\s-]+Approved[\s-]+(School|Instructor)\b/i,
    // `neutralise`, not `allow`. As a whole-line allow, one third-person mention exempted the
    // line, so "CARSI is an IICRC Approved School — certification is obtained through an
    // IICRC approved school" passed: the true second clause laundered the false first one.
    allow: null,
    neutralise: /\b(?:through|via|from|at)\s+(?:an?\s+)?IICRC[\s-]+approved\s+schools?\b/gi,
    message: 'CARSI is not an IICRC Approved School or Instructor — never claim that status (it is a separate IICRC licence class).',
  },
  {
    // Discipline-acronym branding. CLAUDE.md § "CARSI designation rule" (founder, 2026-07-10):
    // CARSI courses are NEVER branded with IICRC Registered-Training-School discipline
    // designations/acronyms (WRT/ASD/AMRT/FSRT/CCT/CRT/OCT/TCST), and never described as
    // "[discipline]-aligned". CARSI issues its own Southern Hemisphere designations.
    //
    // This rule did not exist until 2026-08-07 and the founder MUST was therefore enforced by
    // nothing. It was found live: the Career Opportunities block on public course pages rendered
    // "IICRC WRT training pathway", built by a template literal in the /api/lms catch-all so the
    // acronym never appeared in source. The guard returned 0 even on the fully literal string.
    //
    // Nominative third-person references to an IICRC certification remain legal ("FSRT is an
    // IICRC certification covering…", a student's own recert) — what is banned is an acronym
    // used to brand or frame a CARSI course.
    // "IICRC-aligned" is included alongside the discipline acronyms: it was found on the about
    // page as "IICRC-aligned course catalogue", branding CARSI's OWN catalogue against the IICRC.
    // The acronym-only form would have missed it.
    re: /\bIICRC[\s-]+(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b|\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST|IICRC)[\s-]+aligned\b/i,
    // Narrow allows, each a case CLAUDE.md explicitly permits — never a blanket bypass:
    //  1. nominative third-person fact about an IICRC certification;
    //  2. a legacy lowercase-hyphenated URL slug from the WordPress import (an identifier, not
    //     copy — rewriting these breaks live redirects);
    //  3. a PERSON's own certifications, which CLAUDE.md allows referencing third-person
    //     ("a student's own recert / member number / CEC tracking"). This allow is written as a
    //     positive match on the ONLY legitimate shape — a `certifications:` key whose value is a
    //     list of bare credential names — rather than on the key alone. A bare `\bcertifications\s*:`
    //     was a blanket bypass: any line carrying that key escaped the whole rule, so
    //     `certifications: "IICRC WRT course for CARSI students"` branded a CARSI course and still
    //     passed. Prose inside the array is not a credential name and must stay banned.
    // Written as `neutralise`, not `allow`: each span below is deleted and the rule re-tested
    // on the remainder, so a legacy slug or a credential list cannot launder branding sitting
    // next to it on the same line. /g is required — one permitted span must not exempt the rest.
    allow: null,
    neutralise:
      // Also third-person references to IICRC's OWN certification, which CLAUDE.md permits:
      // a prerequisite naming the learner's existing cert ("recommended: IICRC WRT
      // certification"), IICRC's competency framework, and a parenthesised scope note
      // ("colour repair / re-dyeing (IICRC CRT)"). None of these brands a CARSI course.
      /\b(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\s+is\s+an?\s+IICRC\s+certification\b|\bIICRC\s+(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\s+(?:certification|competency|credential)\b[^.!?]{0,40}|\(\s*IICRC\s+(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b[^)]*\)|[a-z0-9]-iicrc-(?:wrt|asd|amrt|fsrt|cct|crt|oct|tcst)\b|\bcertifications\s*:\s*\[\s*(?:['"]IICRC\s+(?:WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)['"]\s*,?\s*)+\]/gi,
    message:
      'Never brand a CARSI course with an IICRC discipline acronym or "[discipline]-aligned" — CARSI issues its own Southern Hemisphere designations (CLAUDE.md § CARSI designation rule). Nominative third-person references to an IICRC certification are still allowed.',
  },
  {
    // Discipline-acronym branding, GLOSSED-LIST form. The list rule above requires the acronyms
    // to sit next to each other with only a separator between them. Found live on
    // carsi.com.au/llms.txt (HTTP 200) in the form that breaks that assumption: each acronym is
    // parenthesised after its spelled-out discipline name, so what sits between two acronyms is
    // `), <discipline words> (` — never a bare separator, and the rule returned 0 on the whole
    // paragraph. The line branded CARSI's own offering as "IICRC Continuing Education Credit
    // (CEC) courses across disciplines: Water Restoration (WRT), … Commercial Carpet Cleaning
    // (CCT)". Requiring TWO parenthesised acronyms from the known set, within a bounded window,
    // keeps this specific to a discipline roster and off ordinary prose: measured across the
    // full scanned scope it matched that one line and nothing else.
    //
    // RRT is in this set. It is absent from every rule above, so a roster naming it was
    // unenforced — and RRT was one of the acronyms live in that paragraph.
    re: /\((?:WRT|RRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\)[^\n]{0,160}?\((?:WRT|RRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\)/i,
    allow: null,
    neutralise: null,
    message:
      'Do not publish a roster of IICRC discipline acronyms as CARSI\'s course range — CARSI courses carry CARSI Southern Hemisphere designations (CLAUDE.md § CARSI designation rule).',
  },
  {
    // Discipline-acronym branding, SECTION-HEADING form. Found live on carsi.com.au/llms.txt as
    // an "IICRC Disciplines Explained" section whose seven H3 headings were bare acronyms
    // ("### WRT — Water Restoration Technician"), each followed by a paragraph describing the
    // training. A heading names the thing beneath it, so this is the acronym used as the name of
    // a body of CARSI training — exactly what the founder MUST bans. No rule above matched:
    // there is no adjacent "IICRC", no "-aligned", and only one acronym per line.
    //
    // Deliberately anchored to a markdown heading rather than any line beginning with an
    // acronym: measured across the full scanned scope it matched those seven lines and nothing
    // else. Prose that merely opens with an acronym is left to the rules above.
    re: /^\s{0,3}#{1,6}\s*(?:WRT|RRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\b/i,
    allow: null,
    neutralise: null,
    message:
      'Do not title a section with an IICRC discipline acronym — a heading names what follows, which brands that content as an IICRC discipline (CLAUDE.md § CARSI designation rule).',
  },
  {
    // Discipline-acronym branding, PRODUCT-SURFACE form: the acronym used as the NAME of a CARSI
    // catalogue surface — "Explore CARSI CCT courses", "Browse WRT courses", "CARSI CCT course
    // pathway", "Start the CCT pathway". These are call-to-action labels and route names, so the
    // acronym IS the product name a learner sees. No rule above matched: no adjacent "IICRC", no
    // "-aligned", one acronym per line.
    //
    // Scoped by the two signals that separate branding from permitted nominative reference: the
    // CARSI brand within a short window, or a catalogue call-to-action verb. Deliberately does
    // NOT match third-person description of the discipline itself — "CRT (Carpet Cleaning
    // Technician) is an IICRC certification covering…" and "What is WRT training and how does it
    // help a plumbing business?" both stay legal, because CLAUDE.md permits nominative reference.
    // Measured: the unscoped form ("<acronym> course|training|pathway" anywhere) matched 24
    // lines, of which the majority were those permitted third-person descriptions; this scoped
    // form matched 7, every one of them a CARSI product label.
    re: /(?:\bCARSI\b[^\n]{0,30}|\b(?:explore|browse|start(?:\s+the)?|enrol\s+in|view|our)\s+(?:the\s+)?)(?:WRT|RRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST)\s+(?:course|courses|pathway|pathways|training)\b/i,
    allow: null,
    neutralise: null,
    message:
      'Do not name a CARSI course, pathway or CTA with an IICRC discipline acronym — use the topic ("carpet cleaning") or the CARSI designation (CLAUDE.md § CARSI designation rule).',
  },
  {
    // Endorsement claims. The IICRC states it "does not promote any particular
    // educational provider" — endorsement/partnership/promotion claims are banned.
    re: /endorsed[\s-]+by[\s-]+(the[\s-]+)?IICRC/i,
    allow: null,
    message: 'The IICRC does not endorse providers — never claim IICRC endorsement.',
  },
  {
    re: /IICRC[\s-]+endorsed/i,
    allow: null,
    message: 'The IICRC does not endorse providers — never claim "IICRC endorsed".',
  },
  {
    re: /IICRC[\s-]+partner(ship)?/i,
    allow: null,
    message: 'CARSI is an approved CEC provider, not an IICRC partner — never claim an IICRC partnership.',
  },
  {
    re: /promoted[\s-]+by[\s-]+(the[\s-]+)?IICRC/i,
    allow: null,
    message: 'The IICRC does not promote any particular educational provider — never claim IICRC promotion.',
  },
  {
    // CARSI designation rule (founder 2026-07-10): IICRC discipline designations are
    // Registered-Training-School marks — a CARSI course may not be branded as
    // "[discipline]-aligned". Use the CARSI Southern Hemisphere designation instead.
    // Nominative S-standards ("ANSI/IICRC S500") are NOT "-aligned" so are untouched.
    re: /\b(WRT|ASD|AMRT|FSRT|CCT|TCST|S\d{3})[\s-]*aligned\b/i,
    allow: null,
    message:
      'CARSI courses are not "[discipline]-aligned" — brand them with their CARSI Southern Hemisphere designation (e.g. "CARSI Water Restoration Practitioner"). Reference IICRC S-standards nominatively only.',
  },
  {
    // Seed course data must not store an IICRC school-designation acronym as the
    // course discipline — CARSI courses carry CARSI designations (iicrcDiscipline: null).
    re: /"iicrcDiscipline"\s*:\s*"(WRT|ASD|AMRT|FSRT|CCT|TCST|S\d{3})"/i,
    allow: null,
    seedOnly: true,
    message:
      'iicrcDiscipline must be null — a CARSI course does not carry an IICRC discipline designation. Set the CARSI designation in meta.designation instead.',
  },
  {
    // Founder brand-exclusion rule (2026-07-09): COACH8 must never appear in any CARSI
    // copy or content surface (see src/lib/calendar/event-exclusions.ts for the calendar
    // enforcement of the same rule).
    re: /\bCOACH[\s-]?8\b/i,
    allow: null,
    message: 'COACH8 is excluded from all CARSI surfaces (founder brand-exclusion rule) — remove it.',
  },
];

// Only these source-copy extensions carry public/marketing/in-app strings.
const COPY_EXT = /\.(tsx?|jsx?|mdx?)$/;

// Customer-facing surfaces the guard scans. Application/site copy (app, src,
// templates) plus customer-facing marketing collateral (docs/marketing). The
// broader docs/ tree (internal engineering specs, planning) is out of scope —
// it uses technical phrasings like "non-IICRC courses" that are not selling copy.
// docs/course-content/ carries AUTHORED COURSE COPY that ships to students. It was out of
// scope until 2026-08-07, when a blanket rewrite stamped "IICRC CEC Accredited" onto the CCW
// truckmount workshop — a deliberately NON-IICRC course, and the exact incident CLAUDE.md
// cites as the reason CEC framing was made fail-closed. The self-test calls scanText()
// directly and so bypasses inScope(), which is why it stayed green over an unscanned tree.
const SCANNED_DIRS = [
  'app/',
  'src/',
  'templates/',
  'docs/marketing/',
  'docs/course-content/',
  'docs/content/',
];

// Seed JSON is production copy (course descriptions, marketing prose) that ships to the
// live DB via the PRE_DEPLOY seeder — scan it too (gap closed 2026-07-09).
const JSON_SCANNED_DIRS = ['data/seed/', '.curation/', 'data/wordpress-export/'];

// Static files served verbatim from the site root. These are the surfaces AI engines read
// and quote — llms.txt and the citation packs exist specifically to be cited — so banned
// branding here is published copy, not internal notes. They were out of scope until
// 2026-08-07, when `IICRC-aligned` was found live on carsi.com.au/llms.txt (HTTP 200) and
// on both citation packs while this guard reported green. Their extensions (.txt, .json)
// are not in COPY_EXT, so directory scope alone would not have caught them.
const PUBLIC_COPY_EXT = /\.(txt|json|md|mdx)$/;
const PUBLIC_SCANNED_DIRS = ['public/'];

function inScope(file) {
  const norm = file.replace(/\\/g, '/');
  if (COPY_EXT.test(norm) && SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  if (norm.endsWith('.json') && JSON_SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  if (PUBLIC_COPY_EXT.test(norm) && PUBLIC_SCANNED_DIRS.some((d) => norm.startsWith(d))) return true;
  return false;
}

/** Files intentionally exempt: this guard, the rule docs, and skill/spec text
 *  that legitimately quote the banned phrases in order to forbid them. */
const EXEMPT = [
  'scripts/check-iicrc-terminology.mjs',
  'CLAUDE.md',
  'skills/context/project-context.skill.md',
  // The course-asset-kit engine's banned-phrase scanner mirrors this guard's
  // regexes and messages, and its tests use the banned phrases as fixtures to
  // prove the scan fires — same rationale as exempting this guard itself.
  'src/lib/course-kit/iicrc-phrases.ts',
  'src/lib/course-kit/iicrc-phrases.test.ts',
  'src/lib/course-kit/scaffold.test.ts',
  // The calendar exclusion module + test enforce the COACH8 brand-exclusion rule and
  // legitimately name the excluded brand (same rationale as the phrase catalogue above).
  'src/lib/calendar/event-exclusions.ts',
  'src/lib/calendar/event-exclusions.test.ts',
];

function isExempt(file) {
  const norm = file.replace(/\\/g, '/');
  return EXEMPT.some((e) => norm === e || norm.endsWith('/' + e));
}

/**
 * Exported so scripts/check-iicrc-terminology.test.mjs can prove each rule FIRES, without those
 * banned phrasings having to exist in the repository. A licence guard whose non-vacuity is only
 * ever demonstrated by hand is one refactor away from being decorative.
 */
export function scanText(file, content) {
  const findings = [];
  scanLine(file, 1, content, findings);
  return findings;
}

function scanLine(file, lineNo, content, findings) {
  const norm = file.replace(/\\/g, '/');
  for (const rule of BANNED) {
    if (rule.seedOnly && !norm.startsWith('data/seed/')) continue;
    // `allow` exempts the whole LINE, so any line carrying both a violation and an allow
    // token escapes — `title: "IICRC WRT course", slug: "x-iicrc-wrt"` passed on the slug
    // alone. `neutralise` is the stricter form: it deletes the permitted spans and re-tests
    // what is LEFT, so a legitimate token can no longer shelter branding beside it.
    const probe = rule.neutralise ? content.replace(rule.neutralise, ' ') : content;
    if (rule.re.test(probe) && !(rule.allow && rule.allow.test(content))) {
      findings.push(`  ${file}:${lineNo}: ${rule.message}\n    → ${content.trim().slice(0, 140)}`);
    }
  }
}

// CLI only. Importing this module for the self-test must not run the scan or exit the process.
//
// Build the comparison with pathToFileURL, never `file://` + the raw path. String-concatenating
// leaves the path unencoded, so any character needing percent-encoding makes the comparison
// false and this guard silently no-ops: the scan still runs and findings still accumulate, but
// the reporting block below is skipped and the process exits 0. A repository checked out under
// a path containing a space (e.g. `/Volumes/Storage Unit/CARSI`) reproduced exactly that — a
// staged file carrying an explicitly-banned phrase produced no output and exit 0. CI paths have
// no space, so CI was unaffected and its green history is real. This repo wires no pre-commit
// hook either — lint-staged runs only eslint and prettier — so the damage landed exactly on the
// manual `npm run check:iicrc-terminology` used to self-certify a change before pushing it. A
// check that cannot go red is worse than no check, because it is quoted as evidence.
const isCli = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
const staged = process.argv.includes('--staged');
const findings = [];

if (staged) {
  // Pre-commit: scan STAGED additions only, no context lines (matches check-secrets).
  let diff = '';
  try {
    diff = execSync('git diff --cached --no-color -U0', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error('check-iicrc-terminology: failed to read staged diff:', err.message);
    process.exit(1);
  }
  let currentFile = null;
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      lineNo = parseInt(hunk[1], 10);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (!currentFile || !inScope(currentFile) || isExempt(currentFile)) continue;
    scanLine(currentFile, lineNo, line.slice(1), findings);
    lineNo++;
  }
} else {
  // CI / manual: scan all tracked source-copy files.
  let list = '';
  try {
    list = execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    console.error('check-iicrc-terminology: failed to list tracked files:', err.message);
    process.exit(1);
  }
  const files = list
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && inScope(f) && !isExempt(f));
  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      scanLine(file, i + 1, lines[i], findings);
    }
  }
}

if (isCli) {
  if (findings.length > 0) {
    console.error('\n✖ IICRC CEC terminology guard failed (Linear GP-451)\n');
    console.error('CARSI sells IICRC *CEC courses*, not IICRC certification. Fix these:\n');
    console.error(findings.join('\n'));
    console.error(
      '\nSee CLAUDE.md § "IICRC CEC terminology". Use "IICRC CEC course(s)" and never imply' +
        '\nCARSI delivers IICRC certification. Verified false positive? git commit --no-verify\n'
    );
    process.exit(1);
  }

  console.log('✓ IICRC CEC terminology guard passed.');
  process.exit(0);
}
