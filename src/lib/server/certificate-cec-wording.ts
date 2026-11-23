import {
  certificateCecWording,
  type CertificateCecWording,
} from '@/lib/certificate/certificate-cec-wording';
import { resolveLmsCourseCecHours } from '@/lib/server/course-cec-hours';

/**
 * Certificate IICRC and CEC wording for a course, read from the approvals register by slug
 * (GP-757). This is the one place a certificate's IICRC wording is decided: the printed
 * certificate, the on-screen certificate and the public verify payload all call it. The DB
 * `cecHours` column and the course's discipline code are never consulted.
 */
export function certificateCecWordingForCourse(
  slug: string | null | undefined
): CertificateCecWording {
  if (!slug?.trim()) return certificateCecWording(null);
  return certificateCecWording(resolveLmsCourseCecHours({ slug: slug.trim() }));
}
