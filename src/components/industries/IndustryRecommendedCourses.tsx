import { IndustryCourseSection } from '@/components/industries/IndustryCourseSection';
import { getIndustryCoursesFromDb } from '@/lib/server/industry-courses';

interface IndustryRecommendedCoursesProps {
  industryName: string;
  disciplineList: string;
  disciplines: string[];
  limitPerDiscipline?: number;
}

/** Server component — recommended courses from Postgres by IICRC discipline (Phase 3). */
export async function IndustryRecommendedCourses({
  industryName,
  disciplineList,
  disciplines,
  limitPerDiscipline = 8,
}: IndustryRecommendedCoursesProps) {
  const courses = await getIndustryCoursesFromDb(disciplines, limitPerDiscipline);

  return (
    <IndustryCourseSection
      industryName={industryName}
      disciplineList={disciplineList}
      courses={courses}
    />
  );
}
