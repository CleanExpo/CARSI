'use client';

import { useRouter } from 'next/navigation';
import { CourseBuilder, CourseFormValues } from '@/components/lms/CourseBuilder';
import { apiClient } from '@/lib/api/client';

export default function NewCoursePage() {
  const router = useRouter();

  async function handleSubmit(values: CourseFormValues) {
    const course = await apiClient.post<{ slug: string }>('/api/lms/courses', values);
    router.push(`/instructor/courses/${course.slug}/edit`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Course</h1>
        <p className="text-muted-foreground">Fill in the course details below.</p>
      </div>
      <CourseBuilder onSubmit={handleSubmit} />
    </div>
  );
}
