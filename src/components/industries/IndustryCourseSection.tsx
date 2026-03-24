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
}

export function IndustryCourseSection({
  industryName,
  disciplineList,
  courses,
}: IndustryCourseSectionProps) {
  return (
    <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8">
          <p
            className="mb-2 text-xs tracking-wide uppercase"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {industryName}-Relevant Courses
          </p>
          <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {disciplineList} Training
          </h2>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <CourseGrid courses={courses} initialTab="All" />
        </div>
      </div>
    </section>
  );
}
