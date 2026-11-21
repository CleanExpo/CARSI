/**
 * Course-page credential wording (Linear GP-748, founder ruling 21/11/2026: "Drop IICRC entirely").
 *
 * Only a course approved in data/seed/cec-approvals.json (isCecApprovedCourse) may name the
 * IICRC on its page; it keeps the GP-704 disclaimer. Every other course says only that it is a
 * CARSI course and a CARSI-issued credential. The page, the credential paragraph
 * (CoursePublicDetail) and the Course JSON-LD (courseCredentialStatement) all take the same flag.
 */
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import type { DesignationDefinition } from '@/lib/designations/registry';

export function getCourseLearningOutcomes(
  course: { cec_hours?: string | null },
  designation: DesignationDefinition | null,
  cecApproved = false
): string[] {
  const outcomes: string[] = [];

  if (designation) {
    outcomes.push(
      `Work to the CARSI ${designation.disciplineTopic} standard, built for Southern-Hemisphere conditions`
    );
  }

  const cecHoursLabel = formatCecHoursForDisplay(course.cec_hours);
  if (cecHoursLabel) {
    const plural = cecHoursLabel === '1' ? '' : 's';
    outcomes.push(
      `Earn ${cecHoursLabel} IICRC Continuing Education Credit${plural} (CEC${plural}) toward maintaining an existing IICRC certification`
    );
  }

  outcomes.push(
    'Apply current Australian and New Zealand methods to real-world restoration jobs',
    // GP-748: only a CEC-approved course names the IICRC; every other course is a CARSI course
    // and credential, and its page never names the IICRC.
    cecApproved
      ? 'Build competency in training the IICRC does not offer locally — a CARSI-issued credential, not an IICRC certification'
      : 'Build competency in CARSI training, with a CARSI-issued credential',
    'Receive a verifiable digital credential for your professional portfolio'
  );

  if (designation) {
    outcomes.push(`Complete a required step toward the ${designation.name} designation`);
  }

  return outcomes;
}
