import { PDFDocument } from 'pdf-lib';

import { CERT_ART_HEIGHT, CERT_ART_WIDTH } from '@/lib/certificate/CertificateArt';
import { renderCertificatePng } from '@/lib/certificate/render-certificate-png';
import { certificateHolderDisplayName } from '@/lib/server/certificate-name';
import { certificateKindForCourseSlug } from '@/lib/server/carsi-workshop-access';

export type CompletionCertificateData = {
  studentName: string;
  courseTitle: string;
  completedDate: Date;
  issuedDate?: Date;
  discipline?: string;
  /** Catalogue slug: the certificate's IICRC and CEC wording is read from the register by it. */
  courseSlug?: string | null;
  courseLevel?: string | null;
  credentialId?: string;
  certificateKind?: 'completion' | 'attendance';
};

function formatAuDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Download PDF is a print of the same light certificate the on-screen preview shows. */
export async function buildCompletionCertificatePdf(
  params: CompletionCertificateData
): Promise<Uint8Array> {
  const png = await renderCertificatePng({
    studentName: params.studentName,
    courseName: params.courseTitle,
    discipline: params.discipline,
    completedDate: formatAuDate(params.completedDate),
    issuedDate: formatAuDate(params.issuedDate ?? params.completedDate),
    credentialId: params.credentialId,
    courseSlug: params.courseSlug,
    courseLevel: params.courseLevel,
    certificateKind: params.certificateKind,
  });

  const doc = await PDFDocument.create();
  const page = doc.addPage([CERT_ART_WIDTH / 2, CERT_ART_HEIGHT / 2]);
  const image = await doc.embedPng(png);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });
  return doc.save();
}

export function completionCertificateDataFromEnrollment(
  row: {
    id: string;
    completedAt: Date;
    certificateIssuedAt?: Date | null;
    student: { fullName: string | null; email: string };
    course: {
      title: string;
      slug: string;
      iicrcDiscipline?: string | null;
      cecHours?: unknown;
      shortDescription?: string | null;
      description?: string | null;
      meta?: unknown;
      durationHours?: unknown;
      level?: string | null;
    };
  },
  verificationOrigin?: string
): CompletionCertificateData {
  void verificationOrigin;
  const studentName = certificateHolderDisplayName(row.student);
  return {
    studentName,
    courseTitle: row.course.title,
    completedDate: row.completedAt,
    issuedDate: row.certificateIssuedAt ?? row.completedAt,
    discipline: row.course.iicrcDiscipline?.trim() || undefined,
    courseSlug: row.course.slug,
    courseLevel: row.course.level,
    credentialId: row.id,
    certificateKind: certificateKindForCourseSlug(row.course.slug),
  };
}
