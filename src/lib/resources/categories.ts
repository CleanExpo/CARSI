/**
 * Free Resources categories. Kept apart from the item data so the header menu can list
 * them without pulling every resource into the client bundle. Items refer to a category by
 * `id`; the label is what readers see, and the id doubles as the page anchor.
 */
export const RESOURCE_CATEGORIES = [
  { id: 'moisture-and-condensation', label: 'Moisture and condensation' },
  { id: 'ventilation-and-indoor-air', label: 'Ventilation and indoor air' },
  { id: 'timber-floors-and-framing', label: 'Timber, floors and framing' },
  { id: 'flood-and-storm-resilience', label: 'Flood and storm resilience' },
  { id: 'mould-and-health', label: 'Mould and health' },
  { id: 'healthy-homes-nz', label: 'Healthy Homes (NZ)' },
  { id: 'building-codes', label: 'Building codes' },
  { id: 'asbestos-and-worker-safety', label: 'Asbestos and worker safety' },
] as const;

export type ResourceCategoryId = (typeof RESOURCE_CATEGORIES)[number]['id'];

export function resourceCategoryLabel(id: ResourceCategoryId): string {
  return RESOURCE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
