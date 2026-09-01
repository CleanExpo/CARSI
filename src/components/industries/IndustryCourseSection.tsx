import { CourseGrid } from '@/components/lms/CourseGrid';
import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { marketingPanel } from '@/lib/marketing/marketing-ui';

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
    <section id="industry-courses" className="scroll-mt-28 py-16 md:py-24">
      <div className="mb-9 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className={LANDING_EYEBROW_CLASS}>Approved course pathway</p>
          <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>
            {disciplineList} <br aria-hidden />
            <span className="text-[#146fc2]">for {industryName.toLowerCase()}</span>
          </h2>
        </div>
        <p className={`max-w-2xl lg:justify-self-end ${LANDING_LEAD_CLASS}`}>
          These recommendations are pinned to live IICRC CEC Accredited introductions, not generated
          from broad discipline labels. Open a course to check its current hour value, learning
          outcomes and enrolment details.
        </p>
      </div>

      <div
        className={`rounded-[1.75rem] p-3 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-5 ${marketingPanel}`}
      >
        <CourseGrid courses={courses} initialTab={defaultTab} surface="auto" />
      </div>
    </section>
  );
}
