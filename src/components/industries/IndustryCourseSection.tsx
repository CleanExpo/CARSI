import { CourseGrid } from '@/components/lms/CourseGrid';
import { MarketingSectionHeader } from '@/components/marketing/MarketingSectionHeader';
import { marketingPanel, marketingSection } from '@/lib/marketing/marketing-ui';

interface Course {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number | string;
  is_free?: boolean;
  discipline?: string | null;
  thumbnail_url?: string | null;
}

interface IndustryCourseSectionProps {
  industryName: string;
  disciplineList: string;
  courses: Course[];
  initialTab?: string;
}

export function IndustryCourseSection({
  industryName,
  disciplineList,
  courses,
  initialTab,
}: IndustryCourseSectionProps) {
  const defaultTab =
    initialTab && courses.some((c) => (c.discipline ?? '').toUpperCase().includes(initialTab))
      ? initialTab
      : 'All';

  return (
    <section className={marketingSection}>
      <MarketingSectionHeader
        eyebrow={`${industryName}-relevant courses`}
        title={`${disciplineList} training`}
        body="Filter by discipline, search the catalogue, and open any course for full details and enrolment."
      />

      <div className={`p-4 sm:p-5 ${marketingPanel}`}>
        <CourseGrid courses={courses} initialTab={defaultTab} surface="auto" />
      </div>
    </section>
  );
}
