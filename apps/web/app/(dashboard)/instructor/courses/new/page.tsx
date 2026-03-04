'use client';

import { useRouter } from 'next/navigation';
import { CourseBuilder, CourseFormValues } from '@/components/lms/CourseBuilder';

export default function NewCoursePage() {
  const router = useRouter();

  async function handleSubmit(values: CourseFormValues) {
    const userId = localStorage.getItem('carsi_user_id') ?? '';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

    const res = await fetch(`${backendUrl}/api/lms/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {}),
      },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      const course = await res.json();
      router.push(`/instructor/courses/${course.slug}/edit`);
    }
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
