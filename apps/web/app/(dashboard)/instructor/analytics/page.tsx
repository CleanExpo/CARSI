'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface CourseStats {
  course_id: string;
  title: string;
  total_enrollments: number;
  completions: number;
  completion_rate_pct: number;
  avg_quiz_score: number | null;
}

interface InstructorAnalytics {
  courses: CourseStats[];
  total_students: number;
  total_completions: number;
}

export default function InstructorAnalyticsPage() {
  const [data, setData] = useState<InstructorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<InstructorAnalytics>('/api/lms/admin/instructor-analytics')
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance metrics for your courses
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Loading…
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Students', value: data.total_students },
              { label: 'Completions', value: data.total_completions },
              { label: 'Courses', value: data.courses.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-5"
              >
                <p className="mb-1 text-[11px] tracking-widest text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="text-3xl font-bold text-foreground/90">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {data.courses.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-4 border-b border-border px-5 py-3 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                <span className="col-span-2">Course</span>
                <span>Enrolments</span>
                <span>Completion</span>
              </div>
              {data.courses.map((course, i) => (
                <div
                  key={course.course_id}
                  className={`grid grid-cols-4 items-center border-b border-border px-5 py-3.5 ${i % 2 === 0 ? 'bg-muted/5' : ''}`}
                >
                  <span className="col-span-2 text-sm text-foreground/80">
                    {course.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {course.total_enrollments}
                  </span>
                  <span
                    className={`text-sm font-semibold ${course.completion_rate_pct >= 60 ? 'text-green-500' : 'text-carsi-orange'}`}
                  >
                    {course.completion_rate_pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
