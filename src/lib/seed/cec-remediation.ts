/**
 * CEC prod-remediation logic (GP-498).
 *
 * The live `lms_courses.cec_hours` column still holds stale, DERIVED values from before
 * the fail-closed cutover (founder directive 2026-07-09) — public course pages therefore
 * display CEC claims the IICRC never approved. The read-time resolver cannot fix this: it
 * treats any stored positive as an explicit approval, so it echoes the stale value.
 *
 * The ONLY source of truth for whether a course has CEC hours is the approvals registry
 * (`data/seed/cec-approvals.json`). This module derives the value each course SHOULD hold
 * from the registry alone — ignoring the untrusted stored column — so a remediation pass
 * can converge prod to the SSOT: approved courses to their registry hours, everything else
 * to 0 (the explicit "not approved" opt-out; the resolver maps explicit 0 → no badge).
 */

import { getApprovedCecHours } from './cec-approvals';

/** Registry-approved hours for a course, or 0 when it holds no recorded IICRC approval. */
export function resolveApprovedCecTarget(slug: string | null | undefined): number {
  return getApprovedCecHours(slug) ?? 0;
}

export interface CecRemediationRow {
  slug: string;
  current: number | null;
}

export interface CecRemediationPlanItem {
  slug: string;
  current: number | null;
  target: number;
}

/**
 * Courses whose stored `cec_hours` disagrees with the registry-derived target.
 * A stored NULL and a stored 0 are equivalent (both = no CEC) and are not rewritten
 * to each other — only genuine differences (a stale positive to clear, or a real
 * approval to backfill) appear in the plan.
 */
export function planCecRemediation(rows: CecRemediationRow[]): CecRemediationPlanItem[] {
  const plan: CecRemediationPlanItem[] = [];
  for (const row of rows) {
    const target = resolveApprovedCecTarget(row.slug);
    const current = row.current == null ? 0 : Number(row.current);
    if (current !== target) {
      plan.push({ slug: row.slug, current: row.current, target });
    }
  }
  return plan;
}
