import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  resolveCecHours,
  resolveDurationHours,
  type CecResolvable,
} from '@/lib/seed/cec-hours';

type CecProfessionalAssignmentsFile = {
  version: number;
  excludedSlugs?: string[];
  assignments?: Record<string, number>;
  slugAliases?: Record<string, string>;
};

let cached: {
  excluded: Set<string>;
  assignments: Map<string, number>;
  aliases: Map<string, string>;
  wpBySlug: Map<string, CecResolvable> | null;
} | null = null;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function loadWpBySlug(): Map<string, CecResolvable> {
  const path = join(process.cwd(), 'data', 'wordpress-export', 'courses.json');
  try {
    const rows = JSON.parse(readFileSync(path, 'utf8')) as CecResolvable[];
    const map = new Map<string, CecResolvable>();
    for (const row of rows) {
      const slug = (row as { slug?: string }).slug;
      if (slug) map.set(normalizeSlug(slug), row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function loadAssignmentsFile(): {
  excluded: Set<string>;
  assignments: Map<string, number>;
  aliases: Map<string, string>;
  wpBySlug: Map<string, CecResolvable>;
} {
  if (cached) {
    return {
      excluded: cached.excluded,
      assignments: cached.assignments,
      aliases: cached.aliases,
      wpBySlug: cached.wpBySlug ?? new Map(),
    };
  }

  const path = join(process.cwd(), 'data', 'seed', 'cec-professional-assignments.json');
  let raw: CecProfessionalAssignmentsFile;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as CecProfessionalAssignmentsFile;
  } catch {
    const wpBySlug = loadWpBySlug();
    cached = { excluded: new Set(), assignments: new Map(), aliases: new Map(), wpBySlug };
    return { excluded: cached.excluded, assignments: cached.assignments, aliases: cached.aliases, wpBySlug };
  }

  const excluded = new Set(
    (raw.excludedSlugs ?? []).map((s) => normalizeSlug(s)).filter(Boolean)
  );
  const assignments = new Map<string, number>();
  for (const [slug, hours] of Object.entries(raw.assignments ?? {})) {
    if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) continue;
    assignments.set(normalizeSlug(slug), hours);
  }
  const aliases = new Map<string, string>();
  for (const [from, to] of Object.entries(raw.slugAliases ?? {})) {
    if (!from.trim() || !to.trim()) continue;
    aliases.set(normalizeSlug(from), normalizeSlug(to));
  }

  const wpBySlug = loadWpBySlug();
  cached = { excluded, assignments, aliases, wpBySlug };
  return { excluded, assignments, aliases, wpBySlug };
}

function resolveFromWpCatalog(slug: string): number | null {
  const { aliases, wpBySlug } = loadAssignmentsFile();
  const canonical = aliases.get(slug) ?? slug;
  const row = wpBySlug.get(canonical);
  if (!row) return null;
  const hours = resolveCecHours(row);
  return hours != null && hours > 0 ? hours : null;
}

/** Slugs that are catalogue products but not IICRC continuing-education courses. */
export function isCecExcludedSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return loadAssignmentsFile().excluded.has(normalizeSlug(slug));
}

/**
 * Reviewer-assigned CEC hours for courses with no parseable CEC in export/DB fields.
 * Never overrides explicit `cec_hours` — call only after catalog resolution fails.
 */
export function getProfessionalCecAssignment(slug: string | null | undefined): number | null {
  if (!slug?.trim()) return null;
  const key = normalizeSlug(slug);
  const { excluded, assignments, aliases } = loadAssignmentsFile();
  if (excluded.has(key)) return null;

  const canonical = aliases.get(key) ?? key;
  const fromAssignment = assignments.get(key) ?? assignments.get(canonical);
  if (fromAssignment != null) return fromAssignment;

  return resolveFromWpCatalog(key);
}

/**
 * Duration hours from the WordPress export catalogue (via slug or slugAliases).
 * Used when the LMS row has no `duration_hours` and no parseable duration prose.
 */
export function getWpCatalogDurationHours(slug: string | null | undefined): number | null {
  if (!slug?.trim()) return null;
  const key = normalizeSlug(slug);
  const { aliases, wpBySlug } = loadAssignmentsFile();
  const canonical = aliases.get(key) ?? key;
  const row = wpBySlug.get(canonical);
  if (!row) return null;
  const hours = resolveDurationHours({
    duration_hours: row.duration_hours,
    short_description: row.short_description,
    description: row.description,
  });
  return hours != null && hours > 0 ? hours : null;
}

/** For tests and seed scripts — reset in-memory cache after file edits. */
export function resetCecProfessionalAssignmentsCache(): void {
  cached = null;
}
