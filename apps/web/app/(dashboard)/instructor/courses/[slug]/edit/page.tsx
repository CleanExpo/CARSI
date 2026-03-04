'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CourseBuilder, CourseFormValues } from '@/components/lms/CourseBuilder';
import { ModuleEditor } from '@/components/lms/ModuleEditor';

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

  const userId = typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  const headers = {
    'Content-Type': 'application/json',
    ...(userId ? { 'X-User-Id': userId } : {}),
  };

  const loadData = useCallback(async () => {
    const [courseRes, modulesRes] = await Promise.all([
      fetch(`${backendUrl}/api/lms/courses/${params.slug}`, { headers }),
      fetch(`${backendUrl}/api/lms/courses/${params.slug}/modules`, { headers }),
    ]);
    if (courseRes.ok) setCourse(await courseRes.json());
    if (modulesRes.ok) setModules(await modulesRes.json());
    setLoading(false);
  }, [params.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCourseUpdate(values: CourseFormValues) {
    await fetch(`${backendUrl}/api/lms/courses/${params.slug}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(values),
    });
  }

  async function handleAddModule() {
    const title = prompt('Module title:');
    if (!title) return;
    await fetch(`${backendUrl}/api/lms/courses/${params.slug}/modules`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, order_index: modules.length + 1 }),
    });
    loadData();
  }

  async function handleDeleteModule(moduleId: string) {
    await fetch(`${backendUrl}/api/lms/modules/${moduleId}`, { method: 'DELETE', headers });
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function handleAddLesson(moduleId: string) {
    const title = prompt('Lesson title:');
    if (!title) return;
    const nextOrder = (modules.find((m) => m.id === moduleId)?.lessons.length ?? 0) + 1;
    await fetch(`${backendUrl}/api/lms/modules/${moduleId}/lessons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, order_index: nextOrder, content_type: 'text' }),
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
