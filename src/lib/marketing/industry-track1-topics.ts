export type IndustrySearchTopic = {
  title: string;
  body: string;
  jobContext: string;
  outcome: string;
  href: string;
  cta: string;
};

/** Technician-search topics mapped to live IICRC CEC Accredited intro courses. */
export const healthcareSearchTopics: IndustrySearchTopic[] = [
  {
    title: 'Mould in healthcare facilities',
    body: 'Containment, airborne spread and clearance thinking for wards, plant rooms and water-damaged clinical fabric.',
    jobContext: 'For mould findings, damp building materials and occupied clinical areas.',
    outcome: 'Build a safer containment and handover conversation with the site manager.',
    href: '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
    cta: 'Open the IAQ and mould course',
  },
  {
    title: 'Microbial remediation for restoration crews',
    body: 'Microbial remediation basics for technicians who enter hospitals and clinics after a water or hygiene incident.',
    jobContext: 'For restoration contractors working beside facility infection-control procedures.',
    outcome: 'Recognise microbial risk and document decisions within the site-approved work plan.',
    href: '/courses/introduction-to-applied-microbial-remediation',
    cta: 'Open microbial remediation',
  },
  {
    title: 'Water damage in clinical buildings',
    body: 'Commercial water-loss response for hospitals, consulting suites and shared plant, not domestic flood work.',
    jobContext: 'For pipe bursts, roof leaks and wet plant rooms in operational facilities.',
    outcome:
      'Plan commercial extraction and drying around access, isolation and continuity constraints.',
    href: '/courses/introduction-to-water-damage-in-commercial-buildings',
    cta: 'Open commercial water damage',
  },
  {
    title: 'Indoor air quality after a loss',
    body: 'What to monitor, document and hand over when a healthcare site asks for clean-air evidence after drying.',
    jobContext: 'For close-out discussions after water or mould remediation work.',
    outcome:
      'Prepare clearer monitoring records without presenting a course certificate as clearance.',
    href: '/courses/introduction-to-improving-indoor-air-quality-after-water-damage',
    cta: 'Open the IAQ after water damage course',
  },
];

export const agedCareSearchTopics: IndustrySearchTopic[] = [
  {
    title: 'Mould in residential aged care',
    body: 'Airborne spread and containment for rooms, bathrooms and shared lounges where residents stay overnight.',
    jobContext: 'For damp rooms and wet areas in resident-occupied buildings.',
    outcome: 'Plan disruption controls and communicate the work boundary to facility staff.',
    href: '/courses/introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
    cta: 'Open the IAQ and mould course',
  },
  {
    title: 'Carpet hygiene in high-traffic care',
    body: 'Cleaning and drying carpets in corridors and dining rooms without taking the whole wing offline.',
    jobContext: 'For recurring carpet care and localised water losses in shared areas.',
    outcome: 'Choose a practical cleaning and drying sequence around resident movement.',
    href: '/courses/introduction-to-basic-carpet-cleaning-and-drying',
    cta: 'Open carpet cleaning and drying',
  },
  {
    title: 'Air quality on the job site',
    body: 'How crews monitor air quality during a loss and contribute completion records to the provider training file.',
    jobContext: 'For containment monitoring and documented handover in occupied care settings.',
    outcome:
      'Record what was monitored, when it was checked and what still needs specialist review.',
    href: '/courses/introduction-to-monitoring-air-quality-on-the-job-site',
    cta: 'Open job-site air quality',
  },
  {
    title: 'PPE in care environments',
    body: 'Personal protective equipment for technicians working around residents and wet building materials.',
    jobContext:
      'For contractor tasks controlled by the provider site induction and risk assessment.',
    outcome: 'Select, use and remove PPE without treating it as the only risk control.',
    href: '/courses/introduction-to-using-personal-protective-equipment',
    cta: 'Open the PPE course',
  },
];

export const hospitalitySearchTopics: IndustrySearchTopic[] = [
  {
    title: 'Guest-room water damage',
    body: 'Fast extraction and drying so rooms return to inventory without a second odour complaint.',
    jobContext: 'For bathroom leaks, failed supply lines and localised water migration.',
    outcome:
      'Structure the first response around moisture checks, extraction and documented handover.',
    href: '/courses/introduction-to-water-damage-restoration',
    cta: 'Open water damage restoration',
  },
  {
    title: 'Odour control in occupied hotels',
    body: 'Source identification and removal techniques for smoke, biological and wet-area odours in guest rooms.',
    jobContext: 'For repeat complaints where fragrance has hidden rather than removed the source.',
    outcome: 'Move from masking odour to locating, treating and documenting the source.',
    href: '/courses/introduction-to-odour-control-and-removal-techniques',
    cta: 'Open odour control',
  },
  {
    title: 'Carpet in public hotel areas',
    body: 'Cleaning and drying lobbies, corridors and function rooms where downtime affects operations.',
    jobContext: 'For high-traffic areas that need staged access and realistic drying windows.',
    outcome: 'Match the cleaning and drying sequence to fibre, soil load and site access.',
    href: '/courses/introduction-to-basic-carpet-cleaning-and-drying',
    cta: 'Open carpet cleaning and drying',
  },
  {
    title: 'Structural drying after wet incidents',
    body: 'Applied structural drying concepts for pool overflow, spa leaks and wet walls next to occupied rooms.',
    jobContext:
      'For moisture that travels beyond the obvious wet area into walls and adjoining rooms.',
    outcome:
      'Explain the drying plan, monitoring points and escalation triggers to property staff.',
    href: '/courses/introduction-to-applied-structural-drying',
    cta: 'Open applied structural drying',
  },
];

export const healthcareRecommendedSlugs = [
  'introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
  'introduction-to-improving-indoor-air-quality-after-water-damage',
  'introduction-to-air-quality-fundamentals',
  'introduction-to-monitoring-air-quality-on-the-job-site',
  'introduction-to-creating-a-clean-air-environment-best-practices-for-final-cleara',
  'introduction-to-applied-microbial-remediation',
  'introduction-to-water-damage-in-commercial-buildings',
  'introduction-to-water-damage-restoration',
  'introduction-to-safety-procedures-for-water-damage-work',
  'introduction-to-using-personal-protective-equipment',
] as const;

export const agedCareRecommendedSlugs = [
  'introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment',
  'introduction-to-basic-carpet-cleaning-and-drying',
  'introduction-to-monitoring-air-quality-on-the-job-site',
  'introduction-to-using-personal-protective-equipment',
  'introduction-to-air-quality-fundamentals',
  'introduction-to-applied-microbial-remediation',
  'introduction-to-improving-indoor-air-quality-after-water-damage',
] as const;

export const hospitalityRecommendedSlugs = [
  'introduction-to-water-damage-restoration',
  'introduction-to-odour-control-and-removal-techniques',
  'introduction-to-basic-carpet-cleaning-and-drying',
  'introduction-to-applied-structural-drying',
  'introduction-to-structural-drying-concepts',
  'introduction-to-water-extraction-methods',
  'introduction-to-smoke-and-soot-damage-restoration',
] as const;
