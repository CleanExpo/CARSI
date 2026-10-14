import type { ResourceCategoryId } from './categories';

/**
 * Free Resources: open-licence AU and NZ government and public-body publications.
 *
 * Source: the 14 October 2026 building-science library licence check. Only items with a GREEN
 * verdict are listed (CC BY any version, CC0, or no-copyright legislation). AMBER, RED and
 * UNREAD items are excluded, as is anything from IICRC, Standards Australia, BRANZ,
 * FWPA/WoodSolutions or Timber Queensland.
 *
 * CARSI links to the official source and never rehosts a file. Licences cover the publisher's
 * own text only; logos, trade marks, photographs and third-party material are excluded.
 * `readDate` is the day CARSI last checked the item and its licence.
 *
 * Adding an item: confirm the licence on the document itself or the publisher's copyright
 * page, use the publisher's own host, write the note fresh, and the data test will hold the
 * rest. Do not paste or paraphrase standard text into a note.
 */
export type ResourceJurisdiction = 'AU' | 'Qld' | 'NSW' | 'ACT' | 'Vic' | 'NZ';

export type ResourceFormat = 'PDF' | 'web';

export interface FreeResource {
  id: string;
  title: string;
  publisher: string;
  jurisdiction: ResourceJurisdiction;
  /** Category id from RESOURCE_CATEGORIES. The label shown to readers lives there. */
  category: ResourceCategoryId;
  /** Official source on the publisher's own host. */
  url: string;
  format: ResourceFormat;
  /** Short licence label shown on the card, e.g. "CC BY 4.0". */
  licence: string;
  /**
   * The publisher's own notice the licence was read from on readDate: the document itself where
   * it carries one, otherwise the dataset page or the site's copyright page.
   */
  licenceSource: string;
  /** ISO date (YYYY-MM-DD) the item and its licence were last checked. */
  readDate: string;
  attribution: string;
  /** Plain-English reason the item helps restorers. */
  note: string;
  /** Set only for drafts and proposals, which are never in force. */
  status?: ResourceStatus;
}

export type ResourceStatus = 'draft-proposal';

/**
 * True for building-code material: anything naming the NCC (in id, title, note or URL) or
 * published by the ABCB. The hub shows the building-code caution in every group holding one.
 */
export function isBuildingCodeResource(
  r: Pick<FreeResource, 'id' | 'title' | 'note' | 'url' | 'publisher'>
): boolean {
  return (
    /\bNCC\b|National Construction Code|Building Code of Australia|\bBCA\b|ncc/i.test(
      [r.id, r.title, r.note, r.url].join(' ')
    ) || r.publisher === 'Australian Building Codes Board'
  );
}

export const RESOURCE_STATUS_LABEL: Record<ResourceStatus, string> = {
  'draft-proposal': 'Draft proposal — not in force',
};

// Building-code cards (NCC editions and ABCB publications) say only what each document is.
// Which edition and amendments apply depends on the state or territory and on project triggers
// that differ between them, so the hub shows one caution above the building-code group instead.
// Sources, accessed 14/10/2026:
// - ABCB adoption table: https://ncc.abcb.gov.au/ncc-2025-state-and-territory-adoption-information
// - ABCB editions page (NCC 2022 superseded by Amendments 1 and 2, read with a corrigendum):
//   https://ncc.abcb.gov.au/editions-national-construction-code
// - NCC 2022 volumes and housing provisions are CC BY-ND 4.0, so they are not listed:
//   https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-one/preface/copyright-and-licence-notice
// - NCC 2025 is CC BY 4.0:
//   https://ncc.abcb.gov.au/editions/ncc-2025/adopted/housing-provisions/front-matter/copyright-licence-notice-and-acknowledgment-country
// - PCD 2025 papers are Public Comment Draft material, not adopted provisions:
//   https://www.abcb.gov.au/pcd/pcd-2025-improving-waterproofing-and-water-shedding-provisions
// Licences were re-read on 14/10/2026 from each publisher's own notice (each card's licenceSource):
// the document itself where it states one (every ABCB PDF, NCC 2025 notice pages, CTIQ books,
// QRA cyclone and storm-tide guides, MBIE tolerances guide, AIDR handbook, SWA exposure
// standards), otherwise the dataset page or site copyright page:
// - https://www.yourhome.gov.au/copyright (CC BY 4.0)
// - https://www.qbcc.qld.gov.au/copyright (CC BY 4.0 unless otherwise noted)
// - https://www.qld.gov.au/legal/copyright (CC BY 4.0 unless otherwise noted)
// - https://www.qra.qld.gov.au/access-information/copyright (CC BY 4.0 unless otherwise noted)
// - https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797 (CC BY 4.0)
// - https://www.longpaddock.qld.gov.au/silo/ (SILO data CC BY 4.0)
// - https://www.act.gov.au/copyright, https://www.healthnz.govt.nz/copyright,
//   https://www.epa.vic.gov.au/copyright (CC BY 4.0)
// - https://www.legislation.govt.nz/copyright/ (no copyright in NZ legislation, s27 Copyright
//   Act 1994)
// Removed: SWA guidance on interpreting the exposure standards (July 2025), because no fetched
// notice confirmed its licence and the SWA site licence excludes publications with their own terms.
// Removed: the two NSW Health pages, because https://www.health.nsw.gov.au/pages/copyright.aspx
// grants CC BY 4.0 but also requires a permission form for use other than personal, in-house or
// non-commercial use, which are conflicting terms under the hub's unclear-terms rule.
// - Get Ready Queensland's Design Guidance for Flood Resilient Homes (June 2026): CC BY 4.0 per the
//   notice on p.73 of the document, read 14/10/2026 (getready.qld.gov.au has no site notice of its
//   own, so the document itself is the licence source).
export const FREE_RESOURCES: readonly FreeResource[] = [
  {
    id: 'abcb-condensation-handbook-ncc2025',
    title: 'NCC 2025 Condensation in Buildings Handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2026/NCC%202025%20Condensation%20in%20building%20handbook.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2026/NCC%202025%20Condensation%20in%20building%20handbook.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The ABCB Condensation in Buildings Handbook written for NCC 2025. It explains how condensation forms in buildings and how design manages it.',
  },
  {
    id: 'abcb-condensation-handbook-2023',
    title: 'Condensation in Buildings Handbook (2023)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2023/Condensation-in-buildings-handbook.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2023/Condensation-in-buildings-handbook.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The 2023 edition of the ABCB Condensation in Buildings Handbook, since followed by an NCC 2025 edition. It explains how moisture forms and travels in walls, roofs and subfloors.',
  },
  {
    id: 'abcb-condensation-handbook-2019',
    title: 'Condensation in Buildings Handbook (2019)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-condensation-in-buildings-2019.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-condensation-in-buildings-2019.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The 2019 edition of the ABCB Condensation in Buildings Handbook, since followed by later editions. It explains how condensation forms in buildings.',
  },
  {
    id: 'abcb-condensation-placemat',
    title: 'PCD 2025: Condensation mitigation placemat',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/ABCB-Condensation-mitigation-placemat.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/ABCB-Condensation-mitigation-placemat.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'Background reading only: a one-page condensation mitigation summary the ABCB released with the NCC 2025 Public Comment Draft. It describes proposals put out for comment, not the adopted code.',
    status: 'draft-proposal',
  },
  {
    id: 'abcb-pcd2025-condensation-mitigation',
    title: 'PCD 2025: Condensation mitigation',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Condensation-mitigation.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Condensation-mitigation.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'Background reading only: an ABCB paper supporting the NCC 2025 Public Comment Draft on condensation mitigation. It describes proposals put out for comment, not the adopted code.',
    status: 'draft-proposal',
  },
  {
    id: 'abcb-pcd2025-thermal-breaks',
    title: 'PCD 2025: Housing energy efficiency, thermal breaks',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Housing-energy-efficiency-thermal-breaks.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Housing-energy-efficiency-thermal-breaks.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'Background reading only: an ABCB paper supporting the NCC 2025 Public Comment Draft on thermal breaks in housing. It describes proposals put out for comment, not the adopted code.',
    status: 'draft-proposal',
  },
  {
    id: 'abcb-pcd2025-waterproofing-water-shedding',
    title: 'PCD 2025: Improving waterproofing and water shedding provisions',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Waterproofing-and-water-shedding.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/PCD-2025-Waterproofing-and-water-shedding.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'Background reading only: an ABCB paper supporting the NCC 2025 Public Comment Draft on waterproofing and water shedding. It describes proposals put out for comment, not the adopted code, and is not a benchmark for assessing a leak.',
    status: 'draft-proposal',
  },
  {
    id: 'yourhome-condensation',
    title: 'Condensation (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/passive-design/condensation',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'A plain-language explanation of where condensation forms in a home and how design and airflow change it. A good first read before you talk to an owner about repeat damp.',
  },
  {
    id: 'yourhome-glazing',
    title: 'Glazing (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/passive-design/glazing',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Explains window and glazing choices and how they affect cold surfaces. Useful when moisture keeps showing up at windows.',
  },
  {
    id: 'yourhome-cladding-systems',
    title: 'Cladding systems (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/materials/cladding-systems',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Describes common cladding systems and how each deals with weather. It helps you picture what sits behind a wall before you open it.',
  },
  {
    id: 'yourhome-concrete-slab-floors',
    title: 'Concrete slab floors (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/materials/concrete-slab-floors',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Covers how concrete slab floors are built in houses. Relevant when moisture rises from the ground or gets trapped under floor coverings.',
  },
  {
    id: 'yourhome-insulation',
    title: 'Insulation (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/passive-design/insulation',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Explains insulation types and where they go. Useful for seeing how insulation changes surface temperatures and moisture behaviour.',
  },
  {
    id: 'yourhome-design-climate',
    title: 'Design for climate (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'moisture-and-condensation',
    url: 'https://www.yourhome.gov.au/passive-design/design-climate',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Shows how climate zones shape home design. Gives context for why drying conditions and mould risk differ between regions.',
  },
  {
    id: 'silo',
    title: 'SILO climate data (Long Paddock)',
    publisher: 'Queensland Government (Long Paddock)',
    jurisdiction: 'Qld',
    category: 'moisture-and-condensation',
    url: 'https://www.longpaddock.qld.gov.au/silo/',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.longpaddock.qld.gov.au/silo/',
    readDate: '2026-10-14',
    attribution: 'Queensland Government (Long Paddock SILO), CC BY 4.0',
    note: 'Free historical climate data for Australian locations. Handy for checking what the weather did around a loss, bearing in mind the accuracy notes on the site.',
  },
  {
    id: 'qbcc-preventing-structural-damage',
    title: 'A guide to preventing structural damage (foundations and clay soils)',
    publisher: 'Queensland Building and Construction Commission',
    jurisdiction: 'Qld',
    category: 'moisture-and-condensation',
    url: 'https://www.qbcc.qld.gov.au/sites/default/files/2021-10/guide-preventing-structural-damage.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qbcc.qld.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: 'Queensland Building and Construction Commission, licensed CC BY 4.0 Australia',
    note: 'A guide for owners on foundations and clay soils. It helps you separate soil movement and drainage problems from other causes of cracking and damp.',
  },
  {
    id: 'qbcc-wet-areas-vinyl-tiles',
    title: 'Vinyl planks, tiles and hybrid flooring used in wet areas (fact sheet)',
    publisher: 'Queensland Building and Construction Commission',
    jurisdiction: 'Qld',
    category: 'moisture-and-condensation',
    url: 'https://www.qbcc.qld.gov.au/sites/default/files/documents/guide-ncbp-vinyl-planks-tles-used-wet-areas.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qbcc.qld.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: 'Queensland Building and Construction Commission, licensed CC BY 4.0 Australia',
    note: 'A 2023 QBCC fact sheet on these floor coverings in wet areas. Useful when you assess a floor after a bathroom or laundry leak.',
  },
  {
    id: 'abcb-iaq-vm-handbook-ncc2022',
    title: 'Indoor Air Quality Verification Methods Handbook (NCC 2022)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2023/Handbook-Indoor-Air-Quality-Verification-Methods-NCC-2022.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2023/Handbook-Indoor-Air-Quality-Verification-Methods-NCC-2022.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on the NCC 2022 indoor air quality verification methods. It explains how those methods assess indoor air quality.',
  },
  {
    id: 'yourhome-ventilation-airtightness',
    title: 'Ventilation and airtightness (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.yourhome.gov.au/passive-design/ventilation-airtightness',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Covers natural and mechanical ventilation and how airtight a house is. Helps you decide how far to open up or seal a building during and after drying.',
  },
  {
    id: 'yourhome-heating-cooling',
    title: 'Heating and cooling (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.yourhome.gov.au/energy/heating-and-cooling',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'Explains heating and cooling systems for homes. Useful context when you plan air movement and humidity control.',
  },
  {
    id: 'abcb-warm-water-systems-handbook',
    title: 'Warm water systems handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-warm-water-systems.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-warm-water-systems.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on warm water systems in buildings, covering plumbing design and bacteria risk.',
  },
  {
    id: 'abcb-adv-openable-windows',
    title: 'Advisory note: protection of openable windows',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Advisory-note-protection-of-openable-windows.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Advisory-note-protection-of-openable-windows.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB advisory note on the protection of openable windows, covering the risk of falls from upper floors.',
  },
  {
    id: 'abcb-housing-energy-efficiency-handbook',
    title: 'Housing energy efficiency handbook (NCC 2022)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/Housing%20energy%20efficiency%20handbook.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/Housing%20energy%20efficiency%20handbook.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on the NCC 2022 housing energy efficiency provisions, covering insulation, sealing and ventilation in houses.',
  },
  {
    id: 'abcb-energy-efficiency-vol2-handbook-2019',
    title: 'Energy efficiency NCC Volume Two handbook (2019)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-energy-efficiency-NCC-Volume-Two-2019.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-energy-efficiency-NCC-Volume-Two-2019.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The 2019 edition of the ABCB energy efficiency handbook for NCC Volume Two, an earlier edition of this guidance.',
  },
  {
    id: 'abcb-residential-ee-overview-2022',
    title: '2022 residential energy efficiency: overview of provisions (slides)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'ventilation-and-indoor-air',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/NCC-2022-Residential-Energy-Efficiency-Overview-of-Provisions.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/NCC-2022-Residential-Energy-Efficiency-Overview-of-Provisions.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB slide deck summarising the NCC 2022 residential energy efficiency changes.',
  },
  {
    id: 'business-qld-timber-species-pages',
    title: 'Wood properties and uses of Australian timbers (80 species pages)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.business.qld.gov.au/industries/farms-fishing-forestry/forests-wood/properties-timbers',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qld.gov.au/legal/copyright',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'Eighty Business Queensland pages on the properties and uses of Australian timbers, linked through their index. Helps you identify a floor or frame species and think through how it will react to moisture.',
  },
  {
    id: 'qld-ctiq-about-2018',
    title: 'About Construction timbers in Queensland (2018)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/df7ad4be-167f-4099-8280-102437f7bd70/download/about-ctiq-2018.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/df7ad4be-167f-4099-8280-102437f7bd70/download/about-ctiq-2018.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'An introduction to the Construction timbers in Queensland reference books. Read it first to see how the two books and their tables are laid out.',
  },
  {
    id: 'qld-ctiq-amendments-2020',
    title: 'Amendments to Construction timbers in Queensland (2020)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/5eac9f00-f12d-4cc4-9fa4-554e2ba79aec/download/ctiq-amendments-2020.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/5eac9f00-f12d-4cc4-9fa4-554e2ba79aec/download/ctiq-amendments-2020.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'Lists the 2020 changes to the timber reference books. Check it so you do not quote a superseded figure.',
  },
  {
    id: 'qld-ctiq-book1-definitions',
    title: 'Construction timbers in Queensland, Book 1: Definitions (2020)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/976103a3-9ea1-44e7-a950-78ba1bd952e8/download/ctiq-book-1-definitions-jan-2020.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/976103a3-9ea1-44e7-a950-78ba1bd952e8/download/ctiq-book-1-definitions-jan-2020.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'Defines the terms used for timber grades, durability and use. Handy when a report or a client uses a term you need to pin down.',
  },
  {
    id: 'qld-ctiq-book2-specifications',
    title: 'Construction timbers in Queensland, Book 2: Properties and specifications (2020)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/9393cc58-6f73-467a-8900-5b688888fbdb/download/ctiq-book-2-specifications-jan-2020.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/34cb31ba-7ae9-48ea-a7c9-228525e4c638/resource/9393cc58-6f73-467a-8900-5b688888fbdb/download/ctiq-book-2-specifications-jan-2020.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'Sets out species properties, durability classes and uses. A strong reference when you need to know what a damaged floor or frame is made of.',
  },
  {
    id: 'qbcc-timber-deck-balcony',
    title: 'Timber deck and balcony construction (defect guide)',
    publisher: 'Queensland Building and Construction Commission',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.qbcc.qld.gov.au/sites/default/files/2021-11/guide-timber-deck-balcony-construction.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qbcc.qld.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: 'Queensland Building and Construction Commission, licensed CC BY 4.0 Australia',
    note: 'A QBCC guide to timber deck and balcony construction. It helps you spot construction faults that let water in before you blame the weather.',
  },
  {
    id: 'qbcc-non-completion-technical-manual',
    title: 'Non-completion Technical Procedure Manual',
    publisher: 'Queensland Building and Construction Commission',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.qbcc.qld.gov.au/sites/default/files/documents/non-completion-technical-procedures-manual.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qbcc.qld.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: 'Queensland Building and Construction Commission, licensed CC BY 4.0 Australia',
    note: 'A QBCC technical manual on unfinished building work, including particleboard and timber flooring exposed to weather. Useful when a floor was rained on during construction.',
  },
  {
    id: 'abcb-adv-timber-framing-concessions',
    title: 'Advisory note: Class 2 and 3 buildings, concessions for timber framing',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'timber-floors-and-framing',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Advisory-Note-timber-framing-concessions.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Advisory-Note-timber-framing-concessions.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB advisory note on concessions for timber framing in apartment and other multi-unit residential buildings.',
  },
  {
    id: 'yourhome-lightweight-framing',
    title: 'Lightweight framing, including timber framing (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'timber-floors-and-framing',
    url: 'https://www.yourhome.gov.au/materials/lightweight-framing',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'A plain explanation of lightweight and timber framing. It gives you a picture of how walls are built before you cut one open.',
  },
  {
    id: 'yourhome-construction-systems',
    title: 'Construction systems (YourHome)',
    publisher:
      'Australian Government Department of Climate Change, Energy, the Environment and Water (YourHome)',
    jurisdiction: 'AU',
    category: 'timber-floors-and-framing',
    url: 'https://www.yourhome.gov.au/materials/construction-systems',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.yourhome.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Commonwealth of Australia (YourHome, DCCEEW), CC BY 4.0',
    note: 'An overview of the construction systems used in houses. Useful for explaining to a client why a floor or wall is built the way it is.',
  },
  {
    id: 'qld-subterranean-termites-2019',
    title: 'Subterranean termites in Queensland (2019)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797/resource/34a952d1-dc8e-4755-beca-96f9ae0fdfdf/download/subterranean-termites-in-queensland_2019.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'A Queensland fact sheet on subterranean termites. Helps you tell termite damage from moisture damage in timber.',
  },
  {
    id: 'qld-termite-baiting-2019',
    title: 'Subterranean termite baiting systems (2019)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797/resource/47706fd6-a8ec-429d-acda-761b4b6e8c80/download/subterranean-termite-baiting-systems_2019.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'A Queensland fact sheet on baiting systems. Useful background when a client asks what treatment is already on site.',
  },
  {
    id: 'qld-termite-infestation-buildings-2019',
    title: 'Subterranean termite infestation in buildings (2019)',
    publisher: 'Queensland Department of Agriculture and Fisheries',
    jurisdiction: 'Qld',
    category: 'timber-floors-and-framing',
    url: 'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797/resource/77f1d06c-eac0-4501-9b10-fccf96040ad5/download/subterranean-termite-infestation-in-buildings_2019.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.publications.qld.gov.au/dataset/53ac3a6d-ae93-4a4d-9461-a629ab60f797',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Agriculture and Fisheries), CC BY 4.0',
    note: 'A Queensland fact sheet on termite infestation in buildings. Helps you recognise signs while you inspect wet or damaged timber.',
  },
  {
    id: 'nz-guide-to-tolerances-2015',
    title: 'Guide to tolerances, materials and workmanship in new residential construction (2015)',
    publisher: 'Ministry of Business, Innovation and Employment (NZ)',
    jurisdiction: 'NZ',
    category: 'timber-floors-and-framing',
    url: 'https://www.building.govt.nz/assets/Uploads/projects-and-consents/guide-to-tolerances/guide-to-tolerances.pdf',
    format: 'PDF',
    licence: 'CC BY 3.0',
    licenceSource:
      'https://www.building.govt.nz/assets/Uploads/projects-and-consents/guide-to-tolerances/guide-to-tolerances.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Crown Copyright 2015, Ministry of Business, Innovation and Employment, CC BY 3.0',
    note: 'A New Zealand guide that includes subfloors and flooring. Useful for judging whether a floor or wall fault is a build issue or damage.',
  },
  {
    id: 'business-qld-repairing-after-flood',
    title: 'Repairing a house after a flood (Business Queensland)',
    publisher: 'Queensland Department of Housing and Public Works',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.business.qld.gov.au/industries/building-property-development/building-construction/natural-disasters/repairing-after-flood',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qld.gov.au/legal/copyright',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Housing and Public Works), CC BY 4.0',
    note: 'Business Queensland guidance on repairing a house after a flood. A practical reference when you scope flood repairs with an owner.',
  },
  {
    id: 'qbcc-contractor-guide-rebuilding-after-flood',
    title: "A contractor's guide to rebuilding after a flood (2020)",
    publisher: 'Queensland Building and Construction Commission',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.qbcc.qld.gov.au/sites/default/files/2022-01/guide-contractor-rebuilding-after-flood.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qbcc.qld.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: 'Queensland Building and Construction Commission, licensed CC BY 4.0 Australia',
    note: "A QBCC guide written for builders rebuilding after a flood. It shows what the rebuild trades expect from a restorer's handover.",
  },
  {
    id: 'qld-design-guidance-flood-resilient-homes-2026',
    title: 'Design Guidance for Flood Resilient Homes (June 2026)',
    publisher: 'Queensland Department of Housing and Public Works',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.getready.qld.gov.au/sites/default/files/2026-06/Design%20Guidance%20for%20Flood%20Resilient%20Homes_final%20digital.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.getready.qld.gov.au/sites/default/files/2026-06/Design%20Guidance%20for%20Flood%20Resilient%20Homes_final%20digital.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Housing and Public Works), CC BY 4.0',
    note: 'The June 2026 Queensland design guidance for flood resilient homes. A current reference for material and layout choices when a flooded house is rebuilt. It is a very large file.',
  },
  {
    id: 'qld-rhf-industry-guidance-flood-resilient-a3',
    title: 'Industry Guidance for Flood Resilient Homes (A3), Resilient Homes Fund',
    publisher: 'Queensland Department of Energy and Public Works',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.qld.gov.au/__data/assets/pdf_file/0026/335780/rhf-industry-guidance-flood-resilient-home-a3.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qld.gov.au/legal/copyright',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Department of Energy and Public Works), CC BY 4.0',
    note: 'A one-sheet industry guide from the Queensland Resilient Homes Fund. Quick to scan when you talk through rebuild options.',
  },
  {
    id: 'qra-flood-resilient-building-v1-1',
    title: 'Flood Resilient Building Guidance for Queensland Homes v1.1 (2024)',
    publisher: 'Queensland Reconstruction Authority',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.qra.qld.gov.au/sites/default/files/2024-02/0879_Flood%20Resilient%20Building%20Guidance%20for%20Queensland%20Homes.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.qra.qld.gov.au/access-information/copyright',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Queensland Reconstruction Authority), CC BY 4.0',
    note: 'QRA guidance on materials and details for flood resilient homes. Helpful when advising what to reinstate after a flood.',
  },
  {
    id: 'qra-cyclone-resilient-building',
    title: 'Cyclone Resilient Building Guidance for Queensland Homes (2019)',
    publisher: 'Queensland Reconstruction Authority',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.qra.qld.gov.au/sites/default/files/2019-12/0321%20Cyclone%20Resilient%20Building%20Guidance%20for%20Qld%20Homes%20FINAL.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.qra.qld.gov.au/sites/default/files/2019-12/0321%20Cyclone%20Resilient%20Building%20Guidance%20for%20Qld%20Homes%20FINAL.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Queensland Reconstruction Authority), CC BY 4.0',
    note: 'QRA guidance on building for cyclones. Background on wind and water entry when storm damage is the loss.',
  },
  {
    id: 'qra-storm-tide-resilient-building',
    title: 'Storm Tide Resilient Building Guidance for Queensland Homes (2019)',
    publisher: 'Queensland Reconstruction Authority',
    jurisdiction: 'Qld',
    category: 'flood-and-storm-resilience',
    url: 'https://www.qra.qld.gov.au/sites/default/files/2019-12/0320%20Storm%20Tide%20Resilient%20Building%20Guidance%20for%20Qld%20Homes%20FINAL.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.qra.qld.gov.au/sites/default/files/2019-12/0320%20Storm%20Tide%20Resilient%20Building%20Guidance%20for%20Qld%20Homes%20FINAL.pdf',
    readDate: '2026-10-14',
    attribution: '© State of Queensland (Queensland Reconstruction Authority), CC BY 4.0',
    note: 'QRA guidance on building for storm tide. Relevant for coastal salt-water losses.',
  },
  {
    id: 'aidr-community-recovery-handbook',
    title: 'Community Recovery Handbook',
    publisher: 'Australian Institute for Disaster Resilience',
    jurisdiction: 'AU',
    category: 'flood-and-storm-resilience',
    url: 'https://knowledge.aidr.org.au/media/5634/community-recovery-handbook.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://knowledge.aidr.org.au/media/5634/community-recovery-handbook.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia (Australian Institute for Disaster Resilience), CC BY 4.0',
    note: 'A handbook on community recovery after disasters. Helps you understand the wider recovery process your clients are going through.',
  },
  {
    id: 'act-mould',
    title: 'Mould (ACT Government)',
    publisher: 'ACT Government',
    jurisdiction: 'ACT',
    category: 'mould-and-health',
    url: 'https://www.act.gov.au/housing-planning-and-property/staying-healthy-in-your-home/mould',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.act.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© Australian Capital Territory, CC BY 4.0',
    note: 'ACT Government guidance on mould in the home. A plain-language page to point owners and tenants to when you explain causes and prevention.',
  },
  {
    id: 'healthnz-floods-and-health',
    title: 'Floods and health (Health NZ)',
    publisher: 'Health New Zealand',
    jurisdiction: 'NZ',
    category: 'mould-and-health',
    url: 'https://info.health.nz/keeping-healthy/in-emergencies/floods-and-health',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.healthnz.govt.nz/copyright',
    readDate: '2026-10-14',
    attribution: '© Health New Zealand, CC BY 4.0 (photographs, illustrations and logos excluded)',
    note: 'Health NZ advice on floods and health, including mould and contents. A useful reference for New Zealand jobs.',
  },
  {
    id: 'healthnz-healthy-homes',
    title: 'Keeping your home healthy: damp, condensation and mould (Health NZ)',
    publisher: 'Health New Zealand',
    jurisdiction: 'NZ',
    category: 'healthy-homes-nz',
    url: 'https://info.health.nz/keeping-healthy/healthy-homes-environments/healthy-homes',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.healthnz.govt.nz/copyright',
    readDate: '2026-10-14',
    attribution: '© Health New Zealand, CC BY 4.0 (photographs, illustrations and logos excluded)',
    note: 'Health NZ advice on keeping a home dry and healthy. Written for households, so it suits client conversations about damp and mould.',
  },
  {
    id: 'nz-healthy-homes-regs-2019-88',
    title:
      'Residential Tenancies (Healthy Homes Standards) Regulations 2019 (consolidated PDF, 25 September 2025)',
    publisher: 'New Zealand Parliamentary Counsel Office',
    jurisdiction: 'NZ',
    category: 'healthy-homes-nz',
    url: 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2019/88/en/2025-09-25.pdf',
    format: 'PDF',
    licence: 'No copyright (NZ legislation)',
    licenceSource: 'https://www.legislation.govt.nz/copyright/',
    readDate: '2026-10-14',
    attribution:
      'New Zealand legislation: no copyright under section 27 of the Copyright Act 1994. Source: Parliamentary Counsel Office',
    note: 'The legal text of the Healthy Homes Standards for New Zealand rentals. A primary source for landlord and tenant jobs involving heating, insulation, ventilation and moisture. This link is a dated consolidation, so check for a newer version.',
  },
  {
    id: 'ncc2025-housing-provisions',
    title: 'NCC 2025 ABCB Housing Provisions Standard',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/housing-provisions/front-matter/copyright-licence-notice-and-acknowledgment-country',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/housing-provisions/front-matter/copyright-licence-notice-and-acknowledgment-country',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The online edition of the NCC 2025 ABCB Housing Provisions Standard, published by the ABCB on its NCC site with a link to the PDF.',
  },
  {
    id: 'ncc2025-volume-two',
    title: 'NCC 2025 Volume Two (Class 1 and 10)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/volume-two/preface/copyright-licence-notice-and-acknowledgment-country',
    format: 'web',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/volume-two/preface/copyright-licence-notice-and-acknowledgment-country',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'The online edition of NCC 2025 Volume Two, covering houses and small outbuildings, published by the ABCB on its NCC site with a link to the PDF.',
  },
  {
    id: 'abcb-upgrading-existing-buildings',
    title: 'Upgrading Existing Buildings handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-upgrading-existing-buildings.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2022/Handbook-upgrading-existing-buildings.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on upgrading buildings that were constructed to earlier requirements.',
  },
  {
    id: 'abcb-embodied-carbon-handbook',
    title: 'Embodied carbon handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2026/Embodied-carbon-handbook.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2026/Embodied-carbon-handbook.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on embodied carbon in building materials and construction.',
  },
  {
    id: 'abcb-prefab-modular-handbook',
    title: 'Prefabricated, modular and offsite construction handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/Prefabricated%2C%20modular%20and%20offsite%20construction%20handbook%20NCC%202022%20Final.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/Prefabricated%2C%20modular%20and%20offsite%20construction%20handbook%20NCC%202022%20Final.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on prefabricated, modular and offsite construction, written for NCC 2022.',
  },
  {
    id: 'abcb-sound-transmission-handbook',
    title: 'Sound transmission and insulation in buildings handbook',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2024/Sound-transmission-handbook-2022-final.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2024/Sound-transmission-handbook-2022-final.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on sound transmission and insulation in floors and walls.',
  },
  {
    id: 'abcb-bushfire-vm-handbook-2023',
    title: 'Bushfire Verification Methods Handbook (NCC 2022)',
    publisher: 'Australian Building Codes Board',
    jurisdiction: 'AU',
    category: 'building-codes',
    url: 'https://www.abcb.gov.au/sites/default/files/resources/2023/NCC-2022-Bushfire-Verification-Methods-Handbook-FA.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.abcb.gov.au/sites/default/files/resources/2023/NCC-2022-Bushfire-Verification-Methods-Handbook-FA.pdf',
    readDate: '2026-10-14',
    attribution:
      '© Commonwealth of Australia and the States and Territories of Australia (ABCB), CC BY 4.0',
    note: 'An ABCB handbook on the NCC 2022 bushfire verification methods.',
  },
  {
    id: 'nz-building-regs-1992-150',
    title:
      'Building Regulations 1992, including Building Code Schedule 1 (consolidated PDF, 15 January 2026)',
    publisher: 'New Zealand Parliamentary Counsel Office',
    jurisdiction: 'NZ',
    category: 'building-codes',
    url: 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/1992/150/en/2026-01-15.pdf',
    format: 'PDF',
    licence: 'No copyright (NZ legislation)',
    licenceSource: 'https://www.legislation.govt.nz/copyright/',
    readDate: '2026-10-14',
    attribution:
      'New Zealand legislation: no copyright under section 27 of the Copyright Act 1994. Source: Parliamentary Counsel Office',
    note: 'The New Zealand Building Regulations with the Building Code. The legal text behind the moisture and ventilation clauses. This link is a dated consolidation, so check for a newer version.',
  },
  {
    id: 'epa-vic-after-fire-asbestos',
    title: 'After a fire: Asbestos hazards (Publication 1719.3)',
    publisher: 'EPA Victoria',
    jurisdiction: 'Vic',
    category: 'asbestos-and-worker-safety',
    url: 'https://www.epa.vic.gov.au/sites/default/files/epa/publications/1719-after-fire-asbestos-hazards-version-3.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource: 'https://www.epa.vic.gov.au/copyright',
    readDate: '2026-10-14',
    attribution: '© State of Victoria (EPA Victoria), CC BY 4.0',
    note: 'An EPA Victoria publication on asbestos hazards after a fire. Useful context before you disturb fire-damaged materials in older buildings.',
  },
  {
    id: 'swa-wes-nov2025',
    title: 'Workplace exposure standards for airborne contaminants (November 2025)',
    publisher: 'Safe Work Australia',
    jurisdiction: 'AU',
    category: 'asbestos-and-worker-safety',
    url: 'https://www.safeworkaustralia.gov.au/sites/default/files/2025-11/workplace-exposure-standards-amended-november2025.pdf',
    format: 'PDF',
    licence: 'CC BY 4.0',
    licenceSource:
      'https://www.safeworkaustralia.gov.au/sites/default/files/2025-11/workplace-exposure-standards-amended-november2025.pdf',
    readDate: '2026-10-14',
    attribution: 'Safe Work Australia, licensed CC BY 4.0 (logo excluded)',
    note: "Safe Work Australia's list of workplace exposure standards for airborne contaminants. The reference behind many air-quality and respiratory protection decisions on site.",
  },
];

export const FREE_RESOURCE_JURISDICTIONS: readonly ResourceJurisdiction[] = [
  'AU',
  'Qld',
  'NSW',
  'ACT',
  'Vic',
  'NZ',
];

export function groupResourcesByCategory(
  items: readonly FreeResource[],
  categories: readonly ResourceCategoryId[]
): { category: ResourceCategoryId; items: FreeResource[] }[] {
  return categories
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
}
