import { IndustryCourseSection } from '@/components/industries/IndustryCourseSection';
import { getIndustryCoursesBySlugs, getIndustryCoursesFromDb } from '@/lib/server/industry-courses';

interface IndustryRecommendedCoursesProps {
  industryName: string;
  disciplineList: string;
  disciplines?: string[];
  courseSlugs?: readonly string[];
  limitPerDiscipline?: number;
}

/** Server component — recommended courses from Postgres by slug or topic filter. */
export async function IndustryRecommendedCourses({
  industryName,
  disciplineList,
  disciplines = [],
  courseSlugs,
  limitPerDiscipline = 8,
}: IndustryRecommendedCoursesProps) {
  const courses = courseSlugs?.length
    ? await getIndustryCoursesBySlugs(courseSlugs)
    : await getIndustryCoursesFromDb(disciplines, limitPerDiscipline);

  return (
    <IndustryCourseSection
      industryName={industryName}
      disciplineList={disciplineList}
      courses={courses}
      initialTab={disciplines[0]}
    />
  );
}
