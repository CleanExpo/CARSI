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
import ts from 'typescript';
import { isEntryPoint } from './lib/is-entry-point.mjs';

import { IICRC_CODE_ALT } from './iicrc-codes.mjs';

/**
 * IICRC discipline designations spelled out, as a regex alternation.
 * "Applied Structural Drying" and "Applied Microbial Remediation" carry no trailing
 * "Technician" because the discipline name alone is the designation; the rest are only the
 * designation WITH "Technician", since "water damage restoration" alone is ordinary topic wording.
 *
 * `sep` is what may sit between the words. Spaces only by default; the course-title shape passes
 * TITLE_WORD_SEP because "Applied-Structural-Drying — Core Concepts" and the en-dash form
 * "Applied–Structural–Drying" are the same title (independent review, 06/10/2026, reproduced
 * both bypasses). \s already covers the no-break space.
 */
// A string join (`'Applied ' + 'Structural Drying'`) separates words as well as whitespace does.
const TITLE_WORD_SEP = '(?:[\\s_\\-\\u2010-\\u2015\\u2212]|["\'`]\\s*\\+\\s*["\'`])+';

function designationNames(sep = '\\s+') {
  const and = `(?:and|&)`;
  const w = (...words) => words.join(sep);
  return (
    `(?:${w('applied', 'structural', 'drying')}|${w('applied', 'microbial', 'remediation')}` +
    `|water(?:${sep}damage)?${sep}${w('restoration', 'technicians?')}` +
    `|${w('fire', and, 'smoke', 'restoration', 'technicians?')}` +
    `|(?:commercial${sep})?${w('carpet', 'cleaning', 'technicians?')}` +
    `|${w('odou?r', 'control', 'technicians?')}` +
    `|${w('trauma', and, 'crime', 'scene', 'technicians?')}` +
    `|${w('carpet', 'repair', and, 'reinstallation', 'technicians?')}` +
    `|${w('upholstery', and, 'fabric', 'cleaning', 'technicians?')})`
  );
}

/**
 * Exact registry titles that contain a designation name, as a global neutralise regex.
 *
 * Only the approved title AS THE WHOLE QUOTED VALUE is exempt, optionally followed by " | CARSI"
 * suffixes that also end the value. Independent review (06/10/2026, two rounds) showed that any
 * looser anchoring erased the approved title inside a different one — "… Drying Masterclass",
 * "… Drying course Masterclass" and "… Drying | CARSI Masterclass" all passed. A value joined to
 * another string with `+` is not a whole value either (round 4: 'Introduction to …' + ' Masterclass').
 */
function registryTitlesCarryingDesignations() {
  const registry = JSON.parse(
    readFileSync(new URL('../data/seed/cec-approvals.json', import.meta.url), 'utf8')
  );
  const designation = new RegExp(designationNames(), 'i');
  const titles = registry.approvals
    .map((a) => a.title)
    .filter((t) => typeof t === 'string' && designation.test(t));
  if (titles.length === 0) return null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?<!\\+\\s*["'\`])(?<=["'\`])(?:${titles.map(esc).join('|')})(?=(?:\\s*\\|\\s*CARSI)*["'\`](?!\\s*\\+))`,
    'gi'
  );
}

/**
 * GP-654: the ONLY sentences exempt from the catalogue rule — learner-data shapes matched end to
 * end. Three review rounds each found selling copy that a list of catalogue words missed ("at your
 * pace", 395315bc; "Boost your IICRC disciplines with expert-led tuition", fd1890a8), so nothing
 * outside these shapes is exempt, comments included (JSX text renders a "//"):
 *  - a question asking which disciplines the learner holds or must renew;
 *  - a form prompt asking the learner to select the disciplines they hold.
 * Leading property keys or a quote ("question: '…") and trailing punctuation are tolerated.
 */
// Leading object-literal keys, each with an optional short value that never mentions IICRC
// ("kind: 'multi', question: '"), so a claim cannot ride in front of an exempt question.
const LEAD =
  String.raw`^(?:[^A-Za-z]*[A-Za-z_]\w*\s*:\s*(?:['"` +
  '`' +
  String.raw`](?:(?!IICRC)[^'"` +
  '`' +
  String.raw`\n]){0,40}['"` +
  '`' +
  String.raw`]\s*,\s*)?){0,3}[^A-Za-z]*`;
// Spaces and ?.! are themselves non-letters; one quantifier keeps the anchored tail linear.
const TAIL = String.raw`[^A-Za-z]*$`;
const HOLD = String.raw`(?:hold|have|currently\s+hold|maintain|renew)(?:\s+or\s+plan\s+to\s+work\s+in)?`;
const LEARNER_DATA_SENTENCE = [
  String.raw`(?:which|what)\s+IICRC\s+disciplines\s+do\s+you\s+${HOLD}`,
  String.raw`which\s+of\s+(?:your|their)\s+(?:[\w-]+\s+)?IICRC\s+disciplines\s+(?:needs?\s+renewal|are\s+(?:due|expiring|current))`,
  String.raw`(?:select|choose|tick|pick|enter|add|list|update)\s+(?:all\s+)?(?:of\s+)?(?:the\s+)?(?:your\s+)?IICRC\s+disciplines\s+(?:(?:that|which)\s+)?you\s+${HOLD}`,
].map((body) => new RegExp(LEAD + body + TAIL, 'i'));
/** Something other than plain whitespace between "IICRC" and "disciplines": `{…}` or `&…;`. */
const SEP = String.raw`(?:\{[^{}\n]{0,60}\}|\$\{[^{}\n]{0,60}\}|&[#\w]{1,30};)`;
/**
 * Whitespace that renders as a space: JSX `{" "}` / `{' '}` expressions, HTML space
 * entities, and the no-break / thin / zero-width characters (review of 395315bc).
 */
const RENDERED_SPACE = new RegExp(
  String.raw`\{\s*(["'` +
    '`' +
    String.raw`])(?:\s|\\[tnr]|\\u00(?:20|09|0a|a0)|\\x(?:20|09|0a|a0)|\\u\{0*(?:20|9|a|a0)\}|\\u2009|\\u202f|&(?:nbsp|Tab|NewLine|#0*(?:9|10|32|160)|#x0*(?:9|a|20|a0));)*\1\s*\}` +
    String.raw`|&(?:nbsp|ensp|emsp|thinsp|hairsp|numsp|puncsp|NonBreakingSpace|Tab|NewLine|ThinSpace|MediumSpace|VeryThinSpace|#0*(?:9|10|13|32|160|8194|8195|8201|8239)|#x0*(?:9|a|d|20|a0|2002|2003|2009|202f));` +
    String.raw`|[  -   　]`,
  'gi'
);
const ZERO_WIDTH = /[​-‍⁠﻿­]|&(?:shy|ZeroWidthSpace|#0*(?:173|8203)|#x0*(?:ad|200b));/gi;
/** A numeric entity for a letter (`IICR&#67;`) renders as that letter. */
const LETTER_ENTITY = /&#(?:x0*([0-9a-f]{1,4})|0*(\d{1,5}));/gi;
/** A quoted literal in a JSX expression (`IICRC{' disciplines'}`) renders as its text. */
const JSX_LITERAL = /\{\s*(['"`])([^'"`{}\n$\\]{0,80})\1\s*\}/g;
/**
 * Quoted pieces joined with `+` (`'7 IICRC ' + 'disciplines'`) render as one string, with or
 * without a comment beside the `+` (review of d42d3e99).
 */
const JOIN_COMMENT =
  String.raw`(?:\/\*[^*]{0,120}\*\/|\/\/[^\n'"` + '`' + String.raw`]{0,120})?\s*`;
const STRING_JOIN = new RegExp(
  String.raw`(['"` +
    '`' +
    String.raw`])\s*` +
    JOIN_COMMENT +
    String.raw`\+\s*` +
    JOIN_COMMENT +
    String.raw`(['"` +
    '`' +
    '])',
  'g'
);
/**
 * An element tag with its attributes (a long Tailwind className included), or a fragment
 * `<>` / `</>` (review of d42d3e99). `[^<>]` keeps it linear.
 */
const MARKUP = /<\/?(?:[A-Za-z][^<>]{0,600})?>/g;

/**
 * The text a line renders, as two views: markup read as a break, and markup read as nothing
 * (`disci<span>plines</span>`; review of d28bbcc0). Callers join them with a NUL, which no rule
 * matches across.
 */
function renderedViews(line) {
  const text = line
    // Markdown emphasis renders as nothing (`Which **IICRC disciplines** do you hold?`).
    .replace(/\*{1,3}/g, '')
    .replace(ZERO_WIDTH, '')
    .replace(RENDERED_SPACE, ' ')
    .replace(LETTER_ENTITY, (m, hex, dec) => {
      const ch = String.fromCodePoint(hex ? parseInt(hex, 16) : Number(dec));
      return /^[A-Za-z]$/.test(ch) ? ch : m;
    })
    .replace(JSX_LITERAL, '$2')
    .replace(STRING_JOIN, '');
  return [text.replace(MARKUP, ' '), text.replace(MARKUP, '')];
}

// Banned selling/descriptive phrasings. Each must be something that implies
// CARSI itself delivers IICRC courses or IICRC certification.
/** Every rule; code-bearing rules are built from `codes` (the shared list by default). */
export function bannedRules(CODES = IICRC_CODE_ALT) {
  return [
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
      re: new RegExp(
        String.raw`\b(${CODES})\b\s*(?:,|&|\+|,?\s+and\s+|\s*\/\s*)\s*\b(${CODES})\b`,
        'i'
      ),
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
        new RegExp(
          String.raw`\be\.g\.[^*]{0,60}?(?=\)|\*\/)|[^\n]{0,120}\bnever\s+(?:call|brand|use|say)\b[^\n]{0,120}|[^\n]{0,120}\bdoes\s+not\s+brand\b[^\n]{0,120}|[^\n]{0,120}\bnot\s+by\s+(?:${CODES})[/,][^\n]{0,120}|\b(?:${CODES})\b[^.!?]{0,40}?\b(?:required|held|sought|requested)\s+by\b|\b(?:code|codes|certifications?)\b[^.!?(]{0,30}\([^)]*\)|\bIICRC\s+Discipline:[^\`]{0,60}|\**\b(?:${CODES})(?:\s*\+\s*(?:${CODES}))+\**\s+techs?\b`,
          'gi'
        ),
      message:
        'Do not list IICRC discipline acronyms — a CARSI course carries its CARSI Southern Hemisphere designation. Reference at most one IICRC certification, third-person.',
    },
    {
      // A SINGLE IICRC discipline acronym naming training: "WRT training", "Most WRT courses take
      // 8–12 hours", "Explore CARSI CCT courses", "the CCT pathway", "CRT (Carpet Restoration)
      // training". Found live 18/10/2026 in industry FAQ JSON-LD (plumbing-trades, caravan-parks,
      // museums, NDIS, emergency-management) and on start-smart / customer-journey CTAs. None was
      // caught: the list rule above needs two acronyms, and the designation rule below needs an
      // adjacent "IICRC" or "-aligned". CARSI courses carry CARSI designations (CLAUDE.md §
      // CARSI designation rule), so an acronym directly naming a course, training, program,
      // pathway, module or class is branding. A third-person fact about the certification itself
      // ("FSRT is an IICRC certification covering…") names no training and stays allowed.
      // Case-insensitive ("Wrt training", "wrt training"), across hyphen, en and em dashes, colon,
      // slash and comma ("WRT: training", "WRT/course", "ASD, training"; review of d25ce440), with a
      // possessive ("WRT's training"), and — via `crossLine` in scanFile — across a line break
      // inside a file (review 18/10/2026). OCT stays upper-case only: "Oct" is October, and
      // "Oct training day" is a date, so mixed/lower-case "oct" is neutralised first.
      // Out of scope here, by design: JSX text split across elements, string concatenation, HTML
      // entities and zero-width characters — the rendered-text scan on feat/designations-live
      // covers those, rather than more source regex.
      // Up to TWO course modifiers from a CLOSED list may sit between the code and the offering
      // ("Enrol in WRT online training", "ASD practical training module"; review of 47921544). No
      // open wildcard: "WRT holders completing training" names the certification, not an offering.
      re: new RegExp(
        String.raw`\b(?:${CODES})(?:['’]s)?\b(?:\s*\([^)\n]{0,60}\))?(?:\s*[:/,]\s*|[\s\-\u2013\u2014])+(?:(?:online|practical|refresher|intro|introductory|advanced|foundations?|essentials|basics|short|self-paced|accelerated|hands-on|on-site|onsite|CEC|live|virtual|fundamentals)(?:\s*[:/,]\s*|[\s\-\u2013\u2014])+){0,2}(?:courses?|training|program(?:me)?s?|pathways?|modules?|class(?:es)?)\b`,
        'i'
      ),
      allow: null,
      crossLine: true,
      // Public surfaces only (app/, src/, public/, data/): docs/ marketing and campaign plans are
      // reviewed on fix/marketing-docs-licence and stay covered by check:iicrc-compliance as on main.
      skipDocs: true,
      // Lines that exist to FORBID the construction ("never call it a WRT course") are exempt only
      // up to the end of THAT sentence, so "Never call it a WRT course. Book ASD training today."
      // still fires on the second sentence. Also exempt: the IICRC's own course in the possessive,
      // and a non-upper-case "oct" (the month).
      neutralise:
        /[^.!?\n]{0,120}\b[Nn][Ee][Vv][Ee][Rr]\s+(?:call|brand|use|say|name)\b[^.!?\n]{0,120}|\bIICRC['’]s\s+[A-Za-z]{3,4}\b|\b(?!OCT\b)[Oo][Cc][Tt]\b/g,
      message:
        'Do not name a course, training, program or pathway with an IICRC discipline acronym ("WRT training", "CCT courses") — CARSI courses carry CARSI Southern Hemisphere designations. Name the subject in plain English instead.',
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
      neutralise:
        /\bIICRC[^.!?]{0,40}?training\s+at\s+(?:IICRC[\s-]+)?approved\s+schools?|\bIICRC[\s-]+Registered-Training-School\b|\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)\w*(?:[\s-]+\w+){0,3}[\s-]+training\b|\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)/gi,
      message:
        'CARSI does not deliver "IICRC training" — say "IICRC CEC course(s)". IICRC training comes from an IICRC-approved school.',
    },
    {
      // The CARSI catalogue measured in IICRC disciplines (GP-654). Found live 20/10/2026 on the
      // homepage FAQ and FAQPage schema ("80 published courses across 7 IICRC disciplines"), the
      // certifications lead ("training that spans 7 IICRC disciplines"), the homepage and about
      // stats ("IICRC Disciplines") and the share image. None was caught: no rule above keys on
      // the words "IICRC discipline". A count, a quantity word or a coverage verb in front of it,
      // or a stat label made of it, describes what CARSI teaches. The learner's own disciplines
      // ("Which IICRC disciplines do you hold?") and admin data labels carry none of those.
      //
      // Fail-closed by design. Two review rounds (6edff7f0, 3aec1af2) each found new spellings
      // of a coverage claim — reversed order, markup between the words, "all of your", three
      // lines of JSX — so this rule does not try to recognise claims. The plural phrase is
      // banned outright on every scanned surface. The only exemption is a whole sentence in one
      // of the LEARNER_DATA_SENTENCE shapes (a question or form prompt about the disciplines the
      // learner holds); anything else, rephrase as "restoration disciplines". Earlier exemptions
      // keyed on "you"/"your" plus a list of selling words, and reviews kept finding selling copy
      // outside the list (395315bc, fd1890a8).
      // A count in front of the singular ("7 IICRC discipline${s}") and a stat label are also
      // banned. Zero-width characters are removed, rendered whitespace (`{" "}`, `{" "}`,
      // `&nbsp;`, `&Tab;`) becomes a space, letter entities and quoted JSX literals become their
      // text, `'…' + '…'` joins, markup is read both as a break and as nothing, and up to six
      // lines are read as one (renderedViews). Any other `{…}` expression or `&…;` entity between "IICRC" and "disciplines" is
      // banned without trying to work out what it renders.
      re: new RegExp(
        String.raw`\bIICRC\s+disciplines\b` +
          // Any separator other than plain whitespace, singular or plural; one way to parse it,
          // so it stays linear (review of 17342ea9: the counted singular took `{x}` and `{"s"}`).
          String.raw`|\bIICRC\s*(?:${SEP}\s*)+disciplines?\b` +
          // The singular with a computed ending ("discipline{s}", "discipline${s}").
          String.raw`|\bIICRC\s+discipline(?:\{|\$\{)` +
          String.raw`|(?<![\w.])(?:\d{1,3}\+?|\$\{[^}\n]{1,40}\}|\{[^}\n]{1,40}\})(?:\s|${SEP}){1,8}IICRC\s+discipline\b` +
          String.raw`|\blabel\s*:\s*['"` +
          '`' +
          String.raw`]IICRC\s+disciplines?['"` +
          '`' +
          ']',
        'i'
      ),
      allow: null,
      // Six lines: a JSX text run with a `{" "}` and inline elements spreads one phrase over
      // five (review of d28bbcc0).
      crossLine: 6,
      // Also checked against the text each JSX tree, string join and Markdown paragraph renders
      // (renderedRuns): markup, attributes, comments and emphasis are gone there by construction
      // (review of 723bdce5).
      rendered: true,
      prepare: (line) =>
        renderedViews(line)
          .map((view) =>
            view
              .split(/(?<=[.!?])\s+/)
              // trimEnd: the shapes end in an anchored tail that is quadratic on trailing
              // whitespace (review of 723bdce5, P2).
              .filter((s) => !LEARNER_DATA_SENTENCE.some((shape) => shape.test(s.trimEnd())))
              .join(' ')
          )
          .join(' \u0000 '),
      message:
        'Do not measure the CARSI catalogue in IICRC disciplines ("across 7 IICRC disciplines", "IICRC Disciplines" stat) — say "restoration disciplines" or name the topics. A learner\'s own IICRC disciplines may still be referenced.',
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
        "Do not claim a CARSI course earns/awards IICRC CECs — that requires per-course IICRC approval recorded in data/seed/cec-approvals.json (currently the SSOT gates every claim). State CARSI's provider standing instead.",
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
      neutralise:
        /\bIICRC[\s-]+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)\w*(?:[\s-]+(?:Accredited|courses?))?/gi,
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
      message:
        'Say "IICRC CEC Accredited", never bare "IICRC Accredited" — CARSI is accredited as a CEC provider, not accredited by IICRC generally.',
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
      message:
        'Do not imply IICRC accredits CARSI\'s courses — say "IICRC CEC Accredited course(s)".',
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
      message:
        'CARSI is not an IICRC Approved School or Instructor — never claim that status (it is a separate IICRC licence class).',
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
      re: new RegExp(String.raw`\bIICRC[\s-]+(${CODES})\b|\b(${CODES}|IICRC)[\s-]+aligned\b`, 'i'),
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
        new RegExp(
          String.raw`\b(?:${CODES})\s+is\s+an?\s+IICRC\s+certification\b|\bIICRC\s+(?:${CODES})\s+(?:certification|competency|credential)\b[^.!?]{0,40}|\(\s*IICRC\s+(?:${CODES})\b[^)]*\)|[a-z0-9]-iicrc-(?:${CODES})\b|\bcertifications\s*:\s*\[\s*(?:['"]IICRC\s+(?:${CODES})['"]\s*,?\s*)+\]`,
          'gi'
        ),
      message:
        'Never brand a CARSI course with an IICRC discipline acronym or "[discipline]-aligned" — CARSI issues its own Southern Hemisphere designations (CLAUDE.md § CARSI designation rule). Nominative third-person references to an IICRC certification are still allowed.',
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
      message:
        'CARSI is an approved CEC provider, not an IICRC partner — never claim an IICRC partnership.',
    },
    {
      re: /promoted[\s-]+by[\s-]+(the[\s-]+)?IICRC/i,
      allow: null,
      message:
        'The IICRC does not promote any particular educational provider — never claim IICRC promotion.',
    },
    {
      // CARSI designation rule (founder 2026-07-10): IICRC discipline designations are
      // Registered-Training-School marks — a CARSI course may not be branded as
      // "[discipline]-aligned". Use the CARSI Southern Hemisphere designation instead.
      // Nominative S-standards ("ANSI/IICRC S500") are NOT "-aligned" so are untouched.
      re: new RegExp(String.raw`\b(${CODES}|S\d{3})[\s-]*aligned\b`, 'i'),
      allow: null,
      message:
        'CARSI courses are not "[discipline]-aligned" — brand them with their CARSI Southern Hemisphere designation (e.g. "CARSI Water Restoration Practitioner"). Reference IICRC S-standards nominatively only.',
    },
    {
      // Seed course data must not store an IICRC school-designation acronym as the
      // course discipline — CARSI courses carry CARSI designations (iicrcDiscipline: null).
      re: new RegExp(String.raw`"iicrcDiscipline"\s*:\s*"(${CODES}|S\d{3})"`, 'i'),
      allow: null,
      seedOnly: true,
      message:
        'iicrcDiscipline must be null — a CARSI course does not carry an IICRC discipline designation. Set the CARSI designation in meta.designation instead.',
    },
    {
      // The IICRC discipline designation written out IN FULL, used to name a course. Every rule
      // above keys on the ACRONYM, so "Applied Structural Drying — Core Concepts" shipped as a
      // live course title (06/10/2026) with no guard able to see it: the designation name with
      // the acronym removed is still the designation. Two shapes count as naming a course:
      //  - the phrase inside a `title` value (TS `title: '…'` or JSON `"title": "…"`), including a
      //    value built from quoted pieces joined with `+` (review round 4);
      //  - the phrase directly followed by a course noun ("… Fundamentals", "… — Core", "… course").
      // Spaces only between words, deliberately: a hyphenated slug is the URL, which the live
      // catalogue guard audits, and a slug in a JSON key is not rendered copy.
      // Audience usage ("for water damage restoration technicians") matches neither shape and
      // stays allowed, as does a third-person reference to the IICRC certification itself.
      re: new RegExp(
        `\\btitle["']?\\s*[:=]\\s*(?:["'\`][^"'\`\\n]*["'\`]\\s*\\+\\s*)*["'\`][^"'\`\\n]*\\b${designationNames(TITLE_WORD_SEP)}|\\b${designationNames(TITLE_WORD_SEP)}\\b(?:\\s*[—–:]\\s*|\\s+-\\s*|\\s+)(?:core|essentials|fundamentals|basics|course|courses|training|class|classes|module|modules|program|programme|workshop|masterclass)\\b`,
        'i'
      ),
      allow: null,
      // The IICRC itself titled some approved CEC classes with a discipline name ("Introduction to
      // Applied Structural Drying"). Those exact registry titles are the IICRC's own wording, so
      // they are neutralised by VALUE, read from data/seed/cec-approvals.json — never by shape.
      neutralise: registryTitlesCarryingDesignations(),
      // An inline block comment inside a joined title is not part of the value:
      // 'Introduction to Applied Structural Drying' /* x */ + ' Masterclass' (review round 5).
      prepare: (line) => line.replace(/\/\*.*?\*\//g, ''),
      message:
        'Do not name a CARSI course with an IICRC discipline designation written out in full (e.g. "Applied Structural Drying", "Carpet Cleaning Technician") — name the topic, or use the CARSI "…Practitioner" designation. Exact IICRC-approved CEC class titles in data/seed/cec-approvals.json are exempt.',
    },
    {
      // Founder brand-exclusion rule (2026-07-09): COACH8 must never appear in any CARSI
      // copy or content surface (see src/lib/calendar/event-exclusions.ts for the calendar
      // enforcement of the same rule).
      re: /\bCOACH[\s-]?8\b/i,
      allow: null,
      message:
        'COACH8 is excluded from all CARSI surfaces (founder brand-exclusion rule) — remove it.',
    },
  ];
}

const BANNED = bannedRules();

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
// data/seo/ holds the SEO course cards, whose copy the course page renders into page
// metadata and FAQPage JSON-LD. That is published, citable copy in exactly the sense
// that made public/ in-scope on 2026-08-07, so banned branding here would ship live.
const JSON_SCANNED_DIRS = ['data/seed/', '.curation/', 'data/wordpress-export/', 'data/seo/'];

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
  if (PUBLIC_COPY_EXT.test(norm) && PUBLIC_SCANNED_DIRS.some((d) => norm.startsWith(d)))
    return true;
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
export function scanText(file, content, rules = BANNED) {
  const findings = [];
  scanLine(file, 1, content, findings, rules);
  return findings;
}

// JSON is parsed too, so its strings are read as their decoded value (`"IICRC\ndisciplines"`
// in data/seo, review of 190018fe).
const SCRIPT_KIND = {
  '.tsx': 'TSX',
  '.jsx': 'JSX',
  '.ts': 'TS',
  '.js': 'JS',
  '.mjs': 'JS',
  '.json': 'JSON',
};

/**
 * The text a file renders, as runs with their line numbers, built from the parsed source rather
 * than from lines (review of 723bdce5: a regex over source lines kept losing to ordinary
 * attributes, comments and emphasis):
 *  - each outermost JSX element or fragment, and each one passed as a prop: its text children,
 *    string-literal expressions and nested elements' text, in order, once per way its
 *    conditionals can render. String attributes and comments are never part of it. Any other
 *    expression reads as `{x}`, so "{count} IICRC disciplines" is still a count.
 *    Each tree is read twice: as React renders it (JSX text whitespace trimmed at line breaks,
 *    character references decoded) and with every line break as a space.
 *  - each outermost `+` join of quoted strings, with comments gone, once per conditional branch.
 *  - in Markdown, each paragraph with emphasis, code ticks and link targets removed.
 * Every file is parsed: a substring prefilter missed a word split across elements (review of
 * 818f619e), and parsing the whole repository takes under a second.
 */
export function renderedRuns(file, text) {
  const ext = (file.match(/\.[a-z]+$/i)?.[0] ?? '').toLowerCase();
  if (ext === '.md' || ext === '.mdx') {
    const runs = [];
    let start = 0;
    const lines = text.split('\n');
    for (let i = 0; i <= lines.length; i++) {
      if (i === lines.length || lines[i].trim() === '') {
        const para = lines.slice(start, i).join(' ');
        if (para.trim()) {
          runs.push({
            line: start + 1,
            text: para
              .replace(/\[([^\]\n]{0,200})\]\([^)\n]{0,400}\)/g, '$1')
              .replace(/[*_`~]+/g, ''),
          });
        }
        start = i + 1;
      }
    }
    return runs;
  }
  const kind = SCRIPT_KIND[ext];
  if (!kind) return [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind[kind]);
  const runs = [];
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const isJsx = (n) => ts.isJsxElement(n) || ts.isJsxFragment(n) || ts.isJsxSelfClosingElement(n);
  // Type-only wrappers erase at compile time: `('disciplines' as const)` renders its literal
  // (review of 190018fe), so they read as parentheses do.
  const isWrap = (n) =>
    ts.isParenthesizedExpression(n) ||
    ts.isAsExpression(n) ||
    ts.isTypeAssertionExpression(n) ||
    ts.isSatisfiesExpression(n) ||
    ts.isNonNullExpression(n);
  const isPlus = (n) =>
    ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken;

  const opOf = (n) => (ts.isBinaryExpression(n) ? n.operatorToken.kind : null);
  const isChoice = (n) =>
    ts.isConditionalExpression(n) ||
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(opOf(n));

  // A piece of copy is the set of texts it can render (review of 0bb32ada: `{open ? 'disciplines'
  // : 'topics'}` read as one opaque `{x}`). Each branch of `?:`, `||` and `??` is one
  // alternative, `&&` adds the empty render, and a branch that is not authored text reads as
  // `{x}`. The source-line rules still see the raw `{…}`, so nothing they caught is lost.
  // Sets are joined pairwise and capped at ALT_CAP: past it, every full text is checked as its
  // own run first, then each keeps only its two ends (400, 200, then 100 characters; a match
  // across the cut already fired), and a set still over the cap fails closed (`overflow`).
  const ALT_CAP = 256;
  let root = null;
  // Every rule reads a whitespace run as one space, so texts that differ only in whitespace (an
  // empty `&&` beside an `<Icon />`) are one alternative.
  const cross = (a, b) => {
    const out = [...new Set(a.flatMap((x) => b.map((y) => (x + y).replace(/\s+/g, ' '))))];
    if (out.length <= ALT_CAP) return out;
    for (const t of out) runs.push({ line: root.line, text: t });
    for (const keep of [400, 200, 100]) {
      const ends = [
        ...new Set(
          out.map((t) => (t.length > 2 * keep ? `${t.slice(0, keep)}\u0000${t.slice(-keep)}` : t))
        ),
      ];
      if (ends.length <= ALT_CAP) return ends;
    }
    root.overflow = true;
    return out.slice(0, ALT_CAP);
  };

  // null: not authored text at all (an identifier, a call), which the caller reads as `{x}`.
  const alts = (expr, inJsx) => {
    if (isWrap(expr)) return alts(expr.expression, inJsx);
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [expr.text];
    if (ts.isTemplateExpression(expr)) {
      // A substitution renders its own branches (review of 818f619e); anything else is `${x}`.
      return expr.templateSpans.reduce(
        (acc, s) => cross(cross(acc, alts(s.expression, false) ?? ['${x}']), [s.literal.text]),
        [expr.head.text]
      );
    }
    if (inJsx && isJsx(expr)) return flatten(expr);
    if (isPlus(expr)) {
      const l = alts(expr.left, false);
      const r = alts(expr.right, false);
      return l === null && r === null ? null : cross(l ?? ['{x}'], r ?? ['{x}']);
    }
    if (isChoice(expr)) {
      const and = opOf(expr) === ts.SyntaxKind.AmpersandAmpersandToken;
      const branches = ts.isConditionalExpression(expr)
        ? [expr.whenTrue, expr.whenFalse]
        : and
          ? [expr.right]
          : [expr.left, expr.right];
      const found = branches.map((b) => alts(b, inJsx));
      if (found.every((f) => f === null)) return null;
      return [...new Set([...(and ? [''] : []), ...found.flatMap((f) => f ?? ['{x}'])])];
    }
    return null;
  };

  // React's JSX text rule (Babel's cleanJSXElementLiteralChild): whitespace that touches a line
  // break is dropped, and non-blank lines join with one space. So `disci` at the end of a line
  // followed by `<span>plines</span>` renders "disciplines" (review of 818f619e).
  const reactText = (raw) => {
    const lines = raw.split(/\r\n|\n|\r/);
    let last = -1;
    lines.forEach((l, i) => {
      if (/[^ \t]/.test(l)) last = i;
    });
    let out = '';
    lines.forEach((l, i) => {
      let t = l.replace(/\t/g, ' ');
      if (i > 0) t = t.replace(/^ +/, '');
      if (i < lines.length - 1) t = t.replace(/ +$/, '');
      if (t) out += i === last ? t : `${t} `;
    });
    return out;
  };
  const NAMED_REFS = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    shy: '­',
    zwnj: '‌',
    zwj: '‍',
    zerowidthspace: '​',
    nobreak: '⁠',
  };
  // Characters a browser does not show: a word split by a soft hyphen or a zero-width space reads
  // as one word (review of c6c5a064). The source-line rules strip the same set.
  const INVISIBLE = /[­​-‍⁠﻿]/g;
  const visible = (t) => t.replace(INVISIBLE, '');
  const decodeRefs = (t) =>
    t.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,16});/gi, (m, ref) => {
      const code = /^#x/i.test(ref)
        ? parseInt(ref.slice(2), 16)
        : ref[0] === '#'
          ? parseInt(ref.slice(1), 10)
          : null;
      if (code !== null) return code <= 0x10ffff ? String.fromCodePoint(code) : m;
      return NAMED_REFS[ref.toLowerCase()] ?? m;
    });
  let reactMode = false;

  const flatten = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      return [reactMode ? decodeRefs(reactText(raw)) : raw];
    }
    if (ts.isJsxExpression(node)) {
      if (!node.expression) return [''];
      return alts(node.expression, true) ?? ['{x}'];
    }
    // As React renders it, an empty element adds no text (`dis<wbr />ciplines`, review of
    // c6c5a064); the loose view keeps reading it as a break.
    if (ts.isJsxSelfClosingElement(node)) return [reactMode ? '' : ' '];
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      return node.children.reduce((acc, child) => cross(acc, flatten(child)), ['']);
    }
    return [''];
  };

  // Already part of an enclosing tree's text: a child element, or a branch of a child `{…}`.
  // JSX in an attribute (`title={<>…</>}`) is not, so it is a run of its own (review of 0bb32ada).
  const inParentText = (node) => {
    let p = node.parent;
    if (isJsx(p)) return true;
    while (isWrap(p) || isChoice(p)) p = p.parent;
    return ts.isJsxExpression(p) && isJsx(p.parent);
  };

  // A template that a `+` chain, an enclosing template or a JSX tree already expands.
  const inExpandedText = (node) => {
    let p = node.parent;
    while (isWrap(p) || isChoice(p)) p = p.parent;
    return isPlus(p) || ts.isTemplateSpan(p) || (ts.isJsxExpression(p) && isJsx(p.parent));
  };

  const emit = (texts) => {
    for (const text of texts) runs.push({ line: root.line, text });
    if (root.overflow) runs.push({ line: root.line, text: '', overflow: true });
  };

  // Whether a tree can render "discipline" at all, decided without expanding it. Every rendered
  // text is the tree's authored pieces (JSX text, string and template literals) in source order
  // with some dropped, so the word must be spellable across consecutive kept pieces. A matcher
  // walks the pieces, free to keep or drop each one; every catalogue alternative needs the word.
  // Comments, identifiers (`discipline={discipline}`) and attributes are not pieces: flatten never
  // reads an attribute (`href="/courses?discipline=CCT"`), and JSX passed as a prop is a run of
  // its own with its own check. Sound where the old substring prefilter was not
  // (`dis<span title="a > b">ci</span>plines`, review of 818f619e).
  const WORD = 'discipline';
  const step = (k, text) => {
    for (const ch of text.toLowerCase()) {
      if (k === WORD.length) return k;
      k = ch === WORD[k] ? k + 1 : ch === WORD[0] ? 1 : 0;
    }
    return k;
  };
  const canSpell = (node) => {
    let states = new Set([0]);
    const piece = (...forms) => {
      const next = new Set(states);
      for (const k of states) for (const f of forms) next.add(step(k, f));
      next.add(0);
      states = next;
    };
    const walk = (n) => {
      if (states.has(WORD.length) || ts.isJsxAttributes(n)) return;
      if (ts.isJsxText(n)) {
        const raw = n.getText(sf);
        piece(raw, reactText(raw), visible(decodeRefs(reactText(raw))));
      } else if (
        ts.isStringLiteral(n) ||
        ts.isNoSubstitutionTemplateLiteral(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)
      ) {
        piece(n.text, visible(n.text));
      }
      ts.forEachChild(n, walk);
    };
    walk(node);
    return states.has(WORD.length);
  };

  const visit = (node) => {
    // A root that cannot spell the word is not expanded, but its children are still visited:
    // JSX passed as a prop inside it is a root of its own.
    if (isJsx(node) && !inParentText(node)) {
      if (canSpell(node)) {
        root = { line: lineOf(node) };
        reactMode = true;
        emit(flatten(node).map(visible));
        reactMode = false;
        emit(flatten(node));
      }
    } else if (
      (isPlus(node) && !isPlus(node.parent)) ||
      ((ts.isTemplateExpression(node) ||
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)) &&
        !inExpandedText(node))
    ) {
      // A template or string outside JSX is copy too (`const headline = \`… ${wide ? 'a' : 'b'}\``,
      // review of 42c32b79), read as its value: the source line of `"IICRC\ndisciplines"` shows
      // an escape, not the space it renders (review of 4414fcac). Read with and without
      // invisible characters, as JSX text is.
      root = { line: lineOf(node) };
      const v = alts(node, false);
      if (v !== null) emit([...new Set([...v, ...v.map(visible)])]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return runs;
}

function ruleHits(rule, content) {
  const base = rule.prepare ? rule.prepare(content) : content;
  const probe = rule.neutralise ? base.replace(rule.neutralise, ' ') : base;
  return rule.re.test(probe) && !(rule.allow && rule.allow.test(content));
}

/**
 * A whole file, as the CLI scans it: each line, plus — for `crossLine` rules — each pair of
 * adjacent lines joined with a space, so "Explore CARSI WRT" / "training today" across a line
 * break is still seen. A join is reported only when neither line fires alone.
 */
export function scanFile(file, text, rules = BANNED) {
  const findings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) scanLine(file, i + 1, lines[i], findings, rules);
  const docs = file.replace(/\\/g, '/').startsWith('docs/');
  for (const rule of rules.filter((r) => r.crossLine && !(r.skipDocs && docs))) {
    // `crossLine: true` joins pairs of lines; a number joins up to that many (GP-654: a count,
    // "<span>IICRC</span>" and "disciplines" on three lines render as one phrase). A window is
    // reported only when neither of its one-line-shorter windows already fires.
    const width = rule.crossLine === true ? 2 : rule.crossLine;
    const join = (from, n) =>
      lines
        .slice(from, from + n)
        .map((l) => l.trim())
        .join(' ');
    const hits = (from, n) =>
      n === 1 ? ruleHits(rule, lines[from]) : ruleHits(rule, join(from, n));
    for (let n = 2; n <= width; n++) {
      for (let i = 0; i + n <= lines.length; i++) {
        if (hits(i, n) && !hits(i, n - 1) && !hits(i + 1, n - 1)) {
          findings.push(
            `  ${file}:${i + 1}-${i + n}: ${rule.message}\n    → ${join(i, n).slice(0, 140)}`
          );
        }
      }
    }
  }
  const renderedRules = rules.filter((r) => r.rendered && !(r.skipDocs && docs));
  if (renderedRules.length > 0) {
    for (const run of renderedRuns(file, text)) {
      if (run.overflow) {
        findings.push(
          `  ${file}:${run.line} (rendered): this copy has too many conditional variants to check (over 256); split it into smaller pieces`
        );
        continue;
      }
      for (const rule of renderedRules) {
        if (ruleHits(rule, run.text)) {
          findings.push(
            `  ${file}:${run.line} (rendered): ${rule.message}\n    → ${run.text.replace(/\s+/g, ' ').trim().slice(0, 140)}`
          );
        }
      }
    }
  }
  return findings;
}

function scanLine(file, lineNo, content, findings, rules = BANNED) {
  const norm = file.replace(/\\/g, '/');
  for (const rule of rules) {
    if (rule.seedOnly && !norm.startsWith('data/seed/')) continue;
    if (rule.skipDocs && norm.startsWith('docs/')) continue;
    // `allow` exempts the whole LINE, so any line carrying both a violation and an allow
    // token escapes — `title: "IICRC WRT course", slug: "x-iicrc-wrt"` passed on the slug
    // alone. `neutralise` is the stricter form: it deletes the permitted spans and re-tests
    // what is LEFT, so a legitimate token can no longer shelter branding beside it.
    // `prepare` normalises the line for one rule before anything else runs (see the rule).
    const base = rule.prepare ? rule.prepare(content) : content;
    const probe = rule.neutralise ? base.replace(rule.neutralise, ' ') : base;
    if (rule.re.test(probe) && !(rule.allow && rule.allow.test(content))) {
      findings.push(`  ${file}:${lineNo}: ${rule.message}\n    → ${content.trim().slice(0, 140)}`);
    }
  }
}

// CLI only. Importing this module for the self-test must not run the scan or exit the process.
// isEntryPoint compares real paths, so neither a space in the checkout path nor a symlinked
// invocation can silently disarm the check (scripts/lib/is-entry-point.mjs).
const isCli = isEntryPoint(import.meta.url);
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
    list = execSync('git ls-files --cached --others --exclude-standard', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
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
    findings.push(...scanFile(file, text));
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
