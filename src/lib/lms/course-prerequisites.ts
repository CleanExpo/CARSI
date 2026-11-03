/**
 * Course prerequisites — the pure resolver and gate decision (DECISIONS #41, 02/11/2026).
 *
 * A course with a prerequisite is LOCKED until the learner has COMPLETED the prerequisite
 * course. First case: `mould-remediation-fundamentals` (CARSI Mould Remediation
 * Practitioner) requires `level-2-mould-remediation-30ee3492`.
 *
 * WHERE THE DATA LIVES — `lms_courses.meta` (JSON), not a schema column:
 *
 *   meta.prerequisites:           [{ courseSlug: string, reason?: string }]
 *   meta.prerequisite:            string   (legacy singular slug; still honoured)
 *   meta.prerequisitesEnforcedFrom: ISO date (optional; see grandfathering below)
 *
 * `meta` is already the per-course config bag (designation, intro video, onboarding), it
 * travels through the catalogue export/seed unchanged, and a migration buys nothing a JSON
 * array does not. The legacy singular `meta.prerequisite` is read too so a prerequisite
 * already stated in data is enforced rather than silently ignored (fail closed).
 *
 * WHAT "COMPLETED" MEANS — an `lms_enrollments` row for the prerequisite course with
 * status `completed` (the same signal designation progress uses; quiz-gated by
 * `syncEnrollmentCompletion`). A revoked/refunded prerequisite is not completed.
 *
 * FAIL MODE — CLOSED. Paid access is at stake, so a prerequisite that cannot be proven met
 * blocks: an unknown prerequisite slug (no course row) blocks with a logged warning, and a
 * malformed `meta.prerequisites` blocks the whole course. Admins bypass; nothing else does.
 *
 * GRANDFATHERING — an enrolment that already exists is never broken by the gate:
 *   - the gate is checked when an enrolment is ISSUED (enrol / checkout). An existing
 *     active or completed row returns `already_enrolled` and is never re-checked there;
 *   - at lesson/quiz read time the gate only applies to an enrolment created ON OR AFTER
 *     `meta.prerequisitesEnforcedFrom`. With no such date, every existing enrolment is
 *     grandfathered and the issuance gate alone protects the course. So adding a
 *     prerequisite to a course that already has learners can never lock them out;
 *   - a `completed` enrolment of the gated course itself is always allowed (certificate
 *     and record access), and an enrolment an admin created (`admin:` payment reference)
 *     is the explicit per-learner admin override.
 *
 * LOCKED SEATS (founder decision 02/11/2026) — anyone may buy TEAM seats for a course with a
 * prerequisite; each staff member's own seat stays locked until they complete it. Such a seat
 * is issued with `lms_enrollments.prerequisite_gated = true` (team seat assignment, invite
 * acceptance, the team buyer's own seat, and any Stripe-paid fulfilment that reaches
 * enrolment with the prerequisite unmet). A gated row is NEVER grandfathered — neither by a
 * missing `prerequisitesEnforcedFrom` nor by an early `enrolledAt` — so only completing the
 * prerequisite (or an admin) unlocks it. Existing rows default to `false` and keep the
 * grandfathering above unchanged.
 *
 * Pure and dependency-free (no Prisma) so it is unit-testable anywhere; the server
 * adapter that loads the facts is `src/lib/server/course-prerequisites.ts`.
 */

export type CoursePrerequisite = {
  courseSlug: string;
  reason?: string;
};

export type ParsedCoursePrerequisites = {
  prerequisites: CoursePrerequisite[];
  /** Enrolments created before this instant are grandfathered at lesson/quiz read time. */
  enforcedFrom: Date | null;
  /** Problems found in the meta. Any entry here makes the course fail closed. */
  configErrors: string[];
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function normaliseSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  return SLUG_RE.test(s) ? s : null;
}

/** Read prerequisites out of a course's `meta`. Never throws. */
export function parseCoursePrerequisites(meta: unknown): ParsedCoursePrerequisites {
  const out: ParsedCoursePrerequisites = { prerequisites: [], enforcedFrom: null, configErrors: [] };
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return out;
  const m = meta as Record<string, unknown>;
  const seen = new Set<string>();
  const add = (courseSlug: string, reason?: string) => {
    if (seen.has(courseSlug)) return;
    seen.add(courseSlug);
    out.prerequisites.push(reason ? { courseSlug, reason } : { courseSlug });
  };

  if (m.prerequisites !== undefined && m.prerequisites !== null) {
    if (!Array.isArray(m.prerequisites)) {
      out.configErrors.push('meta.prerequisites must be an array');
    } else {
      m.prerequisites.forEach((entry, i) => {
        const raw =
          typeof entry === 'string'
            ? entry
            : entry && typeof entry === 'object'
              ? (entry as Record<string, unknown>).courseSlug
              : undefined;
        const slug = normaliseSlug(raw);
        if (!slug) {
          out.configErrors.push(`meta.prerequisites[${i}] has no valid courseSlug`);
          return;
        }
        const reason =
          entry && typeof entry === 'object'
            ? (entry as Record<string, unknown>).reason
            : undefined;
        add(slug, typeof reason === 'string' && reason.trim() ? reason.trim() : undefined);
      });
    }
  }

  if (m.prerequisite !== undefined && m.prerequisite !== null && m.prerequisite !== '') {
    const slug = normaliseSlug(m.prerequisite);
    if (slug) add(slug);
    else out.configErrors.push('meta.prerequisite is not a valid course slug');
  }

  if (typeof m.prerequisitesEnforcedFrom === 'string' && m.prerequisitesEnforcedFrom.trim()) {
    const d = new Date(m.prerequisitesEnforcedFrom);
    if (Number.isNaN(d.getTime())) {
      out.configErrors.push('meta.prerequisitesEnforcedFrom is not a valid date');
    } else {
      out.enforcedFrom = d;
    }
  }

  return out;
}

/** True when the course meta declares (or malformedly attempts to declare) a prerequisite. */
export function courseHasPrerequisites(parsed: ParsedCoursePrerequisites): boolean {
  return parsed.prerequisites.length > 0 || parsed.configErrors.length > 0;
}

/** An enrolment created by an admin (`admin:*`) is the explicit per-learner override. */
export function isAdminOverridePaymentReference(ref: string | null | undefined): boolean {
  return typeof ref === 'string' && ref.trim().toLowerCase().startsWith('admin:');
}

/** A Stripe Checkout session id: money has already been taken for this enrolment. */
export function isStripeCheckoutPaymentReference(ref: string | null | undefined): boolean {
  return typeof ref === 'string' && ref.trim().startsWith('cs_');
}

export type ExistingEnrolmentFacts = {
  status: string | null;
  enrolledAt: Date | null;
  paymentReference: string | null;
  /**
   * `lms_enrollments.prerequisite_gated`: the row was issued while the prerequisite was NOT
   * met (a team seat, or a team buyer's own seat). Such a row is never grandfathered.
   */
  prerequisiteGated?: boolean | null;
};

export type PrerequisiteFacts = {
  /** Prerequisite slugs that resolve to a real course row (any publish state). */
  knownSlugs: ReadonlySet<string>;
  /** Prerequisite slugs this learner has a `completed` enrolment for. */
  completedSlugs: ReadonlySet<string>;
};

export type PrerequisiteDecision =
  | {
      allowed: true;
      reason:
        | 'no-prerequisites'
        | 'admin'
        | 'admin-override'
        | 'grandfathered'
        | 'course-completed'
        | 'met';
    }
  | {
      allowed: false;
      reason: 'not-met' | 'unknown-prerequisite' | 'invalid-config';
      /** Prerequisites still to complete (includes unknown ones). */
      missing: CoursePrerequisite[];
      /** Prerequisite slugs with no course row (configuration fault). */
      unknown: string[];
      configErrors: string[];
    };

export type PrerequisiteDecisionInput = {
  parsed: ParsedCoursePrerequisites;
  isAdmin: boolean;
  facts: PrerequisiteFacts;
  /**
   * The learner's existing enrolment in the GATED course, when deciding read access
   * (lesson / quiz). Omit (or null) when deciding whether a NEW enrolment may be issued.
   */
  enrolment?: ExistingEnrolmentFacts | null;
};

/**
 * The gate decision. Order matters: no prerequisites, then admin, then the grandfathering
 * exemptions (read-time only), then the facts. Unknown slugs and bad config fail closed.
 */
export function decidePrerequisiteAccess(input: PrerequisiteDecisionInput): PrerequisiteDecision {
  const { parsed, isAdmin, facts, enrolment } = input;
  if (!courseHasPrerequisites(parsed)) return { allowed: true, reason: 'no-prerequisites' };
  if (isAdmin) return { allowed: true, reason: 'admin' };

  if (enrolment) {
    if (isAdminOverridePaymentReference(enrolment.paymentReference)) {
      return { allowed: true, reason: 'admin-override' };
    }
    if ((enrolment.status ?? '').trim().toLowerCase() === 'completed') {
      return { allowed: true, reason: 'course-completed' };
    }
    // A seat issued locked (team seat / team buyer without the prerequisite) is NEVER
    // grandfathered: it was created knowing the prerequisite was unmet, so only the facts
    // below (prerequisite completed) unlock it, whatever `prerequisitesEnforcedFrom` says.
    if (enrolment.prerequisiteGated !== true) {
      if (!parsed.enforcedFrom) return { allowed: true, reason: 'grandfathered' };
      // An unknown enrolment date cannot prove it post-dates the gate: grandfather it.
      if (!enrolment.enrolledAt || enrolment.enrolledAt.getTime() < parsed.enforcedFrom.getTime()) {
        return { allowed: true, reason: 'grandfathered' };
      }
    }
  }

  const unknown = parsed.prerequisites
    .map((p) => p.courseSlug)
    .filter((slug) => !facts.knownSlugs.has(slug));
  const missing = parsed.prerequisites.filter((p) => !facts.completedSlugs.has(p.courseSlug));

  if (parsed.configErrors.length > 0) {
    return { allowed: false, reason: 'invalid-config', missing, unknown, configErrors: parsed.configErrors };
  }
  if (unknown.length > 0) {
    return { allowed: false, reason: 'unknown-prerequisite', missing, unknown, configErrors: [] };
  }
  if (missing.length > 0) {
    return { allowed: false, reason: 'not-met', missing, unknown: [], configErrors: [] };
  }
  return { allowed: true, reason: 'met' };
}

export type PrerequisiteCourseLink = { slug: string; title: string };

/** Learner-facing message (Australian English). */
export function prerequisiteBlockedMessage(missing: PrerequisiteCourseLink[]): string {
  if (missing.length === 0) {
    return 'This course has a prerequisite we could not verify. Please contact CARSI support.';
  }
  const names = missing.map((m) => m.title);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Complete ${list} first. This course is locked until you have completed its prerequisite.`;
}
