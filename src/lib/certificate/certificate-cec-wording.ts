import { formatCecHoursForCertificate } from '@/lib/cec-display';

/**
 * The owner of every IICRC and CEC line a CARSI certificate or credential card prints (GP-757).
 *
 * Founder rules GP-704 and GP-748:
 * - CARSI is never called accredited by the IICRC; no certificate says "Accredited".
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
};

export const COURSE_APPROVED_FOR_IICRC_CECS = 'Course approved for IICRC CECs';

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
    };
  }
  return {
    approved: true,
    cecCreditsValue,
    recordLine: `${COURSE_APPROVED_FOR_IICRC_CECS}. Retain this certificate with your renewal records.`,
    cardLabel: COURSE_APPROVED_FOR_IICRC_CECS,
  };
}
