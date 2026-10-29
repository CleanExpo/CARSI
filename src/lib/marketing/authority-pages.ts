import { healthcareRecommendedSlugs } from '@/lib/marketing/industry-track1-topics';

/**
 * Registry for the six /for/<industry> authority pages (CARSI Authority Machine, slice 3).
 *
 * Every page starts as a `draft`: noindex, nofollow, absent from the sitemap. A page becomes
 * indexable only through a committed change that sets `status: 'approved'` with `approvedBy`
 * and `approvedAt` filled in, which `validateAuthorityPage` checks.
 *
 * Claims: only facts opened at the primary source (tag `O`) on `lastVerified`. Anything the
 * research marked secondary (`S`) or UNVERIFIED is not in this file. Prices are never typed
 * here; the course grid reads them from the catalogue. Modules not yet built carry no price.
 */

export type AuthorityStatus = 'draft' | 'approved';

export interface AuthorityClaim {
  /** The sentence shown on the page. */
  text: string;
  sourceTitle: string;
  publisher: string;
  sourceUrl: string;
  tag: 'O';
  /** ISO date the source was last opened. */
  lastVerified: string;
}

export interface AuthorityPlannedModule {
  title: string;
  minutes: number | null;
  status: 'not_built';
}

export type AuthorityIcon = 'hardhat' | 'clipboard' | 'building' | 'stethoscope' | 'home' | 'spray';
export type AuthorityCardIcon = 'shield' | 'droplets' | 'wind' | 'clipboard';

export interface AuthorityPageEntry {
  slug: string;
  status: AuthorityStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  audience: string;
  /** Lower-case label used mid-sentence by shared components ("Live courses for builders"). */
  shortAudience: string;
  icon: AuthorityIcon;
  title: string;
  metaDescription: string;
  keywords: string[];
  headline: string;
  headlineAccent: string;
  description: string;
  topics: string[];
  whyCards: { icon: AuthorityCardIcon; title: string; description: string }[];
  claims: AuthorityClaim[];
  /** What CARSI does and does not claim on this page. */
  scopeNote: string;
  bundle: { publishedSlugs: string[]; plannedModules: AuthorityPlannedModule[] };
  faqs: { question: string; answer: string }[];
  /** The existing, live /industries page for this audience. */
  livePageHref: string;
  livePageLabel: string;
}

const VERIFIED = '2026-10-20';

const NSW_CPD_URL =
  'https://www.nsw.gov.au/business-and-economy/licences-and-credentials/building-and-trade-licences-and-registrations/continuing-professional-development/for-builders-and-swimming-pool-builders';
const NSW_AGENT_CPD_URL =
  'https://www.nsw.gov.au/housing-and-construction/property-professionals/working-as-an-agent/continuing-professional-development';
const SWA_CODE_URL =
  'https://www.safeworkaustralia.gov.au/sites/default/files/2026-03/modelcop_managing_risks_biological_hazards_mar2026.docx';
const VHBA_URL =
  'https://www.vhba.vic.gov.au/sites/default/files/2025-08/VHBA-Health-technical-advice-HTA-2024-002-Responding-to-flooding-events-restoration-for-healthcare-facilities.pdf';

const swaCode = (text: string): AuthorityClaim => ({
  text,
  sourceTitle: 'Model Code of Practice: Managing the risks of biological hazards at work (March 2026)',
  publisher: 'Safe Work Australia',
  sourceUrl: SWA_CODE_URL,
  tag: 'O',
  lastVerified: VERIFIED,
});

const iicrcFaq = {
  question: 'Does CARSI deliver IICRC certification?',
  answer:
    'No. CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page. IICRC certification itself is obtained only through schools and examinations approved by the IICRC.',
};

export const authorityPages: AuthorityPageEntry[] = [
  {
    slug: 'nsw-builders',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'NSW licensed builders',
    shortAudience: 'builders',
    icon: 'hardhat',
    title: 'Water damage and moisture training for NSW builders',
    metaDescription:
      'Self-paced courses on moisture, drying and water-damaged buildings for NSW licensed builders and the crews who reinstate after floods, storms and leaks.',
    keywords: ['builder water damage course NSW', 'moisture training for builders'],
    headline: 'Know the moisture before',
    headlineAccent: 'you close the wall',
    description:
      'For NSW licensed builders and repair crews who reinstate after floods, storms and leaks. Self-paced courses on moisture readings, drying and water-damaged buildings.',
    topics: ['Moisture readings', 'Drying basics', 'Water damage', 'Mould risk'],
    whyCards: [
      {
        icon: 'droplets',
        title: 'Reinstating over wet material',
        description:
          'Lining, flooring and cabinetry go back over framing that looks dry. Learn how moisture is measured and what a dry standard means before the next coat of paint.',
      },
      {
        icon: 'clipboard',
        title: 'Records you can keep',
        description:
          'A CARSI completion record shows what you studied and when. Check with Building Commission NSW what counts for your licence.',
      },
      {
        icon: 'shield',
        title: 'Built around the job',
        description:
          'Short, self-paced courses you can open on a phone between sites, with a clear path from task to course.',
      },
    ],
    claims: [
      {
        text: 'Licensed NSW builders must complete 12 points of continuing professional development a year. Building Commission NSW lists interactive online learning at 1 point per hour, and Technical issues is one of the permitted topics.',
        sourceTitle: 'Continuing professional development for builders and swimming pool builders',
        publisher: 'NSW Government',
        sourceUrl: NSW_CPD_URL,
        tag: 'O',
        lastVerified: VERIFIED,
      },
    ],
    scopeNote:
      'CARSI does not present any current course as NSW builder continuing professional development and does not claim that a course earns points. Check the Building Commission NSW guidelines for what counts. The modules listed as being built are not for sale yet.',
    bundle: {
      publishedSlugs: [
        'water-damage-essentials',
        'introduction-to-water-damage-restoration',
        'moisture-meters-readings-and-dry-standards',
        'moisture-mould-and-indoor-air-quality-understanding-the-link',
        'introduction-to-digital-moisture-mapping',
        'introduction-to-water-damage-principles',
      ],
      plannedModules: [
        {
          title: 'Water-damaged homes: what the builder must check before reinstating',
          minutes: 60,
          status: 'not_built',
        },
        {
          title: 'Insurance repair after flood and storm: Category 3 water, safety and documentation',
          minutes: 60,
          status: 'not_built',
        },
        { title: 'Mould risk in remedial waterproofing', minutes: 60, status: 'not_built' },
      ],
    },
    faqs: [
      {
        question: 'Do these courses count towards my NSW builder learning requirement?',
        answer:
          'CARSI does not make that claim for any current course. Building Commission NSW sets what counts, so check its guidelines before you rely on any provider.',
      },
      {
        question: 'Who are the current courses written for?',
        answer:
          'Restoration technicians first. Builders and reinstatement crews can use them to understand moisture, drying and water damage, but they are not written as builder licence courses.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/construction',
    livePageLabel: 'Construction industry page',
  },
  {
    slug: 'insurance-claims-staff',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'Insurance claims staff and loss adjusters',
    shortAudience: 'claims staff and loss adjusters',
    icon: 'clipboard',
    title: 'Water damage knowledge for insurance claims staff',
    metaDescription:
      'Self-paced courses on water damage, moisture readings and drying for insurance claims staff, loss adjusters and assessors.',
    keywords: ['water damage training claims staff', 'loss adjuster water damage course'],
    headline: 'Read the drying file',
    headlineAccent: 'with confidence',
    description:
      'For claims staff, loss adjusters and assessors who review water-damage scopes. Self-paced courses on categories, classes, moisture readings and drying goals.',
    topics: ['Water categories', 'Moisture readings', 'Drying goals', 'Scope review'],
    whyCards: [
      {
        icon: 'clipboard',
        title: 'Spot a scope that does not fit',
        description:
          'Learn what a drying log should show, so you can see when a scope does not match the water category or the materials involved.',
      },
      {
        icon: 'droplets',
        title: 'Know when to ask for an expert',
        description:
          'Understand the limits of a site visit and when an independent expert opinion is the right next step.',
      },
      {
        icon: 'shield',
        title: 'Completion records',
        description:
          'Each course gives a completion record with the course name and date, which you can file with your own training records.',
      },
    ],
    claims: [
      {
        text: 'Under the ANZIIF CIP points scheme, members can record online continuing education with self-assessment at 1 point per hour, up to 15 points per activity, and to record non-ANZIIF training.',
        sourceTitle: 'CIP points',
        publisher: 'ANZIIF',
        sourceUrl: 'https://anziif.com/membership/certified-insurance-professionals/cip-points',
        tag: 'O',
        lastVerified: VERIFIED,
      },
      {
        text: 'The 2020 General Insurance Code of Practice says insurers must make sure employees and distributors receive appropriate education and training (clause 28), and that service suppliers must reasonably satisfy the insurer that they and their employees are qualified by education, training or experience (clause 38). Check the current edition of the Code.',
        sourceTitle: 'General Insurance Code of Practice (published 1 January 2020)',
        publisher: 'Insurance Council of Australia',
        sourceUrl: 'https://www.ing.com.au/pdf/insurance/GICOP.pdf',
        tag: 'O',
        lastVerified: VERIFIED,
      },
    ],
    scopeNote:
      'CARSI does not claim that ANZIIF, AICLA or any insurer has reviewed or recognised any course. ANZIIF members record their own learning under ANZIIF rules, so check those rules yourself. Nothing on this page states that a CARSI course satisfies a clause of the Code. The module listed as being built is not for sale yet.',
    bundle: {
      publishedSlugs: [
        'introduction-to-water-damage-restoration',
        'introduction-to-water-damage-in-commercial-buildings',
        'introduction-to-water-damage-principles',
        'introduction-to-forensic-investigations-for-water-losses',
        'introduction-to-water-damage-estimating',
        'moisture-meters-readings-and-dry-standards',
      ],
      plannedModules: [
        {
          title:
            'Reading a water-damage job file: categories, classes, moisture readings and drying goals',
          minutes: 60,
          status: 'not_built',
        },
      ],
    },
    faqs: [
      {
        question: 'Are these courses written for claims staff?',
        answer:
          'The current courses are written for restoration technicians. Claims staff can use them to learn how water damage is measured and dried. A module written for claims staff is being built.',
      },
      {
        question: 'Can I record a CARSI course in my ANZIIF points?',
        answer:
          'That is a decision for you under ANZIIF rules. CARSI does not claim ANZIIF recognition of any course. Keep the completion record and check the ANZIIF page linked above.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/insurance',
    livePageLabel: 'Insurance industry page',
  },
  {
    slug: 'facility-managers',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'Facility managers and building owners',
    shortAudience: 'facility managers and building owners',
    icon: 'building',
    title: 'Water damage and mould training for facility managers',
    metaDescription:
      'Self-paced courses on water damage, moisture and mould for facility managers and building owners, with sources for the biological hazards code of practice.',
    keywords: ['facility manager mould training', 'building manager water damage course'],
    headline: 'Direct the first response',
    headlineAccent: 'to a leak or flood',
    description:
      'For facility managers and building owners who direct the response to a leak or flood. Self-paced courses on commercial water damage, moisture and mould.',
    topics: ['First response', 'Commercial buildings', 'Mould and air quality', 'Choosing a restorer'],
    whyCards: [
      {
        icon: 'droplets',
        title: 'Direct the first response',
        description:
          'Know what to stop, document and start drying in the first hours, and what to hand to a restorer.',
      },
      {
        icon: 'wind',
        title: 'Mould and building air',
        description:
          'Understand how moisture, ventilation and air handling connect, so a leak does not become a mould problem.',
      },
      {
        icon: 'clipboard',
        title: 'Records for your files',
        description:
          'A completion record names the course and the learner, ready to file beside your own WHS records.',
      },
    ],
    claims: [
      swaCode(
        'The code says a person conducting a business or undertaking must provide any information, training, instruction or supervision that is necessary for reasonably foreseeable biological hazards. It must be suitable and adequate, and should be provided by a person with appropriate knowledge and expertise.'
      ),
      swaCode(
        'The code names mould-contaminated wall linings and demolishing a mouldy or water-damaged building in its hazard-identification checklist, and lists water-damaged buildings with mould growth as an exposure source.'
      ),
      swaCode(
        'Duties are shared in multi-tenant buildings. Shopping centres are named, and duty holders must consult, cooperate and coordinate.'
      ),
    ],
    scopeNote:
      'A model code of practice applies only where your state or territory has adopted it. Check which version applies to your building. CARSI courses do not replace your own WHS obligations or professional advice. The modules listed as being built are not for sale yet.',
    bundle: {
      publishedSlugs: [
        'introduction-to-drying-health-care-facilities',
        'introduction-to-drying-educational-and-institutional-sites',
        'introduction-to-drying-industrial-and-manufacturing-sites',
        'introduction-to-water-damage-in-commercial-buildings',
        'moisture-mould-and-indoor-air-quality-understanding-the-link',
        'introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
      ],
      plannedModules: [
        { title: 'Water first response for building managers', minutes: 60, status: 'not_built' },
        {
          title: 'Mould duties under the biological hazards code',
          minutes: 60,
          status: 'not_built',
        },
        { title: 'Choosing and overseeing a restorer', minutes: 60, status: 'not_built' },
      ],
    },
    faqs: [
      {
        question: 'Who is this page for?',
        answer:
          'Facility managers, building managers and owners who arrange the response to a leak, flood or mould finding. It is not a replacement for a restorer or a hygienist.',
      },
      {
        question: 'Does the code of practice apply in my state?',
        answer:
          'It applies only where your state or territory has adopted it. Check with your WHS regulator, and use the Safe Work Australia source linked above.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/facility-management',
    livePageLabel: 'Facility management industry page',
  },
  {
    slug: 'healthcare-facilities',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'Victorian healthcare facilities',
    shortAudience: 'healthcare facilities',
    icon: 'stethoscope',
    title: 'Water damage and mould training for Victorian healthcare facilities',
    metaDescription:
      'Self-paced courses in water damage, mould and indoor air quality for the crews and engineers who respond to flooding in Victorian healthcare facilities.',
    keywords: ['hospital flood restoration training Victoria', 'healthcare mould course'],
    headline: 'Be ready for the hospital',
    headlineAccent: 'call-out',
    description:
      'For restoration crews and facility engineers who respond to water damage in Victorian healthcare facilities. Self-paced courses in water damage, mould and indoor air quality.',
    topics: ['Water damage', 'Mould and air quality', 'Clinical buildings', 'Safety'],
    whyCards: [
      {
        icon: 'shield',
        title: 'A written expectation',
        description:
          'Victorian Health Building Authority advice sets out what hospitals should expect from a remediation subcontractor. See the source below.',
      },
      {
        icon: 'droplets',
        title: 'Water in clinical fabric',
        description:
          'Leaks in plant rooms, basements and ward blocks need commercial drying thinking, not a domestic flood playbook.',
      },
      {
        icon: 'wind',
        title: 'Mould and indoor air quality',
        description:
          'Containment and clean-air close-out matter more where patients are vulnerable. Study airborne spread, monitoring and handover.',
      },
    ],
    claims: [
      {
        text: 'Victorian Health Building Authority technical advice HTA-2024-002 says a hospital must establish a contractual arrangement with at least one qualified, skilled and experienced remediation subcontractor.',
        sourceTitle: 'HTA-2024-002 Responding to flooding events: restoration for healthcare facilities',
        publisher: 'Victorian Health Building Authority',
        sourceUrl: VHBA_URL,
        tag: 'O',
        lastVerified: VERIFIED,
      },
      {
        text: 'The same advice says remediation technicians should have, at the very least, completed the water damage restoration and applied microbial remediation technician qualifications issued by the IICRC.',
        sourceTitle: 'HTA-2024-002 Responding to flooding events: restoration for healthcare facilities',
        publisher: 'Victorian Health Building Authority',
        sourceUrl: VHBA_URL,
        tag: 'O',
        lastVerified: VERIFIED,
      },
    ],
    scopeNote:
      'Those IICRC certifications are obtained only through schools and examinations approved by the IICRC. CARSI does not deliver them. CARSI is an IICRC CEC Accredited provider, and CEC hours are shown only on a course with an approval in force. The advice above covers Victoria; check the rules in your state. CARSI courses sit beside, and do not replace, hospital infection-control policy. The modules listed as being built are not for sale yet.',
    bundle: {
      publishedSlugs: [...healthcareRecommendedSlugs, 'introduction-to-drying-health-care-facilities'],
      plannedModules: [
        {
          title: 'Water damage and mould in clinical environments',
          minutes: null,
          status: 'not_built',
        },
        {
          title: 'Water damage and mould for hospital engineers',
          minutes: null,
          status: 'not_built',
        },
      ],
    },
    faqs: [
      {
        question: 'Is this training for doctors and nurses?',
        answer:
          'No. It is for restoration technicians, contractors and facility engineers who respond to water and mould problems in healthcare buildings.',
      },
      {
        question: 'Does this replace infection-control policy?',
        answer:
          'No. A CARSI course gives documented training in water damage, moisture and indoor air quality. It does not replace a facility policy, induction or competency check.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/healthcare',
    livePageLabel: 'Healthcare industry page',
  },
  {
    slug: 'property-and-strata-managers',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'Property managers and strata managers',
    shortAudience: 'property and strata managers',
    icon: 'home',
    title: 'Mould and water damage knowledge for property and strata managers',
    metaDescription:
      'Self-paced courses on mould, damp and water damage for residential property managers and strata managers. Knowledge for the job, not regulated agent CPD.',
    keywords: ['property manager mould course', 'strata manager water damage course'],
    headline: 'Tell structural damp from',
    headlineAccent: 'tenant-caused mould',
    description:
      'For residential property managers and strata managers who handle damp, mould and water-damage reports. Self-paced courses on moisture, mould and when to call a restorer.',
    topics: ['Mould and damp', 'Water damage', 'Moisture basics', 'When to escalate'],
    whyCards: [
      {
        icon: 'droplets',
        title: 'Read the report properly',
        description:
          'Understand what moisture readings and mould findings mean, so you ask the right next question.',
      },
      {
        icon: 'clipboard',
        title: 'Document it',
        description:
          'Know what to photograph, measure and record at entry, during and at exit.',
      },
      {
        icon: 'shield',
        title: 'Know when to escalate',
        description:
          'Recognise when a job needs a restorer, a hygienist or a builder, and say so early.',
      },
    ],
    claims: [
      {
        text: 'Victorian rental minimum standards say all rooms must be free from mould and damp caused by or related to the building structure.',
        sourceTitle: 'Rental minimum standards checklist for rental providers',
        publisher: 'Consumer Affairs Victoria',
        sourceUrl:
          'https://www.consumer.vic.gov.au/library/publications/housing-and-accommodation/renting/rental-minimum-standards/rental-minimum-standards-checklist-for-rental-providers-pdf.pdf',
        tag: 'O',
        lastVerified: VERIFIED,
      },
      {
        text: 'Queensland minimum housing standards say a rental property must be free from vermin, damp and mould, except where the tenant caused it. They applied to new tenancies from 1 September 2023 and to all tenancies from 1 September 2024.',
        sourceTitle: 'Minimum housing standards fact sheet: general tenancies',
        publisher: 'Residential Tenancies Authority Queensland',
        sourceUrl:
          'https://rta.qld.gov.au/forms-resources/factsheets/minimum-housing-standards-fact-sheet-general-tenancies',
        tag: 'O',
        lastVerified: VERIFIED,
      },
      {
        text: 'In NSW, a maintenance and habitability topic is compulsory for residential property manager CPD, and a maintenance topic is compulsory for strata managing agents. Those topics must be delivered face-to-face or by interactive webinar, with an assessment, by an approved provider.',
        sourceTitle: 'Continuing professional development for agents',
        publisher: 'NSW Government',
        sourceUrl: NSW_AGENT_CPD_URL,
        tag: 'O',
        lastVerified: VERIFIED,
      },
    ],
    scopeNote:
      'CARSI courses are self-paced. They are not regulated agent CPD in any state and are not offered as such. This page is about knowledge for the job: telling structural damp from tenant-caused damp, and knowing when to call a restorer. State rules change, so check your regulator. The module listed as being built is not for sale yet.',
    bundle: {
      publishedSlugs: [
        'moisture-mould-and-indoor-air-quality-understanding-the-link',
        'introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
        'introduction-to-applied-microbial-remediation',
        'introduction-to-water-damage-restoration',
        'introduction-to-air-quality-fundamentals',
      ],
      plannedModules: [
        { title: 'Mould and damp in Australian homes', minutes: 60, status: 'not_built' },
      ],
    },
    faqs: [
      {
        question: 'Do these courses count as property manager CPD?',
        answer:
          'No. They are self-paced and are not offered as regulated agent CPD. For regulated CPD, use a provider approved by your state regulator.',
      },
      {
        question: 'Are these courses written for property managers?',
        answer:
          'The current courses are written for restoration technicians. Property and strata managers can use them to understand moisture, mould and water damage. A module for managers is being built.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/property-management',
    livePageLabel: 'Property management industry page',
  },
  {
    slug: 'commercial-cleaning-contractors',
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    audience: 'Commercial cleaning contractors and supervisors',
    shortAudience: 'cleaning contractors and supervisors',
    icon: 'spray',
    title: 'Water damage and mould awareness for commercial cleaning contractors',
    metaDescription:
      'Self-paced courses on water damage, mould and safe handover to a restorer for commercial cleaning contractors and supervisors.',
    keywords: ['commercial cleaner mould training', 'cleaning contractor water damage course'],
    headline: 'Recognise it, stop,',
    headlineAccent: 'and hand it over',
    description:
      'For commercial cleaning contractors and supervisors who find water damage or mould on a routine job. Self-paced courses on what to look for, how to stay safe and when to hand over to a restorer.',
    topics: ['Recognise damage', 'PPE and safety', 'Mould basics', 'Handover'],
    whyCards: [
      {
        icon: 'droplets',
        title: 'Find it early',
        description:
          'Cleaners are often the first to see a stain, a smell or a damp patch. Learn what the signs mean.',
      },
      {
        icon: 'shield',
        title: 'Keep your people safe',
        description:
          'Study protective equipment and safe work around wet materials and visible mould.',
      },
      {
        icon: 'clipboard',
        title: 'A clean handover',
        description:
          'Know what to photograph and report so the client and the restorer can act quickly.',
      },
    ],
    claims: [
      swaCode(
        'The code says a person conducting a business or undertaking must provide any information, training, instruction or supervision that is necessary for reasonably foreseeable biological hazards. It must be suitable and adequate, and should be provided by a person with appropriate knowledge and expertise.'
      ),
      swaCode(
        'The code says mould cleaning may need specialist methods and suggests outsourcing the cleaning to a specialist.'
      ),
      swaCode(
        'The code names mould-contaminated wall linings and demolishing a mouldy or water-damaged building in its hazard-identification checklist.'
      ),
    ],
    scopeNote:
      'A model code of practice applies only where your state or territory has adopted it. If you run a cleaning business, check whether and how it applies to you. CARSI courses do not replace your own WHS obligations or professional advice. The module listed as being built is not for sale yet.',
    bundle: {
      publishedSlugs: [
        'introduction-to-using-personal-protective-equipment',
        'introduction-to-air-quality-fundamentals',
        'introduction-to-applied-microbial-remediation',
        'introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
        'introduction-to-safety-procedures-for-water-damage-work',
        'introduction-to-water-damage-in-commercial-buildings',
      ],
      plannedModules: [
        {
          title: 'Mould and water-damaged buildings: recognise, stop, escalate',
          minutes: null,
          status: 'not_built',
        },
      ],
    },
    faqs: [
      {
        question: 'Is this a mould removal course?',
        answer:
          'No. It teaches you to recognise water damage and mould, work safely and hand over to a restorer. Specialist mould work is a job for a specialist.',
      },
      {
        question: 'Are these courses written for cleaners?',
        answer:
          'The current courses are written for restoration technicians. Cleaning contractors and supervisors can use them to learn the signs and the safe response. A shorter module is being built.',
      },
      iicrcFaq,
    ],
    livePageHref: '/industries/commercial-cleaning',
    livePageLabel: 'Commercial cleaning industry page',
  },
];

export function getAuthorityPage(slug: string): AuthorityPageEntry {
  const entry = authorityPages.find((p) => p.slug === slug);
  if (!entry) throw new Error(`Unknown authority page: ${slug}`);
  return entry;
}

export function approvedAuthorityPages(): AuthorityPageEntry[] {
  return authorityPages.filter((p) => p.status === 'approved');
}

/** Sitemap paths: approved entries only. */
export function authoritySitemapPaths(pages: AuthorityPageEntry[] = authorityPages): string[] {
  return pages.filter((p) => p.status === 'approved').map((p) => `/for/${p.slug}`);
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Problems that stop an entry being approved. A draft is always allowed; an approved entry must
 * name its approver, carry sourced and fresh claims, and link at least one published course.
 * `liveSlugs`, when given, is the set of published course slugs the bundle is checked against.
 */
export function validateAuthorityPage(
  entry: AuthorityPageEntry,
  now: Date = new Date(),
  liveSlugs?: ReadonlySet<string>
): string[] {
  if (entry.status !== 'approved') return [];
  const problems: string[] = [];
  if (!entry.approvedBy) problems.push('approvedBy is required');
  if (!entry.approvedAt) problems.push('approvedAt is required');
  if (entry.bundle.publishedSlugs.length === 0) {
    problems.push('at least one published course is required in the bundle');
  }
  if (liveSlugs) {
    for (const slug of entry.bundle.publishedSlugs) {
      if (!liveSlugs.has(slug)) problems.push(`bundle course is not published: ${slug}`);
    }
  }
  for (const claim of entry.claims) {
    if (!claim.sourceUrl) problems.push(`claim is missing sourceUrl: ${claim.text.slice(0, 40)}`);
    if (!claim.tag) problems.push(`claim is missing tag: ${claim.text.slice(0, 40)}`);
    const verified = Date.parse(claim.lastVerified);
    if (Number.isNaN(verified)) {
      problems.push(`claim is missing lastVerified: ${claim.text.slice(0, 40)}`);
    } else if (now.getTime() - verified > NINETY_DAYS_MS) {
      problems.push(`claim is older than 90 days: ${claim.text.slice(0, 40)}`);
    }
  }
  return problems;
}
