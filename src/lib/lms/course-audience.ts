import type { DesignationDefinition } from '@/lib/designations/registry';

/** "Who it is for" list on a public course page. */
export function getCourseAudienceItems(
  course: { cec_hours?: string | null },
  designation: DesignationDefinition | null
): string[] {
  // The CEC audience line appears only on a course that earns CECs; on any other course it
  // contradicts the missing CEC figure.
  const cecLine = course.cec_hours
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
