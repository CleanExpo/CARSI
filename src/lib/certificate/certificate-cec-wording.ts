import { formatCecHoursForCertificate } from '@/lib/cec-display';
import {
  APPROVED_FOR_IICRC_CECS,
  APPROVED_FOR_IICRC_CECS_LABEL,
  CARSI_PROVIDER_STATUS,
  IICRC_APPROVED_CEC_PROVIDER,
} from '@/lib/iicrc/approved-wording';

/**
 * The owner of every IICRC and CEC line a CARSI certificate or credential card prints (GP-757).
 *
 * Founder rules GP-704 and GP-748:
 * - CARSI is never called accredited by the IICRC; no certificate says "Accredited". Its standing
 *   is "IICRC Approved CEC Provider", imported from src/lib/iicrc/approved-wording.ts (GP-704).
 * - "Course approved for IICRC CECs" appears only for a course the approvals register
 *   (data/seed/cec-approvals.json) lists as approved, with the hours from that register.
 * - A course not on the register shows no IICRC wording at all, not even a disclaimer.
 *
 * This file is client-safe and holds only the words. The single read of the register for a
 * course is `certificateCecWordingForCourse(slug)` in src/lib/server/certificate-cec-wording.ts;
 * server code computes the wording there and passes it to the client certificate.
 */
export type CertificateCecWording = {
  /** True only for a course the register lists as approved with positive hours. */
  approved: boolean;
  /** The CEC hours value (formatCecHoursForCertificate) for an approved course, else null. */
  cecCreditsValue: string | null;
  /** The line printed under the credential reference. */
  recordLine: string;
  /** Short label for a credential card. */
  cardLabel: string;
  /** "What this credential is" statement on the public verify page. */
  scopeStatement: string;
  /** Footer line beside the seal: names CARSI's IICRC provider standing only for an approved course. */
  footerLine: string;
};

export const COURSE_APPROVED_FOR_IICRC_CECS = `Course ${APPROVED_FOR_IICRC_CECS}`;

/**
 * Wording for `approvedHours`, which must come from the approvals register (null when the course
 * is not approved). Anything that is not a positive number prints no IICRC wording.
 */
export function certificateCecWording(
  approvedHours: number | null | undefined
): CertificateCecWording {
  const cecCreditsValue =
    typeof approvedHours === 'number' && Number.isFinite(approvedHours) && approvedHours > 0
      ? formatCecHoursForCertificate(approvedHours)
      : null;
  if (!cecCreditsValue) {
    return {
      approved: false,
      cecCreditsValue: null,
      recordLine: 'Issued by CARSI. Retain this certificate with your training records.',
      cardLabel: 'CARSI certificate',
      scopeStatement: 'A CARSI-issued credential for a CARSI course. It is not a trade licence.',
      footerLine: 'carsi.com.au',
    };
  }
  return {
    approved: true,
    cecCreditsValue,
    recordLine: `${COURSE_APPROVED_FOR_IICRC_CECS}. Retain this certificate with your renewal records.`,
    cardLabel: APPROVED_FOR_IICRC_CECS_LABEL,
    scopeStatement:
      `A CARSI-issued credential, not an IICRC certification. ${CARSI_PROVIDER_STATUS} ` +
      `${COURSE_APPROVED_FOR_IICRC_CECS}. ` +
      'IICRC certification itself is obtained through a school and examination approved by the IICRC.',
    footerLine: `${IICRC_APPROVED_CEC_PROVIDER} · carsi.com.au`,
  };
}

/**
 * The per-course line on the shared training record (/verify/training-record and its PDF).
 * `cec_hours` is the register value (src/lib/server/proof-pack.ts). A course that is not approved
 * shows only its issue date: no CEC count and no discipline code.
 */
export function trainingRecordCourseMeta(row: {
  iicrc_discipline: string | null;
  cec_hours: number;
  issued_date: string;
}): string {
  const wording = certificateCecWording(row.cec_hours);
  if (!wording.cecCreditsValue) return `issued ${row.issued_date}`;
  return `${row.iicrc_discipline?.trim() || '—'} · ${wording.cecCreditsValue} · issued ${row.issued_date}`;
}

/**
 * Record-level wording for the shared training record. `totalCecHours` is the sum of register
 * hours over the learner's completed courses. A record with no approved course names neither the
 * IICRC nor CECs.
 */
export function trainingRecordWording(totalCecHours: number): {
  heading: string;
  pdfSubtitle: string;
  totalLabel: string | null;
  totalLine: string | null;
  byDisciplineHeading: string;
} {
  const hasCec = Number.isFinite(totalCecHours) && totalCecHours > 0;
  if (!hasCec) {
    return {
      heading: 'Training record',
      pdfSubtitle: 'For employer, HR, or insurer evidence: completions on CARSI.',
      totalLabel: null,
      totalLine: null,
      byDisciplineHeading: '',
    };
  }
  return {
    heading: 'Training & CEC summary',
    pdfSubtitle:
      'For employer, HR, or insurer evidence: completions on CARSI; IICRC CEC hours only for approved courses.',
    totalLabel: 'Total IICRC CEC hours',
    totalLine: `Total IICRC CEC hours (from approved courses): ${totalCecHours}`,
    byDisciplineHeading: 'CEC hours by discipline',
  };
}
