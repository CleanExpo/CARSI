'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CourseBuilder, CourseFormValues } from '@/components/lms/CourseBuilder';
import { ModuleEditor } from '@/components/lms/ModuleEditor';
import { apiClient } from '@/lib/api/client';

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: { id: string; title: string; content_type: string | null; order_index: number }[];
}

interface Course {
  slug: string;
  title: string;
  description: string | null;
  price_aud: number;
  level: string | null;
  iicrc_discipline: string | null;
  cec_hours: number | null;
}

export default function EditCoursePage() {
  const params = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [courseData, modulesData] = await Promise.all([
      apiClient.get<Course>(`/api/lms/courses/${params.slug}`).catch(() => null),
      apiClient.get<Module[]>(`/api/lms/courses/${params.slug}/modules`).catch(() => []),
    ]);
    if (courseData) setCourse(courseData);
    if (modulesData) setModules(modulesData);
    setLoading(false);
  }, [params.slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCourseUpdate(values: CourseFormValues) {
    await apiClient.patch(`/api/lms/courses/${params.slug}`, values);
  }

  async function handleAddModule() {
    const title = prompt('Module title:');
    if (!title) return;
    await apiClient.post(`/api/lms/courses/${params.slug}/modules`, {
      title,
      order_index: modules.length + 1,
    });
    loadData();
  }

  async function handleDeleteModule(moduleId: string) {
    await apiClient.delete(`/api/lms/modules/${moduleId}`);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function handleAddLesson(moduleId: string) {
    const title = prompt('Lesson title:');
    if (!title) return;
    const nextOrder = (modules.find((m) => m.id === moduleId)?.lessons.length ?? 0) + 1;
    await apiClient.post(`/api/lms/modules/${moduleId}/lessons`, {
      title,
      order_index: nextOrder,
      content_type: 'text',
    });
    loadData();
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Course</h1>
        <p className="text-muted-foreground font-mono text-sm">{params.slug}</p>
      </div>

      {course && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Course Details</h2>
          <CourseBuilder
            onSubmit={handleCourseUpdate}
            initialValues={{
              title: course.title,
              slug: course.slug,
              description: course.description ?? '',
              price_aud: Number(course.price_aud),
              level: course.level ?? 'beginner',
              iicrc_discipline: course.iicrc_discipline ?? '',
              cec_hours: Number(course.cec_hours ?? 0),
            }}
          />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Modules &amp; Lessons</h2>
        <ModuleEditor
          modules={modules}
          onAddModule={handleAddModule}
          onDeleteModule={handleDeleteModule}
          onAddLesson={handleAddLesson}
        />
      </section>
    </div>
  );
}
