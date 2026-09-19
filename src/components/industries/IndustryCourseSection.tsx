import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
  PUBLIC_SHELL_INNER_CLASS,
} from '@/components/landing/public-shell-width';
import { CourseGrid } from '@/components/lms/CourseGrid';

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
    <section
      id="industry-courses"
      className="scroll-mt-28 border-t border-slate-200/70 bg-white py-16 md:py-24"
    >
      <div className={PUBLIC_SHELL_INNER_CLASS}>
        <p className={LANDING_EYEBROW_CLASS}>Approved course pathway</p>
        <h2 className={`mt-3 max-w-2xl ${LANDING_DISPLAY_H2_CLASS}`}>
          {disciplineList} for {industryName.toLowerCase()}
        </h2>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          These recommendations are pinned to live IICRC CEC Accredited introductions. Open a course
          to check its current hour value, outcomes and enrolment details.
        </p>
        <div className="mt-10">
          <CourseGrid courses={courses} initialTab={defaultTab} surface="light" />
        </div>
      </div>
    </section>
  );
}
