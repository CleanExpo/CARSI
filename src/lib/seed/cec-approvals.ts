/**
 * IICRC CEC approvals registry — the single source of truth for CEC hours.
 *
 * Licence-critical (CLAUDE.md § "IICRC / CEC — root cause + enforcement"): CARSI may
 * display CEC hours for a course ONLY after the IICRC has approved that course
 * (per-course submission via CECCourse@iicrcnet.org — see
 * `scripts/generate-cec-submission.ts`). The founder records each approval in
 * `data/seed/cec-approvals.json`; nothing else is approval. The registry is validated
 * fail-closed in CI by `npm run check:cec` (`scripts/check-cec-approvals.mjs`), and the
 * compliance scanner (`scripts/check-iicrc-compliance.mjs`) derives its approved-slug
 * allow-list from the same file, so there is exactly one place approval lives.
 */

import registryJson from '../../../data/seed/cec-approvals.json';

export const CEC_APPROVAL_STATUSES = ['approved', 'submitted', 'not_submitted'] as const;

export type CecApprovalStatus = (typeof CEC_APPROVAL_STATUSES)[number];

export interface CecApprovalEntry {
  /** Catalog course slug (must exist in data/seed/courses-catalog.json). */
  slug: string;
  status: CecApprovalStatus;
  /** IICRC-approved CEC hours (whole number ≥ 1). Only meaningful when status is 'approved'. */
  approvedHours?: number | null;
  /** ISO date the IICRC confirmed approval. */
  approvedAt?: string | null;
  /** IICRC reference / correspondence identifier for the approval. */
  iicrcReference?: string | null;
  /** Where the evidence lives (email, letter, directory listing). */
  evidence?: string | null;
}

interface CecApprovalsFile {
  version: number;
  approvals: CecApprovalEntry[];
}

/** Pure lookup over an explicit registry — used directly by tests. */
export function approvedCecHoursFromRegistry(
  approvals: readonly CecApprovalEntry[],
  slug: string | null | undefined
): number | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase();
  for (const entry of approvals) {
    if (entry.slug.trim().toLowerCase() !== key) continue;
    if (entry.status !== 'approved') return null;
    const hours = entry.approvedHours;
    return typeof hours === 'number' && Number.isFinite(hours) && hours > 0 ? hours : null;
  }
  return null;
}

const registry = registryJson as CecApprovalsFile;

/** All registry entries (any status). */
export function getCecApprovalEntries(): readonly CecApprovalEntry[] {
  return registry.approvals ?? [];
}

/** The registry entry for a slug, if any. */
export function getCecApproval(slug: string | null | undefined): CecApprovalEntry | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase();
  return getCecApprovalEntries().find((e) => e.slug.trim().toLowerCase() === key) ?? null;
}

/**
 * IICRC-approved CEC hours for a course, or null when the course has no recorded
 * approval. This is the ONLY legitimate read path for a CEC-hours display value.
 */
export function getApprovedCecHours(slug: string | null | undefined): number | null {
  return approvedCecHoursFromRegistry(getCecApprovalEntries(), slug);
}

/** Slugs with a confirmed IICRC approval (for guards and audits). */
export function getApprovedCecSlugs(): string[] {
  return getCecApprovalEntries()
    .filter((e) => e.status === 'approved')
    .map((e) => e.slug);
}
