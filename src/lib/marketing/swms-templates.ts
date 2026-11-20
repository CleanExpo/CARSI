/**
 * The CARSI SWMS and site-documentation template library.
 *
 * These are blank, unbranded Safe Work Method Statement templates and a blank restoration
 * assessment report, published for Australian cleaning and restoration firms to adapt. They
 * carry no company, worker or client details — every identifying field is empty and the
 * template is signed by the firm that adopts it, not by CARSI.
 *
 * A SWMS is only compliant once it is made site-specific and developed in consultation with
 * the workers who will do the work (WHS Regulations 2011, reg 299-302 in the harmonised
 * jurisdictions). Nothing here is WHS advice and nothing here is a completed SWMS.
 *
 * These are WHS documents. They carry no IICRC framing and no CEC hours, and none may be
 * added to them - the CEC registry is the only source of a CEC claim.
 */

export type SwmsTemplate = {
  /** Stable identifier, also the download filename stem. */
  slug: string;
  title: string;
  /** File under `public/downloads/swms/`. */
  file: string;
  pages: number;
  /** What the document covers, in one sentence. */
  summary: string;
  /** The activity rows the risk table works through, in document order. */
  activities: string[];
};

const DOWNLOAD_BASE = '/downloads/swms';

export const swmsTemplates: SwmsTemplate[] = [
  {
    slug: 'swms-water-extraction-truck-mounted-and-steam-cleaning',
    title: 'Water and flood — truck-mounted extraction and steam cleaning',
    file: 'swms-water-extraction-truck-mounted-and-steam-cleaning.pdf',
    pages: 12,
    summary:
      'Extraction of water with a truck-mounted unit and subsequent carpet steam cleaning — hose runs through occupied premises, safe operation of the unit, and the slip, manual-handling and electrical risks that follow.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Run hoses through the premises, clear of walkways',
      'Safe operation of the truck-mounted unit',
      'Carpet steam cleaning',
      'Slips, trips and falls',
      'Manual handling and use of power tools',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-water-extraction-portable-and-steam-cleaning',
    title: 'Water and flood — portable extraction and steam cleaning',
    file: 'swms-water-extraction-portable-and-steam-cleaning.pdf',
    pages: 11,
    summary:
      'The portable-machine equivalent: removing the unit from the vehicle, powering it from a general power outlet clear of traffic, working the extraction head, and returning contents.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Remove the portable extraction machine from the vehicle',
      'Remove contents, power up clear of traffic, attach the water claw',
      'Carpet steam cleaning',
      'Slips, trips and falls',
      'Manual handling and use of power tools',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-decontamination-work',
    title: 'Decontamination work',
    file: 'swms-decontamination-work.pdf',
    pages: 11,
    summary:
      'Decontamination work including the doffing sequence — removal of contaminated PPE is treated as its own controlled activity rather than an afterthought.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Operation and use',
      'Removal of contaminated PPE',
      'Manual handling',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-fire-and-smoke-cleaning',
    title: 'Fire and smoke cleaning',
    file: 'swms-fire-and-smoke-cleaning.pdf',
    pages: 10,
    summary:
      'Internal and external wall cleaning after fire and smoke damage, with a dedicated row for the chemicals used and the safety data sheets that must be on site with them.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Internal wall cleaning',
      'External wall cleaning',
      'Chemicals used in cleaning fire and smoke damage',
      'Manual handling and use of power tools',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-demolition-non-structural',
    title: 'Demolition — non-structural',
    file: 'swms-demolition-non-structural.pdf',
    pages: 9,
    summary:
      'Non-structural strip-out: checking existing structures before anything comes out, demolishing interior linings and cabinetry, and getting debris off site.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area and complete safety checks first',
      'Check existing structures and plan the work',
      'Demolish the interior and cabinetry',
      'Manual handling and use of power tools',
      'Removal of debris',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-floor-removal',
    title: 'Floor removal',
    file: 'swms-floor-removal.pdf',
    pages: 10,
    summary:
      'Removal of floor coverings and substrate finishes, covering the power-tool, dust and manual-handling exposures that dominate the task.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Operation and use',
      'Manual handling and use of power tools',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-carpet-removal',
    title: 'Carpet removal',
    file: 'swms-carpet-removal.pdf',
    pages: 9,
    summary:
      'Lifting and removing carpet and underlay — cuts and lacerations, tack strip, dust, and moving the waste out without injuring anyone.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site and assess the site',
      'Isolate the work area',
      'Operation and use',
      'Manual handling and use of power tools',
      'Cleaning and maintenance',
      'Emergency procedures and leaving the work site',
    ],
  },
  {
    slug: 'swms-working-at-height-and-rescue-plan',
    title: 'Working at height and rescue plan',
    file: 'swms-working-at-height-and-rescue-plan.pdf',
    pages: 12,
    summary:
      'Work at height with the rescue plan attached as Appendix A — ladders, scissor and boom lifts, elevating work platforms and roof access, plus recovery of a suspended worker. Includes the high-risk construction work schedule and the underground-services check.',
    activities: [
      'Planning, preparation and operational checks',
      'Arrive at site, induction and site assessment',
      'Prepare and communicate the rescue plan',
      'Isolate the work area; work near traffic corridors and mobile plant',
      'Accessing areas of height — ladders',
      'Scissor and boom lifts',
      'Elevating work platforms (EWPs)',
      'Roof access',
      'Recovery from height',
      'Manual handling, cleaning and maintenance',
      'Emergency procedures and leaving the work site',
      'Appendix A — rescue plan (general details, rescue details, communication)',
    ],
  },
];

export const assessmentReportTemplate: SwmsTemplate = {
  slug: 'restoration-assessment-report',
  title: 'Restoration assessment report and site-specific risk assessment',
  file: 'restoration-assessment-report.pdf',
  pages: 12,
  summary:
    'A blank first-attendance report: cause and resultant damage, make-safe and habitability, available amps and circuits, the site-specific risk assessment (SSRA), an extended JSA sign-off, moisture readings across six attendances and an equipment-installed record for each visit.',
  activities: [
    'Assessment report — cause, resultant damage, make safe, habitability',
    'Site-specific risk assessment (SSRA) across five attendances',
    'Risk assessment table for hazards not covered by a SWMS',
    'Extended JSA sign-off',
    'Moisture readings by room and area tested',
    'First to fifth attendance records — equipment installed, works completed',
  ],
};

export const swmsTemplatesPath = '/resources/swms-templates';

export function swmsDownloadHref(template: SwmsTemplate): string {
  return `${DOWNLOAD_BASE}/${template.file}`;
}

/** Every template published on the library page, SWMS first. */
export const allSwmsLibraryDocuments: SwmsTemplate[] = [...swmsTemplates, assessmentReportTemplate];
