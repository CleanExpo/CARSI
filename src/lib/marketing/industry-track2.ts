import {
  agedCareRecommendedSlugs,
  healthcareRecommendedSlugs,
  hospitalityRecommendedSlugs,
  type IndustrySearchTopic,
} from '@/lib/marketing/industry-track1-topics';

/**
 * Track 2: facility-management contract managers and the crews they put on
 * healthcare, aged-care and hotel sites. This is not a named-client list and
 * does not claim CARSI holds those FM contracts.
 */
export const facilityManagementSearchTopics: IndustrySearchTopic[] = [
  {
    title: 'Records a hospital site can file',
    body: 'Documented mould and indoor-air training for visiting crews, filed beside the facility’s own infection-control competency records.',
    jobContext: 'For contract managers who must show contractor training under NSQHS Standard 3.',
    outcome: 'Hand the site a completion record that names the course and the learner, not a substitute for hospital policy.',
    href: '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
    cta: 'Open the IAQ and mould course',
  },
  {
    title: 'Occupied aged-care work',
    body: 'Containment and carpet hygiene for crews working overnight homes, not empty commercial floors.',
    jobContext: 'For providers and contractors who share corridors and wet areas with residents.',
    outcome: 'Give supervisors a named course path before the next water or mould call-out.',
    href: '/courses/introduction-to-basic-carpet-cleaning-and-drying',
    cta: 'Open carpet cleaning and drying',
  },
  {
    title: 'Hotel rooms back on inventory',
    body: 'Water-loss and odour training so rooms return to sale without a second guest complaint.',
    jobContext: 'For multi-property groups that use the same restoration subcontractors.',
    outcome: 'Point every property at the same live course, then collect completions in one dashboard.',
    href: '/courses/introduction-to-water-damage-restoration',
    cta: 'Open water damage restoration',
  },
  {
    title: 'One record across the crew',
    body: 'Team seats, progress across learners and CEC hours only where the IICRC has approved the course.',
    jobContext: 'For operations leads who buy training for more than one technician.',
    outcome: 'See published team prices, then talk to CARSI to start the crew.',
    href: '/pricing',
    cta: 'See published team prices',
  },
];

export const facilityManagementFaqs = [
  {
    question: 'Who is the facility-management pathway for?',
    answer:
      'Operations and contract managers who put restoration or environmental-services crews into hospitals, aged-care homes and hotels, and the technicians who do that work. It is written for Australian site work, not for a named global facility-management brand.',
  },
  {
    question: 'Does CARSI deliver IICRC certification for those contracts?',
    answer:
      'No. CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, CEC hours appear on the course page and in the learner dashboard after a pass. IICRC certification is obtained only through schools and examinations approved by the IICRC.',
  },
  {
    question: 'Can a manager buy seats for a whole crew?',
    answer:
      'Published team prices are on the pricing page (Starter, Growth and Full library). Contact CARSI to start a crew. Individual courses remain available per learner.',
  },
  {
    question: 'What can we show a hospital or aged-care auditor?',
    answer:
      'Learners receive a CARSI completion record. An employer proof-pack can list completed courses and IICRC CEC hours only for courses the IICRC has approved. CARSI training does not replace NSQHS, aged-care or hotel site induction.',
  },
  {
    question: 'How does a manager get the proof-pack?',
    answer:
      'Each learner opens Dashboard, Credentials, then downloads or shares their training record. A manager does not get a pack until a learner completes courses and shares it. Unapproved courses contribute no CEC hours.',
  },
];

export const facilityManagementContactHref =
  '/contact?source=facility-management&topic=team%20seats%20for%20hospital%2C%20aged-care%20or%20hotel%20crews';

export const facilityManagementProofPackHref = '/dashboard/student/credentials';

export const facilityManagementSiteLinks = [
  {
    href: '/industries/healthcare',
    label: 'Healthcare',
    detail: 'Hospital and clinic crews — mould, indoor air quality and commercial water damage.',
  },
  {
    href: '/industries/aged-care',
    label: 'Aged care',
    detail: 'Occupied homes — mould, carpet hygiene and PPE around residents.',
  },
  {
    href: '/industries/hospitality',
    label: 'Hotels and resorts',
    detail: 'Guest inventory — water damage, odour control and structural drying.',
  },
] as const;

/** Unique live slugs from the three Track 1 site pathways, marketing order kept. */
export const facilityManagementRecommendedSlugs = [
  ...healthcareRecommendedSlugs,
  ...agedCareRecommendedSlugs,
  ...hospitalityRecommendedSlugs,
].filter((slug, index, all) => all.indexOf(slug) === index);
