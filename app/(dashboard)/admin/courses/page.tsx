'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/components/auth/auth-provider';

interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  status: string;
  level: string | null;
  iicrc_discipline: string | null;
  cec_hours: number | null;
}

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Fetch all courses (admin can see drafts via per_page=100)
    apiClient
      .get<{ items: AdminCourse[] }>('/api/lms/courses?per_page=100')
      .then((data) => setCourses(data.items ?? []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function publishCourse(slug: string) {
    await apiClient.post(`/api/lms/courses/${slug}/publish`);
    setCourses((prev) => prev.map((c) => (c.slug === slug ? { ...c, status: 'published' } : c)));
  }

  const draft = courses.filter((c) => c.status !== 'published');
  const published = courses.filter((c) => c.status === 'published');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Approval</h1>
        <p className="text-muted-foreground">
          {draft.length} pending · {published.length} published
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Loading courses…</p>}

      {!loading && draft.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Awaiting Approval</h2>
          <div className="space-y-3">
            {draft.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-muted-foreground font-mono text-sm">{course.slug}</p>
                  <div className="mt-1 flex gap-2">
                    {course.iicrc_discipline && (
                      <Badge variant="outline">{course.iicrc_discipline}</Badge>
                    )}
                    {course.cec_hours && (
                      <Badge variant="secondary">{course.cec_hours} CEC hrs</Badge>
                    )}
                  </div>
                </div>
                <Button size="sm" onClick={() => publishCourse(course.slug)}>
                  Approve &amp; Publish
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && published.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Published</h2>
          <ul className="space-y-2">
            {published.map((course) => (
              <li key={course.id} className="text-muted-foreground flex items-center gap-3 text-sm">
                <Badge>Published</Badge>
                <span>{course.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && courses.length === 0 && (
        <p className="text-muted-foreground">No courses found.</p>
      )}
    </div>
  );
}
