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
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Performance metrics for your courses
        </p>
      </div>

      {loading && (
        <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">
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
                className="rounded-sm p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="mb-1 text-[11px] tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {label}
                </p>
                <p className="text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {data.courses.length > 0 && (
            <div
              className="overflow-hidden rounded-sm"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="grid grid-cols-4 px-5 py-3 text-[10px] font-semibold tracking-widest uppercase"
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span className="col-span-2">Course</span>
                <span>Enrolments</span>
                <span>Completion</span>
              </div>
              {data.courses.map((course, i) => (
                <div
                  key={course.course_id}
                  className="grid grid-cols-4 items-center px-5 py-3.5"
                  style={{
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span className="col-span-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {course.title}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {course.total_enrollments}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: course.completion_rate_pct >= 60 ? '#00FF88' : '#ed9d24' }}
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
