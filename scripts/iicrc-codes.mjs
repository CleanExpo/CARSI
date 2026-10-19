/**
 * IICRC certification and designation acronyms: the ONE list every licence guard reads
 * (check-iicrc-terminology.mjs, check-designations.mjs, licence-inventory.mjs). A rule that names
 * IICRC codes builds its pattern from IICRC_CODE_ALT, never from its own copy (review of f37d2116:
 * the single-acronym rule knew 8 codes, so "Enrol in RRT training today" passed).
 *
 * Source: IICRC's public certification names and acronyms (public naming, not standard text):
 *   https://iicrc.org/category/certifications/          (pages 1-3, /page/2/ and /page/3/)
 *   https://www.iicrc.org/IICRCMaster                   (Master and Journeyman designations)
 * Read 19/10/2026. Last verified 19/10/2026. The pages also list "Mold Remediation Specialist"
 * with no acronym, so it adds none here.
 */
export const IICRC_CERTIFICATIONS = [
  ['AMRT', 'Applied Microbial Remediation Technician'],
  ['ASD', 'Applied Structural Drying Technician'],
  ['BMI', 'Building Moisture Inspection'],
  ['CCMT', 'Commercial Carpet Maintenance Technician'],
  ['CCT', 'Carpet Cleaning Technician'],
  ['CDS', 'Commercial Drying Specialist'],
  ['CPT', 'Contents Processing Technician'],
  ['CRT', 'Color Repair Technician'],
  ['FCT', 'Floor Care Technician'],
  ['FSRT', 'Fire and Smoke Damage Restoration Technician'],
  ['HCT', 'House Cleaning Technician'],
  ['HST', 'Health & Safety Technician'],
  ['ISSI', 'Introduction to Substrate and Subfloor Inspection'],
  ['LCT', 'Leather Cleaning Technician'],
  ['OCT', 'Odor Control Technician'],
  ['RCT', 'Rug Cleaning Technician'],
  ['RFI', 'Resilient Flooring Inspector'],
  ['RFMT', 'Resilient Flooring Maintenance Technician'],
  ['RRT', 'Carpet Repair and Reinstallation Technician'],
  ['SCI', 'Senior Carpet Inspector'],
  ['SMT', 'Stone, Masonry and Ceramic Tile Cleaning Technician'],
  ['TCST', 'Trauma and Crime Scene Technician'],
  ['UFT', 'Upholstery and Fabric Cleaning Technician'],
  ['WFMT', 'Wood Floor Maintenance Technician'],
  ['WLFI', 'Wood and Laminate Flooring Inspector'],
  ['WRT', 'Water Damage Restoration Technician'],
];

export const IICRC_DESIGNATIONS = [
  ['JSR', 'Journeyman Fire and Smoke Restorer'],
  ['JTC', 'Journeyman Textile Cleaner'],
  ['JWR', 'Journeyman Water Restorer'],
  ['MSR', 'Master Fire and Smoke Restorer'],
  ['MTC', 'Master Textile Cleaner'],
  ['MWR', 'Master Water Restorer'],
];

/**
 * Acronyms our lists carried before 19/10/2026 that the current IICRC pages no longer show
 * (BMT is the older Building Moisture Thermography name of BMI). Kept so older copy is still caught.
 */
export const IICRC_FORMER_CODES = ['BMT', 'BCI', 'MRS', 'WFI'];

export const IICRC_CODES = [
  ...[...IICRC_CERTIFICATIONS, ...IICRC_DESIGNATIONS].map(([code]) => code),
  ...IICRC_FORMER_CODES,
];

/** Regex alternation of every code (use inside \b(?:...)\b). */
export const IICRC_CODE_ALT = IICRC_CODES.join('|');
