import { approvedCecHours } from '@/lib/courses/course-credential-copy';
import type { DesignationDefinition } from '@/lib/designations/registry';

/** "Who it is for" list on a public course page. */
export function getCourseAudienceItems(
  course: { cec_hours?: string | null },
  designation: DesignationDefinition | null,
  cecApproved = false
): string[] {
  // The CEC audience line names the IICRC, so it is shown only for a CEC-approved course with
  // in-force hours (GP-748); without hours it would contradict the missing CEC figure.
  const cecLine = approvedCecHours(course.cec_hours, cecApproved)
    ? ['Technicians earning IICRC Continuing Education Credits (CECs)']
    : [];
  if (designation) {
    return [
      `Restoration professionals working in ${designation.disciplineTopic}`,
      ...cecLine,
      `Practitioners pursuing the ${designation.name} designation`,
      'Australian and New Zealand trade professionals expanding their qualifications',
    ];
  }
  return [
    'Restoration and cleaning industry professionals',
    ...cecLine,
    'Trade professionals expanding their qualifications',
    'Business owners investing in team development',
  ];
}
