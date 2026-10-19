/**
 * TEMPORARY shim: IICRC certification and designation acronyms for check-cec-surfaces rule 4.
 *
 * Copied verbatim from scripts/iicrc-codes.mjs at commit 08d15553 (branch
 * fix/industry-faq-licence-v2), the shared list every licence guard will read. That file is not on
 * main yet. Rule 4 and its tests read codes ONLY through iicrcCodes(), so there is one list here,
 * not a private copy inside each rule.
 *
 * TODO(industry merge): delete this shim and import IICRC_CODES from scripts/iicrc-codes.mjs.
 * The industry branch's duplicate-list test fails while this copy exists.
 *
 * Source of the codes (per 08d15553): IICRC's public certification names and acronyms, read
 * 19/10/2026 from https://iicrc.org/category/certifications/ and https://www.iicrc.org/IICRCMaster.
 */
const IICRC_CERTIFICATIONS = [
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

const IICRC_DESIGNATIONS = [
  ['JSR', 'Journeyman Fire and Smoke Restorer'],
  ['JTC', 'Journeyman Textile Cleaner'],
  ['JWR', 'Journeyman Water Restorer'],
  ['MSR', 'Master Fire and Smoke Restorer'],
  ['MTC', 'Master Textile Cleaner'],
  ['MWR', 'Master Water Restorer'],
];

/** Acronyms the current IICRC pages no longer show (BMT = older name of BMI); still caught. */
const IICRC_FORMER_CODES = ['BMT', 'BCI', 'MRS', 'WFI'];

/** Every IICRC code, certifications then designations then former codes. */
export function iicrcCodes() {
  return [
    ...[...IICRC_CERTIFICATIONS, ...IICRC_DESIGNATIONS].map(([code]) => code),
    ...IICRC_FORMER_CODES,
  ];
}
