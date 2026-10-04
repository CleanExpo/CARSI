/**
 * Resolve a /courses?discipline=… URL parameter to a catalogue topic tab (GP-592).
 *
 * The catalogue filters by plain topic tabs ('Water Damage', 'Cleaning', …) since
 * the 2026-07-10 de-IICRC change, but many links still carry the legacy URL codes:
 * start-smart pages, the CEC calculator, customer-journey links, the CCW roadshow
 * page, and the public citation packs already indexed off-site. The page used to
 * upper-case the parameter and hand it to CourseGrid, which matched no tab and
 * fell back to 'All'. So `?discipline=CCT` showed all 80 courses.
 *
 * This map only ROUTES an incoming URL to a topic. It does not name or brand any
 * course; no acronym is shown to the user (CLAUDE.md permits third-person
 * reference; it bans branding CARSI courses with the acronyms).
 */

/** Must stay identical to DISCIPLINE_TABS in src/components/lms/CourseGrid.tsx (pinned by test). */
export const CATALOGUE_TOPIC_TABS = [
  'All',
  'Recommended',
  'Onboarding',
  'IICRC CEC',
  'Water Damage',
  'Mould',
  'Fire & Smoke',
  'HVAC',
  'Cleaning',
  'Free',
] as const;

export type CatalogueTopicTab = (typeof CATALOGUE_TOPIC_TABS)[number];

/** Legacy URL code → topic tab. Keys are upper-case. */
export const LEGACY_URL_CODES: Readonly<Record<string, CatalogueTopicTab>> = {
  WRT: 'Water Damage',
  ASD: 'Water Damage',
  AMRT: 'Mould',
  FSRT: 'Fire & Smoke',
  OCT: 'Fire & Smoke',
  CCT: 'Cleaning',
  CRT: 'Cleaning',
};

function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\band\b/g, '&');
}

/**
 * Returns the topic tab for a raw `discipline` search param, or undefined when the
 * value is empty or unknown (the grid then shows 'All').
 */
export function resolveDisciplineParam(
  raw: string | string[] | undefined | null
): CatalogueTopicTab | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  const legacy = LEGACY_URL_CODES[value.trim().toUpperCase()];
  if (legacy) return legacy;

  const wanted = normalise(value);
  return CATALOGUE_TOPIC_TABS.find((tab) => normalise(tab) === wanted);
}
