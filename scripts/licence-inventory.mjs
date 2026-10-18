#!/usr/bin/env node
/**
 * Licence inventory (review of fix/industry-faq-licence, 18/10/2026).
 *
 * One exhaustive pass over the public surfaces — app/, src/, public/, docs/marketing and
 * docs/content — for every IICRC discipline code (official list, any case), "certif", "CEC",
 * "accredit", "board-approved" and every unsold-subject word (repair, colour, upholstery,
 * reinstall). Every hit is classified:
 *
 *   not-public  — a test, generated code, a staff-only admin surface, or a hit that is not copy
 *                 (identifier, comment, import path, key, slug, URL, CSS)
 *   legitimate  — copy that matches a named rule below (third-person IICRC fact, provider-level
 *                 or conditional CEC wording, a CARSI-issued certificate, …) or a reviewed entry
 *   exposure    — copy that matches no rule. Must be zero: fix the copy, never widen a rule to
 *                 swallow a claim.
 *
 * TS/TSX files are parsed with the TypeScript compiler, so "copy" means string literals,
 * template text and JSX text — exactly what can reach a page, email or schema.
 *
 * Usage: node scripts/licence-inventory.mjs [--root DIR] [--write]
 *   --write  regenerate docs/compliance/licence-inventory.csv and .md
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

export const SURFACES = ['app', 'src', 'public', 'docs/marketing', 'docs/content'];

/** Official IICRC certification / designation codes (iicrc.org certification list). */
export const IICRC_CODES = (
  'WRT|ASD|AMRT|FSRT|OCT|CCT|CRT|RRT|CCMT|CPT|FCT|HCT|HST|LCT|RCT|SMT|TCST|UFT|RFMT|WFMT|BMI|BMT|' +
  'BCI|CDS|MRS|ISSI|RFI|WFI|WLFI|SCI|MWR|MTC|MSR|JWR|JTC|JSR'
).split('|');

export const TERMS = [
  ['iicrc-code', new RegExp(`\\b(?:${IICRC_CODES.join('|')})\\b`, 'gi')],
  ['certif', /certif\w*|\bcerts?\b|IICRC[- ](?:credentials?|recogni[sz]ed)/gi],
  ['CEC', /\bCECs?\b|\bCEC(?=[-\w])/gi],
  ['accredit', /accredit\w*/gi],
  ['board-approved', /board[- ]approved/gi],
  ['repair', /\brepair\w*/gi],
  ['colour', /\bcolou?r[ -]?(?:repair|correct\w*|restor\w*)|\bcolour\w*|\bdye(?:s|ing)?\b/gi],
  ['upholstery', /upholster\w*/gi],
  ['reinstall', /\bre-?install\w*/gi],
];

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
]);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Path-level not-public: tests, generated code, staff-only admin, styles. */
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
    'model instruction (prompt text, not rendered verbatim; reviewed for licence-safe wording)',
    /^(?:src\/lib\/server\/(?:ai-course-builder|optimize-course-content|assistant-prompt|ai-assistant-context|review-reply-draft|margot-knowledge-base)\.ts|src\/lib\/(?:margot-surface|brand-video-assistant)\.ts|app\/api\/margot\/|src\/lib\/server\/frontdesk\/)/,
  ],
  ['instructor-only surface', /^app\/\(dashboard\)\/instructor\//],
  ['internal ops check (CEC drift report)', /^src\/lib\/server\/live-cec-check\.ts$/],
  ['instructor course builder', /^src\/components\/lms\/CourseBuilder\.tsx$/],
];

/**
 * Copy that is legitimate. Each rule names WHY. Tested against the copy string plus its source
 * line (so a computed value beside the words is visible), case-insensitively.
 * `path` limits a rule to matching files; `notPath` excludes files.
 */
const INDUSTRY = /^app\/\(public\)\/industries\//;
/**
 * Forms that are never legitimate, whatever else the line says: a static count of CEC courses
 * (CEC counts come from data/seed/cec-approvals.json at request time), course-level approval
 * language, or selling certification.
 */
export const BLOCK_RULES = [
  {
    name: 'static CEC course count',
    terms: ['CEC', 'accredit'],
    re: /\b\d+\+?\s+(?:IICRC )?CEC\b|\bCEC[^.|]{0,40}\b\d+\+? courses|\b\d+\+? (?:available |approved )?courses with CEC/i,
  },
  {
    name: 'course-level IICRC approval claim',
    terms: ['board-approved', 'CEC', 'accredit', 'certif'],
    re: /board[- ]approved|approved by the IICRC board|IICRC[- ]approved CARSI courses/i,
  },
  {
    name: 'CEC descriptor scoped to a topic or audience (implies those courses carry CECs)',
    terms: ['CEC', 'accredit'],
    re: /IICRC CEC (?:Accredited )?(?:online )?(?:courses?|training)\s+(?:(?:in|on)\b|as CPD|relevant to|apply to|across \d|for (?!(?:cleaning and )?restoration professionals|Australian technicians)[A-Za-z])|IICRC CEC courses through CARSI|Earn CECs, download|across \d+ disciplines/i,
  },
  {
    name: 'promises CECs with no approval condition in the same sentence',
    terms: ['CEC'],
    fn: (ctx) =>
      !/cec_hours|cecHours|cecLabel/.test(ctx) &&
      (
        ctx.match(
          /[^.!?]*\bearn(?:s|ing)? (?:real )?(?:IICRC )?(?:CECs?|Continuing Education Credits)\b[^.!?]*/gi
        ) ?? []
      ).some(
        (sentence) =>
          !/approv|\$\{|cec_hours|cecHours|maintain|renew|toward(?:s)? (?:your|an existing)|passing score|\bnot\b/i.test(
            sentence
          )
      ),
  },
  {
    name: 'sells certification',
    terms: ['certif'],
    re: /\bget certified\b|certify your (?:team|staff|network|crew)|IICRC certs that|become IICRC[- ]certified with/i,
  },
];

export const LEGIT_RULES = [
  {
    name: 'prospect search keyword or pain point (third-person research data)',
    terms: ['certif'],
    path: /^docs\/marketing\/industry-icp-database\.json$/,
    re: /(?:^|\s)"[\w ]*certification[\w ]*",?\s*$|lack of certifications|require certified contractors|Is IICRC recognised/,
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
    name: 'third-person IICRC certification named with its code',
    terms: ['iicrc-code'],
    re: /IICRC [A-Z][A-Za-z ]+ Technician \([A-Z]{2,5}\)|\b[A-Z]{2,5}(?: and [A-Z]{2,5})? commonly required by|\b[A-Z]{2,5} (?:is|are) (?:an? )?IICRC|certifications: \['IICRC [A-Z]|IICRC [A-Z]{2,5} certification|[A-Z]{2,5} certification is recommended|certifications including [A-Z]{2,5} \(|Environ Sci|Sci Technol|IICRC certifications are most common in your team/,
  },
  // --- certification
  {
    name: 'CARSI-issued certificate (document), not certification',
    terms: ['certif'],
    re: /\bcertificates?\b|certif(?:y|ies) that|This is to certify/i,
  },
  {
    name: 'third-person IICRC certification: obtained through IICRC schools, held, renewed or required by others',
    terms: ['certif'],
    re: /IICRC[- ]approved schools|approved by the IICRC|schools? (?:and|&) exam|not (?:an? )?IICRC certifications?|does not (?:deliver|award|issue|provide|sell|make you)|does not sell IICRC|IICRC certification (?:is|itself|evidence|numbers?)|no CARSI course is IICRC certification|(?:your|an existing|existing|already hold|hold(?:s|ing)?|maintain\w*|keep\w*|renew\w*|recertif\w*|expir\w*|lapse\w*)\b[^.]{0,30}certif|certif\w*[^.]{0,30}(?:you (?:already )?hold|renewal|expir|number|on file|history|emails?|status|cockpit|cycle|date)|Already IICRC certified|No (?:Current )?Certifications?|certifications yet|IICRC-certified (?:restoration practitioner|technicians|firms|contractors|restorer)|certified technicians who already|Certification \(IICRC\)|Institute of Inspection,? Cleaning and Restoration Certification|IICRC certification disciplines|IICRC certifications? (?:help|align|required|is|are|reference|it expects|procurement|government|tender)|(?:Do|Does) [^?]{0,40}need[^?]{0,20}certification|certification to clean carpets|'carpet cleaning certification(?: Australia)?'|legally required to hold IICRC|Does CARSI deliver IICRC certification|Does a CARSI course make me IICRC certified|certification[- ](?:course|training)|bought once|One IICRC certification|A certification is|certification is held|Current Certification|certification this cycle|'IICRC certifications',|IICRC certifications, and|disciplines, IICRC certifications|standards and certification body|panel sets its own certification|certifications it requires|certification requirements?|certifications procurement officers|The certifications procurement|requirements, certifications|procurement, certifications|IICRC certification is increasingly listed|IICRC provides technician-level certifications|maintain certification status|Certified Flooring|Certified Building|Certification and Trust|certification, continuing education|Using certification as a badge|Answer certification questions|certification, CEC, and trust|IICRC certifications for|holding any IICRC certification|certified staff maintain certification|certification affect pay|CARSI certifies|certify the numbers|certifies the gas|certified under the relevant|licensed practitioner|Sign-off|engineer-rated|VSB14|Load Restraint|modification code|certification \(amortised\)|Training\/certification|IICRC\/CARSI courses|recommended: IICRC|IICRC [A-Z]{2,5} certification|certification number|certification documents|holds IICRC certification|IICRC-certified restorer|Restoration Certification$|Certified Restoration Contractors|Audit current certifications|certification table|IICRC certification evidence|their IICRC certifications|active IICRC certifications|Confined Space Entry certification|Assess your team's certifications|certifications are the entry ticket|Required IICRC Certifications|Essential Certifications by Service Type|\| Certification +\||ongoing education to maintain|CECs per certification|Current certification status|implication CARSI certifies|imply safety certification|overclaiming certification|overstating certification|certification status changes|Guide to IICRC Certification|IICRC Certification Guide|IICRC Certification explained|certification versus continuing education|they (?:already )?hold|verify a candidate's CARSI credential|^- 20\d\d-\d\d-\d\d:|skills and certifications valued|training and certification costs|fire services certification|IICRC [A-Z]{2,5} certification|[A-Z]{2,5} certification is recommended|Lists IICRC certification|Certified Firms|logo rights attach to Certified|maintenance of IICRC certifications|Certification mix|certified staff maintain|certification queries|pricing, certification|certification is not legally required|certifications: \[/i,
  },
  {
    name: 'other bodies’ certification (ISO, HACCP, gas, vehicle, Cert IV)',
    terms: ['certif'],
    re: /\b(?:ISO|NATA|Green Star|NABERS|SafeWork|WHS|HACCP|electrical|asbestos|licen[cs]ed?|white card|first aid|organic|SSL|TLS|ISSA|Cert IV|gasfitter|AS\/NZS|engineer|truck-mount certification scheme)\b/i,
  },
  // --- CEC
  {
    name: 'provider-level CEC standing',
    terms: ['CEC', 'accredit'],
    re: /CARSI (?:is an?|delivers|offers|provides)[^.]{0,60}IICRC CEC Accredited(?! (?:online )?(?:training|courses?) in )|IICRC CEC Accredited[\w -]{0,30}provider|accredited (?:IICRC )?CEC provider|CARSI is an accredited IICRC|IICRC CEC Platform|IICRC CEC Accredited ·|IICRC CEC Accredited<\/(?:b|strong)>|CEC accreditation and industry|from an IICRC CEC Accredited provider|CEC Accredited \*\*provider\*\*/i,
  },
  {
    name: 'catalogue-wide CLAUDE.md descriptor (not scoped to a topic or audience)',
    terms: ['CEC', 'accredit'],
    re: /IICRC CEC Accredited (?:restoration )?(?:courses|training|continuing education|learning|completions)\b(?! for)|\bIICRC CEC (?:courses|education)\b(?! for)|IICRC CEC courses online|IICRC Continuing Education Credit \(CEC\) courses|term="CEC" \/> accredited courses for people|IICRC CECs?['"]?,?$|'IICRC CEC'|IICRC CEC Accredited — continuing education credits, not IICRC certification|CEC Accredited courses\.|CEC continuing education, not an|IICRC CEC Accredited restoration CEC|IICRC CEC Accredited (?:courses|continuing education) for (?:cleaning and )?restoration professionals|IICRC CEC Accredited restoration courses for Australian technicians|Restoration training — IICRC CEC Accredited|IICRC CEC provider\b/i,
    notPath: INDUSTRY,
  },
  {
    name: 'conditional or registry-computed CEC',
    terms: ['CEC', 'accredit'],
    re: /(?:only|where|when|if|once|until)\b[^.]{0,80}\b(?:IICRC (?:has )?approv|approved by the IICRC|approv)|IICRC (?:has )?approved|approved (?:IICRC )?CEC|with approved CEC|CEC-eligible|not eligible for IICRC CEC|any IICRC CECs that|where it carries any|fail-closed|\bno CEC|not IICRC CEC|NOT for IICRC CEC|Is this an IICRC CEC course|cec-approvals|CEC hours only|IICRC CEC approval|a CEC approval|label: 'On approved courses'|label: 'Hours only on approved courses'|IICRC-Approved|IICRC-approved|Per-course CEC approval|course-level CEC|only if and when|only where that course holds|CEC approval is course-specific/i,
  },
  {
    name: 'registry-computed CEC value beside the words',
    terms: ['CEC', 'accredit'],
    re: /\$\{[^}]*[cC]ec|\{[^}'"]*(?:cec_|[a-z]Cec|cec[A-Z])[^}]*\}|cecValue|cecLabel|cecHours|cec_hours|totalCecs|formatCec|cecInView|hasCec|alsoEarnsCec/,
  },
  {
    name: 'learner CEC record, tracking and renewal (the learner’s own IICRC certification)',
    terms: ['CEC'],
    re: /CEC (?:hours?|hrs|credits?|progress|submission|submitted|summary|totals?|records?|evidence|details|status|target|requirement|reminders?|tracking|log|by discipline|availability|need|Needs|calculator|values?)\b|CECs? (?:earned|remaining|needed|total|do I have|Earned|required|every|toward|per certification)|How many CECs|Renew my CECs|maintaining CECs|CEC renewal|IICRC CEC (?:progress|hours|totals|summary|records?)|Training (?:&|&amp;) CEC|Any CEC status|toward (?:your )?(?:IICRC )?CECs?|IICRC CECs toward maintaining|track\w*[^.]{0,30}CEC|CEC completions|report\w* CEC|verify CEC|to earn CECs|Keep your CECs current|evidence of continuing education|CEC deadline|CECs Explained|does \*\*not\*\* award IICRC|Present training, CECs|professional continuing education \(CECs\)|CEC-compliant framing|Honest certification, CEC|Plan CEC courses and submit your renewal|CECs<\/b> toward maintaining/i,
  },
  {
    name: 'explains how CECs work (third-person IICRC process)',
    terms: ['CEC'],
    re: /How do (?:IICRC )?CECs work|Do CARSI courses count toward IICRC CECs|What IICRC and CECs are|confusing CECs|CECs and customer trust|CARSI, CECs and IICRC CEC Accredited learning|about CECs|online CECs|continuing education through CECs|Which course counts for my CECs|CEC and pathway questions|CEC reminders|CEC need|IICRC CEC references|dual value|Courses (?:&|&amp;) CECs|IICRC CECs, or team training|Continuing Education Credits? \(CECs?\)|CEC \(Continuing Education Credit\)|CEC accreditation|no CEC-hours claims|not state or imply|IICRC CEC cost|Also earns IICRC CECs/i,
  },
  // --- accreditation (other)
  {
    name: 'negated or other-body accreditation',
    terms: ['accredit'],
    re: /not (?:an? )?(?:RTO|registered training)|nationally accredited|not (?:IICRC )?(?:CEC )?accredited|non-accredited|accredited (?:VET|qualification|training organisation)|ASQA|\bRTO\b|NRPG-accredited|park accreditation bodies|management system accreditation|Accreditation renewal periods|no accredited Australian|overclaim accreditation|invent accreditation|rather than \*accredited\*|^## Accreditation$|Accreditation$/i,
  },
  // --- unsold subjects
  {
    name: 'repair of a building, leak or machine (not a course offer)',
    terms: ['repair'],
    re: /(?:leak|pipe|plumb|roof|burst|structur|building|equipment|machine|regulator|pump|float|defect|wall|house|flood)\w*[^.]{0,60}\brepair|\brepair\w*[^.]{0,60}(?:leak|pipe|roof|trade|building|equipment|machine|house|flood|owner|replace|reseal|scope)|insurer-funded repair|as well as the repair|after the repair|repair networks|^repair work\.|does not cover interior fabric repair/i,
  },
  {
    name: 'IICRC designation name quoted third-person (Color Repair / Carpet Repair and Reinstallation Technician)',
    terms: ['repair', 'colour', 'reinstall'],
    re: /Colou?r Repair Technician|fullName: 'Colour Repair'|Carpet Repair (?:and|&) Reinstallation Technician|carpet colour correction|CRT — Colour repair|CARSI sells no colour-repair course|a carpet repair and reinstallation topic removed/,
  },
  {
    name: 'colour as a general word (dye stability, colourless gas)',
    terms: ['colour'],
    re: /dye stabil|colourless|colourfast|colour[- ]?(?:coded|contrast|scheme|palette|change|bleed|loss|fading)|odour, colour, metre/i,
  },
  {
    name: 'upholstery in the real CCW hands-on workshop, a standard title or a business type (not a course offer)',
    terms: ['upholstery'],
    re: /Professional Upholstery Cleaning|Upholstery (?:fibres|—|·)|· Upholstery|fibre, chemistry,? (?:methods, )?upholstery|chemistry, upholstery|upholstery and business modules|residential, commercial, upholstery|Residential, Commercial, Upholstery|upholstery, hard floors|Carpet (?:&|and) [Uu]pholstery (?:Cleaning|cleaning|cleaner|Training|training)|upholstery, rugs|rugs, upholstery|odour, rugs, upholstery|carpet, upholstery or customer trust|hard floors, upholstery|Upholstery, rug, pet stain|damaging carpet, upholstery/i,
  },
  {
    name: 'reinstallation as the IICRC designation name',
    terms: ['reinstall'],
    re: /Reinstallation Technician/i,
  },
];

/**
 * File-level reviewed decisions: every hit of these terms in these files was read and is the
 * stated kind. Keep this short — each entry is a judgement a reviewer can re-check.
 */
export const REVIEWED_FILES = [
  [
    /^src\/lib\/lms\/course-audience\.ts$/,
    ['CEC'],
    'CEC audience line rendered only when the course has cec_hours (an in-force approval)',
  ],
  [
    /^docs\/marketing\/au-restoration-training-benchmark-survey-2026\.md$/,
    ['certif', 'CEC', 'iicrc-code'],
    'survey questions about respondents’ own IICRC certifications (third-person)',
  ],
  [
    /^src\/components\/lms\/(?:CourseCard|EnrolledCourseList)\.tsx$/,
    ['CEC', 'accredit'],
    'label rendered only when the course carries approved CEC hours (cec_hours / cecLabel from the registry)',
  ],
  [
    /^(?:app\/\(dashboard\)\/dashboard\/|src\/components\/dashboard\/|app\/\(public\)\/verify\/|src\/components\/lms\/(?:RenewalCockpit|CECProgressRing|IICRCIdentityCard|EnrolledCourseList|CourseCompletionBanner|CredentialVerificationPageContent|OnboardingWizard|LearningMomentumLoop|FloatingChat)\.tsx|src\/lib\/server\/(?:iicrc-cec-email|iicrc-cec-submission|recert-reminders|renewal-summary|proof-pack-pdf|learner-dashboard-data)\.ts)/,
    ['CEC', 'certif', 'iicrc-code'],
    'learner’s own CEC record, submission or IICRC renewal (computed per learner)',
  ],
  [
    /^src\/components\/lms\/onboarding-flow\.tsx$/,
    ['iicrc-code', 'certif', 'repair', 'colour'],
    'learner states which IICRC certifications they hold (third-person, issuer’s subjects)',
  ],
  [
    /^src\/components\/tools\/CECCalculator\.tsx$/,
    ['CEC', 'certif', 'repair', 'colour', 'iicrc-code'],
    'renewal calculator for a learner’s existing IICRC certification; issuer’s names; rule from iicrc.org/ausfaqs',
  ],
  [
    /^(?:src\/components\/ui\/AcronymTooltip\.tsx|src\/lib\/iicrc-discipline-display\.ts|src\/components\/lms\/diagrams\/IICRCDisciplineMap\.tsx|src\/lib\/iicrc\/)/,
    ['iicrc-code', 'certif', 'repair', 'colour', 'reinstall', 'upholstery', 'CEC'],
    'third-person IICRC designation and standard names, quoted from the issuer',
  ],
  [
    /^app\/\(public\)\/restoration-training-cost-australia\//,
    ['certif', 'CEC', 'iicrc-code'],
    'cost comparison written to the licence rule: third-person IICRC certification fee vs CARSI courses',
  ],
  [
    /^app\/\(public\)\/(?:privacy|terms|support)\/|^app\/unsubscribe\//,
    ['certif', 'CEC'],
    'legal / support process: CEC reporting for a learner’s existing IICRC certification',
  ],
  [
    /^(?:app\/\(public\)\/resources\/government-restoration-panels\/|docs\/marketing\/lead-magnets\/government-contractor-guide\.md)/,
    ['certif', 'CEC', 'iicrc-code', 'repair', 'reinstall', 'accredit'],
    'guide to the IICRC certifications government panels ask for (third-person; CARSI named only as CEC training)',
  ],

  [
    /^docs\/content\/scoping-quoting-course\/quiz-questions\.md$/,
    ['certif'],
    'quiz distractors and third-person IICRC facts',
  ],
  [
    /^public\/courses\/ccw-carsi-truckmount\//,
    ['certif', 'accredit', 'repair', 'colour', 'upholstery', 'iicrc-code'],
    'vehicle, gas and equipment compliance (not IICRC); equipment repair',
  ],
];

/** Owned by another branch or thread: not edited here, listed for Phill. */
export const OWNED_ELSEWHERE = [
  [
    /^app\/\(public\)\/subscribe\//,
    'membership branch owns app/(public)/subscribe/* (brief: do not touch)',
  ],
  [/^src\/components\/membership\//, 'membership branch owns src/components/membership/*'],
  [
    /^(?:src\/components\/designations\/|app\/\(public\)\/designations\/)/,
    'feat/designations-live owns the designations registry and its alsoEarnsCec flag',
  ],
  [
    /^app\/\(public\)\/testimonials\//,
    'reviews thread owns testimonials (brief: do not touch reviews)',
  ],
];

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
        ranges.push([
          node.getStart(sf),
          node.getEnd(),
          text.slice(node.getStart(sf), node.getEnd()),
        ]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return ranges;
}

/** A string that is a key, slug, path, URL or enum value rather than prose. */
function looksLikeToken(raw) {
  const s = raw.replace(/^[`'"]|[`'"]$/g, '').trim();
  if (/^https?:\/\//.test(s) && !/\s/.test(s)) return true;
  if (/\s/.test(s)) return false;
  // A bare discipline code is data; whether it is RENDERED is checked by the rendered tests.
  return /^[\w\-./:@#?=&{}$[\]*]+$/.test(s) && !/^[A-Z]{2,5}$/.test(s);
}

/** Whether column `col` of `line` falls inside a URL or a /site/path token. */
function inUrlOrPath(line, col) {
  for (const m of line.matchAll(/(?:https?:\/\/|(?<![\w])\/)[^\s)"'`|<>]+/g)) {
    if (col >= m.index && col < m.index + m[0].length) return true;
  }
  return false;
}

function lineOf(text, offset) {
  let n = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export function classifyCopy(file, term, context) {
  const owned = OWNED_ELSEWHERE.find(([re]) => re.test(file));
  if (owned) return ['owned-elsewhere', owned[1]];
  for (const r of BLOCK_RULES) {
    if (r.terms.includes(term) && (r.fn ? r.fn(context) : r.re.test(context)))
      return ['exposure', r.name];
  }
  const reviewed = REVIEWED_FILES.find(([re, terms]) => re.test(file) && terms.includes(term));
  if (reviewed) return ['legitimate', `reviewed file: ${reviewed[2]}`];
  for (const r of LEGIT_RULES) {
    if (!r.terms.includes(term)) continue;
    if (r.path && !r.path.test(file)) continue;
    if (r.notPath && r.notPath.test(file)) continue;
    if (r.re.test(context)) return ['legitimate', r.name];
  }
  return ['exposure', 'no rule matches'];
}

export function inventory(root = process.cwd()) {
  const hits = [];
  for (const surface of SURFACES) {
    for (const full of walk(join(root, surface))) {
      const file = relative(root, full).split('\\').join('/');
      const ext = extname(file).toLowerCase();
      if (!CODE_EXT.has(ext) && !TEXT_EXT.has(ext) && !/\.(?:css|scss)$/.test(ext)) continue;
      const text = readFileSync(full, 'utf8');
      const pathRule = NOT_PUBLIC_PATHS.find(([, re]) => re.test(file));
      const ranges = CODE_EXT.has(ext) && !pathRule ? copyRanges(file, text) : null;
      for (const [term, re] of TERMS) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
          const at = m.index;
          const line = lineOf(text, at);
          const lineText = text.split('\n')[line - 1];
          let cls;
          let reason;
          if (pathRule) [cls, reason] = ['not-public', pathRule[0]];
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
            else {
              [cls, reason] = classifyCopy(
                file,
                term,
                `${(text.split('\n')[line - 2] ?? '').trim()} ${r[2]} ${lineText}`
              );
            }
          } else if (inUrlOrPath(lineText, at - (text.lastIndexOf('\n', at - 1) + 1))) {
            [cls, reason] = ['not-public', 'URL or site path'];
          } else if (/^\s*"iicrc_disciplines":/.test(lineText)) {
            [cls, reason] = ['not-public', 'routing data: bare discipline code list'];
          } else if (
            ext === '.json' &&
            /^\s*"[^"]*$/.test(lineText.slice(0, lineText.indexOf(m[0]))) &&
            /^[^"]*"\s*:/.test(lineText.slice(lineText.indexOf(m[0])))
          ) {
            [cls, reason] = ['not-public', 'code: JSON key'];
          } else {
            [cls, reason] =
              /^\s*(?:"[A-Z]{2,5}",?\s*)+\]?,?$/.test(lineText) ||
              /^\s*\[(?:"[A-Z]{2,5}",?\s*)+\],?$/.test(lineText)
                ? ['not-public', 'routing data: bare discipline code list']
                : classifyCopy(
                    file,
                    term,
                    `${(text.split('\n')[line - 2] ?? '').trim()} ${lineText}`
                  );
          }
          hits.push({
            file,
            line,
            term,
            match: m[0],
            cls,
            reason,
            text: lineText.trim().slice(0, 160),
          });
        }
      }
    }
  }
  return hits.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

function csvCell(s) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function main() {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf('--root');
  const root = rootArg >= 0 ? args[rootArg + 1] : process.cwd();
  const hits = inventory(root);
  const counts = {};
  for (const h of hits) counts[h.cls] = (counts[h.cls] ?? 0) + 1;
  const exposures = hits.filter((h) => h.cls === 'exposure');
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(hits));
    return;
  }
  if (args.includes('--write')) {
    mkdirSync(join(root, 'docs/compliance'), { recursive: true });
    writeFileSync(
      join(root, 'docs/compliance/licence-inventory.csv'),
      [
        'file,line,term,match,class,reason,text',
        ...hits.map((h) =>
          [h.file, h.line, h.term, h.match, h.cls, h.reason, h.text].map(csvCell).join(',')
        ),
      ].join('\n') + '\n'
    );
  }
  console.log(JSON.stringify(counts));
  for (const h of exposures) console.log(`EXPOSURE ${h.file}:${h.line} [${h.term}] ${h.text}`);
  process.exitCode = exposures.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
