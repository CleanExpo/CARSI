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
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8">
          <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground/60">
            {industryName}-Relevant Courses
          </p>
          <h2 className="text-2xl font-bold text-foreground">
            {disciplineList} Training
          </h2>
        </div>

        <div className="rounded-sm border border-border bg-secondary p-5">
          <CourseGrid courses={courses} initialTab="All" />
        </div>
      </div>
    </section>
  );
}
