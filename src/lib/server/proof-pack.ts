import { prisma } from '@/lib/prisma';
import type { ProofPackCredentialRow, ProofPackPayload } from '@/types/proof-pack';

export type { ProofPackCredentialRow, ProofPackPayload } from '@/types/proof-pack';

function roundCec(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Employer / insurer oriented transcript: completed courses, dates, CEC by discipline, verification URLs.
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

  const credentials: ProofPackCredentialRow[] = rows.map((e) => ({
    credential_id: e.id,
    course_title: e.course.title,
    iicrc_discipline: e.course.iicrcDiscipline,
    cec_hours: roundCec(Number(e.course.cecHours ?? 0)),
    issued_date: (e.certificateIssuedAt ?? e.completedAt)!.toISOString().slice(0, 10),
    verification_url: `${base}/dashboard/credentials/${e.id}`,
  }));

  const byDisc = new Map<string, number>();
  for (const c of credentials) {
    const d = c.iicrc_discipline?.trim() || '—';
    byDisc.set(d, (byDisc.get(d) ?? 0) + c.cec_hours);
  }

  const cec_by_discipline = [...byDisc.entries()]
    .map(([discipline, cec_hours]) => ({ discipline, cec_hours: roundCec(cec_hours) }))
    .sort((a, b) => a.discipline.localeCompare(b.discipline));

  const total_cec_hours = roundCec(credentials.reduce((s, c) => s + c.cec_hours, 0));

  return {
    schema_version: 1,
    learner_name: user.fullName?.trim() || user.email,
    learner_email: user.email,
    issuing_organisation: 'CARSI Learning',
    generated_at: new Date().toISOString(),
    summary: {
      completed_courses: credentials.length,
      total_cec_hours,
    },
    cec_by_discipline,
    credentials,
  };
}
