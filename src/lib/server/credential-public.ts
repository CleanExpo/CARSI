import { prisma } from '@/lib/prisma';

import { buildCompletionCertificatePdf } from '@/lib/server/certificate-pdf';

/** Public verification JSON (matches CredentialVerificationCard + certificate preview). */
export type PublicCredentialJson = {
  credential_id: string;
  valid: boolean;
  status: string;
  student_name: string;
  course_title: string;
  iicrc_discipline: string;
  cec_hours: number;
  issued_date: string;
  issuing_organisation: string;
  verification_url: string;
  cppp40421_unit_code?: string;
  completed_at?: string;
  discipline?: string;
};

/**
 * Lookup a completed enrollment by id and return verification payload (no auth).
 */
export async function getPublicCredentialJson(
  credentialId: string,
  origin: string
): Promise<PublicCredentialJson | null> {
  if (!credentialId?.trim() || !process.env.DATABASE_URL?.trim()) return null;

  const row = await prisma.lmsEnrollment.findFirst({
    where: {
      id: credentialId,
      status: 'completed',
      completedAt: { not: null },
    },
    include: {
      student: { select: { fullName: true, email: true } },
      course: true,
    },
  });
  if (!row) return null;

  const studentName = row.student.fullName?.trim() || row.student.email;
  const issued = row.certificateIssuedAt ?? row.completedAt!;
  const disc = row.course.iicrcDiscipline?.trim() || '—';

  return {
    credential_id: row.id,
    valid: true,
    status: 'issued',
    student_name: studentName,
    course_title: row.course.title,
    iicrc_discipline: disc,
    cec_hours: Number(row.course.cecHours ?? 0),
    issued_date: issued.toISOString().slice(0, 10),
    issuing_organisation: 'CARSI Learning',
    verification_url: `${origin.replace(/\/$/, '')}/dashboard/credentials/${row.id}`,
    completed_at: issued.toISOString(),
    discipline: row.course.iicrcDiscipline ?? undefined,
  };
}

export async function getPublicCredentialPdfBuffer(credentialId: string): Promise<
  | { ok: true; pdf: Uint8Array; filename: string }
  | { ok: false; reason: 'not_found' }
> {
  if (!credentialId?.trim() || !process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: 'not_found' };
  }

  const row = await prisma.lmsEnrollment.findFirst({
    where: {
      id: credentialId,
      status: 'completed',
      completedAt: { not: null },
    },
    include: {
      student: { select: { fullName: true, email: true } },
      course: { select: { title: true, slug: true, iicrcDiscipline: true } },
    },
  });
  if (!row) return { ok: false, reason: 'not_found' };

  const studentName = row.student.fullName?.trim() || row.student.email;
  const disc = row.course.iicrcDiscipline?.trim() || '—';
  const pdf = await buildCompletionCertificatePdf({
    studentName,
    courseTitle: row.course.title,
    completedDate: row.completedAt!,
    discipline: disc,
  });

  return {
    ok: true,
    pdf,
    filename: `carsi-certificate-${row.course.slug}.pdf`,
  };
}
