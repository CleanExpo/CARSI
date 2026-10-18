#!/usr/bin/env node
/**
 * Licence inventory (reviews of fix/industry-faq-licence, 18/10/2026).
 *
 * One exhaustive pass for every IICRC discipline code (official list, any case), "certif" /
 * "certs" / "IICRC credentials", "CEC", "accredit", "board-approved", IICRC-branded offerings
 * ("IICRC … training/course/credential"), the unsold subjects (repair, colour, upholstery,
 * reinstall) and counted claims about the world ("537 councils").
 *
 * SCOPE: every file under app/, src/ and public/ — the surfaces carsi.com.au serves — including
 * the TEXT of every PDF (extracted by scripts/pdf-text.mjs), so a stale document cannot keep a
 * retracted claim. docs/ is out of scope here: marketing and campaign plans are reviewed on
 * fix/marketing-docs-licence and stay covered by check:iicrc-compliance.
 *
 * Every hit is classified:
 *   not-public       a test, generated code, a staff-only surface, tooling, a model prompt, or a
 *                    hit that is not copy (identifier, comment, key, slug, URL, routing code)
 *   legitimate       copy whose SENTENCE matches a named rule (third-person IICRC fact,
 *                    provider-level or conditional CEC wording, a CARSI certificate, …), or a
 *                    per-line reviewed entry in licence-inventory-reviewed.json
 *   owned-elsewhere  a per-line reviewed entry for copy another branch owns (listed for Phill)
 *   exposure         anything else. Must be zero: fix the copy, never widen a rule to swallow it.
 *
 * Rules see only the sentence that contains the hit, so a legitimate phrase elsewhere on the
 * line cannot excuse a claim. Exemptions are per line: file, line, the exact text, and a reason.
 *
 * Usage: node scripts/licence-inventory.mjs [--root DIR] [--json]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { pdfText } from './pdf-text.mjs';

export const SCAN_ROOTS = ['app', 'src', 'public'];

/** Official IICRC certification / designation codes (iicrc.org certification list). */
export const IICRC_CODES = (
  'WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|CPT|FCT|HCT|HST|LCT|RCT|SMT|TCST|UFT|RFMT|WFMT|BMI|BMT|' +
  'BCI|CDS|MRS|ISSI|RFI|WFI|WLFI|SCI|MWR|MTC|MSR|JWR|JTC|JSR'
).split('|');

const OFFER_NOUN =
  'training|courses?|programs?|programmes?|pathways?|modules?|classes|bundles?|credentials?|creds?|qualifications?';

export const TERMS = [
  ['iicrc-code', new RegExp(`\\b(?:${IICRC_CODES.join('|')})\\b`, 'gi')],
  ['certif', /certif\w*|\bcerts?\b|IICRC[- ](?:credentials?|creds?|recogni[sz]ed)/gi],
  ['CEC', /\bCECs?\b|\bCEC(?=[-\w])/gi],
  ['accredit', /accredit\w*/gi],
  ['board-approved', /board[- ]approved/gi],
  [
    'iicrc-offer',
    new RegExp(`\\bIICRC\\b(?:[\\s-]+[\\w&’'/]+){0,5}?[\\s-]+(?:${OFFER_NOUN})\\b`, 'gi'),
  ],
  ['repair', /\brepair\w*/gi],
  ['colour', /\bcolou?r[ -]?(?:repair|correct\w*|restor\w*)|\bcolour\w*|\bdye(?:s|ing)?\b/gi],
  ['upholstery', /upholster\w*/gi],
  ['reinstall', /\bre-?install\w*/gi],
];

/** A counted claim about the world ("537 councils", "2,800+ caravan parks"), on every surface. */
export const COUNT_CLAIM = new RegExp(
  '(?<![\\d/.,])\\b\\d[\\d,]*\\+?\\s+(?:[A-Za-z-]+\\s+){0,2}?(?:councils|agencies|businesses|companies|facilities|centres|centers|hospitals|schools|technicians|plumbers|operators|members|learners|students|professionals|contractors|parks|homes|properties|sites|organisations|industries|clients|customers|users|enrolments|graduates|volunteers|agents)\\b',
  'g'
);

const TEXT_EXT = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.json',
  '.html',
  '.xml',
  '.csv',
  '.svg',
  '.webmanifest',
  '.pdf',
]);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Path-level not-public: tests, generated code, staff-only surfaces, tooling, prompts, styles. */
const NOT_PUBLIC_PATHS = [
  ['test file', /(?:\.test\.|\.spec\.|\/__tests__\/|\/e2e\/|\/test-utils?\/|\.stories\.)/],
  ['generated code', /^src\/generated\//],
  [
    'staff-only admin surface',
    /^(?:app\/\(admin\)\/|app\/api\/admin\/|src\/components\/admin\/|src\/lib\/admin\/|app\/\(dashboard\)\/dashboard\/admin\/)/,
  ],
  ['stylesheet', /\.(?:css|scss)$/],
  [
    'internal tooling (course production, screencast, audit, video)',
    /^src\/lib\/(?:course-kit|screencast|audit|video)\//,
  ],
  [
    'model instruction (prompt text, not rendered verbatim)',
    /^(?:src\/lib\/server\/(?:ai-course-builder|optimize-course-content|assistant-prompt|ai-assistant-context|review-reply-draft|margot-knowledge-base)\.ts|src\/lib\/(?:margot-surface|brand-video-assistant)\.ts|app\/api\/margot\/|src\/lib\/server\/frontdesk\/)/,
  ],
  ['instructor-only surface', /^app\/\(dashboard\)\/instructor\//],
  ['internal ops check (CEC drift report)', /^src\/lib\/server\/live-cec-check\.ts$/],
  ['instructor course builder', /^src\/components\/lms\/CourseBuilder\.tsx$/],
];

const INDUSTRY = /^app\/\(public\)\/industries\//;
const CODE_ALT = IICRC_CODES.join('|');

/**
 * Forms that are never legitimate, whatever else the sentence says.
 */
export const BLOCK_RULES = [
  {
    name: 'static CEC course count',
    terms: ['CEC', 'accredit'],
    fn: (sentence) =>
      /\b\d+\+?\s+(?:IICRC )?CEC\b|\bCEC[^.|]{0,40}\b\d+\+? courses|\b\d+\+? (?:available |approved )?courses with CEC/i.test(
        sentence
      ) && !/rejected|non-CEC|\bnot\b/i.test(sentence),
  },
  {
    name: 'course-level IICRC approval claim',
    terms: ['board-approved', 'CEC', 'accredit', 'certif'],
    re: /board[- ]approved|approved by the IICRC board|IICRC[- ]approved CARSI courses/i,
  },
  {
    name: 'CEC descriptor scoped to a topic or audience (implies those courses carry CECs)',
    terms: ['CEC', 'accredit', 'iicrc-offer'],
    re: /IICRC CEC (?:Accredited )?(?:online )?(?:courses?|training)\s+(?:(?:in|on)\b|as CPD|relevant to|apply to|across \d|for (?!(?:cleaning and )?restoration professionals|Australian technicians)[A-Za-z])|IICRC CEC courses through CARSI|Earn CECs, download|across \d+ disciplines/i,
  },
  {
    name: 'CARSI offering named with an IICRC code (any modifiers in between)',
    terms: ['iicrc-code'],
    unless: /\bno\b|\bnot\b|never|do not/i,
    re: new RegExp(
      `\\b(?:${CODE_ALT})\\b(?:[\\s-]+(?!(?:certification|certified|certificates?|technicians?|holders?|exams?|cards?|renewal|recertification)\\b)[\\w&’']+){0,3}?[\\s-]+(?:courses?|training|programs?|programmes?|pathways?|modules?|class(?:es)?|bundles?)\\b`
    ),
  },
  {
    name: 'CARSI course offer named with an IICRC code and "certification"',
    terms: ['iicrc-code', 'iicrc-offer', 'certif'],
    unless:
      /\bschool|approved by the IICRC|IICRC-approved|examination|third-person|does not|do not|not an?\b/i,
    re: new RegExp(
      `\\b(?:${CODE_ALT})\\b[\\s-]+certification[\\s-]+(?:courses?|training|programs?|programmes?|classes)\\b`
    ),
  },
  {
    name: 'unsold carpet- or colour-repair training offered',
    terms: ['repair', 'colour', 'reinstall'],
    unless:
      /Technician|CARSI sells no|does not (?:sell|offer|cover)|removed|or refer|IICRC CRT|refer it/i,
    re: /\b(?:carpet|colou?r|rug|fabric) repair(?: and re-?installation)?\b[^.!?]{0,40}\b(?:training|courses?|programs?|modules?|lessons?|class(?:es)?)\b|\b(?:training|courses?|programs?|modules?) (?:in|on|for) (?:carpet|colou?r) repair\b|\b(?:learn|teach(?:es)?|master|train(?:s|ed)? (?:in|on)|study|enrol (?:in|for))\s+(?:\w+\s+){0,2}?(?:carpet|colou?r|rug|fabric) repair\b/i,
  },
  {
    name: 'promises CECs with no approval condition in the same sentence',
    terms: ['CEC'],
    fn: (sentence, code) =>
      !/cec_hours|cecHours|cecLabel/.test(code) &&
      /\b(?:earn(?:s|ing)?|grants?|awards?|gives?|carr(?:y|ies))\b[^.!?]{0,40}\b(?:CECs?|Continuing Education Credits)\b/i.test(
        sentence
      ) &&
      !/approv|\bnot?\b|passing score|absence|rejected|non-CEC/i.test(sentence),
  },
  {
    name: 'every course or module promised CECs',
    terms: ['CEC'],
    fn: (sentence) =>
      /\b(?:every|each|all) (?:CARSI )?(?:courses?|modules?|lessons?)\b[^.!?]{0,60}\b(?:CECs?|Continuing Education Credits)\b/i.test(
        sentence
      ) && !/approv|where it carries any/i.test(sentence),
  },
  {
    name: 'sells certification',
    terms: ['certif'],
    re: /\bget certified\b|certify your (?:team|staff|network|crew)|IICRC certs that|become IICRC[- ]certified with/i,
  },
];

export const LEGIT_RULES = [
  {
    name: 'licence-compliance note: states what is NOT claimed or branded',
    terms: ['CEC', 'iicrc-code', 'iicrc-offer', 'certif', 'accredit'],
    re: /\bnon-(?:IICRC-)?CEC\b|\bno IICRC\b|\bNo\*\* IICRC|\bno\*\* IICRC|not (?:used )?to (?:brand|name)|do not brand|\bno (?:[A-Z]{2,5}\/)*[A-Z]{2,5}(?:\/[\w"-]+)*(?:\/etc\.)? (?:used|acronym|branding)|\(no (?:[A-Z]{2,5}\/)*[A-Z]{2,5}|third-person (?:only|reference)|nominative|CARSI designation rule|rejected|clear of IICRC framing|nothing in-image implies|IICRC CEC terminology|absence of any IICRC|absence\*\* of any IICRC|IICRC \/ CEC terminology compliance|in the course title|violates the|no overclaiming|do not claim accreditation|without an `iicrc_discipline`|not an IICRC designation|recognised industry methods/i,
  },
  // --- discipline codes
  {
    name: 'month abbreviation "Oct"',
    terms: ['iicrc-code'],
    re: /\bOct\b(?=\.?\s*(?:\d|20\d\d))|\b\d{1,2}\s+Oct\b|\bOct-(?:Nov|Dec)\b|\b(?:Sep|Aug)-Oct\b/,
  },
  {
    name: 'equipment model name (HydraMaster CDS xDrive)',
    terms: ['iicrc-code'],
    re: /CDS xDrive|HydraMaster|Boxxer|Sapphire/,
  },
  { name: 'code list constant (data)', terms: ['iicrc-code'], re: /(?:[A-Z]{2,5}\|){5,}/ },
  {
    name: 'PDF table row: the IICRC designation name ("… Technician") in the cell before its code',
    terms: ['iicrc-code'],
    code: true,
    path: /\.pdf$/,
    re: /\bTechnician (?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)\b/,
  },
  {
    name: 'third-person IICRC certification named with its code',
    terms: ['iicrc-code'],
    re: /IICRC [A-Z][A-Za-z ]+ Technician \([A-Z]{2,5}\)|\b[A-Z]{2,5}(?: and [A-Z]{2,5})? commonly required by|\b[A-Z]{2,5} (?:is|are) (?:an? )?IICRC|certifications: \['IICRC [A-Z]|IICRC [A-Z]{2,5} certification|[A-Z]{2,5} certification is recommended|certifications including [A-Z]{2,5} \(|Environ Sci|Sci Technol|IICRC certifications are most common in your team|\*\*(?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)\*\* — [^|]*Technician|points toward (?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)|\*\*(?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|UFT|RCT)(?: \+ (?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|UFT|RCT))+\*\* tech|pairs with (?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST) skill|(?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)-only tech|IICRC (?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)\b|(?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST) → |→ \*\*(?:WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|UFT|RCT|LCT|TCST|HST)\*\*|Forensic\.? ?Sci|IICRC certification itself \(|through a school (?:and examination )?approved by the IICRC|^[A-Z]{2,5}$/,
  },
  // --- certification
  {
    name: 'CARSI-issued certificate (document), not certification',
    terms: ['certif'],
    re: /\bcertificates?\b|certif(?:y|ies) that|This is to certify/i,
  },
  {
    name: 'third-person IICRC certification: obtained through IICRC schools, held, renewed or required by others',
    terms: ['certif', 'iicrc-offer'],
    re: /IICRC[- ]approved schools|approved by the IICRC|schools? (?:and|&) exam|not (?:an? )?IICRC certifications?|does not (?:deliver|award|issue|provide|sell|make you)|does not sell IICRC|IICRC certification (?:is|itself|evidence|numbers?)|no CARSI course is IICRC certification|(?:your|an existing|existing|already hold|hold(?:s|ing)?|maintain\w*|keep\w*|renew\w*|recertif\w*|expir\w*|lapse\w*)\b[^.]{0,30}certif|certif\w*[^.]{0,30}(?:you (?:already )?hold|renewal|expir|number|on file|history|emails?|status|cockpit|cycle|date)|Already IICRC certified|No (?:Current )?Certifications?|certifications yet|IICRC-certified (?:restoration practitioner|technicians|firms|contractors|restorer)|certified technicians who already|Certification \(IICRC\)|Institute of Inspection,? Cleaning and Restoration Certification|IICRC certification disciplines|IICRC certifications? (?:help|align|required|is|are|reference|it expects|procurement|government|tender)|(?:Do|Does) [^?]{0,40}need[^?]{0,20}certification|certification to clean carpets|'carpet cleaning certification(?: Australia)?'|legally required to hold IICRC|Does CARSI deliver IICRC certification|Does a CARSI course make me IICRC certified|certification[- ](?:course|training)|bought once|One IICRC certification|A certification is|certification is held|Current Certification|certification this cycle|'IICRC certifications',|IICRC certifications, and|disciplines, IICRC certifications|standards and certification body|panel sets its own certification|certifications it requires|certification requirements?|certifications procurement officers|The certifications procurement|requirements, certifications|procurement, certifications|IICRC certification is increasingly listed|IICRC provides technician-level certifications|maintain certification status|Certified Flooring|Certified Building|Certification and Trust|certification, continuing education|Using certification as a badge|Answer certification questions|certification, CEC, and trust|IICRC certifications for|holding any IICRC certification|certified staff maintain certification|certification affect pay|CARSI certifies|certify the numbers|certifies the gas|certified under the relevant|licensed practitioner|Sign-off|engineer-rated|VSB14|Load Restraint|modification code|certification \(amortised\)|Training\/certification|IICRC\/CARSI courses|recommended: IICRC|IICRC [A-Z]{2,5} certification|certification number|certification documents|holds IICRC certification|IICRC-certified restorer|Restoration Certification$|Certified Restoration Contractors|Audit current certifications|certification table|IICRC certification evidence|their IICRC certifications|active IICRC certifications|Confined Space Entry certification|Assess your team's certifications|certifications are the entry ticket|Required IICRC Certifications|Essential Certifications by Service Type|\| Certification +\||Certification Code Why It.?s Required|ongoing education to maintain|CECs per certification|Current certification status|implication CARSI certifies|imply safety certification|overclaiming certification|overstating certification|certification status changes|Guide to IICRC Certification|IICRC Certification Guide|IICRC Certification explained|certification versus continuing education|may already hold|Panels Ask for IICRC Certification|list industry certifications|do not grant IICRC certification|your IICRC credentials|^Certification$|through a school (?:and examination )?approved by the IICRC|CECs contribute to the maintenance|verified with the IICRC|disclaims responsibility|^carpet cleaning certification(?: Australia)?$|IICRC(?:&rsquo;|['’])s own|does not award|certified technicians continue|list IICRC certification|Once certified, the IICRC requires|Master and Inspector certifications|an IICRC certification; CARSI sells no colour-repair course|One-off (?:·|&middot;) certification|cert example|what does it cost you every year to keep it|^IICRC certifications$|they (?:already )?hold|verify a candidate's CARSI credential|^- 20\d\d-\d\d-\d\d:|skills and certifications valued|training and certification costs|fire services certification|IICRC [A-Z]{2,5} certification|[A-Z]{2,5} certification is recommended|Lists IICRC certification|Certified Firms|logo rights attach to Certified|maintenance of IICRC certifications|Certification mix|certified staff maintain|certification queries|pricing, certification|certification is not legally required|certifications: \[/i,
  },
  {
    name: 'other bodies’ certification (ISO, HACCP, gas, vehicle, Cert IV)',
    terms: ['certif'],
    re: /\b(?:ISO|NATA|Green Star|NABERS|SafeWork|WHS|HACCP|electrical|asbestos|licen[cs]ed?|white card|first aid|organic|SSL|TLS|ISSA|Cert IV|gasfitter|AS\/NZS|engineer\w*|truck-mount certification scheme|Vehicle Examiner|NHVR|VSB\d+|uncertified|self-certif\w*|electrician|registration|roadworth\w*|Restoration Certified|certifiers|disease-free|regulatory certification|Certify regulatory compliance|CARSI-certified)\b/i,
  },
  // --- CEC
  {
    name: 'provider-level CEC standing',
    terms: ['CEC', 'accredit', 'iicrc-offer'],
    re: /CARSI (?:is an?|delivers|offers|provides)[^.]{0,60}IICRC CEC Accredited(?! (?:online )?(?:training|courses?) in )|IICRC CEC Accredited[\w -]{0,30}provider|accredited (?:IICRC )?CEC provider|CARSI is an accredited IICRC|IICRC CEC Platform|IICRC CEC Accredited ·|IICRC CEC Accredited<\/(?:b|strong)>|CEC accreditation and industry|from an IICRC CEC Accredited provider|CEC Accredited \*\*provider\*\*/i,
  },
  {
    name: 'catalogue-wide CLAUDE.md descriptor (not scoped to a topic or audience)',
    terms: ['CEC', 'accredit', 'iicrc-offer'],
    re: /IICRC CEC Accredited (?:restoration )?(?:courses|training|continuing education|learning|completions)\b(?! for)|\bIICRC CEC (?:courses|education)\b(?! for)|IICRC CEC courses online|IICRC Continuing Education Credit \(CEC\) courses|term="CEC" \/> accredited courses for people|IICRC CECs?['"]?,?$|'IICRC CEC'|IICRC CEC Accredited — continuing education credits, not IICRC certification|CEC Accredited courses\.|CEC continuing education, not an|IICRC CEC Accredited restoration CEC|IICRC CEC Accredited (?:courses|continuing education) for (?:cleaning and )?restoration professionals|IICRC CEC Accredited restoration courses for Australian technicians|Restoration training — IICRC CEC Accredited|IICRC CEC provider\b/i,
    notPath: INDUSTRY,
  },
  {
    name: 'conditional or registry-computed CEC',
    terms: ['CEC', 'accredit', 'iicrc-offer'],
    re: /(?:only|where|when|if|once|until)\b[^.]{0,80}\b(?:IICRC (?:has )?approv|approved by the IICRC|approv)|IICRC (?:has )?approved|approved (?:IICRC )?CEC|with approved CEC|CEC-eligible|not eligible for IICRC CEC|any IICRC CECs that|where it carries any|fail-closed|\bno CEC|not IICRC CEC|NOT for IICRC CEC|Is this an IICRC CEC course|cec-approvals|CEC hours only|IICRC CEC approval|a CEC approval|approved by the IICRC|any IICRC CECs the course carries|an approved course|on approved courses|subject to IICRC approval|label: 'On approved courses'|label: 'Hours only on approved courses'|IICRC-Approved|IICRC-approved|Per-course CEC approval|course-level CEC|only if and when|only where that course holds|CEC approval is course-specific/i,
  },
  {
    name: 'registry-computed CEC value beside the words',
    terms: ['CEC', 'accredit'],
    code: true,
    re: /\$\{[^}]*[cC]ec|\{[^}'"]*(?:cec_|[a-z]Cec|cec[A-Z])[^}]*\}|cecValue|cecLabel|cecHours|cec_hours|totalCecs|formatCec|cecInView|hasCec|alsoEarnsCec/,
  },
  {
    name: 'conditional stat chip: the label beside it says CEC hours are on approved courses only',
    terms: ['CEC'],
    code: true,
    re: /value: 'IICRC CEC', label: '(?:On approved courses|Hours only on approved courses|Hours only when approved|When approved)'/,
  },
  {
    name: 'learner CEC record, tracking and renewal (the learner’s own IICRC certification)',
    terms: ['CEC'],
    re: /CEC (?:hours?|hrs|credits?|progress|submission|submitted|summary|totals?|records?|evidence|details|status|target|requirement|reminders?|tracking|log|by discipline|availability|need|Needs|calculator|values?)\b|CECs? (?:earned|remaining|needed|total|do I have|Earned|required|every|toward|per certification)|How many CECs|Renew my CECs|maintaining CECs|CEC renewal|IICRC CEC (?:progress|hours|totals|summary|records?)|Training (?:&|&amp;) CEC|Any CEC status|toward (?:your )?(?:IICRC )?CECs?|IICRC CECs toward maintaining|track\w*[^.]{0,30}CEC|CEC completions|report\w* CEC|verify CEC|to earn CECs|Keep your CECs current|evidence of continuing education|CEC deadline|maintain certification: CEC courses|CECs contribute to the maintenance|certification needs ongoing CECs|keeping that certification current|any IICRC CECs the course carries|remaining CECs|CEC completion|CECs count toward|education through CECs|CECs Explained|does \*\*not\*\* award IICRC|Present training, CECs|professional continuing education \(CECs\)|CEC-compliant framing|Honest certification, CEC|Plan CEC courses and submit your renewal|CECs<\/b> toward maintaining/i,
  },
  {
    name: 'explains how CECs work (third-person IICRC process)',
    terms: ['CEC', 'iicrc-offer'],
    re: /How do (?:IICRC )?CECs work|Do CARSI courses count toward IICRC CECs|What IICRC and CECs are|confusing CECs|CECs and customer trust|CARSI, CECs and IICRC CEC Accredited learning|about CECs|online CECs|continuing education through CECs|Which course counts for my CECs|CEC and pathway questions|CEC reminders|CEC need|IICRC CEC references|dual value|Courses (?:&|&amp;) CECs|IICRC CECs, or team training|Continuing Education Credits? \(CECs?\)|CEC \(Continuing Education Credit\)|CEC accreditation|no CEC-hours claims|not state or imply|IICRC CEC cost|Also earns IICRC CECs/i,
  },
  // --- accreditation (other)
  {
    name: 'negated or other-body accreditation',
    terms: ['accredit'],
    re: /not (?:an? )?(?:RTO|registered training)|nationally accredited|not (?:IICRC )?(?:CEC )?accredited|non-accredited|accredited (?:VET|qualification|training organisation)|ASQA|\bRTO\b|NRPG-accredited|park accreditation bodies|management system accreditation|Accreditation renewal periods|no accredited Australian|third-party accreditation|does not award|NATA|laborator\w*|\blabs?\b|accredited-organisation|accredited fungal|Accreditation-Ready|Accreditation Evidence|accreditation (?:reviews|audits)|hospital accreditation|not accreditation|overclaim accreditation|invent accreditation|rather than \*accredited\*|^## Accreditation$|Accreditation$/i,
  },
  // --- unsold subjects
  {
    name: 'repair of a building, leak or machine (not a course offer)',
    terms: ['repair'],
    re: /(?:leak|pipe|plumb|roof|burst|structur|building|equipment|machine|regulator|pump|float|defect|wall|house|flood)\w*[^.]{0,60}\brepair|\brepair\w*[^.]{0,60}(?:leak|pipe|roof|trade|building|equipment|machine|house|flood|owner|replace|reseal|scope)|insurer-funded repair|as well as the repair|after the repair|repair networks|^repair work\.|repair cost|old repairs|repairs?, retouching|a repair you didn|good repair|repair the truncation|truncat\w*|inpainting|conservation|removal\/repair|repair, minor modification|quote it as a repair|does not cover interior fabric repair|Maintenance and Repair Services/i,
  },
  {
    name: 'IICRC designation name quoted third-person (Color Repair / Carpet Repair and Reinstallation Technician)',
    terms: ['repair', 'colour', 'reinstall'],
    re: /Colou?r Repair Technician|fullName: 'Colour Repair'|Carpet Repair (?:and|&) Reinstallation Technician|carpet colour correction|CRT — Colour repair|CARSI sells no colour-repair course|IICRC CRT territory|\(IICRC CRT\)|or refer|colour-repair vs cleaning|a carpet repair and reinstallation topic removed/,
  },
  {
    name: 'colour or dye as a general word (stain chemistry, fluorescence, branding) — no colour-repair offer in the sentence',
    terms: ['colour'],
    re: /^(?![\s\S]*\bcolou?r[- \/]?(?:repair|correct))[\s\S]*$/i,
  },
  {
    name: 'upholstery in the real CCW hands-on workshop, a standard title or a business type (not a course offer)',
    terms: ['upholstery'],
    re: /Professional Upholstery Cleaning|Upholstery (?:fibres|—|·)|· Upholstery|fibre, chemistry,? (?:methods, )?upholstery|chemistry, upholstery|upholstery and business modules|residential, commercial, upholstery|Residential, Commercial, Upholstery|upholstery, hard floors|Carpet (?:&|and) [Uu]pholstery (?:Cleaning|cleaning|cleaner|Training|training)|upholstery, rugs|rugs, upholstery|odour, rugs, upholstery|carpet, upholstery or customer trust|hard floors, upholstery|Upholstery, rug, pet stain|damaging carpet, upholstery/i,
  },
  {
    name: 'upholstery cleaning is a CARSI subject (data/seed/courses-catalog.json: introduction-to-upholstery-cleaning-and-drying)',
    terms: ['upholstery'],
    re: /upholster/i,
  },
  {
    name: 'reinstallation as the IICRC designation name',
    terms: ['reinstall'],
    re: /Reinstallation Technician|flooring reinstall/i,
  },
  // --- IICRC-branded phrases that name the IICRC's own offering (third-person)
  {
    name: "third-person: the IICRC's own certification training at IICRC-approved schools",
    terms: ['iicrc-offer'],
    re: /IICRC[- ]approved schools?|IICRC['’]s own|IICRC certification (?:course|training|class)s?[^.]*\b(?:school|exam|approved|in person)|not (?:an? )?IICRC|does not (?:deliver|award|sell|offer)|IICRC (?:Water Damage Restoration|Applied Structural Drying|Applied Microbial Remediation|Carpet Cleaning|Odor Control|Fire and Smoke Damage Restoration) Technician/i,
  },
  // --- counted claims
  {
    name: 'headcount of the guide’s illustrative example business (labelled indicative), not a claim about the world',
    terms: ['count-claim'],
    path: /^public\/downloads\/carsi-government-contractor-guide\.pdf$/,
    local: true,
    re: /^Staff: \d+ \(\d+ technicians, \d+ project managers, \d+ admin\)$/,
  },
];

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Per-line reviewed decisions. Each names the file, the line, text that must appear on that line,
 * the class and the reason. licence-inventory.test.ts fails if an entry no longer matches its line.
 */
export const REVIEWED = JSON.parse(
  readFileSync(join(HERE, 'licence-inventory-reviewed.json'), 'utf8')
);

function reviewedFor(file, line, lineText, term) {
  return REVIEWED.find(
    (r) =>
      r.file === file &&
      r.line === line &&
      lineText.includes(r.contains) &&
      (!r.terms || r.terms.includes(term))
  );
}

function walk(dir, out = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** [start, end, text] for every piece of copy in a TS/TSX/JS source. */
function copyRanges(file, text) {
  const kind = /\.tsx$|\.jsx$/.test(file)
    ? ts.ScriptKind.TSX
    : file.endsWith('.ts')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const ranges = [];
  const visit = (node) => {
    const k = node.kind;
    if (
      k === ts.SyntaxKind.StringLiteral ||
      k === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      k === ts.SyntaxKind.TemplateHead ||
      k === ts.SyntaxKind.TemplateMiddle ||
      k === ts.SyntaxKind.TemplateTail ||
      k === ts.SyntaxKind.JsxText
    ) {
      const parent = node.parent;
      const isModulePath =
        parent &&
        (ts.isImportDeclaration(parent) ||
          ts.isExportDeclaration(parent) ||
          (ts.isCallExpression(parent) &&
            /^(?:require|import)$/.test(parent.expression.getText(sf))) ||
          ts.isExternalModuleReference(parent));
      const isKey =
        parent &&
        (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) &&
        parent.name === node;
      let isLog = false;
      for (let a = node.parent; a && !isLog; a = a.parent) {
        if (
          ts.isCallExpression(a) &&
          /^(?:console\.\w+|logger\.\w+|log)$/.test(a.expression.getText(sf))
        )
          isLog = true;
        if (ts.isNewExpression(a) && /Error$/.test(a.expression.getText(sf))) isLog = true;
        if (ts.isStatement(a)) break;
      }
      const isClassName =
        parent &&
        ts.isJsxAttribute(parent) &&
        /^(?:className|class|id|href|src|key|data-[\w-]+|aria-controls|htmlFor|name|type|role)$/.test(
          parent.name.getText(sf)
        );
      if (!isModulePath && !isKey && !isClassName && !isLog) {
        let ctx = [node.getStart(sf), node.getEnd()];
        if (k === ts.SyntaxKind.JsxText) {
          // Climb out of inline elements (<b>, <strong>, <AcronymTooltip>, …) to the block that
          // holds the whole sentence; inline tags are masked out of the sentence.
          let el = node.parent;
          while (
            el &&
            ts.isJsxElement(el) &&
            INLINE_TAGS.test(el.openingElement.tagName.getText(sf)) &&
            el.parent &&
            ts.isJsxElement(el.parent)
          )
            el = el.parent;
          if (el && ts.isJsxElement(el))
            ctx = [el.openingElement.getEnd(), el.closingElement.getStart(sf)];
        }
        ranges.push([
          node.getStart(sf),
          node.getEnd(),
          text.slice(node.getStart(sf), node.getEnd()),
          ...ctx,
        ]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return ranges;
}

const INLINE_TAGS = /^(?:b|strong|em|i|span|a|abbr|code|small|mark|u|Link|AcronymTooltip)$/;

/** Tags and {expressions} become spaces (offsets kept); a tooltip keeps its visible term. */
function maskMarkup(src) {
  return src
    .replace(/<AcronymTooltip\s+term="([^"]+)"[^>]*\/>/g, (t, term) => term.padEnd(t.length, ' '))
    .replace(/<[^>]*>/g, (t) => ' '.repeat(t.length));
}

/** A string that is a key, slug, path, URL or enum value rather than prose. */
function looksLikeToken(raw) {
  const s = raw.replace(/^[`'"]|[`'"]$/g, '').trim();
  if (/^https?:\/\//.test(s) && !/\s/.test(s)) return true;
  if (/\s/.test(s)) return false;
  return /^[\w\-./:@#?=&{}$[\]*|]+$/.test(s) && !/^[A-Z]{2,5}$/.test(s);
}

/** Whether column `col` of `line` falls inside a URL or a /site/path token. */
function inUrlOrPath(line, col) {
  for (const m of line.matchAll(/(?:https?:\/\/|(?<![\w])\/)[^\s)"'`|<>]+/g)) {
    if (col >= m.index && col < m.index + m[0].length) return true;
  }
  return false;
}

function inCodeSpan(line, col) {
  for (const m of line.matchAll(/`[^`]*`/g)) {
    if (col > m.index && col < m.index + m[0].length) return true;
  }
  return false;
}

function insideTag(text, at) {
  const open = text.lastIndexOf('<', at);
  return open !== -1 && text.lastIndexOf('>', at - 1) < open;
}

function lineOf(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * The sentence of `text` that contains [start, end). Sentences end at . ! ? followed by space,
 * at a table cell bar, and at a line break that starts a new block (blank line, list item,
 * table row, heading or quote). Other line breaks are wrapping and join the sentence.
 */
export function sentenceAt(text, start, end) {
  const isBoundary = (i) => {
    const c = text[i];
    if (c === '|') return true;
    if ('.!?'.includes(c)) return i + 1 >= text.length || /\s/.test(text[i + 1]);
    if (c === '\n') {
      const nl = text.indexOf('\n', i + 1);
      const next = text.slice(i + 1, nl === -1 ? text.length : nl);
      return /^[ \t]*$/.test(next) || /^[ \t]*(?:[-*+>#]\s|\d+\.\s|\|)/.test(next);
    }
    return false;
  };
  let a = start;
  while (a > 0 && !isBoundary(a - 1)) a--;
  let b = end;
  while (b < text.length && !isBoundary(b)) b++;
  return text
    .slice(a, Math.min(b + 1, text.length))
    .replace(/\s+/g, ' ')
    .trim();
}

let lastSentence = '';

export function classifyCopy(file, term, rawSentence, code = rawSentence, local = '') {
  const sentence = rawSentence.replace(/^[\s`'"|]+|[\s`'",|]+$/g, '');
  lastSentence = sentence;
  for (const r of BLOCK_RULES) {
    if (
      r.terms.includes(term) &&
      (r.fn ? r.fn(sentence, code) : r.re.test(sentence)) &&
      !(r.unless && r.unless.test(sentence))
    )
      return ['exposure', r.name];
  }
  for (const r of LEGIT_RULES) {
    if (!r.terms.includes(term)) continue;
    if (r.path && !r.path.test(file)) continue;
    if (r.notPath && r.notPath.test(file)) continue;
    const subject = r.code ? code : r.local && local ? local : sentence;
    if (r.fn ? r.fn(sentence, code) : r.re.test(subject)) return ['legitimate', r.name];
  }
  return ['exposure', 'no rule matches'];
}

export async function inventory(root = process.cwd()) {
  const hits = [];
  for (const surface of SCAN_ROOTS) {
    for (const full of walk(join(root, surface))) {
      const file = relative(root, full).split('\\').join('/');
      const ext = extname(file).toLowerCase();
      if (!CODE_EXT.has(ext) && !TEXT_EXT.has(ext) && !/\.(?:css|scss)$/.test(ext)) continue;
      const text = ext === '.pdf' ? await pdfText(full) : readFileSync(full, 'utf8');
      const lines = text.split('\n');
      const pathRule = NOT_PUBLIC_PATHS.find(([, re]) => re.test(file));
      const ranges = CODE_EXT.has(ext) && !pathRule ? copyRanges(file, text) : null;
      const terms = [...TERMS, ['count-claim', COUNT_CLAIM]];
      for (const [term, re] of terms) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
          const at = m.index;
          const line = lineOf(text, at);
          const lineText = lines[line - 1];
          const col = at - (text.lastIndexOf('\n', at - 1) + 1);
          const code = `${(lines[line - 2] ?? '').trim()} ${lineText}`;
          const local = lineText.slice(Math.max(0, col - 40), col + m[0].length + 40);
          let cls;
          let reason;
          lastSentence = '';
          const reviewed = reviewedFor(file, line, lineText, term);
          if (pathRule) [cls, reason] = ['not-public', pathRule[0]];
          else if (reviewed)
            [cls, reason] = [reviewed.class, `reviewed (line): ${reviewed.reason}`];
          else if (ranges) {
            const r = ranges.find(([s, e]) => at >= s && at < e);
            if (!r) [cls, reason] = ['not-public', 'code: identifier, comment or type'];
            else if (looksLikeToken(r[2]))
              [cls, reason] = ['not-public', 'code: key, slug, path or URL string'];
            else if (/^[`'"]\s*[A-Z]{2,5}\s*[`'"]$/.test(r[2]))
              [cls, reason] = [
                'not-public',
                'routing data: bare discipline code (render sites audited separately)',
              ];
            else if (inUrlOrPath(lineText, col)) [cls, reason] = ['not-public', 'URL or site path'];
            else {
              // Sentence source: the string itself, or for JSX text the enclosing block with tags
              // and {expressions} masked to spaces (offsets kept).
              const src = maskMarkup(text.slice(r[3], r[4])).replace(/\{[^{}]*\}/g, (t) =>
                ' '.repeat(t.length)
              );
              const off = at - r[3];
              [cls, reason] = classifyCopy(
                file,
                term,
                sentenceAt(src, off, off + m[0].length),
                code,
                local
              );
            }
          } else if (/\.(?:html|svg|xml)$/.test(ext) && insideTag(text, at)) {
            [cls, reason] = ['not-public', 'markup: tag name, attribute or id'];
          } else if (inUrlOrPath(lineText, col)) {
            [cls, reason] = ['not-public', 'URL or site path'];
          } else if (/\.mdx?$/.test(ext) && inCodeSpan(lineText, col)) {
            [cls, reason] = ['not-public', 'code: Markdown inline code (slug, key or command)'];
          } else if (/^\s*"iicrc_disciplines":/.test(lineText)) {
            [cls, reason] = ['not-public', 'routing data: bare discipline code list'];
          } else if (
            ext === '.json' &&
            /^\s*"[^"]*$/.test(lineText.slice(0, col)) &&
            /^[^"]*"\s*:/.test(lineText.slice(col))
          ) {
            [cls, reason] = ['not-public', 'code: JSON key'];
          } else if (/^\s*\[?(?:"[A-Z]{2,5}",?\s*)+\]?,?$/.test(lineText)) {
            [cls, reason] = ['not-public', 'routing data: bare discipline code list'];
          } else {
            const src = /\.(?:html|svg|xml)$/.test(ext) ? maskMarkup(text) : text;
            const sentence = ext === '.json' ? lineText : sentenceAt(src, at, at + m[0].length);
            [cls, reason] = classifyCopy(file, term, sentence, code, local);
          }
          hits.push({
            file,
            line,
            term,
            match: m[0],
            cls,
            reason,
            text: lineText.trim().slice(0, 160),
            sentence: lastSentence,
          });
        }
      }
    }
  }
  return hits.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

async function main() {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf('--root');
  const root = rootArg >= 0 ? args[rootArg + 1] : process.cwd();
  const hits = await inventory(root);
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(hits));
    return;
  }
  const counts = {};
  for (const h of hits) counts[h.cls] = (counts[h.cls] ?? 0) + 1;
  const exposures = hits.filter((h) => h.cls === 'exposure');
  console.log(JSON.stringify(counts));
  for (const h of exposures)
    console.log(`EXPOSURE ${h.file}:${h.line} [${h.term}] ${h.reason}: ${h.text}`);
  process.exitCode = exposures.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
