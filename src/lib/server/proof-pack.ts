import { prisma } from '@/lib/prisma';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';
import { proofPackReferencesForCourse } from '@/lib/server/proof-pack-references';
import type { ProofPackCredentialRow, ProofPackPayload } from '@/types/proof-pack';

export type { ProofPackCredentialRow, ProofPackPayload } from '@/types/proof-pack';

function roundCec(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Employer / insurer oriented transcript: completed courses, dates and verification URLs, plus CEC
 * hours by discipline for CEC-approved courses only (GP-748).
 */
export async function getProofPackPayloadForStudent(
  userId: string,
  origin: string
): Promise<ProofPackPayload | null> {
  if (!userId?.trim() || !process.env.DATABASE_URL?.trim()) {
    return null;
  }

  const user = await prisma.lmsUser.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true },
  });
  if (!user) return null;

  const rows = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: userId,
      status: 'completed',
      completedAt: { not: null },
    },
    include: { course: true },
    orderBy: { completedAt: 'desc' },
  });

  const base = origin.replace(/\/$/, '');

  const credentials: ProofPackCredentialRow[] = rows.map((e) => {
    // REGISTRY-ONLY, FAIL-CLOSED (GP-498, GP-748). This employer/insurer transcript is an exported
    // CEC record: hours come from data/seed/cec-approvals.json only, never the stale WP-import
    // `cecHours`, duration or prose. A course that is not approved carries no CEC key and no IICRC
    // discipline at all, so its row names neither.
    const approvedHours = resolveLmsCourseCecHours({ slug: e.course.slug });
    return {
      credential_id: e.id,
      course_title: e.course.title,
      ...(approvedHours != null && approvedHours > 0
        ? { iicrc_discipline: e.course.iicrcDiscipline, cec_hours: roundCec(approvedHours) }
        : {}),
      issued_date: (e.certificateIssuedAt ?? e.completedAt)!.toISOString().slice(0, 10),
      verification_url: `${base}/verify/credential/${e.id}`,
      // BACKLOG #26: citations only, IICRC-naming ones dropped unless the course is CEC-approved.
      references: proofPackReferencesForCourse(e.course.slug),
    };
  });

  const approved = credentials.filter((c) => c.cec_hours != null && c.cec_hours > 0);

  const byDisc = new Map<string, number>();
  for (const c of approved) {
    const d = c.iicrc_discipline?.trim() || '—';
    byDisc.set(d, (byDisc.get(d) ?? 0) + (c.cec_hours ?? 0));
  }

  // Drop zero-hour rows: a course off the approvals register must not get a credit row (GP-757).
  const cec_by_discipline = [...byDisc.entries()]
    .filter(([, cec_hours]) => cec_hours > 0)
    .map(([discipline, cec_hours]) => ({ discipline, cec_hours: roundCec(cec_hours) }))
    .sort((a, b) => a.discipline.localeCompare(b.discipline));

  const total_cec_hours = roundCec(approved.reduce((s, c) => s + (c.cec_hours ?? 0), 0));
  // GP-748: no approved course means no CEC summary and no IICRC name anywhere in the pack.
  const hasApprovedCec = approved.length > 0;

  return {
    schema_version: 2,
    learner_name: user.fullName?.trim() || user.email,
    learner_email: user.email,
    issuing_organisation: 'CARSI Learning',
    generated_at: new Date().toISOString(),
    summary: {
      completed_courses: credentials.length,
      ...(hasApprovedCec ? { total_cec_hours } : {}),
    },
    ...(hasApprovedCec ? { cec_by_discipline } : {}),
    credentials,
  };
}
