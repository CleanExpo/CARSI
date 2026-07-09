/**
 * CARSI Southern Hemisphere Restoration Designations — registry access.
 *
 * The registry SSOT is `data/seed/designations.json` (validated by
 * `npm run check:designations`). This module gives typed, pure access to the
 * definitions; it is safe to import from both server and client code. Joining a
 * designation to live course/enrolment data (server-only) lives in
 * `src/lib/server/designations.ts`.
 */
import registryJson from '../../../data/seed/designations.json';

export type PathwayStepRole = 'foundation' | 'credential';

export type DesignationPathwayStep = {
  courseSlug: string;
  order: number;
  required: boolean;
  role: PathwayStepRole;
};

export type DesignationDefinition = {
  slug: string;
  name: string;
  disciplineTopic: string;
  summary: string;
  pathwaySteps: DesignationPathwayStep[];
  completionRule: 'all-required';
  alsoEarnsCec: boolean;
};

export type DesignationRegistry = {
  version: number;
  program: string;
  programSummary: string;
  designations: DesignationDefinition[];
};

// JSON infers `role`/`completionRule` as `string`; the registry is validated at
// build/CI time by `npm run check:designations`, so assert the richer type here.
const REGISTRY = registryJson as unknown as DesignationRegistry;

/** The whole registry (program name, summary, designations). */
export function getDesignationRegistry(): DesignationRegistry {
  return REGISTRY;
}

/** All designation definitions, in registry order. */
export function listDesignationDefinitions(): DesignationDefinition[] {
  return REGISTRY.designations;
}

/** A single designation definition by slug, or null. */
export function getDesignationDefinition(slug: string): DesignationDefinition | null {
  return REGISTRY.designations.find((d) => d.slug === slug) ?? null;
}

/** Pathway steps sorted by their `order`. */
export function orderedSteps(designation: DesignationDefinition): DesignationPathwayStep[] {
  return [...designation.pathwaySteps].sort((a, b) => a.order - b.order);
}
