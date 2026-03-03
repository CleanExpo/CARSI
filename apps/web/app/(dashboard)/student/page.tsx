'use client';

import { useEffect, useState } from 'react';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';

interface Enrollment {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
}

export default function StudentDashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('carsi_user_id') ?? '';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

    fetch(`${backendUrl}/api/lms/enrollments/me`, {
      headers: userId ? { 'X-User-Id': userId } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Enrollment[]) => setEnrollments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground">
          Track your progress and continue where you left off.
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Loading your courses…</p>}
      {error && <p className="text-destructive">Failed to load courses: {error}</p>}
      {!loading && !error && <EnrolledCourseList enrollments={enrollments} />}
    </div>
  );
}
