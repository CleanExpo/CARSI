'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, BarChart3, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface InstructorMetrics {
  total_courses: number;
  total_enrollments: number;
  published_courses: number;
}

const NAV_ITEMS = [
  {
    href: '/instructor/courses/new',
    icon: BookOpen,
    label: 'Create Course',
    description: 'Build a new course with modules and lessons',
  },
  {
    href: '/instructor/analytics',
    icon: BarChart3,
    label: 'Analytics',
    description: 'Enrolment stats and student progress',
  },
  {
    href: '/instructor/ai-builder',
    icon: Sparkles,
    label: 'AI Course Builder',
    description: 'Generate course content with AI assistance',
  },
  {
    href: '/instructor/ideas',
    icon: Lightbulb,
    label: 'Course Ideas',
    description: 'Browse and develop course concepts',
  },
];

export default function InstructorDashboardPage() {
  const [metrics, setMetrics] = useState<InstructorMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<InstructorMetrics>('/api/lms/instructor/analytics/summary')
      .then((data) => setMetrics(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex max-w-4xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Instructor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage your courses and track student progress.</p>
      </div>

      {/* Metrics summary */}
      {loading && <p className="text-sm text-muted-foreground">Loading metrics...</p>}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
              Published Courses
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{metrics.published_courses}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
              Total Courses
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{metrics.total_courses}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
              Total Enrolments
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{metrics.total_enrollments}</p>
          </div>
        </div>
      )}

      {/* Navigation grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/instructor/courses/new">New Course</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/instructor/analytics">View Analytics</Link>
        </Button>
      </div>
    </main>
  );
}
