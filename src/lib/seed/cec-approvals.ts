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
  /** CEC hours the IICRC has approved for this course (whole number ≥ 1). Only meaningful when status is 'approved'. */
  approvedHours?: number | null;
  /** ISO date the IICRC confirmed approval. */
  approvedAt?: string | null;
  /** IICRC reference / correspondence identifier for the approval. */
  iicrcReference?: string | null;
  /** Where the evidence lives (email, letter, directory listing). */
  evidence?: string | null;
  /** ISO date the IICRC approval lapses (three years after approval per the founder's list). */
  expiresAt?: string | null;
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
 * CEC hours the IICRC has approved for a course, or null when the course has no recorded
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

/**
 * True when an approval is in force at `now`: status approved, positive hours, and an
 * `expiresAt` date that has not been reached. FAIL-CLOSED: a missing or unparseable
 * `expiresAt` is not current, because "we do not know when it lapses" must not advertise a
 * CEC claim. An approval lapses at 00:00 UTC on its `expiresAt` date.
 */
export function isCecApprovalCurrent(entry: CecApprovalEntry, now: Date = new Date()): boolean {
  if (entry.status !== 'approved') return false;
  const hours = entry.approvedHours;
  if (!(typeof hours === 'number' && Number.isFinite(hours) && hours > 0)) return false;
  const expires = entry.expiresAt ? Date.parse(entry.expiresAt) : Number.NaN;
  return Number.isFinite(expires) && now.getTime() < expires;
}

/** The in-force approval for a slug, or null (none, not approved, or expired). */
export function getCurrentCecApproval(
  slug: string | null | undefined,
  now: Date = new Date(),
  entries: readonly CecApprovalEntry[] = getCecApprovalEntries()
): CecApprovalEntry | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase();
  const entry = entries.find((e) => e.slug.trim().toLowerCase() === key);
  return entry && isCecApprovalCurrent(entry, now) ? entry : null;
}

/**
 * Public selling surfaces (course page, CEC hub): only advertise CEC hours for an approval
 * that is in force today. Returns the course unchanged when its approval is current, and with
 * `cec_hours` cleared otherwise, so every downstream CEC line disappears together.
 */
export function withCurrentCecHoursOnly<T extends { slug: string; cec_hours?: string | null }>(
  course: T,
  now: Date = new Date(),
  entries: readonly CecApprovalEntry[] = getCecApprovalEntries()
): T {
  if (!course.cec_hours) return course;
  return getCurrentCecApproval(course.slug, now, entries) ? course : { ...course, cec_hours: null };
}

/** A published course with an in-force CEC approval, for the `/iicrc-cec-courses` hub. */
export type CurrentCecCourse<T> = { course: T; approvedHours: number; expiresAt: string };

/**
 * Published courses with an in-force CEC approval, in the order given. Only courses in
 * `published` are listed, so a registry entry for an unpublished course never appears.
 */
export function selectCurrentCecCourses<T extends { slug: string }>(
  published: readonly T[],
  now: Date = new Date(),
  entries: readonly CecApprovalEntry[] = getCecApprovalEntries()
): CurrentCecCourse<T>[] {
  const out: CurrentCecCourse<T>[] = [];
  const seen = new Set<string>();
  for (const course of published) {
    const key = course.slug.trim().toLowerCase();
    if (seen.has(key)) continue;
    const entry = getCurrentCecApproval(course.slug, now, entries);
    if (!entry) continue;
    seen.add(key);
    out.push({ course, approvedHours: entry.approvedHours as number, expiresAt: entry.expiresAt as string });
  }
  return out;
}
